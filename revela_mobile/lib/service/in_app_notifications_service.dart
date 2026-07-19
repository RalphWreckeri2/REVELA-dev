import 'package:dio/dio.dart';

import 'auth_service.dart';

class InAppNotification {
  final int id;
  final String type;
  final String title;
  final String body;
  final String? readAt;
  final String createdAt;

  InAppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.readAt,
    required this.createdAt,
  });

  bool get isUnread => readAt == null || readAt!.isEmpty;

  factory InAppNotification.fromJson(Map<String, dynamic> json) {
    return InAppNotification(
      id: json['id'] is int
          ? json['id'] as int
          : int.tryParse(json['id']?.toString() ?? '') ?? 0,
      type: json['type']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      body: json['body']?.toString() ?? '',
      readAt: json['readAt']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}

class InAppNotificationsService {
  static final InAppNotificationsService _instance =
      InAppNotificationsService._internal();
  factory InAppNotificationsService() => _instance;
  InAppNotificationsService._internal();

  Dio get _dio => AuthService().dio;

  Future<List<InAppNotification>> fetchNotifications() async {
    final response = await _dio.get('/api/notifications');
    final List<dynamic> data = response.data['data'] ?? [];
    return data
        .map((e) => InAppNotification.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<int> fetchUnreadCount() async {
    final response = await _dio.get('/api/notifications/unread-count');
    final n = response.data['count'];
    if (n is int) return n;
    return int.tryParse(n?.toString() ?? '') ?? 0;
  }

  Future<void> markAllRead() async {
    await _dio.patch('/api/notifications/read', data: <String, dynamic>{});
  }

  Future<void> markRead(List<int> ids) async {
    await _dio.patch('/api/notifications/read', data: {'ids': ids});
  }

  Future<void> deleteNotification(int id) async {
    await _dio.delete('/api/notifications', data: {'ids': [id]});
  }

  Future<void> deleteAllNotifications() async {
    await _dio.delete('/api/notifications', data: {});
  }
}
