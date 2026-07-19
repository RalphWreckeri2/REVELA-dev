import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../component/inspection_modal.dart';
import '../widgets/floating_mascot.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';
import '../widgets/task_card.dart';
import '../widgets/modern_segmented_filter.dart';
import 'history_detail_page.dart';
import 'pdf_generator_page.dart';

class InspectionPage extends StatefulWidget {
  final ValueChanged<bool>? onDrawerToggled;
  const InspectionPage({super.key, this.onDrawerToggled});

  @override
  State<InspectionPage> createState() => _InspectionPageState();
}

class _InspectionPageState extends State<InspectionPage>
    with SingleTickerProviderStateMixin {
  static const Set<String> _activeStatuses = {'Assigned', 'Reassigned'};

  final InspectionService _inspectionService = InspectionService();
  late TabController _tabController;
  int _currentFilterIndex = 0;

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
    _tabController.addListener(() {
      if (!mounted) return;
      if (_currentFilterIndex != _tabController.index) {
        setState(() {
          _currentFilterIndex = _tabController.index;
        });
      }
    });
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
          _currentError = 'Unable to load your tasks. Please pull down to refresh.';
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
          _historyError = 'Unable to load your inspection history. Please pull down to refresh.';
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
  void _onHistoryTaskTap(InspectionTask task) async {
    if (_isDrawerOpen) return;
    setState(() => _isDrawerOpen = true);
    widget.onDrawerToggled?.call(true);

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => HistoryDetailPage(task: task),
    );
    
    widget.onDrawerToggled?.call(false);
    if (mounted) setState(() => _isDrawerOpen = false);
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
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 16, 16),
              child: Row(
                children: [
                  if (Navigator.of(context).canPop())
                    Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: IconButton(
                        icon: Icon(Icons.arrow_back_ios_new_rounded, color: context.adaptiveTextDark),
                        onPressed: () => Navigator.pop(context),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ),
                  Expanded(
                    child: Text(
                      'Inspections',
                      style: TextStyle(
                        color: context.adaptiveTextDark,
                        fontWeight: FontWeight.bold,
                        fontSize: 28,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.picture_as_pdf_rounded, color: AppColors.darkGreen, size: 24),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const PdfGeneratorPage()),
                    ),
                    tooltip: 'Generate Notice PDF',
                  ),
                ],
              ),
            ),
            ModernSegmentedFilter(
              options: const ['Current', 'Missing', 'History'],
              selectedIndex: _currentFilterIndex,
              onSelected: (index) {
                _tabController.animateTo(index);
              },
            ),
            const SizedBox(height: 8),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
          // ── CURRENT Tab
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
                    imagePath: 'assets/images/searching.png',
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
                    imagePath: 'assets/images/searching.png',
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
                    imagePath: 'assets/images/searching.png',
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
  final String? imagePath;
  final IconData? icon;
  const _EmptyState({required this.message, this.imagePath, this.icon});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (imagePath != null)
            FloatingMascot(imagePath: imagePath!, height: 160)
          else if (icon != null)
            Icon(icon, size: 56, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(color: Colors.grey[400], fontSize: 16, fontWeight: FontWeight.w500),
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
