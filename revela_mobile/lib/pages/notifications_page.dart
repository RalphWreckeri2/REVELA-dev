import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'dart:async';
import '../component/inspection_modal.dart';
import '../service/in_app_notifications_service.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';
import '../widgets/task_card.dart';

class NotificationsPage extends StatefulWidget {
  final ValueChanged<bool>? onDrawerToggled;
  const NotificationsPage({super.key, this.onDrawerToggled});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  List<InAppNotification> _items = [];
  List<InspectionTask> _activeTasks = [];
  bool _loading = true;
  String? _error;
  bool _isDrawerOpen = false;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _load();
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _load(silent: true);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final list = await InAppNotificationsService().fetchNotifications();
      final tasks = await InspectionService().getMyTasks();
      if (mounted) {
        setState(() {
          _items = list;
          _activeTasks = tasks;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Could not load notifications.';
          _loading = false;
        });
      }
    }
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'inspection_assigned':
        return Icons.assignment_ind_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  void _onTaskTap(InspectionTask task) async {
    if (_isDrawerOpen) return;
    setState(() => _isDrawerOpen = true);
    widget.onDrawerToggled?.call(true);

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => InspectionModal(
        task: task,
        onSubmitted: () => _load(),
      ),
    );
    widget.onDrawerToggled?.call(false);
    if (mounted) setState(() => _isDrawerOpen = false);
  }

  @override
  Widget build(BuildContext context) {
    // Determine which tasks are nearing deadline
    final nearingTasks = _activeTasks.where((task) {
      if (task.deadline == null || task.deadline!.isEmpty) return false;
      try {
        final deadline = DateTime.parse(task.deadline!);
        final diff = deadline.difference(DateTime.now());
        return diff.inHours <= 24;
      } catch (_) {
        return false;
      }
    }).toList();

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: context.adaptiveBackground,
        appBar: AppBar(
          backgroundColor: context.adaptiveSurface,
          elevation: 0,
          title: Text(
            'Notifications',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: context.adaptiveTextDark,
            ),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.mark_email_read_outlined, color: AppColors.darkGreen),
              tooltip: 'Mark all as read',
              onPressed: _loading ? null : () async {
                await InAppNotificationsService().markAllRead();
                _load();
              },
            ),
            IconButton(
              icon: const Icon(Icons.refresh, color: AppColors.darkGreen),
              onPressed: _loading ? null : _load,
            ),
          ],
          bottom: TabBar(
            indicatorColor: AppColors.darkGreen,
            indicatorWeight: 3,
            labelColor: context.isDarkMode ? Colors.white : AppColors.darkGreen,
            unselectedLabelColor: context.isDarkMode ? Colors.white70 : Colors.grey,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
            tabs: [
              Tab(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('ASSIGNMENTS'),
                    if (_items.any((n) => n.isUnread)) ...[
                      const SizedBox(width: 8),
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Colors.redAccent,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Tab(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('DEADLINES'),
                    if (nearingTasks.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Colors.redAccent,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        body: _loading
            ? ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                itemCount: 5,
                itemBuilder: (context, index) => Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: Shimmer.fromColors(
                    baseColor: context.isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
                    highlightColor: context.isDarkMode ? Colors.grey[700]! : Colors.grey[100]!,
                    child: Container(
                      height: 100,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ),
              )
            : _error != null
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.grey),
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            : TabBarView(
                children: [
                  // Tab 1: ASSIGNMENTS
                  _items.isEmpty
                      ? const Center(
                          child: Padding(
                            padding: EdgeInsets.all(32),
                            child: Text(
                              'No notifications yet.\nNew assignments from admin will appear here.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey, height: 1.5),
                            ),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                          itemCount: _items.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (_, i) {
                            final n = _items[i];
                            return GestureDetector(
                              onTap: () async {
                                if (n.isUnread) {
                                  try {
                                    await InAppNotificationsService().markRead([n.id]);
                                    if (mounted) {
                                      setState(() {
                                        _items[i] = InAppNotification(
                                          id: n.id,
                                          type: n.type,
                                          title: n.title,
                                          body: n.body,
                                          createdAt: n.createdAt,
                                          readAt: DateTime.now().toIso8601String(),
                                        );
                                      });
                                    }
                                  } catch (_) {}
                                }

                                if (n.type == 'inspection_assigned') {
                                  final match = RegExp(r'\(report #(\d+)\)').firstMatch(n.body);
                                  final reportId = match != null ? int.tryParse(match.group(1) ?? '') : null;
                                  if (reportId != null) {
                                    InspectionTask? task;
                                    for (var t in _activeTasks) {
                                      if (t.reportID == reportId) {
                                        task = t;
                                        break;
                                      }
                                    }
                                    if (task != null) {
                                      _onTaskTap(task);
                                      return;
                                    }
                                  }
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task no longer active or found.')));
                                  }
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: n.isUnread
                                      ? AppColors.darkGreen.withValues(alpha: 0.06)
                                      : context.adaptiveSurface,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: n.isUnread
                                        ? AppColors.darkGreen.withValues(alpha: 0.25)
                                        : context.isDarkMode ? Colors.grey.shade800 : Colors.grey.shade200,
                                  ),
                                  boxShadow: [
                                    if (n.isUnread)
                                      BoxShadow(
                                        color: AppColors.darkGreen.withValues(alpha: 0.05),
                                        blurRadius: 10,
                                        offset: const Offset(0, 4),
                                      )
                                  ],
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: n.isUnread 
                                          ? AppColors.darkGreen.withValues(alpha: 0.1) 
                                          : context.isDarkMode ? Colors.grey.shade800 : Colors.grey.shade100,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        _iconForType(n.type),
                                        color: n.isUnread ? AppColors.darkGreen : context.adaptiveTextMid,
                                        size: 24,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            n.title,
                                            style: TextStyle(
                                              fontWeight: n.isUnread
                                                  ? FontWeight.w700
                                                  : FontWeight.w600,
                                              fontSize: 15,
                                              color: context.adaptiveTextDark,
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            n.body,
                                            style: TextStyle(
                                              fontSize: 13,
                                              color: context.adaptiveTextMid,
                                              height: 1.4,
                                            ),
                                          ),
                                          if (n.createdAt.isNotEmpty) ...[
                                            const SizedBox(height: 8),
                                            Text(
                                              n.createdAt,
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500,
                                                color: context.adaptiveTextMid.withValues(alpha: 0.7),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                  
                  // Tab 2: DEADLINES
                  nearingTasks.isEmpty
                      ? const Center(
                          child: Padding(
                            padding: EdgeInsets.all(32),
                            child: Text(
                              'No approaching deadlines.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey, height: 1.5),
                            ),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: nearingTasks.length,
                          itemBuilder: (ctx, index) {
                            return TaskCard(
                              task: nearingTasks[index],
                              isCurrent: true,
                              onTap: () => _onTaskTap(nearingTasks[index]),
                            );
                          },
                        ),
                ],
              ),
      ),
    );
  }
}
