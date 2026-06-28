import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../service/auth_service.dart';
import '../main.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _is2faEnabled = false;
  bool _emailAlertsEnabled = true;
  bool _isDarkMode = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);
    final profile = await AuthService().getProfile();
    final prefs = await SharedPreferences.getInstance();
    final isDark = prefs.getBool('is_dark_mode') ?? false;

    if (mounted) {
      setState(() {
        if (profile != null) {
          _is2faEnabled = profile['is_2fa_enabled'] == true;
          _emailAlertsEnabled = profile['emailInspectionAlerts'] == true;
        }
        _isDarkMode = isDark;
        _isLoading = false;
      });
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.redAccent : Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
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
                    _handle2FAChange(value);
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
                  onChanged: (bool value) async {
                    setState(() => _emailAlertsEnabled = value);
                    final success = await AuthService().updateEmailAlerts(value);
                    if (!success) {
                      setState(() => _emailAlertsEnabled = !value);
                      _showSnackBar('Failed to update preference', isError: true);
                    } else {
                      _showSnackBar('Preference updated');
                    }
                  },
                ),

                // --- DARK MODE ---
                SwitchListTile(
                  secondary: const Icon(Icons.dark_mode_outlined),
                  title: const Text('Dark Mode'),
                  subtitle: const Text('Switch between light and dark themes'),
                  value: _isDarkMode,
                  onChanged: (bool value) async {
                    setState(() => _isDarkMode = value);
                    themeModeNotifier.value = value ? ThemeMode.dark : ThemeMode.light;
                    final prefs = await SharedPreferences.getInstance();
                    await prefs.setBool('is_dark_mode', value);
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
                  onTap: () async {
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
                              style: TextStyle(color: Colors.red),
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
              ],
            ),
    );
  }

  void _handle2FAChange(bool enable) async {
    if (enable) {
      final res = await AuthService().setup2FA();
      if (res == null || res['secret'] == null) {
        _showSnackBar('Failed to initialize 2FA setup', isError: true);
        return;
      }
      final String secret = res['secret'];
      final String? otpUri = res['otpUri'];
      _show2FASetupDialog(secret, otpUri);
    } else {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Disable 2FA'),
          content: const Text('Are you sure you want to disable Two-Factor Authentication?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Disable', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      );

      if (confirm == true) {
        final success = await AuthService().disable2FA();
        if (success) {
          setState(() => _is2faEnabled = false);
          _showSnackBar('2FA disabled successfully');
        } else {
          _showSnackBar('Failed to disable 2FA', isError: true);
        }
      }
    }
  }

  void _show2FASetupDialog(String secret, String? otpUri) {
    final codeController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isSubmitting = false;
    String? errorMsg;
    final qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${Uri.encodeComponent(otpUri ?? secret)}';

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Setup 2FA'),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Scan this QR code with your Authenticator App (e.g. Google Authenticator):',
                        style: TextStyle(fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      Container(
                        width: 180,
                        height: 180,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Image.network(
                          qrUrl,
                          fit: BoxFit.contain,
                          loadingBuilder: (ctx, child, progress) {
                            if (progress == null) return child;
                            return const Center(child: CircularProgressIndicator());
                          },
                          errorBuilder: (ctx, err, stack) => const Center(
                            child: Icon(Icons.qr_code, size: 80, color: Colors.grey),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Or manually enter this secret key:',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      const SizedBox(height: 4),
                      SelectableText(
                        secret,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          letterSpacing: 1.2,
                          color: Colors.blueAccent,
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (errorMsg != null) ...[
                        Text(
                          errorMsg!,
                          style: const TextStyle(color: Colors.red, fontSize: 12),
                        ),
                        const SizedBox(height: 8),
                      ],
                      TextFormField(
                        controller: codeController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Enter 6-Digit Code',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => v == null || v.length < 6 ? 'Enter 6-digit code' : null,
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogCtx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (formKey.currentState!.validate()) {
                            setDialogState(() {
                              isSubmitting = true;
                              errorMsg = null;
                            });
                            final result = await AuthService().verify2FASetup(codeController.text.trim());
                            if (result['success'] == true) {
                              if (mounted) {
                                Navigator.pop(dialogCtx);
                                setState(() => _is2faEnabled = true);
                                _showSnackBar('2FA enabled successfully!');
                              }
                            } else {
                              setDialogState(() {
                                isSubmitting = false;
                                errorMsg = result['error'] ?? 'Verification failed';
                              });
                            }
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Enable'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final oldPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool obscureOld = true;
    bool obscureNew = true;
    bool obscureConfirm = true;
    bool isSubmitting = false;
    String? errorMsg;

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Change Password'),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (errorMsg != null) ...[
                        Text(
                          errorMsg!,
                          style: const TextStyle(color: Colors.red, fontSize: 12),
                        ),
                        const SizedBox(height: 8),
                      ],
                      TextFormField(
                        controller: oldPasswordController,
                        obscureText: obscureOld,
                        decoration: InputDecoration(
                          labelText: 'Current Password',
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscureOld ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            ),
                            onPressed: () => setDialogState(() => obscureOld = !obscureOld),
                          ),
                        ),
                        validator: (val) => val != null && val.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: newPasswordController,
                        obscureText: obscureNew,
                        decoration: InputDecoration(
                          labelText: 'New Password (min. 8 chars)',
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscureNew ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            ),
                            onPressed: () => setDialogState(() => obscureNew = !obscureNew),
                          ),
                        ),
                        validator: (val) {
                          if (val == null || val.isEmpty) return 'Required';
                          if (val.length < 8) return 'Must be at least 8 characters';
                          return null;
                        },
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: confirmPasswordController,
                        obscureText: obscureConfirm,
                        decoration: InputDecoration(
                          labelText: 'Confirm New Password',
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            ),
                            onPressed: () => setDialogState(() => obscureConfirm = !obscureConfirm),
                          ),
                        ),
                        validator: (val) {
                          if (val != newPasswordController.text) return 'Passwords do not match';
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogCtx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (formKey.currentState!.validate()) {
                            setDialogState(() {
                              isSubmitting = true;
                              errorMsg = null;
                            });
                            final res = await AuthService().changePassword(
                              oldPasswordController.text,
                              newPasswordController.text,
                            );
                            if (res['success'] == true) {
                              if (mounted) {
                                Navigator.pop(dialogCtx);
                                _showSnackBar('Password changed successfully');
                              }
                            } else {
                              setDialogState(() {
                                isSubmitting = false;
                                errorMsg = res['error'] ?? 'Failed to change password';
                              });
                            }
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}

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
