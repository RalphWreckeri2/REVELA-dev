import math
import traceback

from flask import Blueprint, jsonify, request
from api.middleware.decorators import jwt_required, admin_required
from api.analytics.service import get_wlc_config, update_wlc_config

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/all", methods=["GET"])
@jwt_required()
def get_all_analytics():
    try:
        return _get_all_analytics_inner()
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


def _get_all_analytics_inner():
    from app import mysql

    cur = mysql.connection.cursor()

    # ── WLC config ────────────────────────────────────────────────────────────
    config = get_wlc_config()
    w1 = config.get("w1_risk", 40) / 100
    w2 = config.get("w2_sector", 40) / 100
    w3 = config.get("w3_distance", 20) / 100
    bplo_lat = config.get("bplo_lat", 13.9667)
    bplo_lng = config.get("bplo_lng", 121.1167)
    sector_scores = config.get("sectors", {})

    # ══════════════════════════════════════════════════════════════════════════
    # TIER 1 — DESCRIPTIVE
    # ══════════════════════════════════════════════════════════════════════════

    cur.execute("SELECT COUNT(*) AS n FROM official_registry")
    total_businesses = cur.fetchone()["n"]

    cur.execute(
        "SELECT COUNT(*) AS n FROM official_registry WHERE applicationStatus = 'Active'")
    active_count = cur.fetchone()["n"]

    cur.execute(
        "SELECT COUNT(*) AS n FROM official_registry WHERE applicationStatus = 'Expired'")
    expired_count = cur.fetchone()["n"]

    cur.execute("SELECT COUNT(*) AS n FROM geospatial_logs")
    total_flagged = cur.fetchone()["n"]

    compliance_rate = round(
        (active_count / total_businesses * 100), 1) if total_businesses else 0

    # Enforcement progress
    cur.execute("""
        SELECT
            b.barangayName,
            SUM(CASE WHEN g.flagColor = 'Green'  THEN 1 ELSE 0 END) AS green_count,
            SUM(CASE WHEN g.flagColor = 'Red'    THEN 1 ELSE 0 END) AS red_count,
            SUM(CASE WHEN g.flagColor = 'Yellow' THEN 1 ELSE 0 END) AS yellow_count,
            SUM(CASE WHEN g.flagColor = 'Black'  THEN 1 ELSE 0 END) AS black_count
        FROM barangays b
        LEFT JOIN geospatial_logs g ON g.barangayID = b.barangayID
        GROUP BY b.barangayID, b.barangayName
        ORDER BY b.barangayName
    """)
    enforcement_progress = [
        {
            "barangayName": row["barangayName"],
            "green_count":  row["green_count"] or 0,
            "red_count":    row["red_count"] or 0,
            "yellow_count": row["yellow_count"] or 0,
            "black_count":  row["black_count"] or 0,
        }
        for row in cur.fetchall()
    ]

    # Sectoral distribution
    cur.execute("""
        SELECT COALESCE(lineOfBusiness, 'Unclassified') AS sector, COUNT(*) AS count
        FROM official_registry
        GROUP BY lineOfBusiness
        ORDER BY count DESC
        LIMIT 10
    """)
    sectoral_distribution = [
        {"sector": row["sector"], "count": row["count"]}
        for row in cur.fetchall()
    ]

    # Business size
    cur.execute("""
        SELECT COALESCE(businessSize, 'Unknown') AS size_label, COUNT(*) AS count
        FROM official_registry
        GROUP BY businessSize
        ORDER BY count DESC
    """)
    business_size_dist = [
        {"size_label": row["size_label"], "count": row["count"]}
        for row in cur.fetchall()
    ]

    # Compliance timeline
    cur.execute("""
        SELECT
            DATE_FORMAT(lastRenewalDate, '%Y-%m') AS month,
            SUM(CASE WHEN applicationStatus = 'Active'  THEN 1 ELSE 0 END) AS active_count,
            SUM(CASE WHEN applicationStatus != 'Active' THEN 1 ELSE 0 END) AS non_active_count
        FROM official_registry
        WHERE lastRenewalDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month
    """)
    compliance_timeline = [
        {
            "month":            row["month"],
            "active_count":     row["active_count"] or 0,
            "non_active_count": row["non_active_count"] or 0,
        }
        for row in cur.fetchall()
    ]

    # Audit summary
    cur.execute("SELECT COUNT(*) AS n FROM inspection_reports")
    total_inspections = cur.fetchone()["n"]

    cur.execute("""
        SELECT inspectionResult, COUNT(*) AS count
        FROM inspection_reports
        WHERE inspectionResult IS NOT NULL
        GROUP BY inspectionResult
    """)
    result_breakdown = [
        {"inspectionResult": row["inspectionResult"], "count": row["count"]}
        for row in cur.fetchall()
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # TIER 2 — DIAGNOSTIC
    # ══════════════════════════════════════════════════════════════════════════

    # Barangay risk heatmap
    cur.execute("""
        SELECT
            b.barangayID,
            b.barangayName,
            COUNT(g.logID)                                           AS flagged_count,
            SUM(CASE WHEN g.flagColor = 'Red'    THEN 1 ELSE 0 END) AS red_count,
            SUM(CASE WHEN g.flagColor = 'Yellow' THEN 1 ELSE 0 END) AS yellow_count,
            SUM(CASE WHEN g.flagColor = 'Black'  THEN 1 ELSE 0 END) AS black_count
        FROM barangays b
        LEFT JOIN geospatial_logs g ON g.barangayID = b.barangayID
        GROUP BY b.barangayID, b.barangayName
        ORDER BY flagged_count DESC
    """)
    barangay_risk_data = [
        {
            "barangayID":    row["barangayID"],
            "barangayName":  row["barangayName"],
            "flagged_count": row["flagged_count"] or 0,
            "red_count":     row["red_count"] or 0,
            "yellow_count":  row["yellow_count"] or 0,
            "black_count":   row["black_count"] or 0,
        }
        for row in cur.fetchall()
    ]

    high_risk_barangays = sum(
        1 for r in barangay_risk_data
        if r["red_count"] > 0 or r["flagged_count"] >= 5
    )

    # Category non-compliance
    cur.execute("""
        SELECT
            COALESCE(o.lineOfBusiness, 'Unclassified') AS category,
            COUNT(g.logID) AS flagged_count
        FROM geospatial_logs g
        LEFT JOIN official_registry o ON g.detectedName = o.businessName
        GROUP BY category
        ORDER BY flagged_count DESC
        LIMIT 10
    """)
    category_noncompliance = [
        {"category": row["category"], "flagged_count": row["flagged_count"]}
        for row in cur.fetchall()
    ]

    # Weekly red-flag trend
    cur.execute("""
        SELECT
            DATE_FORMAT(
                DATE_SUB(detectedDate, INTERVAL WEEKDAY(detectedDate) DAY),
                '%Y-%m-%d'
            ) AS week_start,
            SUM(CASE WHEN flagColor = 'Red' THEN 1 ELSE 0 END) AS new_red_flags
        FROM geospatial_logs
        WHERE detectedDate >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
        GROUP BY week_start
        ORDER BY week_start
    """)
    flag_trend = [
        {"week_start": str(row["week_start"]),
         "new_red_flags": row["new_red_flags"] or 0}
        for row in cur.fetchall()
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # TIER 3 — PRESCRIPTIVE (WLC / OPS)
    # ══════════════════════════════════════════════════════════════════════════

    cur.execute("""
        SELECT
            b.barangayID,
            b.barangayName,
            COUNT(DISTINCT g.logID)                                  AS flagged_count,
            SUM(CASE WHEN g.flagColor = 'Red'    THEN 1 ELSE 0 END) AS red_count,
            SUM(CASE WHEN g.flagColor = 'Yellow' THEN 1 ELSE 0 END) AS yellow_count,
            SUM(CASE WHEN g.flagColor = 'Black'  THEN 1 ELSE 0 END) AS black_count,
            AVG(g.latitude)                                          AS avg_lat,
            AVG(g.longitude)                                         AS avg_lng,
            COUNT(DISTINCT o.businessID)                             AS total_registered
        FROM barangays b
        LEFT JOIN geospatial_logs   g ON g.barangayID = b.barangayID
        LEFT JOIN official_registry o ON o.barangayID = b.barangayID
        GROUP BY b.barangayID, b.barangayName
    """)
    rows = cur.fetchall()
    cur.close()

    max_flagged = max((r["flagged_count"] or 0 for r in rows), default=1) or 1
    rankings = []

    for row in rows:
        flagged = int(row["flagged_count"] or 0)
        red = int(row["red_count"] or 0)
        yellow = int(row["yellow_count"] or 0)
        black = int(row["black_count"] or 0)
        total_reg = int(row["total_registered"] or 0)
        avg_lat = row["avg_lat"]
        avg_lng = row["avg_lng"]

        risk_score = min(
            ((red * 3 + yellow * 2 + black * 4) / max(flagged, 1))
            * (flagged / max_flagged) * 100,
            100,
        )

        sector_score = float(sector_scores.get(row["barangayName"], 50))

        if avg_lat and avg_lng:
            R = 6371
            dlat = math.radians(float(avg_lat) - bplo_lat)
            dlng = math.radians(float(avg_lng) - bplo_lng)
            a = (math.sin(dlat / 2) ** 2
                 + math.cos(math.radians(bplo_lat))
                 * math.cos(math.radians(float(avg_lat)))
                 * math.sin(dlng / 2) ** 2)
            dist_km = R * 2 * math.asin(math.sqrt(a))
            distance_score = min(dist_km / 20 * 100, 100)
        else:
            distance_score = 50

        ops_score = round(w1 * risk_score + w2 *
                          sector_score - w3 * distance_score, 1)
        ops_score = max(0.0, min(100.0, ops_score))

        non_compliance_rate = round(
            (flagged / total_reg * 100), 1) if total_reg else 0

        risk_level = (
            "High" if ops_score >= 65 else
            "Medium" if ops_score >= 35 else
            "Low"
        )

        rankings.append({
            "barangayID":          row["barangayID"],
            "barangayName":        row["barangayName"],
            "ops_score":           ops_score,
            "risk_score":          round(risk_score, 1),
            "sector_score":        sector_score,
            "distance_score":      round(distance_score, 1),
            "flagged_count":       flagged,
            "red_count":           red,
            "yellow_count":        yellow,
            "black_count":         black,
            "non_compliance_rate": non_compliance_rate,
            "risk_level":          risk_level,
        })

    rankings.sort(key=lambda x: x["ops_score"], reverse=True)
    for i, r in enumerate(rankings):
        r["rank"] = i + 1

    return jsonify({
        "descriptive": {
            "kpis": {
                "total_businesses":    total_businesses,
                "active_count":        active_count,
                "expired_count":       expired_count,
                "total_flagged":       total_flagged,
                "compliance_rate":     compliance_rate,
                "high_risk_barangays": high_risk_barangays,
            },
            "enforcement_progress":  enforcement_progress,
            "sectoral_distribution": sectoral_distribution,
            "business_size_dist":    business_size_dist,
            "compliance_timeline":   compliance_timeline,
            "audit_summary": {
                "total_inspections": total_inspections,
                "result_breakdown":  result_breakdown,
            },
        },
        "diagnostic": {
            "barangay_risk_data":     barangay_risk_data,
            "category_noncompliance": category_noncompliance,
            "flag_trend":             flag_trend,
        },
        "prescriptive": {
            "rankings":   rankings,
            "wlc_config": config,
        },
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
@analytics_bp.route("/wlc-config", methods=["GET"])
@jwt_required()
def get_config():
    return jsonify(get_wlc_config()), 200


@analytics_bp.route("/wlc-config", methods=["PUT"])
@admin_required()
def update_config():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No configuration data provided."}), 400
    updated_config, error = update_wlc_config(data)
    if error:
        return jsonify({"error": error}), 500
    return jsonify({"message": "WLC configuration updated successfully.", "data": updated_config}), 200
