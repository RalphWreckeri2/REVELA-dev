import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../main.dart';
import '../service/api_config.dart';
import '../service/auth_service.dart';
import '../service/assignment_notifications.dart';
import 'main_layout.dart';
import 'welcome_page.dart';
import 'login_page.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    try {
      // 1. Initialize API config and base URL
      await ApiConfig.initialize();
      AuthService().syncBaseUrl();

      // 2. Initialize notifications
      await AssignmentNotifications.init();

      // 3. Read SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      final bool seenWelcome = prefs.getBool('seen_welcome') ?? false;
      final String themePref = prefs.getString('theme_preference') ?? 'system';

      if (themePref == 'dark') {
        themeModeNotifier.value = ThemeMode.dark;
      } else if (themePref == 'light') {
        themeModeNotifier.value = ThemeMode.light;
      } else {
        themeModeNotifier.value = ThemeMode.system;
      }

      // 4. Check Authentication
      // We intentionally do not auto-login here anymore.
      // We enforce re-authentication (biometrics or password) on every launch.

      // Minimum display time for splash to look polished
      await Future.delayed(const Duration(milliseconds: 1500));

      if (!mounted) return;

      // 5. Navigate based on app state
      Widget nextRoute;
      if (seenWelcome) {
        nextRoute = const LoginPage();
      } else {
        nextRoute = const WelcomePage();
      }

      Navigator.pushReplacement(
        context,
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 600),
          pageBuilder: (context, animation, secondaryAnimation) => nextRoute,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      );
    } catch (e) {
      debugPrint("Initialization error: $e");
      // Fallback behavior if init fails
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const LoginPage()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1B5E20), // Dark green background
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Spacer(),

            // Logo Container
            Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                color: const Color(
                  0xFF388E3C,
                ).withValues(alpha: 0.5), // Lighter green glow
                borderRadius: BorderRadius.circular(28),
              ),
              child: Center(
                child: Image.asset('assets/images/logo.png', height: 65),
              ),
            ).animate().scale(
              delay: 200.ms,
              duration: 600.ms,
              curve: Curves.easeOutBack,
            ),

            const SizedBox(height: 24),

            // App Name
            const Text(
              'REVELA',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: 4,
              ),
            ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2),

            const SizedBox(height: 8),

            // Subtitle
            Text(
              'Field Inspection Platform',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withValues(alpha: 0.8),
                letterSpacing: 1.5,
              ),
            ).animate().fadeIn(delay: 700.ms),

            const Spacer(),

            // Loading Spinner
            const CircularProgressIndicator(
              color: Colors.white,
              strokeWidth: 3,
            ).animate().fadeIn(delay: 1000.ms),

            const SizedBox(height: 60),
          ],
        ),
      ),
    );
  }
}
