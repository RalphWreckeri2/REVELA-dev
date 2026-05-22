import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';

import 'inspection_service.dart';

/// Local notifications when new inspection assignments appear (polling-based).
/// No FCM required — suitable for dev and small deployments.
class AssignmentNotifications {
  AssignmentNotifications._();

  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static bool _initialized = false;
  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'revela_assignments',
    'Inspection assignments',
    description: 'Alerts when a new site is assigned to you',
    importance: Importance.high,
  );

  static Future<void> init() async {
    if (_initialized) return;

    const androidInit = AndroidInitializationSettings('@mipmap/launcher_icon');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    await _plugin.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
    );

    final android = _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await android?.createNotificationChannel(_channel);

    _initialized = true;
  }

  static Future<void> notifyNewAssignments({
    required List<InspectionTask> previous,
    required List<InspectionTask> next,
  }) async {
    if (!_initialized) return;

    final prevIds = previous.map((e) => e.reportID).toSet();
    final newcomers = next.where((t) => !prevIds.contains(t.reportID)).toList();
    if (newcomers.isEmpty) return;

    for (final task in newcomers) {
      await _plugin.show(
        task.reportID,
        'New inspection assigned',
        task.detectedName,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _channel.id,
            _channel.name,
            channelDescription: _channel.description,
            importance: Importance.high,
            priority: Priority.high,
            icon: '@mipmap/launcher_icon',
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
      );
    }
  }
}
