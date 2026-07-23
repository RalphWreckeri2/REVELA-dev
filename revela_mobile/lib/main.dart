import 'dart:ui';
import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'pages/splash_screen.dart';
import 'service/auth_service.dart';

final ValueNotifier<ThemeMode> themeModeNotifier = ValueNotifier<ThemeMode>(ThemeMode.system);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeModeNotifier,
      builder: (context, currentMode, _) {
        return MaterialApp(
          scrollBehavior: AppScrollBehavior(),
          navigatorKey: AuthService.navigatorKey,
          debugShowCheckedModeBanner: false,
          title: 'REVELA',
          theme: AppTheme.theme,
          darkTheme: AppTheme.darkTheme,
          themeMode: currentMode,
          home: const SplashScreen(),
          builder: (context, child) {
            // Clamp the text scaling to prevent UI disarray on devices with large font sizes
            final mediaQueryData = MediaQuery.of(context);
            final scale = mediaQueryData.textScaler.clamp(
              minScaleFactor: 1.0,
              maxScaleFactor: 1.15,
            );
            return MediaQuery(
              data: mediaQueryData.copyWith(
                textScaler: scale,
              ),
              child: child!,
            );
          },
        );
      },
    );
  }
}

class AppScrollBehavior extends MaterialScrollBehavior {
  @override
  Set<PointerDeviceKind> get dragDevices => {
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
        PointerDeviceKind.stylus,
        PointerDeviceKind.trackpad,
      };
}
