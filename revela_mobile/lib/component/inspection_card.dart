import 'package:revela_mobile/theme/app_theme.dart';
import 'package:flutter/material.dart';
import '../service/inspection_service.dart';

class InspectionCard extends StatelessWidget {
  final InspectionTask task;
  final VoidCallback? onTap;

  const InspectionCard({super.key, required this.task, this.onTap});

  Color get _flagColor {
    switch (task.flagColor) {
      case 'Red':
        return const Color(0xFFEF4444);
      case 'Yellow':
        return const Color(0xFFF59E0B);
      case 'Black':
        return const Color(0xFF1E293B);
      default:
        return const Color(0xFF22C55E);
    }
  }

  Color get _flagBg {
    switch (task.flagColor) {
      case 'Red':
        return const Color(0xFFFFEDED);
      case 'Yellow':
        return const Color(0xFFFFF8E7);
      case 'Black':
        return const Color(0xFFF1F5F9);
      default:
        return const Color(0xFFEDFDF5);
    }
  }

  IconData get _flagIcon {
    switch (task.flagColor) {
      case 'Red':
        return Icons.warning_rounded;
      case 'Yellow':
        return Icons.help_rounded;
      case 'Black':
        return Icons.block_rounded;
      default:
        return Icons.verified_rounded;
    }
  }

  String get _flagLabel {
    switch (task.flagColor) {
      case 'Red':
        return 'Unregistered';
      case 'Yellow':
        return 'Suspected';
      case 'Black':
        return 'Non-Responsive';
      default:
        return 'Compliant';
    }
  }

  String _formatDate(String timestamp) {
    try {
      final dt = DateTime.parse(timestamp);
      final months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      final hour = dt.hour > 12
          ? dt.hour - 12
          : dt.hour == 0
          ? 12
          : dt.hour;
      final ampm = dt.hour >= 12 ? 'PM' : 'AM';
      final min = dt.minute.toString().padLeft(2, '0');
      return '${months[dt.month - 1]} ${dt.day} · $hour:$min $ampm';
    } catch (_) {
      return timestamp.length > 10 ? timestamp.substring(0, 10) : timestamp;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.adaptiveSurface,
          borderRadius: BorderRadius.circular(18),
          border: context.isDarkMode ? Border.all(color: Colors.grey, width: 1) : null,
          boxShadow: [
            BoxShadow(
              color: context.isDarkMode ? Colors.transparent : Colors.black.withOpacity(0.06),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
            BoxShadow(
              color: context.isDarkMode ? Colors.transparent : Colors.black.withOpacity(0.03),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // ── Left icon box ───────────────────────────────────────────────
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _flagBg,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(_flagIcon, color: _flagColor, size: 24),
            ),

            SizedBox(width: 14),

            // ── Middle: main info ───────────────────────────────────────────
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Business name
                  Text(
                    task.detectedName,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: context.adaptiveTextDark,
                      letterSpacing: -0.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 3),

                  // Barangay
                  Row(
                    children: [
                      Icon(
                        Icons.location_on_outlined,
                        size: 11,
                        color: context.adaptiveTextMid,
                      ),
                      SizedBox(width: 3),
                      Flexible(
                        child: Text(
                          task.barangayName,
                          style: TextStyle(
                            fontSize: 12,
                            color: context.adaptiveTextMid,
                            fontWeight: FontWeight.w400,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),

                  // Bottom row: flag label + timestamp
                  Row(
                    children: [
                      // Flag pill
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: _flagBg,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _flagLabel,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: _flagColor,
                          ),
                        ),
                      ),
                      SizedBox(width: 6),

                      // Status pill
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: context.adaptiveBorder,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          task.verificationStatus,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: context.adaptiveTextMid,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            SizedBox(width: 10),

            // ── Right: ID + time ────────────────────────────────────────────
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '#${task.reportID}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: context.adaptiveTextMid,
                    fontFamily: 'monospace',
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  _formatDate(task.irTimestamp),
                  style: TextStyle(
                    fontSize: 10,
                    color: context.adaptiveTextMid,
                    fontWeight: FontWeight.w400,
                  ),
                  textAlign: TextAlign.right,
                ),
                SizedBox(height: 8),
                Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 12,
                  color: context.adaptiveTextLight,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
