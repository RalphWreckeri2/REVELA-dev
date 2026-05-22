import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../theme/app_theme.dart';
import '../service/auth_service.dart';
import '../pages/inspection_page.dart';
import '../pages/settings_screen.dart';

class AppSidebar extends StatefulWidget {
  const AppSidebar({super.key});

  @override
  State<AppSidebar> createState() => _AppSidebarState();
}

class _AppSidebarState extends State<AppSidebar> {
  String _fullName = 'Loading...';
  String _role = 'Loading...';
  String _initials = '';

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    try {
      const storage = FlutterSecureStorage();

      String name = await storage.read(key: 'user_fullName') ?? '';
      String role = await storage.read(key: 'user_role') ?? '';

      if (name.isEmpty) name = 'Unknown User';
      if (role.isEmpty) role = 'Inspector';

      String initials = '?';
      if (name != 'Unknown User') {
        final names = name
            .split(' ')
            .where((n) => n.trim().isNotEmpty)
            .toList();
        if (names.isNotEmpty) {
          initials = names
              .map((n) => n[0])
              .join('')
              .substring(0, names.length > 1 ? 2 : 1)
              .toUpperCase();
        }
      }

      if (mounted) {
        setState(() {
          _fullName = name;
          _role = role;
          _initials = initials;
        });
      }
    } catch (e) {
      debugPrint('Error loading user data: $e');
      if (mounted) {
        setState(() {
          _fullName = 'Unknown User';
          _role = 'Inspector';
          _initials = '?';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Column(
        children: [
          // Header - Similar to Angkas' Profile Section
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(color: AppColors.darkGreen),
            currentAccountPicture: CircleAvatar(
              backgroundColor: AppColors.gold,
              child: _initials.isNotEmpty
                  ? Text(
                      _initials,
                      style: const TextStyle(
                        color: AppColors.darkGreen,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : const Icon(
                      Icons.person,
                      color: AppColors.darkGreen,
                      size: 40,
                    ),
            ),
            accountName: Text(
              _fullName,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            accountEmail: Text(_role),
          ),

          // Navigation Items
          _buildDrawerItem(
            icon: Icons.map_outlined,
            label: 'Map View',
            onTap: () => Navigator.pop(context),
          ),
          _buildDrawerItem(
            icon: Icons.assignment_outlined,
            label: 'Task Assignment',
            onTap: () {
              Navigator.pop(context); // close drawer first
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const InspectionPage()),
              );
            },
          ),
          const Divider(),

          _buildDrawerItem(
            icon: Icons.settings_outlined,
            label: 'Settings',
            onTap: () {
              Navigator.pop(context); // close drawer first
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              );
            },
          ),

          const Spacer(), // Pushes logout to the bottom

          _buildDrawerItem(
            icon: Icons.logout_rounded,
            label: 'Log Out',
            textColor: Colors.redAccent,
            iconColor: Colors.redAccent,
            onTap: () async {
              Navigator.pop(context); // close drawer first

              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Log Out'),
                  content: const Text('Are you sure you want to log out?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text(
                        'Log Out',
                        style: TextStyle(color: Colors.redAccent),
                      ),
                    ),
                  ],
                ),
              );

              if (confirm == true) {
                await AuthService().logout();
              }
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String label,
    required Function() onTap,
    Color? textColor,
    Color? iconColor,
  }) {
    return ListTile(
      leading: Icon(icon, color: iconColor ?? AppColors.midGreen),
      title: Text(
        label,
        style: TextStyle(
          color: textColor ?? AppColors.textDark,
          fontWeight: FontWeight.w500,
        ),
      ),
      onTap: onTap,
    );
  }
}
