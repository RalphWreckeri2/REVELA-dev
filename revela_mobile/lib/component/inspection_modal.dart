
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
  final List<String> _evidenceLocalPaths = [];
  List<String> _uploadedPhotoUrls = [];
  bool _uploadingEvidence = false;
  bool _submitting = false;
  int _noticeLevel = 0;

  /// API Result options: Green, Yellow, Red, Orange, Black, Purple
  String _inspectionResult = '';
  int _currentStep = 0;
  bool _showResultError = false;

  /// Pre-warmed GPS position (fetched when entering the Review step)
  Future<Position>? _locationFuture;

  @override
  void dispose() {
    _remarksController.dispose();
    super.dispose();
  }

  /// Pre-warm GPS so it's ready when the user taps Submit.
  void _preWarmLocation() {
    _locationFuture ??= Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        timeLimit: Duration(seconds: 10),
      ),
    );
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
        // Use pre-warmed location if available, otherwise fetch now
        _preWarmLocation();
        final p = await _locationFuture!;
        vLat = p.latitude;
        vLng = p.longitude;
      } catch (e) {
        // Reset so next attempt gets a fresh fix
        _locationFuture = null;
        if (mounted) {
          setState(() => _submitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to get location. Please ensure GPS is enabled.'),
              backgroundColor: Colors.red.shade700,
            ),
          );
        }
        return;
      }

      String remarks = _remarksController.text.trim();
      if (_noticeLevel == 1) {
        remarks = remarks.isEmpty ? '[1st Notice Issued]' : '[1st Notice Issued] $remarks';
      } else if (_noticeLevel == 2) {
        remarks = remarks.isEmpty ? '[2nd Notice Issued]' : '[2nd Notice Issued] $remarks';
      } else if (_noticeLevel == 3) {
        remarks = remarks.isEmpty ? '[3rd Notice Issued]' : '[3rd Notice Issued] $remarks';
      } else if (_noticeLevel == 4) {
        remarks = remarks.isEmpty ? '[Escalated to Black]' : '[Escalated to Black] $remarks';
      }

      await InspectionService().submitInspection(
        task: widget.task,
        inspectionResult: _inspectionResult,
        noticeLevel: _noticeLevel,
        notes: remarks.isEmpty ? null : remarks,
        verifiedLat: vLat,
        verifiedLng: vLng,
        evidenceLocalPaths: _uploadedPhotoUrls.isEmpty ? _evidenceLocalPaths : null,
        photoURLs: _uploadedPhotoUrls.isEmpty ? null : _uploadedPhotoUrls,
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
      if (source == ImageSource.gallery) {
        final pickedImages = await picker.pickMultiImage(imageQuality: 85);
        if (pickedImages.isNotEmpty && mounted) {
          setState(() {
            _evidenceLocalPaths.addAll(pickedImages.map((e) => e.path));
            _uploadedPhotoUrls.clear();
          });
        }
      } else {
        final pickedImage = await picker.pickImage(source: source, imageQuality: 85);
        if (pickedImage != null && mounted) {
          setState(() {
            _evidenceLocalPaths.add(pickedImage.path);
            _uploadedPhotoUrls.clear();
          });
        }
      }
    } catch (e) {
      debugPrint('Image picker error: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to pick images.')),
      );
    }
  }

  Future<void> _uploadEvidence() async {
    if (_evidenceLocalPaths.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Take or choose a photo first.')),
      );
      return;
    }

    setState(() => _uploadingEvidence = true);
    try {
      final futures = _evidenceLocalPaths.map((path) => InspectionService().uploadEvidence(path));
      final results = await Future.wait(futures);
      final validUrls = results.where((url) => url != null && url.isNotEmpty).cast<String>().toList();
      
      if (!mounted) return;
      if (validUrls.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Upload failed. Please try again.')),
        );
        return;
      }
      setState(() => _uploadedPhotoUrls = validUrls);
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
      _evidenceLocalPaths.clear();
      _uploadedPhotoUrls.clear();
    });
  }

  void _showPickerOptions() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: Icon(Icons.camera_alt_outlined),
              title: Text('Take a Photo'),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: Icon(Icons.photo_library_outlined),
              title: Text('Choose from Gallery'),
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

  void _nextStep() {
    if (_currentStep == 0 && _inspectionResult.isEmpty) {
      setState(() {
        _showResultError = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please select an on-site compliance result to proceed.', style: TextStyle(color: Colors.white)),
          backgroundColor: Colors.red.shade700,
        ),
      );
      return;
    }
    setState(() {
      _showResultError = false;
      if (_currentStep < 2) _currentStep++;
    });
    // Pre-warm GPS when entering the Review step
    if (_currentStep == 2) _preWarmLocation();
  }

  void _prevStep() {
    setState(() {
      if (_currentStep > 0) _currentStep--;
    });
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) => Container(
        decoration: BoxDecoration(
          color: context.adaptiveSurface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: ListView(
          controller: scrollController,
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            const SizedBox(height: 12),
            Center(
              child: Container(
                width: 40,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            
            // Custom Stepper UI
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: List.generate(3, (index) {
                  final steps = ['Result', 'Photos', 'Review'];
                  final isCompleted = _currentStep > index;
                  final isActive = _currentStep == index;
                  
                  return Expanded(
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                height: 2,
                                color: index == 0 
                                  ? Colors.transparent 
                                  : (isCompleted || isActive ? context.adaptivePrimary : Colors.grey.shade300),
                              ),
                            ),
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isCompleted ? context.adaptivePrimary : Colors.transparent,
                                border: Border.all(
                                  color: isCompleted || isActive ? context.adaptivePrimary : Colors.grey.shade300,
                                  width: 2,
                                ),
                              ),
                              child: Center(
                                child: isCompleted 
                                  ? const Icon(Icons.check, size: 16, color: Colors.white)
                                  : (isActive 
                                      ? Container(
                                          width: 8, 
                                          height: 8, 
                                          decoration: BoxDecoration(
                                            color: context.adaptivePrimary, 
                                            shape: BoxShape.circle
                                          )
                                        )
                                      : const SizedBox()),
                              ),
                            ),
                            Expanded(
                              child: Container(
                                height: 2,
                                color: index == 2 
                                  ? Colors.transparent 
                                  : (isCompleted ? context.adaptivePrimary : Colors.grey.shade300),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          steps[index],
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                            color: isActive || isCompleted ? context.adaptivePrimary : Colors.grey.shade500,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: 8),

            // Business info header (Pinned across all steps)
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
                            color: context.adaptivePrimary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'CONDUCT INSPECTION',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: context.adaptivePrimary,
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

            const Divider(height: 32),

            // STEP 1: Compliance Result & Notice
            if (_currentStep == 0)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionLabel(label: 'On-site result', icon: Icons.flag_outlined, isRequired: true),
                    SizedBox(height: 8),
                    Text(
                      'Choose the inspection outcome flag to record.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _ResultChip(
                          label: 'Registered',
                          selected: _inspectionResult == 'Green',
                          color: const Color(0xFF22C55E),
                          onTap: () => setState(() {
                            _inspectionResult = 'Green';
                            _noticeLevel = 0;
                            _showResultError = false;
                          }),
                        ),
                        _ResultChip(
                          label: 'Suspected (Needs Verification)',
                          selected: _inspectionResult == 'Yellow',
                          color: const Color(0xFFF59E0B),
                          onTap: () => setState(() {
                            _inspectionResult = 'Yellow';
                            _noticeLevel = 0;
                            _showResultError = false;
                          }),
                        ),
                        _ResultChip(
                          label: 'Unregistered',
                          selected: _inspectionResult == 'Red',
                          color: const Color(0xFFEF4444),
                          onTap: () => setState(() {
                            _inspectionResult = 'Red';
                            _noticeLevel = 0;
                            _showResultError = false;
                          }),
                        ),
                        if (widget.task.currentNoticeLevel < 3)
                          _ResultChip(
                            label: 'Warned / Non-Compliant',
                            selected: _inspectionResult == 'Orange',
                            color: const Color(0xFFE65100),
                            onTap: () => setState(() {
                              _inspectionResult = 'Orange';
                              _noticeLevel = widget.task.currentNoticeLevel == 0 ? 1 : (widget.task.currentNoticeLevel == 1 ? 2 : 3);
                              _showResultError = false;
                            }),
                          ),
                        _ResultChip(
                          label: 'Blacklisted / Non-Responsive',
                          selected: _inspectionResult == 'Black',
                          color: Colors.black,
                          onTap: () => setState(() {
                            _inspectionResult = 'Black';
                            _noticeLevel = widget.task.currentNoticeLevel == 3 ? 4 : 0;
                            _showResultError = false;
                          }),
                        ),
                        _ResultChip(
                          label: 'Closed / Abandoned',
                          selected: _inspectionResult == 'Purple',
                          color: const Color(0xFF7C3AED),
                          onTap: () => setState(() {
                            _inspectionResult = 'Purple';
                            _noticeLevel = 0;
                            _showResultError = false;
                          }),
                        ),
                      ],
                    ),
                    if (_showResultError)
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline, color: Colors.red.shade700, size: 16),
                            const SizedBox(width: 4),
                            Text(
                              'This field is required',
                              style: TextStyle(color: Colors.red.shade700, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    SizedBox(height: 24),

                    IgnorePointer(
                      ignoring: _inspectionResult != 'Orange',
                      child: Opacity(
                        opacity: _inspectionResult == 'Orange' ? 1.0 : 0.4,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const _SectionLabel(label: 'Administrative Notice', icon: Icons.gavel_outlined, isRequired: true),
                            SizedBox(height: 8),
                            Text(
                              _inspectionResult == 'Orange'
                                  ? 'Select the non-compliance notice level. Enforces sequential escalation.'
                                  : 'Only available when result is "Warned / Non-Compliant".',
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                            SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              decoration: BoxDecoration(
                                color: context.adaptiveSurface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.grey.shade300),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<int>(
                                  value: _noticeLevel,
                                  isExpanded: true,
                                  dropdownColor: context.adaptiveSurface,
                                  items: [
                                    DropdownMenuItem(value: 0, child: Text('No Notice Issued', style: TextStyle(color: context.adaptiveTextDark))),
                                    if (widget.task.currentNoticeLevel == 0)
                                      DropdownMenuItem(value: 1, child: Text('1st Notice: Warning', style: TextStyle(color: const Color(0xFFE65100), fontWeight: FontWeight.bold))),
                                    if (widget.task.currentNoticeLevel == 1)
                                      DropdownMenuItem(value: 2, child: Text('2nd Notice: Warning for Closure', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold))),
                                    if (widget.task.currentNoticeLevel == 2)
                                      DropdownMenuItem(value: 3, child: Text('3rd Notice: Closure', style: TextStyle(color: const Color(0xFFBF360C), fontWeight: FontWeight.bold))),
                                    if (widget.task.currentNoticeLevel == 3)
                                      DropdownMenuItem(value: 4, child: Text('Escalate to Black (Final)', style: TextStyle(color: context.isDarkMode ? Colors.white : Colors.black, fontWeight: FontWeight.bold))),
                                  ],
                                  onChanged: (val) {
                                    if (val != null) {
                                      setState(() {
                                        _noticeLevel = val;
                                        if (val >= 1 && val <= 3) {
                                          _inspectionResult = 'Orange';
                                        } else if (val == 4) {
                                          _inspectionResult = 'Black';
                                        } else if (_inspectionResult == 'Orange' || _inspectionResult == 'Black') {
                                          _inspectionResult = 'Red';
                                        }
                                      });
                                    }
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    SizedBox(height: 24),
                  ],
                ),
              ),

            // STEP 2: Evidence Photo
            if (_currentStep == 1)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionLabel(label: 'Evidence Photo', icon: Icons.photo_library_outlined, isOptional: true),
                    SizedBox(height: 8),
                    Text(
                      'Capture photo evidence before submitting. This step is crucial for auditing.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    SizedBox(height: 12),
                    if (_evidenceLocalPaths.isNotEmpty) ...[
                      SizedBox(
                        height: 240,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _evidenceLocalPaths.length,
                          separatorBuilder: (_, _) => SizedBox(width: 8),
                          itemBuilder: (ctx, i) {
                            return Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(16),
                                  child: Image.file(
                                    File(_evidenceLocalPaths[i]),
                                    height: 240,
                                    width: 180,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                Positioned(
                                  top: 8,
                                  right: 8,
                                  child: GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _evidenceLocalPaths.removeAt(i);
                                        _uploadedPhotoUrls.clear();
                                      });
                                    },
                                    child: Container(
                                      padding: EdgeInsets.all(6),
                                      decoration: BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                                      child: Icon(Icons.close, color: Colors.white, size: 18),
                                    ),
                                  ),
                                )
                              ],
                            );
                          },
                        ),
                      ),
                      SizedBox(height: 12),
                      Row(
                        children: [
                          TextButton.icon(
                            onPressed: _uploadingEvidence ? null : _showPickerOptions,
                            icon: Icon(Icons.add_photo_alternate_outlined, size: 18),
                            label: Text('Add More'),
                          ),
                          TextButton.icon(
                            onPressed: _uploadingEvidence ? null : _clearEvidence,
                            icon: Icon(Icons.delete_outline, size: 18),
                            label: Text('Remove All'),
                          ),
                          const Spacer(),
                          if (_uploadedPhotoUrls.isNotEmpty)
                            Row(
                              children: [
                                Icon(Icons.check_circle, color: context.adaptivePrimary, size: 18),
                                SizedBox(width: 4),
                                Text('Uploaded', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: context.adaptivePrimary)),
                              ],
                            ),
                        ],
                      ),
                    ] else
                      GestureDetector(
                        onTap: _showPickerOptions,
                        child: Container(
                          height: 160,
                          decoration: BoxDecoration(
                            color: context.adaptiveBackground,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: context.adaptivePrimary.withValues(alpha: 0.3)),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.add_photo_alternate_outlined, size: 48, color: context.adaptivePrimary.withValues(alpha: 0.6)),
                              SizedBox(height: 12),
                              Text('Tap to take or choose photos', style: TextStyle(fontSize: 14, color: Colors.grey[500])),
                            ],
                          ),
                        ),
                      ),
                    if (_evidenceLocalPaths.isNotEmpty) ...[
                      SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: OutlinedButton.icon(
                          onPressed: _uploadingEvidence || _uploadedPhotoUrls.isNotEmpty ? null : _uploadEvidence,
                          icon: _uploadingEvidence
                              ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: context.adaptivePrimary))
                              : Icon(Icons.cloud_upload_outlined),
                          label: Text(_uploadedPhotoUrls.isNotEmpty ? 'Evidence uploaded successfully' : 'Upload evidence to server'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: context.adaptivePrimary,
                            side: BorderSide(color: context.adaptivePrimary, width: 1.5),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                    SizedBox(height: 24),
                  ],
                ),
              ),

            // STEP 3: Remarks & Submit
            if (_currentStep == 2)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionLabel(label: 'Remarks', icon: Icons.comment_outlined, isOptional: true),
                    SizedBox(height: 8),
                    Text(
                      'Any additional notes for the admin review process?',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    SizedBox(height: 12),
                    TextField(
                      controller: _remarksController,
                      maxLines: 5,
                      decoration: InputDecoration(
                        hintText: 'e.g., Owner requested a follow up next week...',
                        hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
                        filled: true,
                        fillColor: context.adaptiveBackground,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: context.adaptiveBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: context.adaptiveBorder)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: context.adaptivePrimary)),
                      ),
                    ),
                    SizedBox(height: 24),
                  ],
                ),
              ),

            // Navigation Footer
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: EdgeInsets.fromLTRB(24, 16, 24, 12 + MediaQuery.of(context).padding.bottom),
              decoration: BoxDecoration(
                color: context.adaptiveSurface,
                border: Border(top: BorderSide(color: context.adaptiveBorder)),
              ),
              child: Row(
                children: [
                  if (_currentStep > 0) ...[
                    Expanded(
                      flex: 1,
                      child: OutlinedButton(
                        onPressed: _submitting || _uploadingEvidence ? null : _prevStep,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          side: BorderSide(color: context.adaptiveBorder),
                        ),
                        child: Text('Back', style: TextStyle(color: context.adaptiveTextDark, fontWeight: FontWeight.bold, fontSize: 15)),
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _submitting || _uploadingEvidence
                          ? null
                          : (_currentStep == 2 ? _onSubmit : _nextStep),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: AppColors.darkGreen,
                        disabledBackgroundColor: AppColors.darkGreen.withValues(alpha: 0.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _submitting
                          ? SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text(_currentStep == 2 ? 'Submit Report' : 'Next Step', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
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
      color: selected ? color.withValues(alpha: 0.15) : context.adaptiveBackground,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: selected ? color : context.adaptiveBorder, width: selected ? 2 : 1),
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
  final bool isRequired;
  final bool isOptional;

  const _SectionLabel({
    required this.label, 
    required this.icon,
    this.isRequired = false,
    this.isOptional = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: context.adaptivePrimary),
        SizedBox(width: 8),
        Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.adaptiveTextDark)),
        if (isRequired) ...[
          SizedBox(width: 4),
          Text('*', style: TextStyle(color: Colors.red, fontSize: 16, fontWeight: FontWeight.bold)),
        ],
        if (isOptional) ...[
          SizedBox(width: 6),
          Text('(Optional)', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.normal)),
        ],
      ],
    );
  }
}
