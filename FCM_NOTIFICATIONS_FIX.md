# FCM Push Notifications Fix

## Problem
The mobile app was not receiving push notifications when backgrounded or terminated because **the FCM token was never being saved to the backend**.

## Root Cause
While the backend had all the infrastructure to send push notifications:
- ✅ FCM service initialized (`api/notifications/fcm.py`)
- ✅ Inspection assignment logic calls `send_inspection_dispatch_push()` 
- ✅ Backend endpoint `/auth/fcm-token` exists to save tokens

**The mobile app was missing the critical step**: Getting the FCM token from Firebase and sending it to the backend.

## Solution Implemented

### 1. Added FCM Token Saving to `push_notifications.dart`

**New Method**: `_saveFcmTokenToBackend()` 
- Gets the FCM token from Firebase
- Sends it to the backend via `PUT /auth/fcm-token`
- Called after notification permissions are granted

**New Public Method**: `refreshFcmToken()`
- Can be called from anywhere in the app to refresh the token
- Used after login to ensure the backend always has a valid token

**Token Refresh Listener**:
- Added listener to `_messaging.onTokenRefresh`
- Automatically resaves the token if Firebase refreshes it

### 2. Updated Login Flow in `login_page.dart`

- Added import for `PushNotifications`
- Modified `_showWelcomeGreetingAndNavigate()` to call `PushNotifications.refreshFcmToken()` after successful login
- Ensures the token is saved to the backend immediately when the user authenticates

## Testing Checklist

### ✅ Pre-Requirements
- [ ] Firebase project is set up in development Firebase console
- [ ] `google-services.json` is in `revela_mobile/android/app/`  
- [ ] `GoogleService-Info.plist` is in `revela_mobile/ios/Runner/` (for iOS)
- [ ] Backend has Firebase service account configured via:
  - `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable, OR
  - `FIREBASE_SERVICE_ACCOUNT_PATH` pointing to service account JSON file
- [ ] `firebase-admin` package is installed in the backend (`pip list | grep firebase`)

### ✅ Testing Steps

1. **Rebuild and Run the App**
   ```bash
   flutter clean
   flutter pub get
   flutter run
   ```

2. **Check Console Logs** (after login)
   - Look for: `[FCM] Saving FCM token to backend: ...`
   - Look for: `[FCM] FCM token saved successfully`
   - If you see errors like `[FCM ERROR]`, check the network and backend configuration

3. **Verify Token Was Saved**
   - Check your database: `SELECT fcm_token FROM USERS WHERE userID = <your_user_id>`
   - Should have a non-null value like: `c1234567890abcdef...`

4. **Test Push Notification**
   - Submit an inspection (or have admin assign one to you)
   - Check your backend logs for: `[FCM DISPATCH SENT] report_id=...`
   - You should receive a system notification on the device

5. **Test Background Notifications**
   - Close the app completely (force-stop)
   - Have someone assign an inspection to you
   - Notification should appear on the lock screen or notification center

6. **Test Token Refresh**
   - After the first login, log out and log back in
   - Should see FCM token being refreshed in logs

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No `[FCM]` logs | Firebase initialization failed - check google-services.json/GoogleService-Info.plist |
| `[FCM] No FCM token available` | Firebase didn't grant the FCM token - permissions may have been denied |
| `[FCM ERROR] Failed to save FCM token` | Network error or authentication issue - check internet and token format |
| Backend logs: `[FCM DISPATCH ERROR: inspector X has no saved fcm_token]` | The `PUT /auth/fcm-token` call never reached the backend. Check: 1) Token was obtained, 2) API endpoint is reachable, 3) User is authenticated |
| Firebase admin init error | Check `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH` environment variables |
| Notifications not appearing on device | Check: 1) Notification channel is created, 2) User didn't disable notifications in Android/iOS settings, 3) Device has Firebase Play Services installed (Android) |

## Files Modified

1. `revela_mobile/lib/service/push_notifications.dart`
   - Added `_saveFcmTokenToBackend()` method
   - Added `refreshFcmToken()` public method
   - Added token refresh listener
   - Added call to save token after permissions

2. `revela_mobile/lib/pages/login_page.dart`
   - Added import for `PushNotifications`
   - Modified `_showWelcomeGreetingAndNavigate()` to refresh FCM token after login

## Backend Configuration

The backend already has the necessary code. Just ensure:

1. Firebase is installed:
   ```bash
   pip list | grep firebase-admin
   ```

2. Set environment variable (for development):
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-adminsdk-xyz123.json
   # OR
   export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
   ```

3. Restart the Flask development server after setting the environment variable

## How It Works (After Fix)

```
User logs in
  ↓
_showWelcomeGreetingAndNavigate() called
  ↓
PushNotifications.refreshFcmToken() called
  ↓
Firebase returns FCM token
  ↓
PUT /auth/fcm-token sends token to backend
  ↓
Backend saves fcm_token to database
  ↓
Admin assigns inspection
  ↓
Backend calls send_inspection_dispatch_push()
  ↓
Firebase sends push via FCM token
  ↓
🔔 User receives notification!
```
