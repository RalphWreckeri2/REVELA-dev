import 'package:flutter/material.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  // Mock states for the toggles (you will link these to your backend/local storage)
  bool _is2faEnabled = false;
  bool _emailAlertsEnabled = true;
  bool _isDarkMode = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          const _SectionHeader(title: 'Account Security'),

          // --- CHANGE PASSWORD ---
          ListTile(
            leading: const Icon(Icons.lock_outline),
            title: const Text('Change Password'),
            subtitle: const Text('Update your current password'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              _showChangePasswordDialog(context);
            },
          ),

          // --- TWO FACTOR AUTHENTICATION ---
          SwitchListTile(
            secondary: const Icon(Icons.security),
            title: const Text('Two-Factor Authentication (2FA)'),
            subtitle: const Text(
              'Add an extra layer of security to your account',
            ),
            value: _is2faEnabled,
            onChanged: (bool value) {
              setState(() {
                _is2faEnabled = value;
              });
              // TODO: Call API /api/auth/setup-2fa or disable-2fa
            },
          ),

          const Divider(),
          const _SectionHeader(title: 'Preferences'),

          // --- EMAIL ALERTS ---
          SwitchListTile(
            secondary: const Icon(Icons.notifications_active_outlined),
            title: const Text('Email Inspection Alerts'),
            subtitle: const Text(
              'Receive emails when assigned a new inspection',
            ),
            value: _emailAlertsEnabled,
            onChanged: (bool value) {
              setState(() {
                _emailAlertsEnabled = value;
              });
              // TODO: Call API /api/auth/me/preferences
            },
          ),

          // --- DARK MODE ---
          SwitchListTile(
            secondary: const Icon(Icons.dark_mode_outlined),
            title: const Text('Dark Mode'),
            subtitle: const Text('Switch between light and dark themes'),
            value: _isDarkMode,
            onChanged: (bool value) {
              setState(() {
                _isDarkMode = value;
              });
              // TODO: Update your app's ThemeProvider here
            },
          ),

          const Divider(),
          const _SectionHeader(title: 'Other'),

          // --- ABOUT APP ---
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('About REVELA'),
            onTap: () {
              showAboutDialog(
                context: context,
                applicationName: 'REVELA Mobile',
                applicationVersion: '1.0.0',
                applicationLegalese: '© 2024 REVELA',
              );
            },
          ),

          // --- LOGOUT ---
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Logout', style: TextStyle(color: Colors.red)),
            onTap: () {
              // TODO: Clear local token and navigate to LoginScreen
            },
          ),
        ],
      ),
    );
  }

  // Dialog for changing the password
  void _showChangePasswordDialog(BuildContext context) {
    final oldPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Change Password'),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: oldPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Current Password',
                  ),
                  validator: (val) =>
                      val != null && val.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: newPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New Password'),
                  validator: (val) {
                    if (val == null || val.isEmpty) return 'Required';
                    if (val.length < 8) return 'Must be at least 8 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: confirmPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Confirm New Password',
                  ),
                  validator: (val) {
                    if (val != newPasswordController.text)
                      return 'Passwords do not match';
                    return null;
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                if (formKey.currentState!.validate()) {
                  // TODO: Call your backend /api/auth/change-password endpoint here

                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Password changed successfully'),
                    ),
                  );
                }
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }
}

/// A small reusable widget for rendering section headers in the settings list
class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({Key? key, required this.title}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 8.0),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}
