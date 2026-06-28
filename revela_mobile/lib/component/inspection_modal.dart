import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';

class InspectionModal extends StatefulWidget {
  final InspectionTask task;
  final VoidCallback onSubmitted;

  const InspectionModal({
    super.key,
    required this.task,
    required this.onSubmitted,
  });

  @override
  State<InspectionModal> createState() => _InspectionModalState();
}

class _InspectionModalState extends State<InspectionModal> {
  final TextEditingController _remarksController = TextEditingController();
  String? _evidenceLocalPath;
  String? _uploadedPhotoUrl;
  bool _uploadingEvidence = false;
  bool _submitting = false;
  bool _isFirstNoticeIssued = false;

  /// API Result options: Green, Yellow, Red, or Given First Notice
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

      String remarks = _remarksController.text.trim();
      if (_isFirstNoticeIssued || _inspectionResult == 'Given First Notice') {
        if (!remarks.contains('[Given First Notice]')) {
          remarks = remarks.isEmpty ? '[Given First Notice Issued]' : '[Given First Notice Issued] $remarks';
        }
      }

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
            'Submitted successfully. Admin can verify it on the web dashboard.',
          ),
          backgroundColor: AppColors.darkGreen,
        ),
      );
      widget.onSubmitted();
      Navigator.pop(context, true);
    } catch (e) {
      debugPrint('submitInspection error: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Submit failed: $e')),
      );
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to pick image.')),
      );
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
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
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
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.darkGreen.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'CONDUCT INSPECTION',
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
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, size: 14, color: Colors.grey),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                widget.task.barangayName,
                                style: const TextStyle(fontSize: 13, color: Colors.grey),
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

            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                children: [
                  const _SectionLabel(label: 'On-site result', icon: Icons.flag_outlined),
                  const SizedBox(height: 8),
                  const Text(
                    'Choose the inspection outcome flag to record.',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _ResultChip(
                        label: 'Green — Compliant',
                        selected: _inspectionResult == 'Green',
                        color: const Color(0xFF22C55E),
                        onTap: () => setState(() {
                          _inspectionResult = 'Green';
                          _isFirstNoticeIssued = false;
                        }),
                      ),
                      _ResultChip(
                        label: 'Yellow — Suspected',
                        selected: _inspectionResult == 'Yellow',
                        color: const Color(0xFFF59E0B),
                        onTap: () => setState(() => _inspectionResult = 'Yellow'),
                      ),
                      _ResultChip(
                        label: 'Red — Unregistered',
                        selected: _inspectionResult == 'Red',
                        color: const Color(0xFFEF4444),
                        onTap: () => setState(() => _inspectionResult = 'Red'),
                      ),
                      _ResultChip(
                        label: 'Given First Notice',
                        selected: _inspectionResult == 'Given First Notice',
                        color: Colors.orange.shade800,
                        onTap: () => setState(() {
                          _inspectionResult = 'Given First Notice';
                          _isFirstNoticeIssued = true;
                        }),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Toggle Switch for Given First Notice
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.orange.shade200),
                    ),
                    child: SwitchListTile(
                      title: const Text(
                        'Issued First Notice on-site',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.orange),
                      ),
                      subtitle: const Text(
                        'Marks this report as Given First Notice for administrative compliance tracking.',
                        style: TextStyle(fontSize: 11, color: Colors.black54),
                      ),
                      value: _isFirstNoticeIssued || _inspectionResult == 'Given First Notice',
                      onChanged: (val) {
                        setState(() {
                          _isFirstNoticeIssued = val;
                          if (val) _inspectionResult = 'Given First Notice';
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 24),

                  const _SectionLabel(label: 'Evidence Photo', icon: Icons.photo_library_outlined),
                  const SizedBox(height: 8),
                  const Text(
                    'Capture photo evidence before submitting.',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                  if (_evidenceLocalPath != null && File(_evidenceLocalPath!).existsSync()) ...[
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
                              Icon(Icons.check_circle, color: AppColors.darkGreen, size: 18),
                              SizedBox(width: 4),
                              Text('Uploaded', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.darkGreen)),
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
                          border: Border.all(color: AppColors.darkGreen.withOpacity(0.3)),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_photo_alternate_outlined, size: 36, color: AppColors.darkGreen.withOpacity(0.6)),
                            const SizedBox(height: 8),
                            Text('Tap to take or choose a photo', style: TextStyle(fontSize: 13, color: Colors.grey[500])),
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
                        onPressed: _uploadingEvidence || _uploadedPhotoUrl != null ? null : _uploadEvidence,
                        icon: _uploadingEvidence
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.darkGreen))
                            : const Icon(Icons.cloud_upload_outlined),
                        label: Text(_uploadedPhotoUrl != null ? 'Evidence uploaded' : 'Upload evidence'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.darkGreen,
                          side: const BorderSide(color: AppColors.darkGreen),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),

                  const _SectionLabel(label: 'Remarks', icon: Icons.comment_outlined),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _remarksController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Optional — notes for BPLO / admin review',
                      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
                      filled: true,
                      fillColor: Colors.grey[50],
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.darkGreen)),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),

            Container(
              padding: EdgeInsets.fromLTRB(24, 12, 24, 12 + MediaQuery.of(context).padding.bottom),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(blurRadius: 8, color: Colors.black.withOpacity(0.08), offset: const Offset(0, -2))],
              ),
              child: SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: _submitting || _uploadingEvidence ? null : _onSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.darkGreen,
                    disabledBackgroundColor: AppColors.darkGreen.withOpacity(0.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _submitting
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Submit Inspection Report', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

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
      color: selected ? color.withOpacity(0.15) : Colors.grey.shade100,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? color : Colors.grey.shade300, width: selected ? 2 : 1),
          ),
          child: Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: selected ? color : Colors.grey.shade700),
          ),
        ),
      ),
    );
  }
}

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
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textDark)),
      ],
    );
  }
}
