from flask import Blueprint, request, jsonify
from app import mysql
from api.registry.service import (
    upload_registry,
    sync_registry,
    get_all_businesses,
    get_business_by_id,
)
from api.middleware.decorators import jwt_required, admin_required

registry_bp = Blueprint("registry", __name__)


# ── POST /api/registry/upload ─────────────────────────────────────────────────
@registry_bp.route("/upload", methods=["POST"])
@admin_required()
def upload():
    """Accept a CSV or Excel file and seed OFFICIAL_REGISTRY."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    allowed = {".csv", ".xlsx", ".xls"}
    ext = "." + \
        file.filename.rsplit(
            ".", 1)[-1].lower() if "." in file.filename else ""

    if ext not in allowed:
        return jsonify({"error": "Only CSV and Excel files are accepted (.csv, .xlsx, .xls)"}), 400

    summary, error = upload_registry(file, ext)

    if error:
        return jsonify({"error": error}), 500

    return jsonify(summary), 201


# ── POST /api/registry/sync ───────────────────────────────────────────────────
@registry_bp.route("/sync", methods=["POST"])
@jwt_required()
def sync():
    """Merge a CSV/Excel file into OFFICIAL_REGISTRY (update matches, insert new)."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    allowed = {".csv", ".xlsx", ".xls"}
    ext = "." + \
        file.filename.rsplit(
            ".", 1)[-1].lower() if "." in file.filename else ""

    if ext not in allowed:
        return jsonify({"error": "Only CSV and Excel files are accepted (.csv, .xlsx, .xls)"}), 400

    summary, error = sync_registry(file, ext)

    if error:
        return jsonify({"error": error}), 500

    return jsonify(summary), 200


# ── GET /api/registry ─────────────────────────────────────────────────────────
@registry_bp.route("/", methods=["GET"])
@jwt_required()
def get_registry():
    """Return all businesses with optional filters."""
    barangay_id = request.args.get("barangayID",  type=int)
    # Active | Expired | Revoked | Pending
    status = request.args.get("status")
    search = request.args.get("search", "").strip()
    page = request.args.get("page",  1,    type=int)
    per_page = request.args.get("limit", 10,   type=int)

    result, error = get_all_businesses(
        barangay_id=barangay_id,
        status=status,
        search=search,
        page=page,
        per_page=per_page,
    )

    if error:
        return jsonify({"error": error}), 500

    return jsonify(result), 200


# ── GET /api/registry/<id> ────────────────────────────────────────────────────
@registry_bp.route("/<int:business_id>", methods=["GET"])
@jwt_required()
def get_business(business_id):
    """Return a single business record by ID."""
    business, error = get_business_by_id(business_id)

    if error:
        return jsonify({"error": error}), 500
    if not business:
        return jsonify({"error": "Business not found"}), 404

    return jsonify(business), 200


@registry_bp.route("/barangays", methods=["GET"])
@jwt_required()
def get_barangays():
    cursor = mysql.connection.cursor()
    cursor.execute(
        "SELECT barangayID, barangayName FROM barangays ORDER BY barangayName")
    rows = cursor.fetchall()
    cursor.close()
    return jsonify(rows), 200
