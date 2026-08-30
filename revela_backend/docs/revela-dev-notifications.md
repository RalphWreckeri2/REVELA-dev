# REVELA development notification verification

These changes activate only when the process is explicitly configured as
`revela-dev`. Do not place these values in a production environment file.

## Backend environment

Add the following to `revela_backend/.env` in the development deployment only:

```dotenv
REVELA_ENV=revela-dev
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=dev-notify@example.com
MAIL_PASSWORD=use-an-app-password-not-your-normal-password
MAIL_DEFAULT_SENDER=REVELA Development <dev-notify@example.com>
MAIL_USE_TLS=true
MAIL_USE_SSL=false
MAIL_TIMEOUT_SECONDS=15
```

For an implicit-SSL provider, use port `465`, `MAIL_USE_SSL=true`, and
`MAIL_USE_TLS=false`. Restart the development Flask service after changing the
file. On an inspection submission, verify one in-app notification per opted-in
administrator and this exact email format:

```text
Subject: [REVELA] Inspection Alert — KC Motorshop

Andrea A. Levita submitted a field inspection for "KC Motorshop". Recorded result: Black. Open Inspections to review (report #3).

— REVELA Municipality Dashboard
```

The API returns before email I/O occurs. Inspect development application logs
for `authentication failed`, `timed out`, or `transport failed` messages.

## Mobile FCM setup

1. In the Firebase project used by `revela-dev`, register the Android and iOS
   development app identifiers. Put its `google-services.json` in
   `revela_mobile/android/app/` for debug builds and `GoogleService-Info.plist`
   in the dedicated iOS development target's `Runner/` directory. The Android
   Google Services plugin is applied only to Gradle debug tasks in this repo;
   do not add either file to a production build target.
2. In Xcode, enable **Push Notifications** and **Background Modes → Remote
   notifications** for the development target. Upload an APNs auth key/cert to
   that Firebase project.
3. Run `flutter pub get`, then build or run with:

   ```text
   flutter run --dart-define=REVELA_ENV=revela-dev --dart-define=API_BASE=http://YOUR-DEV-HOST:5000
   ```

4. Test each app state with a real Android/iOS device: foreground (local
   notification), background (system notification), and terminated (tap opens
   REVELA's Notifications page). Use an FCM `notification` payload with
   `android.notification.channel_id: revela_inspection_alerts`; data-only payloads
   must be high-priority and include `title`, `body`, and optionally `reportID`.

Android does not deliver any FCM message after a user **force-stops** an app
until they open it again; that is an OS security policy, not an app defect.

## Failure checklist

- `REVELA_ENV` is exactly `revela-dev`, and the dev Flask process was restarted.
- Admin users have non-empty `USERS.email` values and have not opted out in
  `user_app_preferences.email_inspection_alerts`.
- SMTP host, port, TLS/SSL mode, sender, and app password match the provider.
- The development host/network permits outbound TCP 587 (or 465); corporate
  firewalls often block SMTP ports.
- `MAIL_DEFAULT_SENDER` is an address/domain accepted by the SMTP provider.
- The development Firebase files belong to the installed application ID, and
  Android 13+ notification permission was granted.
- After changing the channel's sound or vibration behavior, uninstall the dev
  app (or clear its app data) before retesting: Android preserves a channel's
  user-configured behavior after its first creation.
- For iOS, test on physical hardware with an APNs-enabled development build;
  simulators do not prove remote-push delivery.
