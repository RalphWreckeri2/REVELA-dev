import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'theme/app_theme.dart';
import 'pages/main_layout.dart';
import 'pages/welcome_page.dart';
import 'pages/login_page.dart';
import 'service/auth_service.dart';
import 'service/api_config.dart';
import 'service/assignment_notifications.dart';

final ValueNotifier<ThemeMode> themeModeNotifier = ValueNotifier<ThemeMode>(ThemeMode.light);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiConfig.initialize();
  AuthService().syncBaseUrl();
  await AssignmentNotifications.init();

  final prefs = await SharedPreferences.getInstance();
  final bool seenWelcome = prefs.getBool('seen_welcome') ?? false;
  final bool isDarkMode = prefs.getBool('is_dark_mode') ?? false;
  themeModeNotifier.value = isDarkMode ? ThemeMode.dark : ThemeMode.light;

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
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeModeNotifier,
      builder: (context, currentMode, _) {
        return MaterialApp(
          navigatorKey: AuthService.navigatorKey,
          debugShowCheckedModeBanner: false,
          title: 'REVELA',
          theme: AppTheme.theme,
          darkTheme: AppTheme.darkTheme,
          themeMode: currentMode,
          home: isLoggedIn
              ? const MainLayout()
              : (seenWelcome ? const LoginPage() : const WelcomePage()),
        );
      },
    );
  }
}
