from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt, create_access_token
from api.auth.service import login_user, request_otp, reset_password, update_user_password, generate_2fa_setup, verify_totp_code
from api.middleware.decorators import jwt_required
from api.models.user import find_user_by_id, find_user_by_email, enable_user_2fa, update_user_2fa_secret, get_user_2fa_secret
from api.notifications.service import get_email_inspection_alerts, set_email_inspection_alerts
from datetime import timedelta

auth_bp = Blueprint("auth", __name__)


# ── POST /api/auth/login ──────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "email and password are required"}), 400

    token, error = login_user(data["email"], data["password"])

    if error:
        return jsonify({"error": error}), 401

    user = find_user_by_email(data["email"])

    # ── Role gate ──
    source = data.get("source")
    if source == "mobile":
        if user and user.get("userRole") != "Inspector":
            return jsonify({"error": "Access denied. Mobile app is for Inspectors only."}), 403
    else:
        WEB_ALLOWED_ROLES = ("Admin", "SUPER_ADMIN", "System Administrator")
        if user and user.get("userRole") not in WEB_ALLOWED_ROLES:
            return jsonify({"error": "Access denied. This portal is for Admin and Super Admin only."}), 403

    if user and user.get("is_2fa_enabled"):
        temp_token = create_access_token(
            identity=str(user["userID"]),
            additional_claims={"2fa_pending": True},
            expires_delta=timedelta(minutes=5)
        )
        return jsonify({
            "status": "2fa_required",
            "tempToken": temp_token,
            "userId": user["userID"]
        }), 200

    return jsonify({
        "access_token": token,
        "user": {
            "userID": user["userID"],
            "fullName": user["fullName"],
            "userRole": user["userRole"],
            "mustChangePassword": bool(user.get("mustChangePassword", False))
        }
    }), 200


# ── GET /api/auth/me ──────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@jwt_required()   # <-- our custom decorator
def me():
    user_id = get_jwt_identity()         # the "identity" we stored (userID)
    claims = get_jwt()                  # the full payload

    # Re-fetch from DB so React always gets fresh data
    user = find_user_by_id(int(user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "userID":   user["userID"],
        "fullName": user["fullName"],
        "email":    user["email"],
        "role":     claims.get("role"),
        "is_2fa_enabled": bool(user.get("is_2fa_enabled")),
        "mustChangePassword": bool(user.get("mustChangePassword", False)),
        "emailInspectionAlerts": get_email_inspection_alerts(int(user_id)),
    }), 200


# ── PATCH /api/auth/me/preferences ────────────────────────────────────────────
@auth_bp.route("/me/preferences", methods=["PATCH"])
@jwt_required()
def patch_me_preferences():
    """Persist notification preferences (e.g. inspection alert emails)."""
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    if "emailInspectionAlerts" in data:
        set_email_inspection_alerts(uid, bool(data["emailInspectionAlerts"]))
    return jsonify({
        "emailInspectionAlerts": get_email_inspection_alerts(uid),
    }), 200


# ── POST /api/auth/request-otp ────────────────────────────────────────────────
@auth_bp.route("/request-otp", methods=["POST"])
def request_otp_route():
    data = request.get_json()

    if not data or not data.get("identifier"):
        return jsonify({"error": "Email or phone number is required"}), 400

    request_otp(data["identifier"])

    # Always return success — never reveal if user exists
    return jsonify({"message": "If an account exists, an OTP has been sent"}), 200


# ── POST /api/auth/reset-password ─────────────────────────────────────────────
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password_route():
    data = request.get_json()

    if not data or not all(k in data for k in ["identifier", "otp", "newPassword"]):
        return jsonify({"error": "identifier, otp, and newPassword are required"}), 400

    success, error = reset_password(
        data["identifier"],
        data["otp"],
        data["newPassword"]
    )

    if not success:
        return jsonify({"error": error}), 400

    return jsonify({"message": "Password reset successful"}), 200


@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    data = request.json

    old_password = data.get('oldPassword')
    new_password = data.get('newPassword')

    if not old_password or not new_password:
        return jsonify({"error": "Missing required fields"}), 400

    # Call the service layer
    result = update_user_password(user_id, old_password, new_password)

    # Return based on the service response
    if "error" in result:
        return jsonify({"error": result["error"]}), result["status"]

    return jsonify({"message": result["message"]}), result["status"]


# ── POST /api/auth/setup-2fa ──────────────────────────────────────────────────
@auth_bp.route('/setup-2fa', methods=['POST'])
@jwt_required()
def setup_2fa():
    user_id = get_jwt_identity()
    user = find_user_by_id(int(user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        secret, otp_uri = generate_2fa_setup(user["email"])

        # Temporarily save the secret to the DB until verified
        update_user_2fa_secret(user["userID"], secret)

        return jsonify({
            "secret": secret,
            "otpUri": otp_uri
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to setup 2FA", "details": str(e)}), 500


# ── POST /api/auth/verify-2fa-setup ───────────────────────────────────────────
@auth_bp.route('/verify-2fa-setup', methods=['POST'])
@jwt_required()
def verify_2fa_setup():
    user_id = get_jwt_identity()
    data = request.get_json()
    code = data.get('code')

    # Fetch the temporarily saved secret from the database
    secret = get_user_2fa_secret(int(user_id))

    print(f"DEBUG → user_id: {user_id}, code: {code}, secret: {secret}")

    if not code:
        return jsonify({"error": "Missing 2FA code"}), 400
    if not secret:
        return jsonify({"error": "No 2FA setup found for user"}), 400

    is_valid = verify_totp_code(secret, code)
    print(
        f"DEBUG → is_valid: {is_valid}, server_time: {__import__('datetime').datetime.now()}")

    print(f"DEBUG → expected code: {__import__('pyotp').TOTP(secret).now()}")
    if is_valid:
        success = enable_user_2fa(int(user_id), True)
        if success:
            return jsonify({"message": "2FA enabled successfully"}), 200
        return jsonify({"error": "Failed to save 2FA settings"}), 500

    return jsonify({"error": "Invalid 2FA code"}), 400


# ── POST /api/auth/disable-2fa ────────────────────────────────────────────────
@auth_bp.route('/disable-2fa', methods=['POST'])
@jwt_required()
def disable_2fa():
    user_id = get_jwt_identity()
    user = find_user_by_id(int(user_id))

    if not user:
        return jsonify({"error": "User not found"}), 404

    success = enable_user_2fa(int(user_id), False)
    if success:
        return jsonify({"message": "2FA disabled successfully"}), 200

    return jsonify({"error": "Failed to disable 2FA"}), 500


# ── POST /api/auth/verify-2fa-login ───────────────────────────────────────────
@auth_bp.route('/verify-2fa-login', methods=['POST'])
@jwt_required()
def verify_2fa_login():
    user_id = get_jwt_identity()
    claims = get_jwt()

    if not claims.get("2fa_pending"):
        return jsonify({"error": "Invalid token. Not pending 2FA."}), 401

    data = request.get_json()
    code = data.get('code')

    if not code:
        return jsonify({"error": "Missing 2FA code"}), 400

    user = find_user_by_id(int(user_id))

    # Get user's enabled 2FA secret
    secret = get_user_2fa_secret(user["userID"])

    if not secret or not verify_totp_code(secret, code):
        return jsonify({"error": "Invalid 2FA code or 2FA not enabled"}), 400

    # Code is valid, provide the real access token for the dashboard
    token = create_access_token(
        identity=str(user["userID"]),
        additional_claims={
            "role": user["userRole"],
            "mustChangePassword": bool(user.get("mustChangePassword", False))
        }
    )
    return jsonify({"access_token": token}), 200
