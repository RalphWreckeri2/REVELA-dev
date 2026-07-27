import math
import traceback

from flask import Blueprint, jsonify, request
from api.middleware.decorators import jwt_required, admin_required
from api.analytics.service import get_wlc_config, update_wlc_config
from api.analytics.filters import (
    parse_analytics_filters,
    registry_sql,
    geo_sql,
    geo_on_extra,
    barangay_b_sql,
    inspection_sql,
    filters_without,
)

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/all", methods=["GET"])
@jwt_required()
def get_all_analytics():
    try:
        F = parse_analytics_filters(request.args)
        return _get_all_analytics_inner(F)
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


def _get_all_analytics_inner(F=None):
    if F is None:
        F = {}
    from app import mysql

    cur = mysql.connection.cursor()

    Fx = F or {}
    reg_all, reg_all_p = registry_sql("official_registry", Fx)
    reg_no_status, reg_no_status_p = registry_sql(
        "official_registry", filters_without(Fx, "application_status"))
    reg_o, reg_o_p = registry_sql("o", Fx)
    geo_g, geo_g_p = geo_sql("g", Fx)
    geo_on_g, geo_on_g_p = geo_on_extra("g", Fx)
    brgy_b, brgy_b_p = barangay_b_sql(Fx)
    insp_ir, insp_ir_p = inspection_sql("ir", Fx)

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

    cur.execute(
        "SELECT COUNT(*) AS n FROM official_registry WHERE 1=1" + reg_all,
        reg_all_p,
    )
    total_businesses = cur.fetchone()["n"]

    cur.execute(
        "SELECT COUNT(*) AS n FROM official_registry WHERE applicationStatus = 'Active'"
        + reg_no_status,
        reg_no_status_p,
    )
    active_count = cur.fetchone()["n"]

    cur.execute(
        "SELECT COUNT(*) AS n FROM official_registry WHERE applicationStatus = 'Expired'"
        + reg_no_status,
        reg_no_status_p,
    )
    expired_count = cur.fetchone()["n"]

    cur.execute(
        "SELECT COUNT(*) AS n FROM official_registry WHERE applicationStatus = 'Closed'"
        + reg_no_status,
        reg_no_status_p,
    )
    closed_count = cur.fetchone()["n"]

    cur.execute(
        "SELECT COUNT(*) AS n FROM official_registry WHERE applicationStatus = 'Pending'"
        + reg_no_status,
        reg_no_status_p,
    )
    pending_count = cur.fetchone()["n"]

    cur.execute(
        "SELECT COUNT(*) AS n FROM official_registry WHERE YEAR(lastRenewalDate) = YEAR(CURDATE())"
        + reg_all,
        reg_all_p,
    )
    current_year_count = cur.fetchone()["n"]

    cur.execute(
        "SELECT COUNT(*) AS n FROM geospatial_logs g WHERE g.flagColor != 'Green'" + geo_g,
        geo_g_p,
    )
    total_flagged = cur.fetchone()["n"]

    compliance_rate = round(
        (active_count / total_businesses * 100), 1) if total_businesses else 0

    # Enforcement progress
    cur.execute(f"""
        SELECT
            b.barangayName,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Green'  THEN g.logID END) AS green_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Red'    THEN g.logID END) AS red_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Yellow' THEN g.logID END) AS yellow_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Black'  THEN g.logID END) AS black_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Orange' THEN g.logID END) AS orange_count
        FROM barangays b
        LEFT JOIN geospatial_logs g ON g.barangayID = b.barangayID{geo_on_g}
        WHERE 1=1 {brgy_b}
        GROUP BY b.barangayID, b.barangayName
        ORDER BY b.barangayName
    """, geo_on_g_p + brgy_b_p)
    enforcement_progress = [
        {
            "barangayName": row["barangayName"],
            "green_count":  row["green_count"] or 0,
            "red_count":    row["red_count"] or 0,
            "yellow_count": row["yellow_count"] or 0,
            "black_count":  row["black_count"] or 0,
            "orange_count": row["orange_count"] or 0,
        }
        for row in cur.fetchall()
    ]

    # Sectoral distribution
    cur.execute(f"""
        SELECT COALESCE(lineOfBusiness, 'Unclassified') AS sector, COUNT(*) AS count
        FROM official_registry
        WHERE 1=1 {reg_all}
        GROUP BY lineOfBusiness
        ORDER BY count DESC
    """, reg_all_p)
    sectoral_distribution = [
        {"sector": row["sector"], "count": row["count"]}
        for row in cur.fetchall()
    ]

    # Nature per barangay
    cur.execute(f"""
        SELECT COALESCE(b.barangayName, 'Unknown') AS barangayName, COALESCE(o.lineOfBusiness, 'Unclassified') AS nature, COUNT(*) AS count
        FROM official_registry o
        LEFT JOIN barangays b ON o.barangayID = b.barangayID
        WHERE 1=1 {reg_all}
        GROUP BY b.barangayName, nature
        ORDER BY b.barangayName ASC, count DESC
    """, reg_all_p)
    
    nature_per_barangay_raw = cur.fetchall()
    
    # Process into a format suitable for stacked bar chart: [{barangayName: 'Brgy 1', 'Retail': 10, 'Food': 5}, ...]
    nature_per_barangay_dict = {}
    for row in nature_per_barangay_raw:
        brgy = row["barangayName"]
        nature = row["nature"]
        count = row["count"]
        if brgy not in nature_per_barangay_dict:
            nature_per_barangay_dict[brgy] = {"barangayName": brgy}
        nature_per_barangay_dict[brgy][nature] = count
    
    nature_per_barangay = list(nature_per_barangay_dict.values())


    # Business size
    cur.execute(f"""
        SELECT COALESCE(businessSize, 'Unknown') AS size_label, COUNT(*) AS count
        FROM official_registry
        WHERE 1=1 {reg_all}
        GROUP BY businessSize
        ORDER BY count DESC
    """, reg_all_p)
    business_size_dist = [
        {"size_label": row["size_label"], "count": row["count"]}
        for row in cur.fetchall()
    ]

    # Business type (Legal Structure)
    cur.execute(f"""
        SELECT COALESCE(businessType, 'Unknown') AS type_label, COUNT(*) AS count
        FROM official_registry
        WHERE 1=1 {reg_all}
        GROUP BY businessType
        ORDER BY count DESC
    """, reg_all_p)
    business_type_dist = [
        {"type_label": row["type_label"], "count": row["count"]}
        for row in cur.fetchall()
    ]

    # Compliance by Business Size
    cur.execute(f"""
        SELECT COALESCE(businessSize, 'Unknown') AS size_label,
               SUM(CASE WHEN applicationStatus = 'Active' THEN 1 ELSE 0 END) AS active_count,
               SUM(CASE WHEN applicationStatus != 'Active' THEN 1 ELSE 0 END) AS inactive_count
        FROM official_registry
        WHERE 1=1 {reg_all}
        GROUP BY businessSize
    """, reg_all_p)
    compliance_by_size = [
        {
            "size_label": row["size_label"],
            "active_count": row["active_count"] or 0,
            "inactive_count": row["inactive_count"] or 0
        }
        for row in cur.fetchall()
    ]

    # Compliance timeline
    cur.execute(f"""
        SELECT
            DATE_FORMAT(lastRenewalDate, '%%Y-%%m') AS month,
            SUM(CASE WHEN applicationStatus = 'Active'  THEN 1 ELSE 0 END) AS active_count,
            SUM(CASE WHEN applicationStatus != 'Active' THEN 1 ELSE 0 END) AS non_active_count
        FROM official_registry
        WHERE lastRenewalDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        {reg_no_status}
        GROUP BY month
        ORDER BY month
    """, reg_no_status_p)
    compliance_timeline = [
        {
            "month":            row["month"],
            "active_count":     row["active_count"] or 0,
            "non_active_count": row["non_active_count"] or 0,
        }
        for row in cur.fetchall()
    ]

    # Audit summary
    cur.execute(f"""
        SELECT COUNT(*) AS n FROM inspection_reports ir
        JOIN geospatial_logs g ON ir.targetID = g.logID
        WHERE 1=1 {insp_ir} {geo_g}
    """, insp_ir_p + geo_g_p)
    total_inspections = cur.fetchone()["n"]

    cur.execute(f"""
        SELECT ir.inspectionResult, COUNT(*) AS count
        FROM inspection_reports ir
        JOIN geospatial_logs g ON ir.targetID = g.logID
        WHERE ir.inspectionResult IS NOT NULL {insp_ir} {geo_g}
        GROUP BY ir.inspectionResult
    """, insp_ir_p + geo_g_p)
    result_breakdown = [
        {"inspectionResult": row["inspectionResult"], "count": row["count"]}
        for row in cur.fetchall()
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # TIER 2 — DIAGNOSTIC
    # ══════════════════════════════════════════════════════════════════════════

    # Barangay risk heatmap
    cur.execute(f"""
        SELECT
            b.barangayID,
            b.barangayName,
            COUNT(DISTINCT CASE WHEN g.flagColor != 'Green' THEN g.logID END) AS flagged_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Red'    THEN g.logID END) AS red_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Yellow' THEN g.logID END) AS yellow_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Black'  THEN g.logID END) AS black_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Orange' THEN g.logID END) AS orange_count
        FROM barangays b
        LEFT JOIN geospatial_logs g ON g.barangayID = b.barangayID{geo_on_g}
        WHERE 1=1 {brgy_b}
        GROUP BY b.barangayID, b.barangayName
        ORDER BY flagged_count DESC
    """, geo_on_g_p + brgy_b_p)
    barangay_risk_data = [
        {
            "barangayID":    row["barangayID"],
            "barangayName":  row["barangayName"],
            "flagged_count": row["flagged_count"] or 0,
            "red_count":     row["red_count"] or 0,
            "yellow_count":  row["yellow_count"] or 0,
            "black_count":   row["black_count"] or 0,
            "orange_count":  row["orange_count"] or 0,
        }
        for row in cur.fetchall()
    ]

    high_risk_barangays = sum(
        1 for r in barangay_risk_data
        if r["red_count"] > 0 or r["flagged_count"] >= 5
    )

    # Category non-compliance
    cur.execute(f"""
        SELECT
            COALESCE(o.lineOfBusiness, 'Unclassified') AS category,
            COUNT(DISTINCT g.logID) AS flagged_count
        FROM geospatial_logs g
        LEFT JOIN official_registry o ON g.detectedName = o.businessName
            AND g.barangayID = o.barangayID{reg_o}
        WHERE 1=1 {geo_g}
        GROUP BY category
        ORDER BY flagged_count DESC
        LIMIT 10
    """, reg_o_p + geo_g_p)
    category_noncompliance = [
        {"category": row["category"], "flagged_count": row["flagged_count"]}
        for row in cur.fetchall()
    ]

    # Weekly red-flag trend
    cur.execute(f"""
        SELECT
            DATE_FORMAT(
                DATE_SUB(g.detectedDate, INTERVAL WEEKDAY(g.detectedDate) DAY),
                '%%Y-%%m-%%d'
            ) AS week_start,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Red' THEN g.logID END) AS new_red_flags
        FROM geospatial_logs g
        WHERE g.detectedDate >= DATE_SUB(NOW(), INTERVAL 8 WEEK) {geo_g}
        GROUP BY week_start
        ORDER BY week_start
    """, geo_g_p)
    flag_trend = [
        {"week_start": str(row["week_start"]),
         "new_red_flags": row["new_red_flags"] or 0}
        for row in cur.fetchall()
    ]

    # DBSCAN Hotspot Intelligence
    dbscan_insight = "Not enough data to pinpoint specific high-risk zones."
    dbscan_clusters = []
    try:
        cur.execute(f"""
            SELECT g.latitude, g.longitude, COALESCE(b.barangayName, 'Unknown Area') as barangayName
            FROM geospatial_logs g
            LEFT JOIN barangays b ON g.barangayID = b.barangayID
            WHERE g.flagColor IN ('Red', 'Black')
              AND g.latitude IS NOT NULL
              AND g.longitude IS NOT NULL {geo_g}
        """, geo_g_p)
        hotspot_data = cur.fetchall()

        if len(hotspot_data) >= 3:
            import numpy as np
            from sklearn.cluster import DBSCAN
            from collections import Counter

            # Convert coords to radians for Haversine distance
            coords = np.radians(
                [[float(r['latitude']), float(r['longitude'])] for r in hotspot_data])

            # 20 meters in radians (10m is often too strict due to GPS drift, 20m provides a better result)
            kms_per_radian = 6371.0088
            epsilon = 0.02 / kms_per_radian

            db = DBSCAN(eps=epsilon, min_samples=3,
                        algorithm='ball_tree', metric='haversine').fit(coords)
            labels = db.labels_

            valid_labels = [lbl for lbl in labels if lbl != -1]  # -1 is noise
            largest_cluster_label = -1
            if valid_labels:
                # Find largest cluster
                largest_cluster_label = Counter(
                    valid_labels).most_common(1)[0][0]
                cluster_size = Counter(valid_labels).most_common(1)[0][1]

            # Export points for visualization
            for idx, row in enumerate(hotspot_data):
                dbscan_clusters.append({
                    "lat": float(row['latitude']),
                    "lng": float(row['longitude']),
                    "cluster": int(labels[idx]),
                    "is_primary": bool(int(labels[idx]) == largest_cluster_label and int(labels[idx]) != -1),
                    "barangay": row['barangayName']
                })

            if valid_labels:

                # Find dominant barangay in this cluster
                cluster_barangays = [hotspot_data[i]['barangayName'] for i, lbl in enumerate(
                    labels) if lbl == largest_cluster_label]
                dominant_barangay = Counter(
                    cluster_barangays).most_common(1)[0][0]

                dbscan_insight = f"Primary Hotspot: {cluster_size} unregistered/high-risk businesses located closely together near {dominant_barangay}. Immediate inspection recommended."
            else:
                dbscan_insight = "No densely packed zones of high-risk businesses detected at this time."
    except Exception as e:
        print(f"DBSCAN Error: {e}")
        dbscan_insight = "Hotspot detection temporarily unavailable."

    # Moran's I Proxy (Spatial Autocorrelation)
    morans_insight = "Not enough data to determine broader geographic patterns."
    morans_data = {"points": [], "threshold": 0}
    try:
        cur.execute(f"""
            SELECT 
                b.barangayName,
                AVG(g.latitude) as lat,
                AVG(g.longitude) as lng,
                COUNT(DISTINCT CASE WHEN g.flagColor IN ('Red', 'Black') THEN g.logID END) as severe_count
            FROM barangays b
            JOIN geospatial_logs g ON b.barangayID = g.barangayID{geo_on_g}
            WHERE g.latitude IS NOT NULL AND g.longitude IS NOT NULL {brgy_b}
            GROUP BY b.barangayID, b.barangayName
        """, geo_on_g_p + brgy_b_p)
        brgy_spatial = cur.fetchall()

        if len(brgy_spatial) >= 4:
            import numpy as np

            points = [
                {'name': r['barangayName'], 'lat': float(r['lat']), 'lng': float(
                    r['lng']), 'risk': float(r['severe_count'])}
                for r in brgy_spatial if r['lat'] and r['lng']
            ]

            if len(points) >= 4:
                risk_values = [p['risk'] for p in points]
                threshold = np.percentile(risk_values, 75) if sum(
                    risk_values) > 0 else 0
                
                morans_data["threshold"] = float(threshold)
                morans_data["points"] = [
                    {"barangay": p['name'], "risk": p['risk'], "is_high_risk": bool(p['risk'] > threshold and p['risk'] > 0)}
                    for p in points
                ]
                
                high_risk_points = [
                    p for p in points if p['risk'] > threshold and p['risk'] > 0]

                if len(high_risk_points) >= 2:
                    all_lat = np.mean([p['lat'] for p in points])
                    all_lng = np.mean([p['lng'] for p in points])
                    hr_lat = np.mean([p['lat'] for p in high_risk_points])
                    hr_lng = np.mean([p['lng'] for p in high_risk_points])

                    ns = "Northern" if hr_lat > all_lat else "Southern"
                    ew = "Eastern" if hr_lng > all_lng else "Western"

                    def haversine(lat1, lon1, lat2, lon2):
                        R = 6371
                        dLat, dLon = np.radians(
                            lat2 - lat1), np.radians(lon2 - lon1)
                        a = np.sin(dLat/2)**2 + np.cos(np.radians(lat1)) * \
                            np.cos(np.radians(lat2)) * np.sin(dLon/2)**2
                        return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))

                    all_dists = [haversine(points[i]['lat'], points[i]['lng'], points[j]['lat'], points[j]['lng'])
                                 for i in range(len(points)) for j in range(i+1, len(points))]
                    hr_dists = [haversine(high_risk_points[i]['lat'], high_risk_points[i]['lng'], high_risk_points[j]['lat'], high_risk_points[j]['lng'])
                                for i in range(len(high_risk_points)) for j in range(i+1, len(high_risk_points))]

                    avg_all = np.mean(all_dists)
                    avg_hr = np.mean(hr_dists) if hr_dists else 0

                    if 0 < avg_hr < (avg_all * 0.85):
                        morans_insight = f"Concentrated Risk: High-risk barangays are heavily grouped together, primarily located in the {ns}-{ew} sector."
                    elif avg_hr > (avg_all * 1.15):
                        morans_insight = f"Widespread Risk: High-risk barangays are scattered widely across the municipality."
                    else:
                        morans_insight = f"No Obvious Pattern: High-risk areas are distributed randomly without obvious clustering."
                else:
                    morans_insight = "Not enough variation in risk to determine regional patterns."
    except Exception as e:
        print(f"Moran's I Proxy Error: {e}")
        morans_insight = "Regional pattern analysis temporarily unavailable."

    # ══════════════════════════════════════════════════════════════════════════
    # TIER 3 — PRESCRIPTIVE (WLC / OPS)
    # ══════════════════════════════════════════════════════════════════════════

    cur.execute(f"""
        SELECT
            b.barangayID,
            b.barangayName,
            COUNT(DISTINCT CASE WHEN g.flagColor != 'Green' THEN g.logID END) AS flagged_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Red'    THEN g.logID END) AS red_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Yellow' THEN g.logID END) AS yellow_count,
            COUNT(DISTINCT CASE WHEN g.flagColor = 'Black'  THEN g.logID END) AS black_count,
            AVG(g.latitude)                                          AS avg_lat,
            AVG(g.longitude)                                         AS avg_lng,
            COUNT(DISTINCT o.businessID)                             AS total_registered
        FROM barangays b
        LEFT JOIN geospatial_logs   g ON g.barangayID = b.barangayID{geo_on_g}
        LEFT JOIN official_registry o ON o.barangayID = b.barangayID{reg_o}
        WHERE 1=1 {brgy_b}
        GROUP BY b.barangayID, b.barangayName
    """, geo_on_g_p + reg_o_p + brgy_b_p)
    rows = cur.fetchall()

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

        # Convert distance penalty to a normalized addition so OPS scales 0-100 properly
        ops_score = round(w1 * risk_score + w2 *
                          sector_score + w3 * (100 - distance_score), 1)
        ops_score = max(0.0, min(100.0, ops_score))

        non_compliance_rate = round(
            (flagged / total_reg * 100), 1) if total_reg else 0

        risk_level = (
            "High" if ops_score >= 60 else
            "Medium" if ops_score >= 30 else
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

    dispatch_recommendations = []
    top_3 = rankings[:3]
    valid_top_3 = [b for b in top_3 if b["flagged_count"] > 0]

    geo_dispatch, geo_dispatch_p = geo_sql(
        "g", filters_without(Fx, "barangay_ids"))

    if valid_top_3:
        # Count actual active inspectors from the users table
        cur.execute(
            "SELECT COUNT(*) AS n FROM users WHERE userRole = 'Inspector' AND isActive = 1")
        inspector_row = cur.fetchone()
        total_inspectors = int(
            inspector_row["n"]) if inspector_row and inspector_row["n"] else 6
        # Ensure we have at least enough to assign 1 to each top barangay
        total_inspectors = max(len(valid_top_3), total_inspectors)

        top_3_flags = sum(b["flagged_count"] for b in valid_top_3)
        available_inspectors = total_inspectors

        for i, brgy in enumerate(valid_top_3):
            cur.execute(f"""
                SELECT COALESCE(o.lineOfBusiness, 'Unclassified') AS category, COUNT(g.logID) as count
                FROM geospatial_logs g
                LEFT JOIN official_registry o ON g.detectedName = o.businessName
                    AND g.barangayID = o.barangayID{reg_o}
                WHERE g.barangayID = %s {geo_dispatch}
                GROUP BY category
                ORDER BY count DESC
                LIMIT 2
            """, [brgy["barangayID"]] + reg_o_p + geo_dispatch_p)

            top_cats_rows = cur.fetchall()
            if top_cats_rows:
                top_cats = [str(row["category"]) for row in top_cats_rows]
                priority_text = " and ".join(top_cats)
            else:
                priority_text = "General Categories"

            # Proportionally distribute actual inspectors across the top 3
            if i == len(valid_top_3) - 1:
                inspectors = available_inspectors
            else:
                inspectors = max(
                    1, round((brgy["flagged_count"] / top_3_flags) * total_inspectors))
                # Ensure we leave at least 1 inspector for the remaining barangays in the list
                inspectors = min(
                    inspectors, available_inspectors - (len(valid_top_3) - 1 - i))

            available_inspectors -= inspectors

            rec_text = f"Deploy {inspectors} inspector{'s' if inspectors > 1 else ''} to {brgy['barangayName']} this week. Priority: {priority_text} (Sector Severity: {brgy['sector_score']}). Estimated coverage: {brgy['flagged_count']} flagged entities."

            dispatch_recommendations.append({
                "barangayID": brgy["barangayID"],
                "barangayName": brgy["barangayName"],
                "rank": brgy["rank"],
                "recommendation": rec_text
            })

    # ══════════════════════════════════════════════════════════════════════════
    # TIER 4 — OPERATIONS
    # ══════════════════════════════════════════════════════════════════════════
    
    # 1. Inspector Leaderboard
    cur.execute(f"""
        SELECT 
            u.userID, 
            u.fullName, 
            COUNT(ir.reportID) as total_assigned, 
            SUM(CASE WHEN ir.verificationStatus IN ('Verified', 'Submitted') THEN 1 ELSE 0 END) as total_completed, 
            AVG(ir.resolutionTime) as avg_resolution_time 
        FROM inspection_reports ir 
        JOIN users u ON ir.userID = u.userID 
        WHERE 1=1 {insp_ir}
        GROUP BY u.userID
        ORDER BY total_completed DESC
    """, insp_ir_p)
    inspector_stats = list(cur.fetchall())
    for stat in inspector_stats:
        if stat["avg_resolution_time"] is not None:
            stat["avg_resolution_time"] = float(stat["avg_resolution_time"])
        else:
            stat["avg_resolution_time"] = 0.0

    # 2. Inspection Status Breakdown
    cur.execute(f"""
        SELECT COALESCE(verificationStatus, 'Unassigned') as status, COUNT(reportID) as count
        FROM inspection_reports ir
        WHERE 1=1 {insp_ir}
        GROUP BY verificationStatus
    """, insp_ir_p)
    status_breakdown = list(cur.fetchall())

    # 3. Inspection Timeline
    cur.execute(f"""
        SELECT DATE(irTimestamp) as date, COUNT(reportID) as count
        FROM inspection_reports ir
        WHERE 1=1 {insp_ir}
        GROUP BY DATE(irTimestamp)
        ORDER BY date ASC
    """, insp_ir_p)
    timeline_rows = list(cur.fetchall())
    inspection_timeline = []
    for row in timeline_rows:
        inspection_timeline.append({
            "date": row["date"].strftime("%Y-%m-%d") if row["date"] else None,
            "count": row["count"]
        })

    cur.close()

    return jsonify({
        "applied_filters": Fx,
        "descriptive": {
            "kpis": {
                "total_businesses":    total_businesses,
                "active_count":        active_count,
                "expired_count":       expired_count,
                "closed_count":        closed_count,
                "pending_count":       pending_count,
                "current_year_count":  current_year_count,
                "total_flagged":       total_flagged,
                "compliance_rate":     compliance_rate,
                "high_risk_barangays": high_risk_barangays,
            },
            "enforcement_progress":  enforcement_progress,
            "nature_per_barangay":   nature_per_barangay,
            "sectoral_distribution": sectoral_distribution,
            "business_size_dist":    business_size_dist,
            "business_type_dist":    business_type_dist,
            "compliance_by_size":    compliance_by_size,
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
            "dbscan_insight":         dbscan_insight,
            "morans_insight":         morans_insight,
            "dbscan_clusters":        dbscan_clusters,
            "morans_data":            morans_data,
        },
        "prescriptive": {
            "rankings":   rankings,
            "wlc_config": config,
            "dispatch_recommendations": dispatch_recommendations,
        },
        "operations": {
            "inspector_stats": inspector_stats,
            "status_breakdown": status_breakdown,
            "inspection_timeline": inspection_timeline,
        },
    }), 200


@analytics_bp.route("/filter-metadata", methods=["GET"])
@jwt_required()
def analytics_filter_metadata():
    """Distinct values for analytics filter controls (registry, flags, inspections)."""
    from app import mysql

    cur = mysql.connection.cursor()
    cur.execute(
        """
        SELECT DISTINCT applicationStatus AS v FROM official_registry
        WHERE applicationStatus IS NOT NULL AND TRIM(applicationStatus) <> ''
        ORDER BY applicationStatus
        """
    )
    application_statuses = [r["v"] for r in cur.fetchall()]

    cur.execute(
        """
        SELECT DISTINCT lineOfBusiness AS v FROM official_registry
        WHERE lineOfBusiness IS NOT NULL AND TRIM(lineOfBusiness) <> ''
        ORDER BY lineOfBusiness
        LIMIT 500
        """
    )
    lines_of_business = [r["v"] for r in cur.fetchall()]

    cur.execute(
        """
        SELECT DISTINCT businessType AS v FROM official_registry
        WHERE businessType IS NOT NULL AND TRIM(businessType) <> ''
        ORDER BY businessType
        LIMIT 500
        """
    )
    business_types = [r["v"] for r in cur.fetchall()]

    cur.execute(
        """
        SELECT DISTINCT businessSize AS v FROM official_registry
        WHERE businessSize IS NOT NULL AND TRIM(businessSize) <> ''
        ORDER BY businessSize
        """
    )
    business_sizes = [r["v"] for r in cur.fetchall()]

    cur.execute(
        """
        SELECT DISTINCT inspectionResult AS v FROM inspection_reports
        WHERE inspectionResult IS NOT NULL AND TRIM(inspectionResult) <> ''
        ORDER BY inspectionResult
        """
    )
    inspection_results = [r["v"] for r in cur.fetchall()]

    cur.execute(
        """
        SELECT DISTINCT verificationStatus AS v FROM inspection_reports
        WHERE verificationStatus IS NOT NULL AND TRIM(verificationStatus) <> ''
        ORDER BY verificationStatus
        """
    )
    verification_statuses = [r["v"] for r in cur.fetchall()]

    cur.close()

    return jsonify({
        "flag_colors": ["Green", "Yellow", "Red", "Black", "Orange"],
        "application_statuses": application_statuses,
        "lines_of_business": lines_of_business,
        "business_types": business_types,
        "business_sizes": business_sizes,
        "inspection_results": inspection_results,
        "verification_statuses": verification_statuses,
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
@analytics_bp.route("/ops-rankings", methods=["GET"])
@jwt_required()
def get_ops_rankings_only():
    """Lightweight endpoint to fetch real-time OPS priority rankings for the Maps/Dispatch UI."""
    try:
        from app import mysql
        cur = mysql.connection.cursor()

        config = get_wlc_config()
        w1 = config.get("w1_risk", 40) / 100
        w2 = config.get("w2_sector", 40) / 100
        w3 = config.get("w3_distance", 20) / 100
        bplo_lat = config.get("bplo_lat", 13.9667)
        bplo_lng = config.get("bplo_lng", 121.1167)
        sector_scores = config.get("sectors", {})

        cur.execute("""
            SELECT
                b.barangayID,
                b.barangayName,
                COUNT(DISTINCT CASE WHEN g.flagColor != 'Green' THEN g.logID END) AS flagged_count,
                COUNT(DISTINCT CASE WHEN g.flagColor = 'Red'    THEN g.logID END) AS red_count,
                COUNT(DISTINCT CASE WHEN g.flagColor = 'Yellow' THEN g.logID END) AS yellow_count,
                COUNT(DISTINCT CASE WHEN g.flagColor = 'Black'  THEN g.logID END) AS black_count,
                AVG(g.latitude)                                          AS avg_lat,
                AVG(g.longitude)                                         AS avg_lng
            FROM barangays b
            LEFT JOIN geospatial_logs g ON g.barangayID = b.barangayID
            GROUP BY b.barangayID, b.barangayName
        """)
        rows = cur.fetchall()

        max_flagged = max(
            (r["flagged_count"] or 0 for r in rows), default=1) or 1
        rankings = []

        for row in rows:
            flagged = int(row["flagged_count"] or 0)
            risk_score = min(
                (((int(row["red_count"] or 0) * 3 + int(row["yellow_count"] or 0) * 2 + int(row["black_count"] or 0) * 4) / max(flagged, 1))
                 * (flagged / max_flagged) * 100), 100
            )
            sector_score = float(sector_scores.get(row["barangayName"], 50))

            if row["avg_lat"] and row["avg_lng"]:
                R = 6371
                a = (math.sin(math.radians(float(row["avg_lat"]) - bplo_lat) / 2) ** 2
                     + math.cos(math.radians(bplo_lat)) *
                     math.cos(math.radians(float(row["avg_lat"])))
                     * math.sin(math.radians(float(row["avg_lng"]) - bplo_lng) / 2) ** 2)
                distance_score = min(
                    (R * 2 * math.asin(math.sqrt(a))) / 20 * 100, 100)
            else:
                distance_score = 50

            ops_score = max(0.0, min(100.0, round(
                w1 * risk_score + w2 * sector_score + w3 * (100 - distance_score), 1)))

            rankings.append({
                "barangayID": row["barangayID"],
                "barangayName": row["barangayName"],
                "ops_score": ops_score,
                "flagged_count": flagged,
                "risk_level": "High" if ops_score >= 60 else "Medium" if ops_score >= 30 else "Low"
            })

        rankings.sort(key=lambda x: x["ops_score"], reverse=True)
        for i, r in enumerate(rankings):
            r["rank"] = i + 1
        cur.close()
        return jsonify({"data": rankings}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
