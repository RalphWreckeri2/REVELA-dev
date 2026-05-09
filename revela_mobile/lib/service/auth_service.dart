import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../pages/login_page.dart';

class AuthService {
  // Use 10.0.2.2 to access localhost from an Android emulator.
  // Use 127.0.0.1 for iOS simulator.
  // Change to your machine's IP (e.g., 192.168.x.x) if using a physical device.
  static const String _baseUrl = 'http://10.0.2.2:5000';

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: _baseUrl,
      headers: {'Content-Type': 'application/json'},
    ),
  );

  Dio get dio => _dio;

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // Global key to access the Navigator from outside widgets
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  static final AuthService _instance = AuthService._internal();

  factory AuthService() {
    return _instance;
  }

  AuthService._internal() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest:
            (RequestOptions options, RequestInterceptorHandler handler) async {
              // Attach JWT token to requests automatically
              final token = await _storage.read(key: 'jwt_token');
              if (token != null) {
                options.headers['Authorization'] = 'Bearer $token';
              }
              return handler.next(options);
            },
        onError: (DioException e, ErrorInterceptorHandler handler) async {
          if (e.response?.statusCode == 401) {
            await logout(); // Clear the token
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

  Future<bool> login(String email, String password) async {
    try {
      final response = await _dio.post(
        '/api/auth/login',
        data: {'email': email, 'password': password},
      );

      if (response.statusCode == 200 && response.data['access_token'] != null) {
        final String token = response.data['access_token'];
        await _storage.write(key: 'jwt_token', value: token);

        final user = response.data['user'];
        if (user != null && user is Map) {
          await _storage.write(
            key: 'user_fullName',
            value: user['fullName']?.toString() ?? '',
          );
          await _storage.write(
            key: 'user_role',
            value: user['userRole']?.toString() ?? '',
          );
        }

        return true;
      }
      return false;
    } on DioException catch (e) {
      print('Login Error: ${e.response?.data ?? e.message}');
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
    await _storage.delete(key: 'user_fullName');
    await _storage.delete(key: 'user_role');
    navigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }
}
