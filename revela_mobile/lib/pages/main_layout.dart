import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'dashboard_page.dart';
import 'home_page.dart';
import 'inspection_page.dart';
import 'notifications_page.dart';
import 'settings_screen.dart';
import '../theme/app_theme.dart';
import '../widgets/app_background.dart';
import '../service/in_app_notifications_service.dart';
import '../widgets/scale_tap.dart';
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

  // True while the user is scrolling down through page content; makes the
  // navbar shrink. Goes back to false (navbar full size) when they scroll
  // back up.
  bool _isNavBarCollapsed = false;

  // True while the indicator should be popped out taller than the pill —
  // during a drag, and briefly after a tap/drag-end selection settles.
  // Goes back to false once it's settled on the chosen page, so the
  // indicator returns to its normal, flush-with-the-pill size.
  bool _isIndicatorPopped = false;
  Timer? _popTimer;

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
        onSwitchTab: _onItemTapped,
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
    _popTimer?.cancel();
    super.dispose();
  }

  void _onItemTapped(int index) {
    HapticFeedback.lightImpact();
    setState(() {
      _selectedIndex = index;
    });
    _popIndicator();
  }

  // Pops the indicator taller than the pill right away, then — once it's
  // had time to land on the chosen tab — lets it animate back down to its
  // normal, flush size.
  void _popIndicator() {
    _popTimer?.cancel();
    setState(() => _isIndicatorPopped = true);
    _popTimer = Timer(const Duration(milliseconds: 300), () {
      if (mounted) setState(() => _isIndicatorPopped = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Scaffold paints its own opaque background by default; without this,
      // that base color shows through the navbar's transparent gaps.
      backgroundColor: Colors.transparent,
      extendBody: true, // Allows the body to flow underneath the bottom nav bar
      body: AppBackground(
        child: NotificationListener<UserScrollNotification>(
          // ScrollNotifications bubble up past IndexedStack automatically,
          // so this catches scrolling from whichever page/tab is active
          // without each page needing to know about the navbar.
          onNotification: (notification) {
            if (notification.direction == ScrollDirection.reverse &&
                !_isNavBarCollapsed) {
              setState(() => _isNavBarCollapsed = true);
            } else if (notification.direction == ScrollDirection.forward &&
                _isNavBarCollapsed) {
              setState(() => _isNavBarCollapsed = false);
            }
            return false;
          },
          child: IndexedStack(index: _selectedIndex, children: _pages),
        ),
      ),
      // Scaffold wraps bottomNavigationBar in its own opaque Material, which
      // can bleed elevation/shadow artifacts through our transparent gaps.
      // Giving it an explicit transparent Material of our own prevents that.
      bottomNavigationBar: Material(
        type: MaterialType.transparency,
        child: AnimatedSlide(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          offset: _isNavBarVisible ? Offset.zero : const Offset(0, 2.0),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.only(
                left: 20,
                right: 20,
                bottom: 24,
                top: 8,
              ),
              child: AnimatedScale(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeInOut,
                alignment: Alignment.bottomCenter,
                scale: _isDragging ? 0.96 : (_isNavBarCollapsed ? 0.82 : 1.0),
                child: Stack(
                  // Clip.none lets the indicator layer below pop outside the
                  // pill's own footprint instead of being cut off at its edge.
                  clipBehavior: Clip.none,
                  children: [
                    // Layer 1: the frosted glass pill. This is the ONLY thing
                    // clipped to the rounded rect — the indicator lives
                    // outside this subtree so it's never subject to this clip.
                    Positioned.fill(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(30),
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                          child: Container(
                            decoration: BoxDecoration(
                              color: context.adaptiveSurface.withValues(
                                alpha: 0.85,
                              ),
                              borderRadius: BorderRadius.circular(30),
                              boxShadow: [
                                BoxShadow(
                                  color: _isDragging
                                      ? AppColors.darkGreen.withValues(
                                          alpha: 0.3,
                                        )
                                      : Colors.black.withValues(alpha: 0.1),
                                  blurRadius: _isDragging ? 30 : 20,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                              border: Border.all(
                                color: _isDragging
                                    ? AppColors.darkGreen.withValues(alpha: 0.5)
                                    : (context.isDarkMode
                                          ? Colors.white24
                                          : Colors.black12),
                                width: 1,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    // Layer 2 & 3: indicator + icons. This subtree determines
                    // the Stack's size (matching the old content height) and
                    // is unclipped, so the indicator is free to render taller
                    // than the pill behind it.
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8.0,
                        vertical: 8.0,
                      ),
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          final tabWidth = constraints.maxWidth / 5;
                          final currentLeft = _isDragging && _dragOffset != null
                              ? _dragOffset!
                              : _selectedIndex * tabWidth;

                          final effectiveSelectedIndex =
                              _isDragging && _dragOffset != null
                              ? (_dragOffset! / tabWidth).round()
                              : _selectedIndex;

                          return GestureDetector(
                            onHorizontalDragStart: (details) {
                              _popTimer?.cancel();
                              setState(() {
                                _isDragging = true;
                                _isIndicatorPopped = true;
                                _dragOffset = _selectedIndex * tabWidth;
                              });
                            },
                            onHorizontalDragUpdate: (details) {
                              setState(() {
                                _dragOffset =
                                    (_dragOffset ?? 0) + details.delta.dx;
                                if (_dragOffset! < 0) _dragOffset = 0;
                                if (_dragOffset! >
                                    constraints.maxWidth - tabWidth) {
                                  _dragOffset = constraints.maxWidth - tabWidth;
                                }
                              });
                            },
                            onHorizontalDragEnd: (details) {
                              final closestIndex = (_dragOffset! / tabWidth)
                                  .round();
                              setState(() {
                                _isDragging = false;
                                _dragOffset = null;
                              });
                              if (closestIndex != _selectedIndex) {
                                // Changes the tab and, via _onItemTapped,
                                // schedules the indicator's collapse.
                                _onItemTapped(closestIndex);
                              } else {
                                // Same tab as before — still let the
                                // indicator settle back to normal size.
                                _popIndicator();
                              }
                            },
                            child: Stack(
                              // Not clipped to the icon row's own bounds, so
                              // the AnimatedPositioned indicator below can
                              // extend above/below it and still be visible.
                              clipBehavior: Clip.none,
                              children: [
                                AnimatedPositioned(
                                  duration: Duration(
                                    milliseconds: _isDragging ? 0 : 350,
                                  ),
                                  curve: Curves.easeOutCirc,
                                  left: currentLeft,
                                  // Negative top/bottom pops the indicator
                                  // taller than the icon row while choosing a
                                  // tab; it animates back to 0 (flush with
                                  // the pill) once _isIndicatorPopped clears.
                                  top: _isIndicatorPopped ? -14 : 0,
                                  bottom: _isIndicatorPopped ? -14 : 0,
                                  width: tabWidth,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: AppColors.darkGreen,
                                      borderRadius: BorderRadius.circular(26),
                                      boxShadow: [
                                        BoxShadow(
                                          color: AppColors.darkGreen.withValues(
                                            alpha: 0.4,
                                          ),
                                          blurRadius: 16,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                // Icons render after (on top of) the
                                // indicator so they stay legible against it.
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceAround,
                                  children: List.generate(5, (index) {
                                    IconData iconData;
                                    bool hasAlert = false;
                                    switch (index) {
                                      case 0:
                                        iconData = Icons.dashboard_rounded;
                                        break;
                                      case 1:
                                        iconData = Icons.map_rounded;
                                        break;
                                      case 2:
                                        iconData = Icons.assignment_rounded;
                                        break;
                                      case 3:
                                        iconData = Icons.notifications_rounded;
                                        hasAlert = _unreadAlerts > 0;
                                        break;
                                      case 4:
                                        iconData = Icons.settings_rounded;
                                        break;
                                      default:
                                        iconData = Icons.circle;
                                    }
                                    final isSelected =
                                        effectiveSelectedIndex == index;
                                    return ScaleTap(
                                      scaleMinValue: 0.80,
                                      onTap: () => _onItemTapped(index),
                                      child: SizedBox(
                                        width: tabWidth,
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 14,
                                          ),
                                          child: Stack(
                                            alignment: Alignment.center,
                                            clipBehavior: Clip.none,
                                            children: [
                                              AnimatedScale(
                                                scale: isSelected ? 1.25 : 1.0,
                                                duration: const Duration(
                                                  milliseconds: 300,
                                                ),
                                                curve: Curves.easeOutBack,
                                                child: Icon(
                                                  iconData,
                                                  size: 24,
                                                  color: isSelected
                                                      ? Colors.white
                                                      : context.adaptiveTextMid,
                                                ),
                                              ),
                                              if (hasAlert)
                                                Positioned(
                                                  right: (tabWidth / 2) - 20,
                                                  top: -4,
                                                  child: Container(
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 5,
                                                          vertical: 2,
                                                        ),
                                                    decoration: BoxDecoration(
                                                      color: Colors.redAccent,
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            10,
                                                          ),
                                                    ),
                                                    constraints:
                                                        const BoxConstraints(
                                                          minWidth: 18,
                                                          minHeight: 18,
                                                        ),
                                                    child: Text(
                                                      _unreadAlerts > 9
                                                          ? '9+'
                                                          : '$_unreadAlerts',
                                                      style: const TextStyle(
                                                        color: Colors.white,
                                                        fontSize: 10,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        height: 1.4,
                                                      ),
                                                      textAlign:
                                                          TextAlign.center,
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
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
