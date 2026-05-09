import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'theme/app_theme.dart';
import 'pages/welcome_page.dart';
import 'pages/login_page.dart';
import 'pages/home_page.dart';
import 'service/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final bool seenWelcome = prefs.getBool('seen_welcome') ?? false;

  const secureStorage = FlutterSecureStorage();
  final String? token = await secureStorage.read(key: 'jwt_token');
  final bool isLoggedIn = token != null;

  runApp(MyApp(seenWelcome: seenWelcome, isLoggedIn: isLoggedIn));
}

class MyApp extends StatelessWidget {
  final bool seenWelcome;
  final bool isLoggedIn;
  const MyApp({super.key, required this.seenWelcome, required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: AuthService.navigatorKey,
      debugShowCheckedModeBanner: false,
      title: 'REVELA',
      theme: AppTheme.theme,
      home: isLoggedIn
          ? const HomePage()
          : (seenWelcome ? const LoginPage() : const WelcomePage()),
    );
  }
}
