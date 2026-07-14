import 'package:flutter/material.dart';
import '../service/inspection_service.dart';
import '../theme/app_theme.dart';

class TaskCard extends StatelessWidget {
  final InspectionTask task;
  final bool isCurrent;
  final bool isMissing;
  final VoidCallback onTap;

  const TaskCard({
    super.key,
    required this.task,
    required this.isCurrent,
    this.isMissing = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    bool isNearing = false;
    bool actualIsMissing = isMissing;

    if (task.deadline != null && task.deadline!.isNotEmpty) {
      try {
        final deadline = DateTime.parse(task.deadline!);
        if (deadline.isBefore(DateTime.now())) {
          actualIsMissing = true;
        } else {
          final diff = deadline.difference(DateTime.now());
          if (diff.inHours <= 24) {
            isNearing = true;
          }
        }
      } catch (_) {}
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.adaptiveSurface,
          borderRadius: BorderRadius.circular(18),
          border: isNearing
              ? Border.all(color: Colors.orange, width: 1.5)
              : context.isDarkMode
                  ? Border.all(color: Colors.grey.shade700, width: 1)
                  : null,
          boxShadow: [
            BoxShadow(
              blurRadius: 8,
              color: Colors.black.withValues(alpha: 0.08),
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Icon badge
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: actualIsMissing 
                    ? Colors.redAccent.withValues(alpha: 0.1)
                    : isNearing
                        ? Colors.orange.withValues(alpha: 0.1)
                        : isCurrent
                            ? AppColors.darkGreen.withValues(alpha: 0.1)
                            : Colors.grey.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                isCurrent || actualIsMissing
                    ? Icons.storefront_outlined
                    : Icons.assignment_turned_in_outlined,
                color: actualIsMissing 
                    ? Colors.redAccent
                    : isNearing
                        ? Colors.orange
                        : isCurrent 
                            ? AppColors.darkGreen 
                            : Colors.grey,
                size: 24,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.detectedName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    task.barangayName,
                    style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today_outlined,
                        size: 11,
                        color: isNearing ? Colors.orange[700] : Colors.grey[600],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        (task.deadline != null && task.deadline!.isNotEmpty)
                            ? 'Due: ${task.deadline}'
                            : task.irTimestamp,
                        style: TextStyle(fontSize: 11, color: isNearing ? Colors.orange[700] : Colors.grey[600]),
                      ),
                    ],
                  ),
                  if (actualIsMissing) ...[
                    const SizedBox(height: 6),
                    const Text(
                      'OVERDUE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.redAccent,
                        letterSpacing: 1,
                      ),
                    ),
                  ] else if (isNearing) ...[
                    const SizedBox(height: 6),
                    const Text(
                      'DEADLINE APPROACHING',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.orange,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(
              isCurrent ? Icons.map_outlined : Icons.chevron_right_rounded,
              color: actualIsMissing ? Colors.redAccent : isNearing ? Colors.orange : isCurrent ? AppColors.darkGreen : Colors.grey,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
