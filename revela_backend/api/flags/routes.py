from flask import Blueprint, request, jsonify
from api.flags.service import (
    run_detection,
    get_flags,
    insert_yellow_flag,
    update_flag_color,
    escalate_to_black,
    delete_flag,
)
from api.middleware.decorators import jwt_required, admin_required

flags_bp = Blueprint("flags", __name__)


# ── POST /api/flags/run-detection ─────────────────────────────────────────────
@flags_bp.route("/run-detection", methods=["POST"])
@admin_required()
def run_detection_route():
    """Trigger full Places API fetch + cross-reference + Red Flag insertion."""
    result, error = run_detection()
    if error:
        return jsonify({"error": error}), 500
    return jsonify(result), 200


# ── GET /api/flags ────────────────────────────────────────────────────────────
@flags_bp.route("", methods=["GET"])
@flags_bp.route("/", methods=["GET"])
@jwt_required()
def get_flags_route():
    """Return all geospatial log entries, filterable by color and barangayID."""
    color = request.args.get("color")
    barangay_id = request.args.get("barangayID", type=int)
    page = request.args.get("page",  1,  type=int)
    per_page = request.args.get("limit", 50, type=int)

    result, error = get_flags(
        color=color,
        barangay_id=barangay_id,
        page=page,
        per_page=per_page,
    )
    if error:
        return jsonify({"error": error}), 500
    return jsonify(result), 200


# ── POST /api/flags/yellow ────────────────────────────────────────────────────
@flags_bp.route("/yellow", methods=["POST"])
@admin_required()
def yellow_flag_route():
    """Manually insert a Yellow or Orange Flag."""
    data = request.get_json()

    required = ["businessName", "lat", "lng", "barangayID"]
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Required fields: {required}"}), 400

    flag_color = data.get("flagColor", "Yellow")
    if flag_color not in ("Yellow", "Orange"):
        return jsonify({"error": "Invalid flag color for manual creation"}), 400

    result, error = insert_yellow_flag(
        business_name=data["businessName"],
        lat=data["lat"],
        lng=data["lng"],
        barangay_id=data["barangayID"],
        notes=data.get("notes"),
        flag_color=flag_color,
    )
    if error:
        return jsonify({"error": error}), 500
    return jsonify(result), 201


# ── PATCH /api/flags/:id/black ────────────────────────────────────────────────
@flags_bp.route("/<int:log_id>/black", methods=["PATCH"])
@admin_required()
def black_flag_route(log_id):
    """Escalate a Red or Yellow flag to Black."""
    success, error = escalate_to_black(log_id)
    if not success:
        return jsonify({"error": error}), 400
    return jsonify({"message": f"Flag #{log_id} escalated to Black"}), 200


# ── PATCH /api/flags/:id/color ────────────────────────────────────────────────
@flags_bp.route("/<int:log_id>/color", methods=["PATCH"])
@admin_required()
def change_flag_color_route(log_id):
    """Update a flag's color manually (e.g. to Orange, Yellow, Red, Black, Green)."""
    data = request.get_json()
    if not data or "color" not in data:
        return jsonify({"error": "Missing 'color' parameter"}), 400

    color = data["color"]
    valid_colors = {"Red", "Yellow", "Black", "Green", "Orange"}
    if color not in valid_colors:
        return jsonify({"error": f"Invalid color. Must be one of {valid_colors}"}), 400

    success, error = update_flag_color(log_id, color)
    if not success:
        return jsonify({"error": error}), 400
    return jsonify({"message": f"Flag #{log_id} color updated to {color}"}), 200


# ── DELETE /api/flags/:id ─────────────────────────────────────────────────────
@flags_bp.route("/<int:log_id>", methods=["DELETE"])
@admin_required()
def delete_flag_route(log_id):
    """Delete a specific flag. Also deletes associated registry records if they exist."""
    success, error = delete_flag(log_id)
    if error:
        status_code = 404 if error == "Flag not found" else 500
        return jsonify({"error": error}), status_code
    return jsonify({"message": f"Flag #{log_id} deleted successfully"}), 200
