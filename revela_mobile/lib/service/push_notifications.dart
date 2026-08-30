import 'dart:typed_data';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../pages/notifications_page.dart';
import 'auth_service.dart';

final _channel = AndroidNotificationChannel(
  'revela_inspection_alerts',
  'Inspection alerts',
  description: 'Alerts for inspection assignments and inspection updates.',
  importance: Importance.max,
  playSound: true,
  enableVibration: true,
  vibrationPattern: Int64List.fromList(<int>[0, 300, 180, 300]),
);

final FlutterLocalNotificationsPlugin _localNotifications =
    FlutterLocalNotificationsPlugin();

/// Must be a top-level function. Android starts a separate Dart isolate for
/// data messages while the app is backgrounded or terminated.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
    await _initializeLocalNotifications();

    // Notification payloads are rendered by Android/iOS while backgrounded.
    // Render data-only messages locally so they are not silently dropped.
    if (message.notification == null) {
      await _showLocalNotification(message);
    }
  } catch (error, stackTrace) {
    debugPrint('[FIREBASE INIT WARNING] Background handler: $error');
    debugPrintStack(stackTrace: stackTrace);
  }
}

/// Required by flutter_local_notifications when a notification action is
/// invoked while the process is not running.
@pragma('vm:entry-point')
void notificationTapBackground(NotificationResponse response) {
  // Background isolates cannot safely navigate. The payload remains available
  // to the OS; foreground startup is handled by getInitialMessage below.
}

class PushNotifications {
  PushNotifications._();

  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static bool _initialized = false;
  static bool _launchNavigationHandled = false;

  static Future<void> initialize() async {
    if (_initialized) return;

    try {
      await Firebase.initializeApp();
      await _initializeLocalNotifications();

      final permissions = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      debugPrint('FCM permission: ${permissions.authorizationStatus}');

      final android = _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      await android?.requestNotificationsPermission();

      FirebaseMessaging.onMessage.listen((message) async {
        await _showLocalNotification(message);
      });
      FirebaseMessaging.onMessageOpenedApp.listen(_openInspectionAlerts);

      // Covers a data-only local notification that launched a terminated app.
      final localLaunch = await _localNotifications
          .getNotificationAppLaunchDetails();
      if (localLaunch?.didNotificationLaunchApp ?? false) {
        _scheduleAlertNavigation(localLaunch?.notificationResponse?.payload);
      }

      // Covers a user tapping an FCM notification that launched a terminated app.
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        WidgetsBinding.instance.addPostFrameCallback(
          (_) => _openInspectionAlerts(initialMessage),
        );
      }

      _initialized = true;
    } catch (error, stackTrace) {
      debugPrint(
        '[FIREBASE INIT WARNING] Push notifications unavailable: $error',
      );
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  static void _openInspectionAlerts(RemoteMessage message) {
    _scheduleAlertNavigation(_reportIdFromData(message.data));
  }

  static void _scheduleAlertNavigation(String? reportId) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_launchNavigationHandled) return;
      final navigator = AuthService.navigatorKey.currentState;
      if (navigator == null) return;
      _launchNavigationHandled = true;
      navigator.push(
        MaterialPageRoute(
          builder: (_) => NotificationsPage(initialReportId: reportId),
        ),
      );
    });
  }
}

Future<void> _initializeLocalNotifications() async {
  const settings = InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    iOS: DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    ),
  );
  await _localNotifications.initialize(
    settings,
    onDidReceiveNotificationResponse: (response) =>
        PushNotifications._scheduleAlertNavigation(response.payload),
    onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
  );

  final android = _localNotifications
      .resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin
      >();
  await android?.createNotificationChannel(_channel);
}

Future<void> _showLocalNotification(RemoteMessage message) async {
  final notification = message.notification;
  final title = notification?.title ?? message.data['title'] ?? 'REVELA update';
  final body =
      notification?.body ??
      message.data['body'] ??
      'You have a new inspection alert.';

  await _localNotifications.show(
    message.messageId?.hashCode ??
        DateTime.now().millisecondsSinceEpoch ~/ 1000,
    title,
    body,
    NotificationDetails(
      android: AndroidNotificationDetails(
        _channel.id,
        _channel.name,
        channelDescription: _channel.description,
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        vibrationPattern: Int64List.fromList(<int>[0, 300, 180, 300]),
        icon: '@mipmap/ic_launcher',
      ),
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    ),
    payload: _reportIdFromData(message.data),
  );
}

String? _reportIdFromData(Map<String, dynamic> data) {
  final reportId = data['reportID'] ?? data['reportId'] ?? data['report_id'];
  return reportId?.toString();
}
