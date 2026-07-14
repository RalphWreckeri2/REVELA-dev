import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../component/inspection_modal.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';
import '../widgets/task_card.dart';
import 'history_detail_page.dart';

class InspectionPage extends StatefulWidget {
  final ValueChanged<bool>? onDrawerToggled;
  const InspectionPage({super.key, this.onDrawerToggled});

  @override
  State<InspectionPage> createState() => _InspectionPageState();
}

class _InspectionPageState extends State<InspectionPage>
    with SingleTickerProviderStateMixin {
  static const Set<String> _activeStatuses = {'Assigned', 'Reassigned'};

  late final TabController _tabController;

  List<InspectionTask> _currentTasks = [];
  List<InspectionTask> _missingTasks = [];
  List<InspectionTask> _historyTasks = [];
  bool _loadingCurrent = true;
  bool _loadingHistory = true;
  String? _currentError;
  String? _historyError;
  bool _isDrawerOpen = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
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
      final activeTasks = tasks
          .where((t) => _activeStatuses.contains(t.verificationStatus))
          .toList();

      final now = DateTime.now();
      final currentList = <InspectionTask>[];
      final missingList = <InspectionTask>[];

      for (var t in activeTasks) {
        if (t.deadline != null && t.deadline!.isNotEmpty) {
          final dl = DateTime.tryParse(t.deadline!);
          if (dl != null && dl.isBefore(now)) {
            missingList.add(t);
            continue;
          }
        }
        currentList.add(t);
      }

      if (mounted) {
        setState(() {
          _currentTasks = currentList;
          _missingTasks = missingList;
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

  // Tapping a CURRENT item opens the interactive InspectionModal to conduct report
  void _onCurrentTaskTap(InspectionTask task) async {
    if (_isDrawerOpen) return;
    setState(() => _isDrawerOpen = true);
    widget.onDrawerToggled?.call(true);

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => InspectionModal(
        task: task,
        onSubmitted: () {
          _fetchCurrent();
          _fetchHistory();
        },
      ),
    );
    widget.onDrawerToggled?.call(false);
    if (mounted) setState(() => _isDrawerOpen = false);
  }

  // Tapping a HISTORY item navigates to HistoryDetailPage
  void _onHistoryTaskTap(InspectionTask task) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => HistoryDetailPage(task: task)),
    );
  }

  Widget _buildShimmerLoader(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: 4,
      itemBuilder: (context, index) => Padding(
        padding: const EdgeInsets.only(bottom: 16.0),
        child: Shimmer.fromColors(
          baseColor: context.isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
          highlightColor: context.isDarkMode ? Colors.grey[700]! : Colors.grey[100]!,
          child: Container(
            height: 120,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.adaptiveBackground,
      appBar: AppBar(
        backgroundColor: context.adaptiveSurface,
        elevation: 0,
        centerTitle: false,
        title: Text(
          'Inspections',
          style: TextStyle(
            color: context.adaptiveTextDark,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.darkGreen,
          indicatorWeight: 3,
          labelColor: context.isDarkMode ? Colors.white : AppColors.darkGreen,
          unselectedLabelColor: context.isDarkMode ? Colors.white70 : Colors.grey,
          labelStyle: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
          unselectedLabelStyle: TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
          tabs: const [
            Tab(text: 'CURRENT'),
            Tab(text: 'MISSING'),
            Tab(text: 'HISTORY'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── CURRENT Tab ──────────────────────────────────────────────────
          RefreshIndicator(
            color: context.adaptivePrimary,
            onRefresh: _fetchCurrent,
            child: _loadingCurrent
                ? _buildShimmerLoader(context)
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
                    itemBuilder: (_, i) => TaskCard(
                      task: _currentTasks[i],
                      isCurrent: true,
                      onTap: () => _onCurrentTaskTap(_currentTasks[i]),
                    ),
                  ),
          ),

          // ── MISSING Tab ──────────────────────────────────────────────────
          RefreshIndicator(
            color: context.adaptivePrimary,
            onRefresh: _fetchCurrent,
            child: _loadingCurrent
                ? _buildShimmerLoader(context)
                : _currentError != null
                ? _ErrorState(message: _currentError!, onRetry: _fetchCurrent)
                : _missingTasks.isEmpty
                ? const _EmptyState(
                    message: 'No missing assignments.',
                    icon: Icons.check_circle_outline_rounded,
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: _missingTasks.length,
                    itemBuilder: (_, i) => TaskCard(
                      task: _missingTasks[i],
                      isCurrent: true,
                      isMissing: true,
                      onTap: () => _onCurrentTaskTap(_missingTasks[i]),
                    ),
                  ),
          ),

          // ── HISTORY Tab ──────────────────────────────────────────────────
          RefreshIndicator(
            color: context.adaptivePrimary,
            onRefresh: _fetchHistory,
            child: _loadingHistory
                ? _buildShimmerLoader(context)
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
                    itemBuilder: (_, i) => TaskCard(
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
          SizedBox(height: 14),
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
          Icon(Icons.wifi_off, color: Colors.grey, size: 40),
          SizedBox(height: 12),
          Text(message, style: TextStyle(color: Colors.grey)),
          SizedBox(height: 12),
          TextButton(onPressed: onRetry, child: Text('Retry')),
        ],
      ),
    );
  }
}
