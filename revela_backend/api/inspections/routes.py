from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from api.inspections.service import (
    get_inspector_tasks,
    assign_inspection,
    submit_inspection,
    verify_inspection,
    get_all_inspections,
)
from api.middleware.decorators import jwt_required, admin_required

inspections_bp = Blueprint("inspections", __name__)


# ── GET /api/inspections/tasks ────────────────────────────────────────────────
@inspections_bp.route("/tasks", methods=["GET"])
@jwt_required()
def get_tasks():
    """Return flags assigned to the current inspector (Assigned or In Progress)."""
    user_id = get_jwt_identity()
    result, error = get_inspector_tasks(user_id=user_id)
    if error:
        return jsonify({"error": error}), 500
    return jsonify(result), 200


# ── POST /api/inspections/assign ──────────────────────────────────────────────
@inspections_bp.route("/assign", methods=["POST"])
@admin_required()
def assign():
    """Admin: assign a geospatial flag to an inspector."""
    assigned_by = get_jwt_identity()
    data = request.get_json()

    required = ["logID", "userID"]
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Required fields: {required}"}), 400

    result, error = assign_inspection(
        log_id=data["logID"],
        inspector_user_id=data["userID"],
        assigned_by=assigned_by,
    )
    if error:
        return jsonify({"error": error}), 500
    return jsonify(result), 201


# ── POST /api/inspections/submit ──────────────────────────────────────────────
@inspections_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit():
    """Inspector submits a completed inspection report."""
    user_id = get_jwt_identity()
    data = request.get_json()

    required = ["logID", "inspectionResult"]
    if not data or not all(k in data for k in required):
        return jsonify({"error": f"Required fields: {required}"}), 400

    valid_results = ("Red", "Yellow", "Green")
    if data["inspectionResult"] not in valid_results:
        return jsonify({"error": f"inspectionResult must be one of {valid_results}"}), 400

    result, error = submit_inspection(
        log_id=data["logID"],
        user_id=user_id,
        inspection_result=data["inspectionResult"],
        verified_lat=data.get("verifiedLat"),
        verified_lng=data.get("verifiedLng"),
        notes=data.get("notes"),
        photo_url=data.get("photoURL"),
    )
    if error:
        return jsonify({"error": error}), 500
    return jsonify(result), 200


# ── POST /api/inspections/<id>/verify ─────────────────────────────────────────
@inspections_bp.route("/<int:report_id>/verify", methods=["POST"])
@admin_required()
def verify(report_id):
    """Admin confirms inspection result → updates geospatial_logs flagColor."""
    result, error = verify_inspection(report_id=report_id)
    if error:
        return jsonify({"error": error}), 400
    return jsonify(result), 200


# ── GET /api/inspections ──────────────────────────────────────────────────────
@inspections_bp.route("", methods=["GET"])
@inspections_bp.route("/", methods=["GET"])
@admin_required()
def get_inspections():
    """Admin: all inspection reports, filterable by status and barangayID."""
    status = request.args.get("status")
    barangay_id = request.args.get("barangayID", type=int)
    page = request.args.get("page",  1,  type=int)
    per_page = request.args.get("limit", 20, type=int)

    result, error = get_all_inspections(
        status=status,
        barangay_id=barangay_id,
        page=page,
        per_page=per_page,
    )
    if error:
        return jsonify({"error": error}), 500
    return jsonify(result), 200
