import 'package:flutter/material.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';

class HistoryDetailPage extends StatelessWidget {
  final InspectionTask? task;

  const HistoryDetailPage({super.key, this.task});

  @override
  Widget build(BuildContext context) {
    // Supports both direct push (task passed) and named route
    final InspectionTask? resolvedTask =
        task ?? ModalRoute.of(context)?.settings.arguments as InspectionTask?;

    if (resolvedTask == null) {
      return Scaffold(
        appBar: AppBar(title: Text('Detail')),
        body: Center(child: Text('No inspection data found.')),
      );
    }

    return Scaffold(
      backgroundColor: context.adaptiveBackground,
      appBar: AppBar(
        backgroundColor: context.adaptiveSurface,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: context.adaptivePrimary,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Inspection Report',
          style: TextStyle(
            color: context.adaptiveTextDark,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Business Card ──────────────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: context.adaptiveSurface,
                borderRadius: BorderRadius.circular(20),
                border: context.isDarkMode ? Border.all(color: Colors.grey.shade700, width: 1) : null,
                boxShadow: [
                  BoxShadow(
                    blurRadius: 10,
                    color: Colors.black.withValues(alpha: 0.08),
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: context.adaptivePrimary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(
                          Icons.storefront_outlined,
                          color: context.adaptivePrimary,
                          size: 28,
                        ),
                      ),
                      SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Business Name',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            Text(
                              resolvedTask.detectedName,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: context.adaptiveTextDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 28),

                  // Row: Inspector
                  _DetailRow(
                    icon: Icons.person_outline_rounded,
                    label: 'Inspector',
                    value: 'Unknown', // Inspector name not available in model
                  ),
                  SizedBox(height: 12),

                  // Row: Inspection Date
                  _DetailRow(
                    icon: Icons.calendar_today_outlined,
                    label: 'Inspection Date',
                    value: resolvedTask.irTimestamp,
                  ),
                  SizedBox(height: 12),

                  // Row: Address
                  _DetailRow(
                    icon: Icons.location_on_outlined,
                    label: 'Address',
                    value: resolvedTask.barangayName,
                  ),
                ],
              ),
            ),

            SizedBox(height: 20),

            // ── Inspection Details ─────────────────────────────────────────
            _SectionHeader(title: 'Inspection Details'),
            SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: context.adaptiveSurface,
                borderRadius: BorderRadius.circular(20),
                border: context.isDarkMode ? Border.all(color: Colors.grey.shade700, width: 1) : null,
                boxShadow: [
                  BoxShadow(
                    blurRadius: 10,
                    color: Colors.black.withValues(alpha: 0.08),
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status chip
                  Row(
                    children: [
                      Text(
                        'Status: ',
                        style: TextStyle(
                          color: Colors.grey,
                          fontWeight: FontWeight.w500,
                          fontSize: 13,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: resolvedTask.verificationStatus == 'Assigned'
                              ? Colors.blue.withValues(alpha: 0.1)
                              : Colors.green.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                border: context.isDarkMode ? Border.all(color: Colors.grey.shade700, width: 1) : null,
                        ),
                        child: Text(
                          resolvedTask.verificationStatus,
                          style: TextStyle(
                            color: resolvedTask.verificationStatus == 'Assigned'
                                ? Colors.blue
                                : Colors.green,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 16),

                  if (resolvedTask.inspectionResult != null &&
                      resolvedTask.inspectionResult!.isNotEmpty) ...[
                    Text(
                      'Recorded result',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: context.adaptiveTextDark,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      resolvedTask.inspectionResult!,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    SizedBox(height: 16),
                  ],

                  if (resolvedTask.inspectionResult == 'Given First Notice' ||
                      (resolvedTask.remarks != null && resolvedTask.remarks!.contains('Given First Notice'))) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.orange.shade300),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 22),
                          SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Given First Notice',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.orange),
                                ),
                                Text(
                                  'First official compliance notice was issued to this establishment.',
                                  style: TextStyle(fontSize: 11, color: Colors.black87),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 16),
                  ],

                  // Remarks
                  Text(
                    'Remarks',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: context.adaptiveTextDark,
                    ),
                  ),
                  SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Text(
                      resolvedTask.remarks ?? 'No remarks provided.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[700],
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            SizedBox(height: 20),

            // ── Evidence Section ───────────────────────────────────────────
            _SectionHeader(title: 'Evidence'),
            SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: context.adaptiveSurface,
                borderRadius: BorderRadius.circular(20),
                border: context.isDarkMode ? Border.all(color: Colors.grey.shade700, width: 1) : null,
                boxShadow: [
                  BoxShadow(
                    blurRadius: 10,
                    color: Colors.black.withValues(alpha: 0.08),
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: resolvedTask.photoPaths.isNotEmpty
                  ? SizedBox(
                      height: 180,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: resolvedTask.photoPaths.length,
                        separatorBuilder: (_, __) => SizedBox(width: 8),
                        itemBuilder: (ctx, i) {
                          final absoluteUrl = InspectionService.mediaAbsoluteUrl(resolvedTask.photoPaths[i]);
                          if (absoluteUrl == null) return const SizedBox();
                          return ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.network(
                              absoluteUrl,
                              height: 180,
                              width: 140,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Container(
                                height: 180,
                                width: 140,
                                color: Colors.grey[200],
                                child: Icon(Icons.broken_image_outlined, color: Colors.grey),
                              ),
                            ),
                          );
                        },
                      ),
                    )
                  : Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Column(
                          children: [
                            Icon(
                              Icons.photo_library_outlined,
                              size: 40,
                              color: Colors.grey[300],
                            ),
                            SizedBox(height: 8),
                            Text(
                              'No evidence photos.',
                              style: TextStyle(
                                color: Colors.grey[400],
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
            ),

            SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: Colors.grey),
        SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
              SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: context.adaptiveTextDark,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Section Header ───────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.bold,
        color: context.adaptiveTextDark,
      ),
    );
  }
}
