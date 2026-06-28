import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

import '../component/app_sidebar.dart';
import '../component/inspection_card.dart';
import '../component/inspection_modal.dart';
import '../service/assignment_notifications.dart';
import '../service/in_app_notifications_service.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  static const Set<String> _activeStatuses = {'Assigned', 'Reassigned'};

  bool _isDockerExpanded = false;
  bool _isFirstLoad = true;
  String _sortBy = 'newest'; // 'newest' or 'oldest'
  bool _hasLocationPermission = false;

  Timer? _pollTimer;
  bool _assignmentNotifyPrimed = false;

  // ── Google Map ─────────────────────────────────────────────────────────────
  GoogleMapController? _mapController;
  static const CameraPosition _initialCamera = CameraPosition(
    target: LatLng(13.9667, 121.1167),
    zoom: 12,
  );

  // ── Real data ──────────────────────────────────────────────────────────────
  List<InspectionTask> _tasks = [];
  bool _loadingTasks = true;
  String? _taskError;

  int _unreadCount = 0;

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
    WidgetsBinding.instance.addObserver(this);
    _primePermissionsAndFetch();
    _pollTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (mounted) {
        _fetchTasks(silent: true);
        _fetchNotifications(silent: true);
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 400), () {
        if (mounted) setState(() => _isDockerExpanded = true);
      });
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _fetchTasks(silent: true);
    }
  }

  Future<void> _primePermissionsAndFetch() async {
    await Permission.locationWhenInUse.request();
    await Future.wait([_fetchTasks(), _fetchNotifications()]);
  }

  Future<void> _fetchNotifications({bool silent = false}) async {
    try {
      final count = await InAppNotificationsService().fetchUnreadCount();
      if (mounted) setState(() => _unreadCount = count);
    } catch (e) {
      debugPrint('_fetchNotifications: $e');
    }
  }

  Future<void> _showNotificationsPanel() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _NotificationsPanel(),
    );
    if (!mounted) return;
    try {
      await InAppNotificationsService().markAllRead();
      await _fetchNotifications(silent: true);
    } catch (e) {
      debugPrint('markAllRead: $e');
    }
  }

  Future<void> _fetchTasks({bool silent = false}) async {
    final previous = List<InspectionTask>.from(_tasks);
    if (!silent && mounted) {
      setState(() {
        _loadingTasks = true;
        _taskError = null;
      });
    }
    try {
      final tasks = await InspectionService().getMyTasks();
      final currentTasks = tasks
          .where((t) => _activeStatuses.contains(t.verificationStatus))
          .toList();

      if (_assignmentNotifyPrimed) {
        await AssignmentNotifications.notifyNewAssignments(
          previous: previous,
          next: currentTasks,
        );
      } else {
        _assignmentNotifyPrimed = true;
      }

      if (mounted) {
        setState(() {
          _tasks = currentTasks;
          _loadingTasks = false;
        });
        _syncMapToTasks();
      }
    } catch (e) {
      debugPrint('_fetchTasks: $e');
      if (mounted) {
        setState(() {
          _taskError =
              'Failed to load tasks. Ensure the backend is running (python app.py) and the device can reach it (USB: adb reverse tcp:5000 tcp:5000).';
          _loadingTasks = false;
        });
      }
    }
  }

  void _syncMapToTasks() {
    if (_mapController == null) return;
    final withCoords = _tasks
        .where((t) => t.latitude != null && t.longitude != null)
        .toList();
    if (withCoords.isEmpty) return;
    if (withCoords.length == 1) {
      final t = withCoords.first;
      _mapController!.animateCamera(
        CameraUpdate.newLatLngZoom(LatLng(t.latitude!, t.longitude!), 15),
      );
      return;
    }
    double minLat = withCoords.first.latitude!, maxLat = minLat;
    double minLng = withCoords.first.longitude!, maxLng = minLng;
    for (final t in withCoords) {
      minLat = minLat < t.latitude! ? minLat : t.latitude!;
      maxLat = maxLat > t.latitude! ? maxLat : t.latitude!;
      minLng = minLng < t.longitude! ? minLng : t.longitude!;
      maxLng = maxLng > t.longitude! ? maxLng : t.longitude!;
    }
    if ((maxLat - minLat).abs() < 0.0005) {
      minLat -= 0.002;
      maxLat += 0.002;
    }
    if ((maxLng - minLng).abs() < 0.0005) {
      minLng -= 0.002;
      maxLng += 0.002;
    }
    _mapController!.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat, minLng),
          northeast: LatLng(maxLat, maxLng),
        ),
        80,
      ),
    );
  }

  Set<Marker> _buildFlagMarkers() {
    final markers = <Marker>{};
    for (final t in _tasks) {
      if (t.latitude == null || t.longitude == null) continue;
      final hue = switch (t.flagColor) {
        'Red' => BitmapDescriptor.hueRed,
        'Yellow' => BitmapDescriptor.hueYellow,
        'Black' => BitmapDescriptor.hueViolet,
        _ => BitmapDescriptor.hueGreen,
      };
      markers.add(
        Marker(
          markerId: MarkerId('flag_${t.logID}'),
          position: LatLng(t.latitude!, t.longitude!),
          infoWindow: InfoWindow(
            title: t.detectedName,
            snippet: '${t.barangayName} · ${t.flagColor}',
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(hue),
        ),
      );
    }
    return markers;
  }

  void _toggleDocker() {
    setState(() {
      _isDockerExpanded = !_isDockerExpanded;
      if (!_isDockerExpanded) _isFirstLoad = false;
    });
  }

  Future<void> _goToCurrentLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return;
      }

      if (mounted) {
        setState(() => _hasLocationPermission = true);
      }

      final position = await Geolocator.getCurrentPosition();
      await _mapController?.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: LatLng(position.latitude, position.longitude),
            zoom: 16,
          ),
        ),
      );
    } catch (e) {
      debugPrint('Error getting location: $e');
    }
  }

  // ── Open inspection modal ─────────────────────────────────────────────────
  void _showInspectionModal(BuildContext context, InspectionTask task) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          InspectionModal(task: task, onSubmitted: () => _fetchTasks()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final paddingTop = MediaQuery.of(context).padding.top;

    return Scaffold(
      drawer: const AppSidebar(),
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Builder(
          builder: (ctx) => Padding(
            padding: const EdgeInsets.all(8.0),
            child: FloatingActionButton(
              heroTag: null,
              mini: true,
              backgroundColor: Colors.white,
              onPressed: () => Scaffold.of(ctx).openDrawer(),
              child: const Icon(Icons.menu, color: AppColors.darkGreen),
            ),
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                FloatingActionButton(
                  mini: true,
                  backgroundColor: Colors.white,
                  heroTag: 'notifications',
                  onPressed: _showNotificationsPanel,
                  child: Icon(
                    _unreadCount > 0
                        ? Icons.notifications_active_rounded
                        : Icons.notifications_none_rounded,
                    color: AppColors.darkGreen,
                  ),
                ),
                if (_unreadCount > 0)
                  Positioned(
                    right: -2,
                    top: -2,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.redAccent,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 18,
                        minHeight: 18,
                      ),
                      child: Text(
                        _unreadCount > 9 ? '9+' : '$_unreadCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          // Refresh
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FloatingActionButton(
              mini: true,
              backgroundColor: Colors.white,
              heroTag: 'refresh',
              onPressed: _loadingTasks ? null : () => _fetchTasks(),
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
          // ── 1. Google Map ────────────────────────────────────────────────
          Positioned.fill(
            child: GoogleMap(
              padding: EdgeInsets.only(
                bottom: _isDockerExpanded ? screenHeight * 0.5 : 0.0,
              ),
              initialCameraPosition: _initialCamera,
              markers: _buildFlagMarkers(),
              onMapCreated: (controller) async {
                _mapController = controller;
                await _goToCurrentLocation();
                _syncMapToTasks();
              },
              myLocationEnabled: _hasLocationPermission,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
            ),
          ),

          // ── 2. Map View Controls (+/−/recenter) ─────────────────────────
          Positioned(
            top: paddingTop + kToolbarHeight + 16,
            right: 16,
            child: Column(
              children: [
                _MapControlButton(
                  icon: Icons.add,
                  tooltip: 'Zoom In',
                  active: false,
                  onTap: () {
                    _mapController?.animateCamera(CameraUpdate.zoomIn());
                  },
                ),
                const SizedBox(height: 6),
                _MapControlButton(
                  icon: Icons.remove,
                  tooltip: 'Zoom Out',
                  active: false,
                  onTap: () {
                    _mapController?.animateCamera(CameraUpdate.zoomOut());
                  },
                ),
                const SizedBox(height: 6),
                _MapControlButton(
                  icon: Icons.my_location,
                  tooltip: 'Recenter',
                  active: false,
                  onTap: () {
                    _goToCurrentLocation();
                  },
                ),
              ],
            ),
          ),

          // ── 3. Animated Bottom Docker (short-file behavior) ──────────────
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: AnimatedSlide(
              duration: const Duration(milliseconds: 500),
              curve: Curves.easeInOutQuart,
              offset: _isDockerExpanded ? Offset.zero : const Offset(0, 1.2),
              child: Container(
                height: screenHeight * 0.5,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                  boxShadow: [BoxShadow(blurRadius: 20, color: Colors.black26)],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Handle — tap or swipe down to dismiss
                    GestureDetector(
                      onTap: _toggleDocker,
                      onVerticalDragEnd: (details) {
                        if ((details.primaryVelocity ?? 0) > 200) {
                          _toggleDocker();
                        }
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Center(
                          child: Container(
                            width: 40,
                            height: 5,
                            decoration: BoxDecoration(
                              color: Colors.grey[300],
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Flexible(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                                        borderRadius: BorderRadius.circular(12),
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
                                      onRefresh: () => _fetchTasks(),
                                      child: ListView.builder(
                                        shrinkWrap: true,
                                        padding: EdgeInsets.zero,
                                        physics:
                                            const AlwaysScrollableScrollPhysics(),
                                        itemCount: _sortedTasks.length,
                                        itemBuilder: (context, index) =>
                                            InspectionCard(
                                              task: _sortedTasks[index],
                                              onTap: () => _showInspectionModal(
                                                context,
                                                _sortedTasks[index],
                                              ),
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

          // ── 4. Floating button when docker is closed ─────────────────────
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
                  child: const Text(
                    "Inspection Tasks",
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Map Control Button ───────────────────────────────────────────────────────
class _MapControlButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final bool active;
  final VoidCallback onTap;

  const _MapControlButton({
    required this.icon,
    required this.tooltip,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: active ? AppColors.darkGreen : Colors.white,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(blurRadius: 6, color: Colors.black.withOpacity(0.12)),
            ],
          ),
          child: Icon(
            icon,
            size: 18,
            color: active ? Colors.white : AppColors.darkGreen,
          ),
        ),
      ),
    );
  }
}

// ─── Inspection Modal ─────────────────────────────────────────────────────────
class _InspectionModal extends StatefulWidget {
  final InspectionTask task;
  final VoidCallback onSubmitted;

  const _InspectionModal({required this.task, required this.onSubmitted});

  @override
  State<_InspectionModal> createState() => _InspectionModalState();
}

class _InspectionModalState extends State<_InspectionModal> {
  final TextEditingController _remarksController = TextEditingController();
  String? _evidenceLocalPath;
  String? _uploadedPhotoUrl;
  bool _uploadingEvidence = false;
  bool _submitting = false;

  /// API: Red | Yellow | Green
  String _inspectionResult = 'Green';

  @override
  void dispose() {
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _onSubmit() async {
    if (_inspectionResult.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select an on-site compliance result.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      double? vLat;
      double? vLng;
      try {
        final p = await Geolocator.getCurrentPosition();
        vLat = p.latitude;
        vLng = p.longitude;
      } catch (_) {}

      final remarks = _remarksController.text.trim();

      await InspectionService().submitInspection(
        task: widget.task,
        inspectionResult: _inspectionResult,
        notes: remarks.isEmpty ? null : remarks,
        verifiedLat: vLat,
        verifiedLng: vLng,
        evidenceLocalPath: _uploadedPhotoUrl == null ? _evidenceLocalPath : null,
        photoURL: _uploadedPhotoUrl,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Submitted. Admin can verify it on the web dashboard (Submitted column).',
          ),
        ),
      );
      widget.onSubmitted();
      Navigator.pop(context, true);
    } catch (e) {
      debugPrint('submitInspection error: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Submit failed: $e')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final pickedImage = await picker.pickImage(
        source: source,
        imageQuality: 85,
      );
      if (pickedImage != null && mounted) {
        setState(() {
          _evidenceLocalPath = pickedImage.path;
          _uploadedPhotoUrl = null;
        });
      }
    } catch (e) {
      debugPrint('Image picker error: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Failed to pick image.')));
    }
  }

  Future<void> _uploadEvidence() async {
    final path = _evidenceLocalPath;
    if (path == null || path.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Take or choose a photo first.')),
      );
      return;
    }

    setState(() => _uploadingEvidence = true);
    try {
      final photoUrl = await InspectionService().uploadEvidence(path);
      if (!mounted) return;
      if (photoUrl == null || photoUrl.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Upload failed. Please try again.')),
        );
        return;
      }
      setState(() => _uploadedPhotoUrl = photoUrl);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Evidence uploaded. You can submit the inspection.'),
          backgroundColor: AppColors.darkGreen,
        ),
      );
    } catch (e) {
      debugPrint('uploadEvidence error: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _uploadingEvidence = false);
    }
  }

  void _clearEvidence() {
    setState(() {
      _evidenceLocalPath = null;
      _uploadedPhotoUrl = null;
    });
  }

  void _showPickerOptions() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Take a Photo'),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
            // Handle
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            const SizedBox(height: 16),

            // Business info header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.darkGreen.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'INFO',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppColors.darkGreen,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          widget.task.detectedName,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(
                              Icons.location_on_outlined,
                              size: 14,
                              color: Colors.grey,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                widget.task.barangayName,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            const Divider(height: 24),

            // Scrollable content
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                children: [
                  const _SectionLabel(
                    label: 'On-site result',
                    icon: Icons.flag_outlined,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Choose the flag color to record after your visit (admin verifies on the web).',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _ResultChip(
                        label: 'Red — Unregistered',
                        selected: _inspectionResult == 'Red',
                        color: const Color(0xFFEF4444),
                        onTap: () => setState(() => _inspectionResult = 'Red'),
                      ),
                      _ResultChip(
                        label: 'Yellow — Suspected',
                        selected: _inspectionResult == 'Yellow',
                        color: const Color(0xFFF59E0B),
                        onTap: () =>
                            setState(() => _inspectionResult = 'Yellow'),
                      ),
                      _ResultChip(
                        label: 'Green — Compliant',
                        selected: _inspectionResult == 'Green',
                        color: const Color(0xFF22C55E),
                        onTap: () =>
                            setState(() => _inspectionResult = 'Green'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const _SectionLabel(
                    label: 'Evidence',
                    icon: Icons.photo_library_outlined,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Take a photo, then tap Upload evidence before submitting.',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                  if (_evidenceLocalPath != null &&
                      File(_evidenceLocalPath!).existsSync()) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.file(
                        File(_evidenceLocalPath!),
                        height: 180,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        TextButton.icon(
                          onPressed: _uploadingEvidence ? null : _showPickerOptions,
                          icon: const Icon(Icons.cameraswitch_outlined, size: 18),
                          label: const Text('Retake'),
                        ),
                        TextButton.icon(
                          onPressed: _uploadingEvidence ? null : _clearEvidence,
                          icon: const Icon(Icons.delete_outline, size: 18),
                          label: const Text('Remove'),
                        ),
                        const Spacer(),
                        if (_uploadedPhotoUrl != null)
                          const Row(
                            children: [
                              Icon(
                                Icons.check_circle,
                                color: AppColors.darkGreen,
                                size: 18,
                              ),
                              SizedBox(width: 4),
                              Text(
                                'Uploaded',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.darkGreen,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ] else
                    GestureDetector(
                      onTap: _showPickerOptions,
                      child: Container(
                        height: 110,
                        decoration: BoxDecoration(
                          color: Colors.grey[50],
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppColors.darkGreen.withOpacity(0.3),
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.add_photo_alternate_outlined,
                              size: 36,
                              color: AppColors.darkGreen.withOpacity(0.6),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Tap to take or choose a photo',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (_evidenceLocalPath != null) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton.icon(
                        onPressed: _uploadingEvidence ||
                                _uploadedPhotoUrl != null
                            ? null
                            : _uploadEvidence,
                        icon: _uploadingEvidence
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.darkGreen,
                                ),
                              )
                            : const Icon(Icons.cloud_upload_outlined),
                        label: Text(
                          _uploadedPhotoUrl != null
                              ? 'Evidence uploaded'
                              : 'Upload evidence',
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.darkGreen,
                          side: const BorderSide(color: AppColors.darkGreen),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Remarks
                  const _SectionLabel(
                    label: 'Remarks',
                    icon: Icons.comment_outlined,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _remarksController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Optional — notes for BPLO / admin review',
                      hintStyle: TextStyle(
                        color: Colors.grey[400],
                        fontSize: 13,
                      ),
                      filled: true,
                      fillColor: Colors.grey[50],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(
                          color: AppColors.darkGreen,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),

            // Sticky actions — always visible without scrolling
            Container(
              padding: EdgeInsets.fromLTRB(
                24,
                12,
                24,
                12 + MediaQuery.of(context).padding.bottom,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    blurRadius: 8,
                    color: Colors.black.withOpacity(0.08),
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: _submitting || _uploadingEvidence
                      ? null
                      : _onSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.darkGreen,
                    disabledBackgroundColor:
                        AppColors.darkGreen.withOpacity(0.5),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: _submitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Submit Inspection',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            letterSpacing: 0.5,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Result chip (modal) ─────────────────────────────────────────────────────
class _ResultChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _ResultChip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? color.withValues(alpha: 0.15) : Colors.grey.shade100,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? color : Colors.grey.shade300,
              width: selected ? 2 : 1,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: selected ? color : Colors.grey.shade700,
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Section Label ────────────────────────────────────────────────────────────
class _SectionLabel extends StatelessWidget {
  final String label;
  final IconData icon;

  const _SectionLabel({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.darkGreen),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppColors.textDark,
          ),
        ),
      ],
    );
  }
}

// ─── In-app notifications panel (home bell) ───────────────────────────────────
class _NotificationsPanel extends StatefulWidget {
  const _NotificationsPanel();

  @override
  State<_NotificationsPanel> createState() => _NotificationsPanelState();
}

class _NotificationsPanelState extends State<_NotificationsPanel> {
  List<InAppNotification> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await InAppNotificationsService().fetchNotifications();
      if (mounted) {
        setState(() {
          _items = list;
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

  @override
  Widget build(BuildContext context) {
    final maxH = MediaQuery.of(context).size.height * 0.55;

    return Container(
      constraints: BoxConstraints(maxHeight: maxH),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Notifications',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textDark,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, color: AppColors.darkGreen),
                  onPressed: _loading ? null : _load,
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Flexible(
            child: _loading
                ? const Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppColors.darkGreen,
                      ),
                    ),
                  )
                : _error != null
                ? Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.grey),
                      textAlign: TextAlign.center,
                    ),
                  )
                : _items.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(32),
                    child: Text(
                      'No notifications yet.\nNew assignments from admin will appear here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, height: 1.5),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: _items.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final n = _items[i];
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: n.isUnread
                              ? AppColors.darkGreen.withOpacity(0.06)
                              : Colors.grey[50],
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: n.isUnread
                                ? AppColors.darkGreen.withOpacity(0.25)
                                : Colors.grey.shade200,
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              _iconForType(n.type),
                              color: AppColors.darkGreen,
                              size: 22,
                            ),
                            const SizedBox(width: 12),
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
                                      fontSize: 14,
                                      color: AppColors.textDark,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    n.body,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey,
                                      height: 1.4,
                                    ),
                                  ),
                                  if (n.createdAt.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      n.createdAt,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey[500],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
