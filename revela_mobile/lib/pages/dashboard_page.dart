import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:flutter/services.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../component/inspection_modal.dart';
import '../component/notifications_panel.dart';
import '../service/inspection_service.dart';
import '../service/flag_service.dart';
import '../theme/app_theme.dart';
import '../widgets/task_card.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'inspection_page.dart';
import '../service/in_app_notifications_service.dart';
import '../component/inspection_modal.dart';

class DashboardPage extends StatefulWidget {
  final ValueChanged<bool>? onDrawerToggled;
  const DashboardPage({super.key, this.onDrawerToggled});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final InspectionService _inspectionService = InspectionService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  String _inspectorName = 'Inspector';
  String _inspectorRole = 'BPLO Field Inspector';
  bool _isLoading = true;
  List<InspectionTask> _activeTasks = [];
  List<InspectionTask> _historyTasks = [];
  List<MyFlag> _myFlags = [];
  String? _errorMsg;
  int _unreadCount = 0;
  bool _isDrawerOpen = false;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
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
      final name = await _storage.read(key: 'user_fullName') ?? 'Field Inspector';
      final role = await _storage.read(key: 'user_role') ?? 'BPLO Field Inspector';
      
      final active = await _inspectionService.getMyTasks();
      final history = await _inspectionService.getMyReportHistory();
      final flags = await FlagService().fetchMyYellowFlags();
      final unread = await InAppNotificationsService().fetchUnreadCount();

      if (mounted) {
        setState(() {
          _inspectorName = name;
          _inspectorRole = role;
          _activeTasks = active;
          _historyTasks = history;
          _myFlags = flags;
          _unreadCount = unread;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMsg = 'Failed to load dashboard metrics';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final int assignedCount = _activeTasks.length;
    final int redFlagsCount = _activeTasks.where((t) => t.flagColor.toLowerCase() == 'red').length;
    final int yellowFlagsCount = _activeTasks.where((t) => t.flagColor.toLowerCase() == 'yellow').length;
    final int greenFlagsCount = _activeTasks.where((t) => t.flagColor.toLowerCase() == 'green').length;
    final int submittedCount = _historyTasks.where((t) => t.verificationStatus.toLowerCase() == 'submitted').length;
    final int verifiedCount = _historyTasks.where((t) => t.verificationStatus.toLowerCase() == 'verified').length;

    return Scaffold(
      backgroundColor: context.adaptiveBackground,
      appBar: AppBar(
        title: Text('Dashboard', style: TextStyle(fontWeight: FontWeight.bold, color: context.adaptiveTextDark)),
        backgroundColor: context.adaptiveSurface,
        elevation: 0,
        actions: [

          IconButton(
            icon: Icon(Icons.refresh_rounded, color: context.adaptivePrimary),
            onPressed: _loadDashboardData,
            tooltip: 'Refresh Dashboard',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboardData,
        color: AppColors.gold,
        backgroundColor: context.adaptiveSurface,
        child: _isLoading
            ? ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
                itemCount: 4,
                itemBuilder: (context, index) => Padding(
                  padding: const EdgeInsets.only(bottom: 16.0),
                  child: Shimmer.fromColors(
                    baseColor: context.isDarkMode ? Colors.grey[800]! : Colors.grey[300]!,
                    highlightColor: context.isDarkMode ? Colors.grey[700]! : Colors.grey[100]!,
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
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Modern Welcome Banner ──
                    Container(
                      width: double.infinity,
                      clipBehavior: Clip.antiAlias,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF0F172A).withValues(alpha: 0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Stack(
                        children: [
                          // Background pattern/circles
                          Positioned(
                            right: -30,
                            top: -30,
                            child: Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white.withValues(alpha: 0.05),
                              ),
                            ),
                          ),
                          Positioned(
                            right: 40,
                            bottom: -40,
                            child: Container(
                              width: 100,
                              height: 100,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white.withValues(alpha: 0.05),
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppColors.gold.withValues(alpha: 0.5), width: 2),
                                  ),
                                  child: CircleAvatar(
                                    radius: 32,
                                    backgroundColor: AppColors.gold,
                                    child: Text(
                                      _inspectorName.isNotEmpty ? _inspectorName[0].toUpperCase() : 'I',
                                      style: const TextStyle(
                                        fontSize: 28,
                                        fontWeight: FontWeight.w900,
                                        color: Color(0xFF0F3E22),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 20),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
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
                                          color: Colors.white.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(Icons.verified_user_rounded, color: AppColors.gold, size: 14),
                                            const SizedBox(width: 6),
                                            Text(
                                              _inspectorRole,
                                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
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
                        ],
                      ),
                    ).animate().fadeIn(duration: 500.ms).slideX(begin: -0.05),
                    const SizedBox(height: 32),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Overall Progress',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.adaptiveTextDark),
                        ),
                        Builder(
                          builder: (context) {
                            final realTotal = assignedCount + submittedCount + verifiedCount;
                            return Text(
                              '$realTotal Total Assignments',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: context.adaptiveTextMid),
                            );
                          }
                        ),
                      ],
                    ).animate().fadeIn(delay: 100.ms),
                    const SizedBox(height: 16),
                    Builder(
                      builder: (context) {
                        int total = assignedCount + submittedCount + verifiedCount;
                        if (total == 0) total = 1; // prevent division by zero
                        return Column(
                          children: [
                            Container(
                              height: 18,
                              width: double.infinity,
                              clipBehavior: Clip.antiAlias,
                              decoration: BoxDecoration(
                                color: context.isDarkMode ? Colors.grey[800] : Colors.grey[200],
                                borderRadius: BorderRadius.circular(9),
                              ),
                              child: Row(
                                children: [
                                  if (verifiedCount > 0)
                                    Expanded(flex: verifiedCount, child: Container(color: Colors.teal)),
                                  if (submittedCount > 0)
                                    Expanded(flex: submittedCount, child: Container(color: Colors.purple)),
                                  if (assignedCount > 0)
                                    Expanded(flex: assignedCount, child: Container(color: Colors.blue)),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildProgressLegend('Verified', verifiedCount, Colors.teal),
                                _buildProgressLegend('Submitted', submittedCount, Colors.purple),
                                _buildProgressLegend('Assigned', assignedCount, Colors.blue),
                              ],
                            ),
                          ],
                        );
                      }
                    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
                    const SizedBox(height: 32),

                    // ── Metrics Grid ──
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Flag Reports',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.adaptiveTextDark),
                        ),
                      ],
                    ).animate().fadeIn(delay: 300.ms),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: redFlagsCount > 0 
                            ? _buildGlassMetricCard('Red Flags', '$redFlagsCount', Icons.flag_rounded, Colors.red, isZero: false)
                                .animate().boxShadow(begin: BoxShadow(color: Colors.red.withValues(alpha: 0.2), blurRadius: 10), end: BoxShadow(color: Colors.red.withValues(alpha: 0.2), blurRadius: 20))
                                .fadeIn(delay: 350.ms).scale(begin: const Offset(0.95, 0.95))
                            : _buildGlassMetricCard('Red Flags', '0', Icons.flag_rounded, Colors.red, isZero: true)
                                .animate().fadeIn(delay: 350.ms).scale(begin: const Offset(0.95, 0.95))
                        ),
                        const SizedBox(width: 12),
                        Expanded(child: _buildGlassMetricCard('Yellow Flags', '$yellowFlagsCount', Icons.flag_rounded, Colors.orange, isZero: yellowFlagsCount == 0).animate().fadeIn(delay: 400.ms).scale(begin: const Offset(0.95, 0.95))),
                        const SizedBox(width: 12),
                        Expanded(child: _buildGlassMetricCard('Green Flags', '$greenFlagsCount', Icons.flag_rounded, Colors.green, isZero: greenFlagsCount == 0).animate().fadeIn(delay: 450.ms).scale(begin: const Offset(0.95, 0.95))),
                      ],
                    ),
                    const SizedBox(height: 32),

                    // ── Recent Active Tasks ──
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Recent Assignments',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.adaptiveTextDark),
                        ),
                        InkWell(
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InspectionPage())),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.gold.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text('View All', style: TextStyle(color: Color(0xFFC79200), fontWeight: FontWeight.bold, fontSize: 13)),
                          ),
                        ),
                      ],
                    ).animate().fadeIn(delay: 500.ms),
                    const SizedBox(height: 16),
                    if (_activeTasks.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                        decoration: BoxDecoration(
                          color: context.adaptiveSurface,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: context.isDarkMode ? Colors.grey.shade800 : Colors.grey.shade200),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.check_circle_outline_rounded, size: 64, color: Colors.grey.withValues(alpha: 0.5)),
                            const SizedBox(height: 16),
                            Text("You're all caught up!", style: TextStyle(color: context.adaptiveTextMid, fontSize: 16, fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ).animate().fadeIn(delay: 600.ms)
                    else
                      ListView.builder(
                        itemCount: _activeTasks.length > 5 ? 5 : _activeTasks.length,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemBuilder: (ctx, index) {
                          final task = _activeTasks[index];
                          return TaskCard(
                            task: task,
                            isCurrent: true,
                            onTap: () async {
                              if (_isDrawerOpen) return;
                              setState(() => _isDrawerOpen = true);
                              widget.onDrawerToggled?.call(true);
                              
                              await showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (_) => InspectionModal(
                                  task: task,
                                  onSubmitted: _loadDashboardData,
                                ),
                              );
                              
                              widget.onDrawerToggled?.call(false);
                              if (mounted) setState(() => _isDrawerOpen = false);
                            },
                          ).animate().fadeIn(delay: Duration(milliseconds: 600 + (index * 100))).slideX(begin: 0.05);
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildGlassMetricCard(String title, String value, IconData icon, Color color, {bool isZero = false}) {
    final effectiveColor = isZero ? Colors.grey : color;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: context.adaptiveSurface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: context.isDarkMode ? Colors.grey.shade800 : Colors.grey.shade200),
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
          Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: isZero ? Colors.grey[400] : context.adaptiveTextDark)),
          const SizedBox(height: 4),
          Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: context.adaptiveTextMid)),
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
        Text('$value $label', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: context.adaptiveTextMid)),
      ],
    );
  }
}
