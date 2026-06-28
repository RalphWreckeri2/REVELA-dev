import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../pages/login_page.dart';
import 'api_config.dart';

enum LoginResult { success, mustChangePassword, twoFactorRequired, notInspector, failed, networkError }

class AuthService {
  late final Dio _dio;

  Dio get dio => _dio;

  static String get apiBase => ApiConfig.apiBase;

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  static final AuthService _instance = AuthService._internal();

  factory AuthService() {
    return _instance;
  }

  AuthService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.apiBase,
        headers: {'Content-Type': 'application/json'},
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest:
            (RequestOptions options, RequestInterceptorHandler handler) async {
              options.baseUrl = ApiConfig.apiBase;
              final token = await _storage.read(key: 'jwt_token');
              if (token != null) {
                options.headers['Authorization'] = 'Bearer $token';
              }
              return handler.next(options);
            },
        onError: (DioException e, ErrorInterceptorHandler handler) async {
          if (e.response?.statusCode == 401) {
            await logout();
            if (navigatorKey.currentState != null) {
              navigatorKey.currentState!.pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginPage()),
                (route) => false,
              );
            }
          }
          return handler.next(e);
        },
      ),
    );
  }

  void syncBaseUrl() {
    _dio.options.baseUrl = ApiConfig.apiBase;
  }

  Future<LoginResult> loginWithRole(String email, String password) async {
    final reachable = await ApiConfig.ensureReachable();
    if (reachable == null) {
      return LoginResult.networkError;
    }
    syncBaseUrl();

    try {
      final response = await _dio.post(
        '/api/auth/login',
        data: {'email': email, 'password': password},
      );

      if (response.statusCode == 200) {
        if (response.data['status'] == '2fa_required') {
          await _storage.write(
            key: 'temp_2fa_token',
            value: response.data['tempToken'],
          );
          return LoginResult.twoFactorRequired;
        }

        if (response.data['access_token'] != null) {
          final user = response.data['user'];

          final String userRole = user?['userRole']?.toString() ?? '';
          if (userRole != 'Inspector') {
            return LoginResult.notInspector;
          }

          final String token = response.data['access_token'];
          await _storage.write(key: 'jwt_token', value: token);

          bool mustChange = false;
          if (user != null && user is Map) {
            await _storage.write(
              key: 'user_fullName',
              value: user['fullName']?.toString() ?? '',
            );
            await _storage.write(key: 'user_role', value: userRole);
            mustChange = user['mustChangePassword'] == true;
            await _storage.write(
              key: 'must_change_password',
              value: mustChange ? 'true' : 'false',
            );
          }

          if (mustChange) {
            return LoginResult.mustChangePassword;
          }

          return LoginResult.success;
        }
      }
      return LoginResult.failed;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        return LoginResult.networkError;
      }
      debugPrint('Login Error: ${e.response?.data ?? e.message}');
      return LoginResult.failed;
    }
  }

  Future<LoginResult> verify2FALogin(String code) async {
    try {
      final tempToken = await _storage.read(key: 'temp_2fa_token');
      if (tempToken == null) return LoginResult.failed;

      final response = await _dio.post(
        '/api/auth/verify-2fa-login',
        options: Options(headers: {'Authorization': 'Bearer $tempToken'}),
        data: {'code': code},
      );

      if (response.statusCode == 200 && response.data['access_token'] != null) {
        final String token = response.data['access_token'];
        await _storage.write(key: 'jwt_token', value: token);
        await _storage.delete(key: 'temp_2fa_token');

        final profile = await getProfile();
        if (profile != null) {
          final String userRole = profile['role']?.toString() ?? profile['userRole']?.toString() ?? '';
          if (userRole != 'Inspector') {
            return LoginResult.notInspector;
          }
          await _storage.write(
            key: 'user_fullName',
            value: profile['fullName']?.toString() ?? '',
          );
          await _storage.write(key: 'user_role', value: userRole);
          if (profile['mustChangePassword'] == true) {
            return LoginResult.mustChangePassword;
          }
        }
        return LoginResult.success;
      }
      return LoginResult.failed;
    } on DioException catch (e) {
      debugPrint('2FA Login Verification error: ${e.response?.data ?? e.message}');
      return LoginResult.failed;
    }
  }

  Future<Map<String, dynamic>> changePassword(
    String oldPassword,
    String newPassword,
  ) async {
    try {
      final response = await _dio.put(
        '/api/auth/change-password',
        data: {'oldPassword': oldPassword, 'newPassword': newPassword},
      );
      if (response.statusCode == 200) {
        await _storage.write(key: 'must_change_password', value: 'false');
        return {'success': true, 'message': response.data['message'] ?? 'Password changed successfully'};
      }
      return {'success': false, 'error': response.data['error'] ?? 'Failed to change password'};
    } on DioException catch (e) {
      final err = e.response?.data?['error'] ?? e.message ?? 'An error occurred';
      return {'success': false, 'error': err};
    }
  }

  Future<Map<String, dynamic>?> getProfile() async {
    try {
      final response = await _dio.get('/api/auth/me');
      if (response.statusCode == 200) {
        return response.data;
      }
      return null;
    } catch (e) {
      debugPrint('Error getting profile: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> setup2FA() async {
    try {
      final response = await _dio.post('/api/auth/setup-2fa');
      if (response.statusCode == 200) {
        return response.data;
      }
      return null;
    } on DioException catch (e) {
      debugPrint('Setup 2FA error: ${e.response?.data ?? e.message}');
      return null;
    }
  }

  Future<Map<String, dynamic>> verify2FASetup(String code) async {
    try {
      final response = await _dio.post(
        '/api/auth/verify-2fa-setup',
        data: {'code': code},
      );
      if (response.statusCode == 200) {
        return {'success': true, 'message': response.data['message']};
      }
      return {'success': false, 'error': response.data['error'] ?? 'Invalid code'};
    } on DioException catch (e) {
      final err = e.response?.data?['error'] ?? e.message ?? 'Verification failed';
      return {'success': false, 'error': err};
    }
  }

  Future<bool> disable2FA() async {
    try {
      final response = await _dio.post('/api/auth/disable-2fa');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Disable 2FA error: $e');
      return false;
    }
  }

  Future<bool> updateEmailAlerts(bool enabled) async {
    try {
      final response = await _dio.patch(
        '/api/auth/me/preferences',
        data: {'emailInspectionAlerts': enabled},
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Update email alerts error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.deleteAll();

    PaintingBinding.instance.imageCache.clear();
    PaintingBinding.instance.imageCache.clearLiveImages();

    navigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }
}
