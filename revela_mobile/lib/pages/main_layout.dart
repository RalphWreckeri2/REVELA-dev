import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dashboard_page.dart';
import 'home_page.dart';
import 'inspection_page.dart';
import 'notifications_page.dart';
import 'pdf_generator_page.dart';
import 'settings_screen.dart';
import '../theme/app_theme.dart';
import '../service/in_app_notifications_service.dart';
import 'dart:async';

class MainLayout extends StatefulWidget {
  final int initialIndex;
  const MainLayout({super.key, this.initialIndex = 0});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  late int _selectedIndex;
  bool _isNavBarVisible = true;
  late final List<Widget> _pages;
  
  int _unreadAlerts = 0;
  Timer? _pollingTimer;

  double? _dragOffset;
  bool _isDragging = false;

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex;
    _pages = [
      DashboardPage(
        onDrawerToggled: (expanded) {
          setState(() {
            _isNavBarVisible = !expanded;
          });
        },
      ),
      HomePage(
        onDrawerToggled: (expanded) {
          setState(() {
            _isNavBarVisible = !expanded;
          });
        },
      ),
      InspectionPage(
        onDrawerToggled: (expanded) {
          setState(() {
            _isNavBarVisible = !expanded;
          });
        },
      ),
      NotificationsPage(
        onDrawerToggled: (expanded) {
          setState(() {
            _isNavBarVisible = !expanded;
          });
        },
      ),
      const PdfGeneratorPage(),
      const SettingsScreen(),
    ];
    _fetchUnreadCount();
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _fetchUnreadCount();
    });
  }

  Future<void> _fetchUnreadCount() async {
    try {
      final count = await InAppNotificationsService().fetchUnreadCount();
      if (mounted) {
        setState(() {
          _unreadAlerts = count;
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  void _onItemTapped(int index) {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true, // Allows the body to flow underneath the bottom nav bar
      body: IndexedStack(
        index: _selectedIndex,
        children: _pages,
      ),
      bottomNavigationBar: AnimatedSlide(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
        offset: _isNavBarVisible ? Offset.zero : const Offset(0, 2.0),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.only(left: 20, right: 20, bottom: 24, top: 8),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(30),
              child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
              child: Container(
                decoration: BoxDecoration(
                  color: context.adaptiveSurface.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                  border: Border.all(
                    color: context.isDarkMode ? Colors.white24 : Colors.black12,
                    width: 1,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8.0),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final tabWidth = constraints.maxWidth / 6;
                      final currentLeft = _isDragging && _dragOffset != null
                          ? _dragOffset!
                          : _selectedIndex * tabWidth;
                      
                      final effectiveSelectedIndex = _isDragging && _dragOffset != null
                          ? (_dragOffset! / tabWidth).round()
                          : _selectedIndex;

                      return GestureDetector(
                        onHorizontalDragStart: (details) {
                          setState(() {
                            _isDragging = true;
                            _dragOffset = _selectedIndex * tabWidth;
                          });
                        },
                        onHorizontalDragUpdate: (details) {
                          setState(() {
                            _dragOffset = (_dragOffset ?? 0) + details.delta.dx;
                            if (_dragOffset! < 0) _dragOffset = 0;
                            if (_dragOffset! > constraints.maxWidth - tabWidth) {
                              _dragOffset = constraints.maxWidth - tabWidth;
                            }
                          });
                        },
                        onHorizontalDragEnd: (details) {
                          final closestIndex = (_dragOffset! / tabWidth).round();
                          setState(() {
                            _isDragging = false;
                            _dragOffset = null;
                            if (closestIndex != _selectedIndex) {
                               _onItemTapped(closestIndex);
                            }
                          });
                        },
                        child: Stack(
                          children: [
                            AnimatedPositioned(
                              duration: Duration(milliseconds: _isDragging ? 0 : 350),
                              curve: Curves.easeOutCirc,
                              left: currentLeft,
                              top: 0,
                              bottom: 0,
                              width: tabWidth,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: AppColors.darkGreen,
                                  borderRadius: BorderRadius.circular(22),
                                ),
                              ),
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: List.generate(6, (index) {
                                IconData iconData;
                                bool hasAlert = false;
                                switch (index) {
                                  case 0: iconData = Icons.dashboard_rounded; break;
                                  case 1: iconData = Icons.map_rounded; break;
                                  case 2: iconData = Icons.assignment_rounded; break;
                                  case 3: 
                                    iconData = Icons.notifications_rounded; 
                                    hasAlert = _unreadAlerts > 0;
                                    break;
                                  case 4: iconData = Icons.picture_as_pdf_rounded; break;
                                  case 5: iconData = Icons.settings_rounded; break;
                                  default: iconData = Icons.circle;
                                }
                                final isSelected = effectiveSelectedIndex == index;
                                return GestureDetector(
                                  onTap: () => _onItemTapped(index),
                                  behavior: HitTestBehavior.opaque,
                                  child: SizedBox(
                                    width: tabWidth,
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      child: Stack(
                                        alignment: Alignment.center,
                                        clipBehavior: Clip.none,
                                        children: [
                                          Icon(
                                            iconData,
                                            size: 24,
                                            color: isSelected ? Colors.white : context.adaptiveTextMid,
                                          ),
                                          if (hasAlert)
                                            Positioned(
                                              right: (tabWidth / 2) - 16,
                                              top: -2,
                                              child: Container(
                                                padding: const EdgeInsets.all(2),
                                                decoration: const BoxDecoration(
                                                  color: Colors.redAccent,
                                                  shape: BoxShape.circle,
                                                ),
                                                constraints: const BoxConstraints(
                                                  minWidth: 8,
                                                  minHeight: 8,
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              }),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      ),
    );
  }
}
