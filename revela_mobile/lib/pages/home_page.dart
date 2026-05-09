import 'package:flutter/material.dart';
import '../component/app_sidebar.dart';
import '../component/inspection_card.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isDockerExpanded = false;
  bool _isFirstLoad = true;
  String _sortBy = 'newest'; // 'newest' or 'oldest'

  // ── Real data ──────────────────────────────────────────────────────────────
  List<InspectionTask> _tasks = [];
  bool _loadingTasks = true;
  String? _taskError;

  List<InspectionTask> get _sortedTasks {
    final sorted = List<InspectionTask>.from(_tasks);
    sorted.sort((a, b) {
      final dtA = DateTime.tryParse(a.irTimestamp) ?? DateTime(0);
      final dtB = DateTime.tryParse(b.irTimestamp) ?? DateTime(0);
      return _sortBy == 'newest' ? dtB.compareTo(dtA) : dtA.compareTo(dtB);
    });
    return sorted;
  }

  @override
  void initState() {
    super.initState();
    _fetchTasks();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 400), () {
        if (mounted) setState(() => _isDockerExpanded = true);
      });
    });
  }

  Future<void> _fetchTasks() async {
    setState(() {
      _loadingTasks = true;
      _taskError = null;
    });
    try {
      final tasks = await InspectionService().getMyTasks();
      if (mounted) {
        setState(() {
          _tasks = tasks;
          _loadingTasks = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _taskError = 'Failed to load tasks.';
          _loadingTasks = false;
        });
      }
    }
  }

  void _toggleDocker() {
    setState(() {
      _isDockerExpanded = !_isDockerExpanded;
      if (!_isDockerExpanded) _isFirstLoad = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    double screenHeight = MediaQuery.of(context).size.height;

    return Scaffold(
      drawer: const AppSidebar(),
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Builder(
          builder: (context) => Padding(
            padding: const EdgeInsets.all(8.0),
            child: FloatingActionButton(
              mini: true,
              backgroundColor: Colors.white,
              onPressed: () => Scaffold.of(context).openDrawer(),
              child: const Icon(Icons.menu, color: AppColors.darkGreen),
            ),
          ),
        ),
        actions: [
          // Refresh button
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FloatingActionButton(
              mini: true,
              backgroundColor: Colors.white,
              heroTag: 'refresh',
              onPressed: _loadingTasks ? null : _fetchTasks,
              child: _loadingTasks
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.darkGreen,
                      ),
                    )
                  : const Icon(Icons.refresh, color: AppColors.darkGreen),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // 1. Map placeholder
          Container(
            color: Colors.grey[200],
            child: const Center(child: Text("Geospatial Map View")),
          ),

          // 2. Animated Docker
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: AnimatedSlide(
              duration: const Duration(milliseconds: 500),
              curve: Curves.easeInOutQuart,
              offset: _isDockerExpanded ? Offset.zero : const Offset(0, 1.2),
              child: ConstrainedBox(
                constraints: BoxConstraints(maxHeight: screenHeight * 0.8),
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(32),
                    ),
                    boxShadow: [
                      BoxShadow(blurRadius: 20, color: Colors.black26),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 12),
                      // Handle
                      Container(
                        width: 40,
                        height: 5,
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),

                      Flexible(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      _isFirstLoad
                                          ? "Saan ang Sinsay?"
                                          : "My Assignments",
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  // Task count badge
                                  if (!_loadingTasks && _tasks.isNotEmpty)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.darkGreen.withOpacity(
                                          0.1,
                                        ),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        '${_tasks.length} task${_tasks.length != 1 ? 's' : ''}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.darkGreen,
                                        ),
                                      ),
                                    ),
                                  // Sort toggle
                                  if (!_loadingTasks && _tasks.isNotEmpty) ...[
                                    const SizedBox(width: 8),
                                    GestureDetector(
                                      onTap: () => setState(
                                        () => _sortBy = _sortBy == 'newest'
                                            ? 'oldest'
                                            : 'newest',
                                      ),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              _sortBy == 'newest'
                                                  ? Icons.arrow_downward_rounded
                                                  : Icons.arrow_upward_rounded,
                                              size: 12,
                                              color: const Color(0xFF64748B),
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              _sortBy == 'newest'
                                                  ? 'Newest'
                                                  : 'Oldest',
                                              style: const TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                                color: Color(0xFF64748B),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                  IconButton(
                                    icon: const Icon(Icons.close_rounded),
                                    onPressed: _toggleDocker,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // Task list
                              Flexible(
                                child: _loadingTasks
                                    ? const Padding(
                                        padding: EdgeInsets.symmetric(
                                          vertical: 32,
                                        ),
                                        child: Center(
                                          child: CircularProgressIndicator(
                                            color: AppColors.darkGreen,
                                          ),
                                        ),
                                      )
                                    : _taskError != null
                                    ? Padding(
                                        padding: const EdgeInsets.symmetric(
                                          vertical: 32,
                                        ),
                                        child: Center(
                                          child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              const Icon(
                                                Icons.wifi_off,
                                                color: Colors.grey,
                                                size: 40,
                                              ),
                                              const SizedBox(height: 12),
                                              Text(
                                                _taskError!,
                                                style: const TextStyle(
                                                  color: Colors.grey,
                                                ),
                                              ),
                                              const SizedBox(height: 12),
                                              TextButton(
                                                onPressed: _fetchTasks,
                                                child: const Text('Retry'),
                                              ),
                                            ],
                                          ),
                                        ),
                                      )
                                    : _tasks.isEmpty
                                    ? Padding(
                                        padding: const EdgeInsets.symmetric(
                                          vertical: 32,
                                        ),
                                        child: Center(
                                          child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Icon(
                                                Icons.check_circle_outline,
                                                color: Colors.grey[400],
                                                size: 48,
                                              ),
                                              const SizedBox(height: 12),
                                              Text(
                                                'No assignments yet.',
                                                style: TextStyle(
                                                  color: Colors.grey[500],
                                                  fontSize: 14,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      )
                                    : RefreshIndicator(
                                        color: AppColors.darkGreen,
                                        onRefresh: _fetchTasks,
                                        child: ListView.builder(
                                          shrinkWrap: true,
                                          padding: EdgeInsets.zero,
                                          physics:
                                              const AlwaysScrollableScrollPhysics(),
                                          itemCount: _sortedTasks.length,
                                          itemBuilder: (context, index) =>
                                              InspectionCard(
                                                task: _sortedTasks[index],
                                                onTap: () {
                                                  // TODO: open inspection detail/submit page
                                                },
                                              ),
                                        ),
                                      ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // 3. Floating button when docker is closed
          if (!_isDockerExpanded)
            Positioned(
              bottom: 40,
              left: 24,
              right: 24,
              child: SizedBox(
                height: 56,
                child: ElevatedButton(
                  onPressed: _toggleDocker,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.darkGreen,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        "Inspection Tasks",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.2,
                        ),
                      ),
                      // Show count on button when docker is closed
                      if (!_loadingTasks && _tasks.isNotEmpty) ...[
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${_tasks.length}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
