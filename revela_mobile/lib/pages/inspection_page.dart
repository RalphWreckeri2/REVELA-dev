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
  String _selectedHistoryStatus = 'All';
  String _selectedHistoryResult = 'All';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  bool _showHistoryFilters = false;
  bool _loadingCurrent = true;
  bool _loadingHistory = true;

  List<String> get _availableHistoryStatuses {
    final statuses = _historyTasks.map((t) => t.verificationStatus).toSet().toList();
    statuses.sort();
    return ['All', ...statuses];
  }

  List<String> get _availableHistoryResults {
    final results = _historyTasks.map((t) => t.inspectionResult ?? 'Pending').toSet().toList();
    results.sort();
    return ['All', ...results];
  }

  String _formatResult(String result) {
    switch (result) {
      case 'Green': return 'Registered';
      case 'Yellow': return 'Suspected / Needs Verification';
      case 'Orange': return 'Warned / Non-Compliant';
      case 'Red': return 'Unregistered';
      case 'Black': return 'Closed / Blacklisted';
      default: return result;
    }
  }

  List<InspectionTask> get _filteredCurrentTasks {
    if (_searchQuery.isEmpty) return _currentTasks;
    final q = _searchQuery.toLowerCase();
    return _currentTasks.where((t) => t.detectedName.toLowerCase().contains(q) || t.barangayName.toLowerCase().contains(q)).toList();
  }

  List<InspectionTask> get _filteredMissingTasks {
    if (_searchQuery.isEmpty) return _missingTasks;
    final q = _searchQuery.toLowerCase();
    return _missingTasks.where((t) => t.detectedName.toLowerCase().contains(q) || t.barangayName.toLowerCase().contains(q)).toList();
  }

  List<InspectionTask> get _filteredHistoryTasks {
    final q = _searchQuery.toLowerCase();
    return _historyTasks.where((t) {
      final matchesStatus = _selectedHistoryStatus == 'All' || t.verificationStatus == _selectedHistoryStatus;
      final matchesResult = _selectedHistoryResult == 'All' || (t.inspectionResult ?? 'Pending') == _selectedHistoryResult;
      final matchesSearch = q.isEmpty || t.detectedName.toLowerCase().contains(q) || t.barangayName.toLowerCase().contains(q);
      return matchesStatus && matchesResult && matchesSearch;
    }).toList();
  }
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
    _searchController.dispose();
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
          if (_selectedHistoryStatus != 'All' &&
              !_historyTasks.any((t) => t.verificationStatus == _selectedHistoryStatus)) {
            _selectedHistoryStatus = 'All';
          }
          if (_selectedHistoryResult != 'All' &&
              !_historyTasks.any((t) => (t.inspectionResult ?? 'Pending') == _selectedHistoryResult)) {
            _selectedHistoryResult = 'All';
          }
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

  Widget _buildHistoryFilter(BuildContext context) {
    final statuses = _availableHistoryStatuses;
    final results = _availableHistoryResults;
    final hasStatusFilter = statuses.length > 1;
    final hasResultFilter = results.length > 1;

    if (!hasStatusFilter && !hasResultFilter) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.adaptiveSurface,
          borderRadius: BorderRadius.circular(16),
          border: context.isDarkMode ? Border.all(color: Colors.grey.shade800) : Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Filters', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: context.adaptiveTextDark)),
                if (_selectedHistoryStatus != 'All' || _selectedHistoryResult != 'All')
                  GestureDetector(
                    onTap: () {
                      if (mounted) {
                        setState(() {
                          _selectedHistoryStatus = 'All';
                          _selectedHistoryResult = 'All';
                        });
                      }
                    },
                    child: Text('Clear', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: context.adaptivePrimary)),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                if (hasStatusFilter)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Status', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    Container(
                      height: 36,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: context.isDarkMode ? Colors.grey[800] : Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          value: _selectedHistoryStatus,
                          icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.grey, size: 18),
                          style: TextStyle(color: context.adaptiveTextDark, fontSize: 13, fontWeight: FontWeight.w600),
                          dropdownColor: context.adaptiveSurface,
                          onChanged: (String? newValue) {
                            if (newValue != null && mounted) {
                              setState(() => _selectedHistoryStatus = newValue);
                            }
                          },
                          items: statuses.map<DropdownMenuItem<String>>((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Text(value == 'All' ? 'All Statuses' : value, overflow: TextOverflow.ellipsis),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            if (hasStatusFilter && hasResultFilter)
              const SizedBox(width: 12),
            if (hasResultFilter)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Result', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    Container(
                      height: 36,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: context.isDarkMode ? Colors.grey[800] : Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          value: _selectedHistoryResult,
                          icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.grey, size: 18),
                          style: TextStyle(color: context.adaptiveTextDark, fontSize: 13, fontWeight: FontWeight.w600),
                          dropdownColor: context.adaptiveSurface,
                          onChanged: (String? newValue) {
                            if (newValue != null && mounted) {
                              setState(() => _selectedHistoryResult = newValue);
                            }
                          },
                          items: results.map<DropdownMenuItem<String>>((String value) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Text(value == 'All' ? 'All Results' : _formatResult(value), overflow: TextOverflow.ellipsis),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
            ),
          ],
        ),
      ),
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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: context.isDarkMode ? Colors.grey[800] : Colors.grey[100],
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Icon(Icons.search, color: Colors.grey),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) {
                          setState(() {
                            _searchQuery = val;
                          });
                        },
                        style: TextStyle(color: context.adaptiveTextDark),
                        decoration: InputDecoration(
                          hintText: 'Search establishments or barangay...',
                          hintStyle: TextStyle(color: Colors.grey),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                    if (_searchQuery.isNotEmpty)
                      GestureDetector(
                        onTap: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                          });
                        },
                        child: Icon(Icons.close, color: Colors.grey, size: 20),
                      ),
                    if (_currentFilterIndex == 2) ...[
                      const SizedBox(width: 12),
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _showHistoryFilters = !_showHistoryFilters;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: _showHistoryFilters ? context.adaptivePrimary.withOpacity(0.1) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.tune_rounded, 
                            color: _showHistoryFilters ? context.adaptivePrimary : Colors.grey, 
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
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
                : _filteredCurrentTasks.isEmpty
                ? const _EmptyState(
                    message: 'No current assignments.',
                    imagePath: 'assets/images/searching.png',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: _filteredCurrentTasks.length,
                    itemBuilder: (_, i) => TaskCard(
                      task: _filteredCurrentTasks[i],
                      isCurrent: true,
                      onTap: () => _onCurrentTaskTap(_filteredCurrentTasks[i]),
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
                : _filteredMissingTasks.isEmpty
                ? const _EmptyState(
                    message: 'No missing assignments.',
                    imagePath: 'assets/images/searching.png',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: _filteredMissingTasks.length,
                    itemBuilder: (_, i) => TaskCard(
                      task: _filteredMissingTasks[i],
                      isCurrent: true,
                      isMissing: true,
                      onTap: () => _onCurrentTaskTap(_filteredMissingTasks[i]),
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
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_showHistoryFilters)
                        _buildHistoryFilter(context),
                      Expanded(
                        child: _filteredHistoryTasks.isEmpty
                            ? const _EmptyState(
                                message: 'No history matches the selected filter.',
                                imagePath: 'assets/images/searching.png',
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.all(20),
                                itemCount: _filteredHistoryTasks.length,
                                itemBuilder: (_, i) => TaskCard(
                                  task: _filteredHistoryTasks[i],
                                  isCurrent: false,
                                  onTap: () => _onHistoryTaskTap(_filteredHistoryTasks[i]),
                                ),
                              ),
                      ),
                    ],
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
