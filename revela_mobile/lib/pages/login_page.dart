import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/custom_text_field.dart';
import '../service/auth_service.dart';
import 'dashboard_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage>
    with SingleTickerProviderStateMixin {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;
  final AuthService _authService = AuthService();
  bool _isLoading = false;

  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeIn);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOut));
    _animController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animController.dispose();
    super.dispose();
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.redAccent,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _showErrorDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(
              Icons.gpp_bad_rounded,
              color: Colors.redAccent,
              size: 28,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: const TextStyle(fontSize: 14, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Understood',
              style: TextStyle(
                color: AppColors.darkGreen,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _handleLogin() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      _showSnackBar('Please fill in all fields.');
      return;
    }

    setState(() => _isLoading = true);

    // ✅ Use loginWithRole instead of login
    final LoginResult result = await _authService.loginWithRole(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (!mounted) return;

    setState(() => _isLoading = false);

    switch (result) {
      case LoginResult.success:
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const DashboardPage()),
        );
        break;
      case LoginResult.mustChangePassword:
        _showForcePasswordChangeDialog();
        break;
      case LoginResult.twoFactorRequired:
        _show2FALoginDialog();
        break;
      case LoginResult.notInspector:
        _showErrorDialog(
          'Unauthorized Access',
          'Only registered field inspectors are authorized to use the mobile application. Administrators and other personnel must log in through the web dashboard.',
        );
        break;
      case LoginResult.failed:
        _showSnackBar('Login failed. Please check your credentials.');
        break;
      case LoginResult.networkError:
        _showErrorDialog(
          'Cannot Reach Server',
          'The app could not connect to the REVELA backend.\n\n'
          '• Start the API: python app.py (in revela_backend)\n'
          '• USB device: run adb reverse tcp:5000 tcp:5000, or use '
          'DEVELOPMENT/scripts/run-mobile-usb.ps1\n'
          '• Wi‑Fi device: flutter run --dart-define=API_BASE=http://YOUR_PC_IP:5000',
        );
        break;
    }
  }

  void _show2FALoginDialog() {
    final codeController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isSubmitting = false;
    String? errorMessage;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: const Row(
                children: [
                  Icon(Icons.security, color: AppColors.darkGreen, size: 28),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Two-Factor Authentication',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Step 2 of 2 — Enter the 6-digit code from your authenticator app to complete sign in.',
                        style: TextStyle(fontSize: 13, color: AppColors.textMid),
                      ),
                      const SizedBox(height: 16),
                      if (errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.shade200),
                          ),
                          child: Text(
                            errorMessage!,
                            style: const TextStyle(color: Colors.red, fontSize: 12),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      TextFormField(
                        controller: codeController,
                        keyboardType: TextInputType.number,
                        autofocus: true,
                        decoration: const InputDecoration(
                          labelText: '6-Digit 2FA Code',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.pin),
                        ),
                        validator: (v) =>
                            v == null || v.length < 6 ? 'Enter 6-digit code' : null,
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.darkGreen,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (formKey.currentState!.validate()) {
                            setDialogState(() {
                              isSubmitting = true;
                              errorMessage = null;
                            });
                            final res = await _authService.verify2FALogin(
                              codeController.text.trim(),
                            );
                            if (!mounted) return;
                            if (res == LoginResult.success) {
                              Navigator.pop(ctx);
                              Navigator.pushReplacement(
                                context,
                                MaterialPageRoute(builder: (_) => const DashboardPage()),
                              );
                            } else if (res == LoginResult.mustChangePassword) {
                              Navigator.pop(ctx);
                              _showForcePasswordChangeDialog();
                            } else {
                              setDialogState(() {
                                isSubmitting = false;
                                errorMessage = 'Invalid 2FA code. Please try again.';
                              });
                            }
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Verify Code'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showForcePasswordChangeDialog() {
    final oldController = TextEditingController(text: _passwordController.text);
    final newController = TextEditingController();
    final confirmController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool obscureOld = true;
    bool obscureNew = true;
    bool obscureConfirm = true;
    bool isSubmitting = false;
    String? errorMessage;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: const Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 28),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Password Change Required',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Your administrator requires you to update your temporary password before accessing the system.',
                        style: TextStyle(fontSize: 13, color: AppColors.textMid),
                      ),
                      const SizedBox(height: 16),
                      if (errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.shade200),
                          ),
                          child: Text(
                            errorMessage!,
                            style: const TextStyle(color: Colors.red, fontSize: 12),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      TextFormField(
                        controller: oldController,
                        obscureText: obscureOld,
                        decoration: InputDecoration(
                          labelText: 'Temporary Password',
                          border: const OutlineInputBorder(),
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscureOld ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            ),
                            onPressed: () => setDialogState(() => obscureOld = !obscureOld),
                          ),
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: newController,
                        obscureText: obscureNew,
                        decoration: InputDecoration(
                          labelText: 'New Password (min. 8 chars)',
                          border: const OutlineInputBorder(),
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscureNew ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            ),
                            onPressed: () => setDialogState(() => obscureNew = !obscureNew),
                          ),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Required';
                          if (v.length < 8) return 'Must be at least 8 characters';
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: confirmController,
                        obscureText: obscureConfirm,
                        decoration: InputDecoration(
                          labelText: 'Confirm New Password',
                          border: const OutlineInputBorder(),
                          suffixIcon: IconButton(
                            icon: Icon(
                              obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            ),
                            onPressed: () => setDialogState(() => obscureConfirm = !obscureConfirm),
                          ),
                        ),
                        validator: (v) {
                          if (v != newController.text) return 'Passwords do not match';
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.darkGreen,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (formKey.currentState!.validate()) {
                            setDialogState(() {
                              isSubmitting = true;
                              errorMessage = null;
                            });
                            final res = await _authService.changePassword(
                              oldController.text,
                              newController.text,
                            );
                            if (res['success'] == true) {
                              if (mounted) {
                                Navigator.pop(ctx);
                                Navigator.pushReplacement(
                                  context,
                                  MaterialPageRoute(builder: (_) => const DashboardPage()),
                                );
                              }
                            } else {
                              setDialogState(() {
                                isSubmitting = false;
                                errorMessage = res['error']?.toString() ?? 'Failed to change password';
                              });
                            }
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Update & Continue'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: SlideTransition(
              position: _slideAnim,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Green header ──
                  Container(
                    padding: const EdgeInsets.symmetric(
                      vertical: 52,
                      horizontal: 28,
                    ),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF1B5E20), Color(0xFF2E7D32)],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                      borderRadius: BorderRadius.only(
                        bottomLeft: Radius.circular(36),
                        bottomRight: Radius.circular(36),
                      ),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 84,
                          height: 84,
                          decoration: BoxDecoration(
                            color: AppColors.darkGreen,
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: AppColors.gold.withOpacity(0.5),
                              width: 2,
                            ),
                          ),
                          child: const Icon(
                            Icons.location_on_rounded,
                            size: 48,
                            color: AppColors.gold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'REVELA',
                          style: TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                            color: AppColors.white,
                            letterSpacing: 5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'BPLO Field Inspection Portal',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.white.withOpacity(0.7),
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ── Form ──
                  Padding(
                    padding: const EdgeInsets.fromLTRB(28, 36, 28, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Sign in to continue',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Use your assigned BPLO credentials',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textLight,
                          ),
                        ),
                        const SizedBox(height: 28),

                        // Email
                        CustomTextField(
                          controller: _emailController,
                          label: 'Email Address',
                          hint: 'inspector@bplo.gov.ph',
                          prefixIcon: Icons.badge_outlined,
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 14),

                        // Password
                        CustomTextField(
                          controller: _passwordController,
                          label: 'Password',
                          prefixIcon: Icons.lock_outline,
                          obscureText: _obscurePassword,
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                              color: AppColors.textLight,
                              size: 20,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Sign In button
                        SizedBox(
                          height: 54,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.darkGreen,
                              foregroundColor: AppColors.white,
                              disabledBackgroundColor: AppColors.lightGreen
                                  .withOpacity(0.5),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      color: AppColors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  )
                                : const Text(
                                    'Sign In',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Footer
                        const Center(
                          child: Text(
                            'For access issues, contact your BPLO administrator.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textLight,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
