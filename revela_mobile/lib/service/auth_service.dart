import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../pages/login_page.dart';
import 'api_config.dart';

enum LoginResult { success, notInspector, failed, networkError }

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

      if (response.statusCode == 200 && response.data['access_token'] != null) {
        final user = response.data['user'];

        final String userRole = user?['userRole']?.toString() ?? '';
        if (userRole != 'Inspector') {
          return LoginResult.notInspector;
        }

        final String token = response.data['access_token'];
        await _storage.write(key: 'jwt_token', value: token);

        if (user != null && user is Map) {
          await _storage.write(
            key: 'user_fullName',
            value: user['fullName']?.toString() ?? '',
          );
          await _storage.write(key: 'user_role', value: userRole);
        }

        return LoginResult.success;
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
