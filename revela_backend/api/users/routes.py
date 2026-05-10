from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from api.middleware.decorators import admin_required
from api.models.user import (
    get_all_users, find_user_by_email, find_user_by_id,
    create_user, update_user, delete_user
)
import bcrypt
import re

users_bp = Blueprint("users", __name__)

DEFAULT_PASSWORD = "admin123"


def _normalize_phone(phone):
    """
    Accepts: 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX
    Always stores as: 09XXXXXXXXX
    Returns None if invalid.
    """
    if not phone:
        return None

    # Strip spaces, dashes, parentheses
    cleaned = re.sub(r"[\s\-\(\)]", "", phone)

    # +639XXXXXXXXX → 09XXXXXXXXX
    if cleaned.startswith("+63"):
        cleaned = "0" + cleaned[3:]

    # 639XXXXXXXXX → 09XXXXXXXXX
    elif cleaned.startswith("63") and len(cleaned) == 12:
        cleaned = "0" + cleaned[2:]

    # Validate final format: 09XXXXXXXXX (11 digits)
    if re.match(r"^09\d{9}$", cleaned):
        return cleaned

    return None  # invalid

# ── GET /api/users/ ───────────────────────────────────────────────────────────


@users_bp.route("/", methods=["GET"])
@admin_required()
def list_users():
    """Return all users. SUPER_ADMIN only."""
    users = get_all_users()
    return jsonify(users), 200


# ── POST /api/users/ ──────────────────────────────────────────────────────────
@users_bp.route("/", methods=["POST"])
@admin_required()
def create_user_route():
    data = request.get_json()

    required = ["fullName", "email", "role"]
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Required fields: {required}"}), 400

    if find_user_by_email(data["email"]):
        return jsonify({"error": "Email already in use"}), 409

    # Phone validation — must happen before create_user call
    raw_phone = data.get("phone", "").strip()
    phone = _normalize_phone(raw_phone) if raw_phone else None
    if raw_phone and phone is None:
        return jsonify({"error": "Invalid phone number. Use format: 09XXXXXXXXX"}), 400

    hashed = bcrypt.hashpw(
        DEFAULT_PASSWORD.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    user_id = create_user(
        full_name=data["fullName"],
        email=data["email"],
        hashed_password=hashed,
        role=data["role"],
        phone=phone,
    )

    return jsonify({
        "message":      "User created successfully",
        "userID":       user_id,
        "tempPassword": DEFAULT_PASSWORD,
    }), 201


# ── PATCH /api/users/:id ──────────────────────────────────────────────────────
@users_bp.route("/<int:user_id>", methods=["PATCH"])
@admin_required()
def update_user_route(user_id):
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    user = find_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user["userRole"] == "SUPER_ADMIN":
        data.pop("role", None)

    # Phone validation — must happen before update_user call
    raw_phone = data.get("phone", "").strip()
    if raw_phone:
        phone = _normalize_phone(raw_phone)
        if phone is None:
            return jsonify({"error": "Invalid phone number. Use format: 09XXXXXXXXX"}), 400
    else:
        phone = user.get("phone")

    update_user(
        user_id=user_id,
        full_name=data.get("fullName", user["fullName"]),
        email=data.get("email",    user["email"]),
        role=data.get("role",     user["userRole"]),
        phone=phone,
    )

    return jsonify({"message": "User updated successfully"}), 200


# ── DELETE /api/users/:id ─────────────────────────────────────────────────────
@users_bp.route("/<int:user_id>", methods=["DELETE"])
@admin_required()
def delete_user_route(user_id):
    """Delete a user. SUPER_ADMIN cannot delete themselves."""
    current_user_id = int(get_jwt_identity())

    if user_id == current_user_id:
        return jsonify({"error": "You cannot delete your own account"}), 403

    user = find_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    from app import mysql
    cursor = mysql.connection.cursor()

    # 1. Check for ACTIVE inspections (Assigned or In Progress)
    cursor.execute(
        "SELECT COUNT(*) AS count FROM inspection_reports WHERE userID = %s AND verificationStatus IN ('Assigned', 'In Progress')",
        (user_id,)
    )
    active_count = cursor.fetchone()["count"]

    if active_count > 0:
        cursor.close()
        return jsonify({"error": "You cannot delete an inspector with assigned task - reassign first"}), 409

    # 2. Check for HISTORICAL inspections (Submitted or Verified)
    cursor.execute(
        "SELECT COUNT(*) AS count FROM inspection_reports WHERE userID = %s AND verificationStatus IN ('Submitted', 'Verified')",
        (user_id,)
    )
    historical_count = cursor.fetchone()["count"]

    if historical_count > 0:
        # SOFT DELETE: Keep the history intact, but deactivate the account
        cursor.execute(
            "UPDATE users SET isActive = FALSE WHERE userID = %s", (user_id,))
        mysql.connection.commit()
        cursor.close()
        return jsonify({"message": "User deactivated successfully (soft delete) to preserve inspection history."}), 200

    cursor.close()

    # 3. HARD DELETE: Safe to obliterate since they have absolutely zero history
    delete_user(user_id)
    return jsonify({"message": "User deleted successfully"}), 200
