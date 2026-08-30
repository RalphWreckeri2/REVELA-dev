"""Firebase Cloud Messaging delivery for inspector inspection assignments."""
import logging
import os

from api.models.user import get_fcm_token

logger = logging.getLogger(__name__)


def _messaging_client():
    """Initialise Firebase Admin once from the configured service-account file."""
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
    except ImportError:
        logger.error("[FCM DISPATCH ERROR: firebase-admin is not installed]")
        return None

    if not firebase_admin._apps:
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip()
        if not service_account_path:
            logger.error("[FCM DISPATCH ERROR: FIREBASE_SERVICE_ACCOUNT_PATH is not configured]")
            return None
        if not os.path.isfile(service_account_path):
            logger.error(
                "[FCM DISPATCH ERROR: service account file does not exist: %s]",
                service_account_path,
            )
            return None
        try:
            firebase_admin.initialize_app(credentials.Certificate(service_account_path))
        except Exception as exc:
            logger.exception(
                "[FCM DISPATCH ERROR: Firebase Admin initialization error: %s]", exc
            )
            return None

    return messaging


def send_inspection_dispatch_push(report_id, inspector_user_id, business_name):
    """Send a visible, high-priority FCM alert to an assigned inspector."""
    inspector_fcm_token = get_fcm_token(inspector_user_id)
    if not inspector_fcm_token:
        logger.error(
            "[FCM DISPATCH ERROR: inspector %s has no saved fcm_token for report %s]",
            inspector_user_id,
            report_id,
        )
        return False

    messaging = _messaging_client()
    if messaging is None:
        return False

    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title="New Inspection Assigned",
                body=f"Task dispatched for {business_name}",
            ),
            data={
                "click_action": "FLUTTER_NOTIFICATION_CLICK",
                "type": "dispatch",
                "report_id": str(report_id),
            },
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    sound="default",
                    channel_id="revela_inspection_alerts",
                    priority="high",
                    visibility="public",
                    default_sound=True,
                    default_vibrate_timings=True,
                ),
            ),
            token=inspector_fcm_token,
        )
        message_id = messaging.send(message)
        logger.info(
            "[FCM DISPATCH SENT] report_id=%s inspector_id=%s message_id=%s",
            report_id,
            inspector_user_id,
            message_id,
        )
        return True
    except Exception as exc:
        logger.exception(
            "[FCM DISPATCH ERROR: report_id=%s inspector_id=%s details=%s]",
            report_id,
            inspector_user_id,
            exc,
        )
        return False
