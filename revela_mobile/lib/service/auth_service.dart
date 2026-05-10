import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../pages/login_page.dart';

enum LoginResult { success, notInspector, failed }

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

  Future<LoginResult> loginWithRole(String email, String password) async {
    try {
      final response = await _dio.post(
        '/api/auth/login',
        data: {'email': email, 'password': password},
      );

      if (response.statusCode == 200 && response.data['access_token'] != null) {
        final user = response.data['user'];

        // ✅ Check if userRole is Inspector before allowing login
        final String userRole = user?['userRole']?.toString() ?? '';
        if (userRole != 'Inspector') {
          return LoginResult.notInspector; // Block non-inspectors silently
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
      print('Login Error: ${e.response?.data ?? e.message}');
      return LoginResult.failed;
    }
  }

  Future<void> logout() async {
    // Clear all stored keys to ensure a complete local session wipe
    await _storage.deleteAll();

    // Clear Flutter's image cache to free up memory and force a UI refresh on next login
    PaintingBinding.instance.imageCache.clear();
    PaintingBinding.instance.imageCache.clearLiveImages();

    navigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (route) => false,
    );
  }
}
