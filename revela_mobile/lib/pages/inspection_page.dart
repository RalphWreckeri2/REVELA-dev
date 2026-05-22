import 'package:flutter/material.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';
import 'history_detail_page.dart';

class InspectionPage extends StatefulWidget {
  const InspectionPage({super.key});

  @override
  State<InspectionPage> createState() => _InspectionPageState();
}

class _InspectionPageState extends State<InspectionPage>
    with SingleTickerProviderStateMixin {
  static const Set<String> _activeStatuses = {'Assigned', 'Reassigned'};

  late final TabController _tabController;

  List<InspectionTask> _currentTasks = [];
  List<InspectionTask> _historyTasks = [];
  bool _loadingCurrent = true;
  bool _loadingHistory = true;
  String? _currentError;
  String? _historyError;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchCurrent();
    _fetchHistory();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchCurrent() async {
    setState(() {
      _loadingCurrent = true;
      _currentError = null;
    });
    try {
      final tasks = await InspectionService().getMyTasks();
      final currentTasks = tasks
          .where((t) => _activeStatuses.contains(t.verificationStatus))
          .toList();
      if (mounted) {
        setState(() {
          _currentTasks = currentTasks;
          _loadingCurrent = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _currentError = 'Failed to load current tasks.';
          _loadingCurrent = false;
        });
      }
    }
  }

  Future<void> _fetchHistory() async {
    setState(() {
      _loadingHistory = true;
      _historyError = null;
    });
    try {
      final all = await InspectionService().getMyReportHistory();
      final historyTasks = all
          .where((t) => !_activeStatuses.contains(t.verificationStatus))
          .toList();
      if (mounted) {
        setState(() {
          _historyTasks = historyTasks;
          _loadingHistory = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _historyError = 'Failed to load history.';
          _loadingHistory = false;
        });
      }
    }
  }

  // Tapping a CURRENT item navigates to HistoryDetailPage
  void _onCurrentTaskTap(InspectionTask task) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => HistoryDetailPage(task: task)),
    );
  }

  // Tapping a HISTORY item navigates to HistoryDetailPage
  void _onHistoryTaskTap(InspectionTask task) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => HistoryDetailPage(task: task)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: AppColors.darkGreen,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Inspections',
          style: TextStyle(
            color: AppColors.textDark,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.darkGreen,
          indicatorWeight: 3,
          labelColor: AppColors.darkGreen,
          unselectedLabelColor: Colors.grey,
          labelStyle: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
          unselectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
          tabs: const [
            Tab(text: 'CURRENT'),
            Tab(text: 'HISTORY'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── CURRENT Tab ──────────────────────────────────────────────────
          RefreshIndicator(
            color: AppColors.darkGreen,
            onRefresh: _fetchCurrent,
            child: _loadingCurrent
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.darkGreen,
                    ),
                  )
                : _currentError != null
                ? _ErrorState(message: _currentError!, onRetry: _fetchCurrent)
                : _currentTasks.isEmpty
                ? const _EmptyState(
                    message: 'No current assignments.',
                    icon: Icons.assignment_turned_in_outlined,
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: _currentTasks.length,
                    itemBuilder: (_, i) => _TaskCard(
                      task: _currentTasks[i],
                      isCurrent: true,
                      onTap: () => _onCurrentTaskTap(_currentTasks[i]),
                    ),
                  ),
          ),

          // ── HISTORY Tab ──────────────────────────────────────────────────
          RefreshIndicator(
            color: AppColors.darkGreen,
            onRefresh: _fetchHistory,
            child: _loadingHistory
                ? const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.darkGreen,
                    ),
                  )
                : _historyError != null
                ? _ErrorState(message: _historyError!, onRetry: _fetchHistory)
                : _historyTasks.isEmpty
                ? const _EmptyState(
                    message: 'No inspection history yet.',
                    icon: Icons.history_rounded,
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: _historyTasks.length,
                    itemBuilder: (_, i) => _TaskCard(
                      task: _historyTasks[i],
                      isCurrent: false,
                      onTap: () => _onHistoryTaskTap(_historyTasks[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

// ─── Task Card ────────────────────────────────────────────────────────────────
class _TaskCard extends StatelessWidget {
  final InspectionTask task;
  final bool isCurrent;
  final VoidCallback onTap;

  const _TaskCard({
    required this.task,
    required this.isCurrent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              blurRadius: 8,
              color: Colors.black.withValues(alpha: 0.08),
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Icon badge
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isCurrent
                    ? AppColors.darkGreen.withValues(alpha: 0.1)
                    : Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                isCurrent
                    ? Icons.storefront_outlined
                    : Icons.assignment_turned_in_outlined,
                color: isCurrent ? AppColors.darkGreen : Colors.orange,
                size: 24,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.detectedName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    task.barangayName,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today_outlined,
                        size: 11,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        task.irTimestamp,
                        style: TextStyle(fontSize: 11, color: Colors.grey[400]),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Icon(
              isCurrent ? Icons.map_outlined : Icons.chevron_right_rounded,
              color: isCurrent ? AppColors.darkGreen : Colors.grey,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Empty State ──────────────────────────────────────────────────────────────
class _EmptyState extends StatelessWidget {
  final String message;
  final IconData icon;
  const _EmptyState({required this.message, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 56, color: Colors.grey[300]),
          const SizedBox(height: 14),
          Text(
            message,
            style: TextStyle(color: Colors.grey[400], fontSize: 15),
          ),
        ],
      ),
    );
  }
}

// ─── Error State ──────────────────────────────────────────────────────────────
class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off, color: Colors.grey, size: 40),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 12),
          TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
