import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../component/inspection_modal.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';
import '../widgets/task_card.dart';
import '../widgets/custom_app_bar.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'inspection_page.dart';

class DashboardPage extends StatefulWidget {
  final ValueChanged<bool>? onDrawerToggled;
  final ValueChanged<int>? onSwitchTab;
  const DashboardPage({super.key, this.onDrawerToggled, this.onSwitchTab});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final PageController _pageController = PageController(viewportFraction: 1.0);
  double _currentPage = 0.0;
  final InspectionService _inspectionService = InspectionService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  String _inspectorName = 'Inspector';
  String _inspectorRole = 'BPLO Field Inspector';
  bool _isLoading = true;
  List<InspectionTask> _activeTasks = [];
  List<InspectionTask> _historyTasks = [];
  bool _isDrawerOpen = false;

  @override
  void initState() {
    super.initState();
    _pageController.addListener(() {
      if (_pageController.hasClients && _pageController.positions.length == 1 && _pageController.position.haveDimensions) {
        setState(() {
          _currentPage = _pageController.page!;
        });
      }
    });
    _loadDashboardData();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _openTask(InspectionTask task) async {
    if (_isDrawerOpen) return;
    setState(() => _isDrawerOpen = true);
    widget.onDrawerToggled?.call(true);

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          InspectionModal(task: task, onSubmitted: _loadDashboardData),
    );

    widget.onDrawerToggled?.call(false);
    if (mounted) setState(() => _isDrawerOpen = false);
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }

  Future<void> _loadDashboardData({bool silent = false}) async {
    setState(() => _isLoading = true);
    try {
      final name =
          await _storage.read(key: 'user_fullName') ?? 'Field Inspector';
      final role =
          await _storage.read(key: 'user_role') ?? 'BPLO Field Inspector';

      final active = await _inspectionService.getMyTasks();
      final history = await _inspectionService.getMyReportHistory();

      if (mounted) {
        setState(() {
          _inspectorName = name;
          _inspectorRole = role;
          _activeTasks = active;
          _historyTasks = history;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final int assignedCount = _activeTasks.length;
    final int redFlagsCount = _activeTasks
        .where((t) => t.flagColor.toLowerCase() == 'red')
        .length;
    final int yellowFlagsCount = _activeTasks
        .where((t) => t.flagColor.toLowerCase() == 'yellow')
        .length;
    final int greenFlagsCount = _activeTasks
        .where((t) => t.flagColor.toLowerCase() == 'green')
        .length;
    final int submittedCount = _historyTasks
        .where((t) => t.verificationStatus.toLowerCase() == 'submitted')
        .length;
    final int verifiedCount = _historyTasks
        .where((t) => t.verificationStatus.toLowerCase() == 'verified')
        .length;

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: CustomAppBar(
        title: 'Dashboard',
        icon: Icons.dashboard_rounded,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: IconButton(
              icon: Icon(
                Icons.refresh_rounded,
                color: context.adaptiveTextMid,
                size: 26,
              ),
              onPressed: _isLoading ? null : _loadDashboardData,
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: () async => _loadDashboardData(),
                    color: AppColors.gold,
                    backgroundColor: context.adaptiveSurface,
                    child: _isLoading
                        ? ListView.builder(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16.0,
                              vertical: 20.0,
                            ),
                            itemCount: 4,
                            itemBuilder: (context, index) => Padding(
                              padding: const EdgeInsets.only(bottom: 16.0),
                              child: Shimmer.fromColors(
                                baseColor: context.isDarkMode
                                    ? Colors.grey[800]!
                                    : Colors.grey[300]!,
                                highlightColor: context.isDarkMode
                                    ? Colors.grey[700]!
                                    : Colors.grey[100]!,
                                child: Container(
                                  height: index == 0 ? 100 : 160,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(24),
                                  ),
                                ),
                              ),
                            ),
                          )
                        : SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16.0,
                              vertical: 0.0,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // ── Modern Welcome Banner ──
                                SizedBox(
                                  height: 280,
                                  child: Stack(
                                    clipBehavior: Clip.none,
                                    children: [
                                      Container(
                                        margin: const EdgeInsets.only(top: 60, bottom: 20),
                                        width: double.infinity,
                                        child: PageView.builder(
                                          controller: _pageController,
                                          itemCount: 3,
                                          itemBuilder: (context, index) {
                                            return AnimatedBuilder(
                                              animation: _pageController,
                                              builder: (context, child) {
                                                double page = _pageController.hasClients && _pageController.positions.length == 1 && _pageController.position.haveDimensions 
                                                    ? _pageController.page! 
                                                    : _currentPage;
                                                double value = 1 - ((page - index).abs() * 0.15);
                                                value = value.clamp(0.85, 1.0);
                                                double opacity = 1 - ((page - index).abs() * 0.5);
                                                opacity = opacity.clamp(0.4, 1.0);
                                                return Transform.scale(
                                                  scale: value,
                                                  child: Opacity(
                                                    opacity: opacity,
                                                    child: child,
                                                  ),
                                                );
                                              },
                                              child: index == 0 ? _buildBannerCard(
                                                child: Padding(
                                                  padding: const EdgeInsets.all(24.0),
                                                  child: Row(
                                                    children: [
                                                      Container(
                                                        decoration: BoxDecoration(
                                                          shape: BoxShape.circle,
                                                          border: Border.all(
                                                            color: Colors.white,
                                                            width: 2,
                                                          ),
                                                          boxShadow: [
                                                            BoxShadow(
                                                              color: AppColors.gold.withValues(alpha: 0.4),
                                                              blurRadius: 20,
                                                              spreadRadius: 8,
                                                            ),
                                                          ],
                                                        ),
                                                        child: CircleAvatar(
                                                          radius: 32,
                                                          backgroundColor: AppColors.gold,
                                                          child: Text(
                                                            _inspectorName.isNotEmpty ? _inspectorName[0].toUpperCase() : 'I',
                                                            style: const TextStyle(
                                                              fontSize: 28,
                                                              fontWeight: FontWeight.w500,
                                                              color: Color(0xFF0F3E22),
                                                            ),
                                                          ),
                                                        ),
                                                      ),
                                                      const SizedBox(width: 20),
                                                      Expanded(
                                                        child: Column(
                                                          crossAxisAlignment: CrossAxisAlignment.start,
                                                          mainAxisAlignment: MainAxisAlignment.center,
                                                          children: [
                                                            Text(
                                                              _getGreeting(),
                                                              style: TextStyle(
                                                                color: Colors.white.withValues(alpha: 0.7),
                                                                fontSize: 14,
                                                                fontWeight: FontWeight.w500,
                                                                letterSpacing: 0.5,
                                                              ),
                                                            ),
                                                            const SizedBox(height: 4),
                                                            Text(
                                                              _inspectorName,
                                                              style: const TextStyle(
                                                                color: Colors.white,
                                                                fontSize: 24,
                                                                fontWeight: FontWeight.bold,
                                                              ),
                                                              maxLines: 1,
                                                              overflow: TextOverflow.ellipsis,
                                                            ),
                                                            const SizedBox(height: 12),
                                                            Container(
                                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                                              decoration: BoxDecoration(
                                                                color: Colors.white.withValues(alpha: 0.15),
                                                                borderRadius: BorderRadius.circular(12),
                                                                border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                                                              ),
                                                              child: Row(
                                                                mainAxisSize: MainAxisSize.min,
                                                                children: [
                                                                  const Icon(Icons.verified, color: AppColors.gold, size: 16),
                                                                  const SizedBox(width: 6),
                                                                  Container(
                                                                    width: 4,
                                                                    height: 4,
                                                                    decoration: BoxDecoration(
                                                                      color: Colors.white.withValues(alpha: 0.5),
                                                                      shape: BoxShape.circle,
                                                                    ),
                                                                  ),
                                                                  const SizedBox(width: 6),
                                                                  Text(
                                                                    _inspectorRole,
                                                                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
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
                                              ) : index == 1 ? _buildBannerCard(
                                                child: Padding(
                                                  padding: const EdgeInsets.all(24.0),
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    mainAxisAlignment: MainAxisAlignment.center,
                                                    children: [
                                                      Text(
                                                        "Today's Focus",
                                                        style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: 0.5),
                                                      ),
                                                      const SizedBox(height: 4),
                                                      Text(
                                                        redFlagsCount > 0 ? 'Prioritize ${redFlagsCount} red flags' : 'You have ${assignedCount} pending tasks',
                                                        style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                                                        maxLines: 2, overflow: TextOverflow.ellipsis,
                                                      ),
                                                      const SizedBox(height: 12),
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                                                        child: Row(
                                                          mainAxisSize: MainAxisSize.min,
                                                          children: [
                                                            const Icon(Icons.bolt_rounded, color: AppColors.gold, size: 14),
                                                            const SizedBox(width: 6),
                                                            const Text('Stay safe on the field', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                                                          ],
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ) : _buildBannerCard(
                                                child: Padding(
                                                  padding: const EdgeInsets.all(24.0),
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    mainAxisAlignment: MainAxisAlignment.center,
                                                    children: [
                                                      Text(
                                                        'Quick Tip',
                                                        style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: 0.5),
                                                      ),
                                                      const SizedBox(height: 4),
                                                      const Text(
                                                        'Ensure clear photos of all violations.',
                                                        style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                                                        maxLines: 2, overflow: TextOverflow.ellipsis,
                                                      ),
                                                      const SizedBox(height: 12),
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                                                        child: Row(
                                                          mainAxisSize: MainAxisSize.min,
                                                          children: [
                                                            const Icon(Icons.lightbulb_rounded, color: AppColors.gold, size: 14),
                                                            const SizedBox(width: 6),
                                                            const Text('Documentation is key', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                                                          ],
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ),
                                            );
                                          },
                                        ),
                                      ),
                                      // Page Indicators
                                      Positioned(
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: List.generate(3, (index) {
                                            return AnimatedContainer(
                                              duration: const Duration(milliseconds: 300),
                                              margin: const EdgeInsets.symmetric(horizontal: 4),
                                              width: _currentPage.round() == index ? 24.0 : 8.0,
                                              height: 8.0,
                                              decoration: BoxDecoration(
                                                color: _currentPage.round() == index 
                                                    ? AppColors.gold 
                                                    : Colors.grey.withValues(alpha: 0.4),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                            );
                                          }),
                                        ),
                                      ),
                                      // Mascot Peaking Above Banner — moves left → center → right across the 3 cards
                                      Positioned(
                                        top: -30,
                                        left: 24,
                                        right: 24,
                                        child: AnimatedBuilder(
                                          animation: _pageController,
                                          builder: (context, child) {
                                            double page = 0.0;
                                            if (_pageController.hasClients && _pageController.positions.length == 1 && _pageController.position.haveDimensions) {
                                              page = _pageController.page ?? _currentPage;
                                            } else {
                                              page = _currentPage;
                                            }
                                            // page 0 -> -1.0 (left), page 1 -> 0.0 (center), page 2 -> 1.0 (right)
                                            final double x = (page - 1.0) * 0.85;
                                            return Align(
                                              alignment: Alignment(x, -1.0),
                                              child: child,
                                            );
                                          },
                                          // Fixed-width box so Align has a definite size to position against —
                                          // this is what stops the mascot from clipping oddly at the left/right extremes.
                                          child: SizedBox(
                                            width: 140,
                                            child: ClipRect(
                                              child: Align(
                                                alignment: Alignment.topCenter,
                                                heightFactor: 0.5,
                                                child: Image.asset(
                                                  'assets/images/standing.png',
                                                  height: 180,
                                                  fit: BoxFit.contain,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ).animate().fadeIn(duration: 500.ms).slideX(begin: -0.05),
                                ),
                                const SizedBox(height: 24),

                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      'Overall Progress',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: context.adaptiveTextDark,
                                      ),
                                    ),
                                    Builder(
                                      builder: (context) {
                                        final realTotal =
                                            assignedCount +
                                            submittedCount +
                                            verifiedCount;
                                        return Text(
                                          '$realTotal Total Assignments',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: context.adaptiveTextMid,
                                          ),
                                        );
                                      },
                                    ),
                                  ],
                                ).animate().fadeIn(delay: 100.ms),
                                const SizedBox(height: 16),
                                Builder(
                                      builder: (context) {
                                        int total =
                                            assignedCount +
                                            submittedCount +
                                            verifiedCount;
                                        if (total == 0)
                                          total = 1; // prevent division by zero
                                        return Column(
                                          children: [
                                            Container(
                                              height: 18,
                                              width: double.infinity,
                                              clipBehavior: Clip.antiAlias,
                                              decoration: BoxDecoration(
                                                color: context.isDarkMode
                                                    ? Colors.grey[800]
                                                    : Colors.grey[200],
                                                borderRadius:
                                                    BorderRadius.circular(9),
                                              ),
                                              child: Row(
                                                children: [
                                                  if (verifiedCount > 0)
                                                    Expanded(
                                                      flex: verifiedCount,
                                                      child: Container(
                                                        color:
                                                            AppColors.darkGreen,
                                                      ),
                                                    ),
                                                  if (submittedCount > 0)
                                                    Expanded(
                                                      flex: submittedCount,
                                                      child: Container(
                                                        color: AppColors.gold,
                                                      ),
                                                    ),
                                                  if (assignedCount > 0)
                                                    Expanded(
                                                      flex: assignedCount,
                                                      child: Container(
                                                        color: Colors.grey[400],
                                                      ),
                                                    ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(height: 12),
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                _buildProgressLegend(
                                                  'Verified',
                                                  verifiedCount,
                                                  AppColors.darkGreen,
                                                ),
                                                _buildProgressLegend(
                                                  'Submitted',
                                                  submittedCount,
                                                  AppColors.gold,
                                                ),
                                                _buildProgressLegend(
                                                  'Assigned',
                                                  assignedCount,
                                                  Colors.grey[400]!,
                                                ),
                                              ],
                                            ),
                                          ],
                                        );
                                      },
                                    )
                                    .animate()
                                    .fadeIn(delay: 200.ms)
                                    .slideY(begin: 0.1),
                                const SizedBox(height: 32),

                                // ── Metrics Grid ──
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Flag Reports',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: context.adaptiveTextDark,
                                      ),
                                    ),
                                  ],
                                ).animate().fadeIn(delay: 300.ms),
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    Expanded(
                                      child: redFlagsCount > 0
                                          ? _buildGlassMetricCard(
                                                  'Red Flags',
                                                  '$redFlagsCount',
                                                  Icons.flag_rounded,
                                                  Colors.red,
                                                  isZero: false,
                                                )
                                                .animate()
                                                .boxShadow(
                                                  begin: BoxShadow(
                                                    color: Colors.red
                                                        .withValues(alpha: 0.2),
                                                    blurRadius: 10,
                                                  ),
                                                  end: BoxShadow(
                                                    color: Colors.red
                                                        .withValues(alpha: 0.2),
                                                    blurRadius: 20,
                                                  ),
                                                )
                                                .fadeIn(delay: 350.ms)
                                                .scale(
                                                  begin: const Offset(
                                                    0.95,
                                                    0.95,
                                                  ),
                                                )
                                          : _buildGlassMetricCard(
                                                  'Red Flags',
                                                  '0',
                                                  Icons.flag_rounded,
                                                  Colors.red,
                                                  isZero: true,
                                                )
                                                .animate()
                                                .fadeIn(delay: 350.ms)
                                                .scale(
                                                  begin: const Offset(
                                                    0.95,
                                                    0.95,
                                                  ),
                                                ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child:
                                          _buildGlassMetricCard(
                                                'Yellow Flags',
                                                '$yellowFlagsCount',
                                                Icons.flag_rounded,
                                                Colors.orange,
                                                isZero: yellowFlagsCount == 0,
                                              )
                                              .animate()
                                              .fadeIn(delay: 400.ms)
                                              .scale(
                                                begin: const Offset(0.95, 0.95),
                                              ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child:
                                          _buildGlassMetricCard(
                                                'Green Flags',
                                                '$greenFlagsCount',
                                                Icons.flag_rounded,
                                                Colors.green,
                                                isZero: greenFlagsCount == 0,
                                              )
                                              .animate()
                                              .fadeIn(delay: 450.ms)
                                              .scale(
                                                begin: const Offset(0.95, 0.95),
                                              ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 32),

                                // ── Recent Active Tasks ──
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Recent Assignments',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: context.adaptiveTextDark,
                                      ),
                                    ),
                                    InkWell(
                                      onTap: () {
                                        if (widget.onSwitchTab != null) {
                                          widget.onSwitchTab!(2);
                                        } else {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) =>
                                                  const InspectionPage(),
                                            ),
                                          );
                                        }
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppColors.gold.withValues(
                                            alpha: 0.15,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            20,
                                          ),
                                        ),
                                        child: const Text(
                                          'View All',
                                          style: TextStyle(
                                            color: Color(0xFFC79200),
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ).animate().fadeIn(delay: 500.ms),
                                const SizedBox(height: 16),

                                if (_activeTasks.isEmpty)
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 40,
                                    ),
                                    decoration: BoxDecoration(
                                      color: context.adaptiveSurface,
                                      borderRadius: BorderRadius.circular(24),
                                      border: Border.all(
                                        color: context.isDarkMode
                                            ? Colors.grey.shade800
                                            : Colors.grey.shade200,
                                      ),
                                    ),
                                    child: Column(
                                      children: [
                                        Icon(
                                          Icons.check_circle_outline_rounded,
                                          size: 64,
                                          color: Colors.grey.withValues(
                                            alpha: 0.5,
                                          ),
                                        ),
                                        const SizedBox(height: 16),
                                        Text(
                                          "You're all caught up!",
                                          style: TextStyle(
                                            color: context.adaptiveTextMid,
                                            fontSize: 16,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ).animate().fadeIn(delay: 600.ms)
                                else
                                  ListView.builder(
                                    itemCount: _activeTasks.length > 5
                                        ? 5
                                        : _activeTasks.length,
                                    shrinkWrap: true,
                                    physics:
                                        const NeverScrollableScrollPhysics(),
                                    itemBuilder: (ctx, index) {
                                      final task = _activeTasks[index];
                                      return TaskCard(
                                            task: task,
                                            isCurrent: true,
                                            onTap: () => _openTask(task),
                                          )
                                          .animate()
                                          .fadeIn(
                                            delay: Duration(
                                              milliseconds: 600 + (index * 100),
                                            ),
                                          )
                                          .slideX(begin: 0.05);
                                    },
                                  ),
                              ],
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGlassMetricCard(
    String title,
    String value,
    IconData icon,
    Color color, {
    bool isZero = false,
  }) {
    final effectiveColor = isZero ? Colors.grey : color;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: context.adaptiveSurface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: context.isDarkMode
              ? Colors.grey.shade800
              : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: effectiveColor.withValues(alpha: isZero ? 0.05 : 0.1),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: effectiveColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: effectiveColor, size: 24),
          ),
          const SizedBox(height: 16),
          Text(
            value,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: isZero ? Colors.grey[400] : context.adaptiveTextDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: context.adaptiveTextMid,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBannerCard({required Widget child}) {
    return Container(
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFF2A5934),
            Color(0xFF3B7243),
          ],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2A5934).withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Grid overlay
          Positioned.fill(
            child: CustomPaint(
              painter: _GridPainter(),
            ),
          ),
          child,
        ],
      ),
    );
  }

Widget _buildProgressLegend(String label, int value, Color color) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          '$value $label',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: context.adaptiveTextMid,
          ),
        ),
      ],
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.05)
      ..strokeWidth = 1.0;

    const double spacing = 30.0;

    for (double i = 0; i < size.width; i += spacing) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), paint);
    }

    for (double i = 0; i < size.height; i += spacing) {
      canvas.drawLine(Offset(0, i), Offset(size.width, i), paint);
    }

    final plusPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.15)
      ..strokeWidth = 1.5;

    const double plusSize = 4.0;

    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawLine(Offset(x - plusSize / 2, y), Offset(x + plusSize / 2, y), plusPaint);
        canvas.drawLine(Offset(x, y - plusSize / 2), Offset(x, y + plusSize / 2), plusPaint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}