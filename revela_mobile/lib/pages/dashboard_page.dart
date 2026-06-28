import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../component/app_sidebar.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';
import 'home_page.dart';
import 'inspection_page.dart';
import 'pdf_generator_page.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

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
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);
    try {
      final name = await _storage.read(key: 'user_fullName') ?? 'Field Inspector';
      final role = await _storage.read(key: 'user_role') ?? 'BPLO Field Inspector';
      
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
    final int submittedCount = _historyTasks.where((t) => t.verificationStatus.toLowerCase() == 'submitted').length;
    final int verifiedCount = _historyTasks.where((t) => t.verificationStatus.toLowerCase() == 'verified').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('BPLO Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDashboardData,
            tooltip: 'Refresh Dashboard',
          ),
        ],
      ),
      drawer: const AppSidebar(),
      body: RefreshIndicator(
        onRefresh: _loadDashboardData,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Welcome Profile Banner ──
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1B5E20), Color(0xFF2E7D32)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.12),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: AppColors.gold,
                                child: Text(
                                  _inspectorName.isNotEmpty ? _inspectorName[0].toUpperCase() : 'I',
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.darkGreen,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Welcome back,',
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.8),
                                        fontSize: 13,
                                      ),
                                    ),
                                    Text(
                                      _inspectorName,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.verified_user_outlined, color: AppColors.gold, size: 16),
                                const SizedBox(width: 6),
                                Text(
                                  _inspectorRole,
                                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ── Quick Metrics Section ──
                    const Text(
                      'Inspection Metrics',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textDark),
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.45,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      children: [
                        _buildMetricCard(
                          title: 'Assigned Tasks',
                          value: '$assignedCount',
                          icon: Icons.assignment_outlined,
                          color: Colors.blue,
                        ),
                        _buildMetricCard(
                          title: 'High Priority',
                          value: '$redFlagsCount',
                          icon: Icons.warning_amber_rounded,
                          color: Colors.redAccent,
                        ),
                        _buildMetricCard(
                          title: 'Submitted Reports',
                          value: '$submittedCount',
                          icon: Icons.hourglass_top_rounded,
                          color: Colors.orange,
                        ),
                        _buildMetricCard(
                          title: 'Verified Cleared',
                          value: '$verifiedCount',
                          icon: Icons.check_circle_outline,
                          color: Colors.green,
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // ── Field Actions Shortcuts ──
                    const Text(
                      'Field Quick Actions',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textDark),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildShortcutButton(
                            label: 'Map View',
                            icon: Icons.map_outlined,
                            color: const Color(0xFF2E7D32),
                            onTap: () {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => const HomePage()));
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildShortcutButton(
                            label: 'Tasks List',
                            icon: Icons.list_alt_rounded,
                            color: const Color(0xFF0277BD),
                            onTap: () {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => const InspectionPage()));
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildShortcutButton(
                            label: 'Notice PDF',
                            icon: Icons.picture_as_pdf_outlined,
                            color: const Color(0xFFD84315),
                            onTap: () {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => const PdfGeneratorPage()));
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // ── Active Tasks Overview ──
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Assigned Assignments',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textDark),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(context, MaterialPageRoute(builder: (_) => const InspectionPage()));
                          },
                          child: const Text('View All'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_activeTasks.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.borderColor),
                        ),
                        child: const Column(
                          children: [
                            Icon(Icons.check_circle_outline, size: 48, color: Colors.grey),
                            SizedBox(height: 8),
                            Text('No active inspection assignments.', style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                      )
                    else
                      ListView.builder(
                        itemCount: _activeTasks.length > 3 ? 3 : _activeTasks.length,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemBuilder: (ctx, index) {
                          final task = _activeTasks[index];
                          final isRed = task.flagColor.toLowerCase() == 'red';
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            elevation: 1.5,
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: isRed ? Colors.red.shade100 : Colors.green.shade100,
                                child: Icon(
                                  isRed ? Icons.priority_high : Icons.storefront,
                                  color: isRed ? Colors.red : Colors.green,
                                ),
                              ),
                              title: Text(task.detectedName, style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text('${task.barangayName} • ${task.verificationStatus}'),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () {
                                Navigator.push(context, MaterialPageRoute(builder: (_) => const InspectionPage()));
                              },
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderColor.withOpacity(0.6)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMid)),
              Icon(icon, color: color, size: 22),
            ],
          ),
          Text(
            value,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildShortcutButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: color.withOpacity(0.1),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
