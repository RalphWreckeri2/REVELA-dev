import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'theme/app_theme.dart';
import 'pages/welcome_page.dart';
import 'pages/login_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final bool seenWelcome = prefs.getBool('seen_welcome') ?? false;

  runApp(MyApp(seenWelcome: seenWelcome));
}

class MyApp extends StatelessWidget {
  final bool seenWelcome;
  const MyApp({super.key, required this.seenWelcome});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'REVELA',
      theme: AppTheme.theme,
      home: seenWelcome ? const LoginPage() : const WelcomePage(),
    );
  }
}
