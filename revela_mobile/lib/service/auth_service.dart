import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import '../pages/login_page.dart';
import 'api_config.dart';

enum LoginResult {
  success,
  mustChangePassword,
  twoFactorRequired,
  notInspector,
  failed,
  networkError,
  canceled,
}

class AuthService {
  late final Dio _dio;

  Dio get dio => _dio;

  static String get apiBase => ApiConfig.apiBase;

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final LocalAuthentication _localAuth = LocalAuthentication();

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
          // Only force-logout on 401 for authenticated endpoints.
          // Auth endpoints (login, logout, reset) handle 401 themselves.
          final path = e.requestOptions.path;
          final isAuthEndpoint =
              path.contains('/auth/login') ||
              path.contains('/auth/logout') ||
              path.contains('/auth/request-manual-reset') ||
              path.contains('/auth/request-otp') ||
              path.contains('/auth/reset-password');

          if (e.response?.statusCode == 401 && !isAuthEndpoint) {
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
        data: {'email': email, 'password': password, 'source': 'mobile'},
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

          // Save credentials securely for biometric re-login
          await _storage.write(key: 'saved_email', value: email);
          await _storage.write(key: 'saved_password', value: password);

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

      if (e.response?.statusCode == 403) {
        final errorMsg = e.response?.data?['error']?.toString() ?? '';
        if (errorMsg.contains('Inspectors only')) {
          return LoginResult.notInspector;
        }
      }

      debugPrint('Login Error: ${e.response?.data ?? e.message}');
      debugPrint('Login Error: ${e.response?.data ?? e.message}');
      return LoginResult.failed;
    }
  }

  Future<bool> requestManualPasswordReset(String email) async {
    try {
      final response = await _dio.post(
        '/api/auth/request-manual-reset',
        data: {'email': email},
      );
      // Clear saved password so biometrics is disabled until they login again with new password
      await _storage.delete(key: 'saved_password');
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Reset Request Error: $e');
      return false; // Still return false on catastrophic error, but API returns 200 even if not found
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
          final String userRole =
              profile['role']?.toString() ??
              profile['userRole']?.toString() ??
              '';
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
      debugPrint(
        '2FA Login Verification error: ${e.response?.data ?? e.message}',
      );
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

        // Update the saved password so biometrics doesn't break
        final email = await _storage.read(key: 'saved_email');
        if (email != null) {
          await _storage.write(key: 'saved_password', value: newPassword);
        }

        return {
          'success': true,
          'message':
              response.data['message'] ?? 'Password changed successfully',
        };
      }
      return {
        'success': false,
        'error': response.data['error'] ?? 'Failed to change password',
      };
    } on DioException catch (e) {
      final err =
          e.response?.data?['error'] ?? e.message ?? 'An error occurred';
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

  Future<bool> canUseBiometrics() async {
    try {
      return await _localAuth.canCheckBiometrics ||
          await _localAuth.isDeviceSupported();
    } catch (e) {
      return false;
    }
  }

  Future<bool> authenticateForSetup() async {
    try {
      final canCheck = await canUseBiometrics();
      if (!canCheck) return false;

      return await _localAuth.authenticate(
        localizedReason: 'Please authenticate to enable biometric login',
        persistAcrossBackgrounding: true,
        biometricOnly: false,
      );
    } catch (e) {
      debugPrint('Setup Biometric error: $e');
      return false;
    }
  }

  Future<bool> hasSavedCredentials() async {
    final email = await _storage.read(key: 'saved_email');
    final password = await _storage.read(key: 'saved_password');
    return email != null &&
        email.isNotEmpty &&
        password != null &&
        password.isNotEmpty;
  }

  Future<LoginResult> biometricLogin() async {
    try {
      final email = await _storage.read(key: 'saved_email');
      final password = await _storage.read(key: 'saved_password');
      if (email == null || password == null) return LoginResult.failed;

      final canCheck = await canUseBiometrics();
      if (!canCheck) return LoginResult.failed;

      final didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Please authenticate to log in',
        persistAcrossBackgrounding: true,
        biometricOnly: false,
      );

      if (didAuthenticate) {
        return await loginWithRole(email, password);
      }
      return LoginResult.canceled;
    } catch (e) {
      debugPrint('Biometric error: $e');
      return LoginResult.canceled;
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
      return {
        'success': false,
        'error': response.data['error'] ?? 'Invalid code',
      };
    } on DioException catch (e) {
      final err =
          e.response?.data?['error'] ?? e.message ?? 'Verification failed';
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

  /// Clears only the saved password, typically after a biometric login fails.
  Future<void> clearSavedPassword() async {
    await _storage.delete(key: 'saved_password');
  }

  Future<void> logout() async {
    try {
      await _dio.post('/api/auth/logout');
    } catch (_) {}

    final email = await _storage.read(key: 'saved_email');
    final password = await _storage.read(key: 'saved_password');
    await _storage.deleteAll();
    if (email != null) await _storage.write(key: 'saved_email', value: email);
    if (password != null)
      await _storage.write(key: 'saved_password', value: password);

    PaintingBinding.instance.imageCache.clear();
    PaintingBinding.instance.imageCache.clearLiveImages();

    navigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }
}
