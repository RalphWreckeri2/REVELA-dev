from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from api.auth.service import login_user, request_otp, reset_password
from api.middleware.decorators import jwt_required
from api.models.user import find_user_by_id

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

    return jsonify({"access_token": token}), 200


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
