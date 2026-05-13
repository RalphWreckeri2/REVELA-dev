from app import mysql


# ── Inspector task list ───────────────────────────────────────────────────────

def get_inspector_tasks(user_id):
    """
    Return all inspection reports assigned to this inspector
    where verificationStatus is 'Assigned' or 'Reassigned'.
    Joins geospatial_logs for flag details and barangays for name.
    """
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            SELECT
                ir.reportID,
                ir.userID,
                ir.targetID          AS logID,
                ir.inspectionResult,
                ir.verificationStatus,
                ir.remarks,
                ir.photoPath,
                ir.irTimestamp,
                ir.nearestLandmark,
                g.detectedName,
                g.flagColor,
                g.latitude,
                g.longitude,
                b.barangayName
            FROM inspection_reports ir
            JOIN geospatial_logs g  ON ir.targetID   = g.logID
            LEFT JOIN barangays b   ON g.barangayID  = b.barangayID
            WHERE ir.userID = %s
              AND ir.verificationStatus IN ('Assigned', 'Reassigned')
            ORDER BY ir.irTimestamp DESC
        """, (user_id,))
        rows = cursor.fetchall()
        cursor.close()

        for row in rows:
            if row.get("irTimestamp"):
                row["irTimestamp"] = str(row["irTimestamp"])

        return {"data": rows, "total": len(rows)}, None

    except Exception as e:
        return None, str(e)


# ── Assign inspection ─────────────────────────────────────────────────────────

def assign_inspection(log_id, inspector_user_id, assigned_by):
    """
    Create an INSPECTION_REPORTS row linking a geospatial log to an inspector.
    targetType is always 'geospatial_log' since we're dispatching from the flag map.
    Prevents duplicate open assignments for the same logID.
    """
    try:
        cursor = mysql.connection.cursor()

        # Guard: check the log exists
        cursor.execute(
            "SELECT logID, flagColor FROM geospatial_logs WHERE logID = %s",
            (log_id,)
        )
        flag = cursor.fetchone()
        if not flag:
            cursor.close()
            return None, f"Flag #{log_id} not found"

        # Check if there's already an open assignment
        cursor.execute("""
            SELECT reportID FROM inspection_reports
            WHERE targetID = %s
              AND verificationStatus IN ('Assigned', 'Reassigned')
            LIMIT 1
        """, (log_id,))
        existing = cursor.fetchone()

        # Guard: inspector user exists and has Inspector role
        cursor.execute(
            "SELECT userID, fullName, userRole FROM users WHERE userID = %s AND userRole = 'Inspector'",
            (inspector_user_id,)
        )
        inspector = cursor.fetchone()
        if not inspector:
            cursor.close()
            return None, f"Inspector userID {inspector_user_id} not found"

        # Check if this flag was already verified in a past report
        cursor.execute("""
            SELECT reportID FROM inspection_reports
            WHERE targetID = %s AND verificationStatus = 'Verified'
            LIMIT 1
        """, (log_id,))
        was_verified = cursor.fetchone()

        new_status = 'Reassigned' if was_verified else 'Assigned'

        if existing:
            cursor.execute("""
                UPDATE inspection_reports
                SET userID = %s, verificationStatus = %s
                WHERE reportID = %s
            """, (inspector_user_id, new_status, existing["reportID"]))
            report_id = existing["reportID"]
        else:
            cursor.execute("""
                INSERT INTO inspection_reports
                    (userID, targetID, targetType, verificationStatus)
                VALUES (%s, %s, 'geospatial_log', %s)
            """, (inspector_user_id, log_id, new_status))
            report_id = cursor.lastrowid

        mysql.connection.commit()
        cursor.close()

        return {
            "reportID":   report_id,
            "logID":      log_id,
            "inspectorID": inspector_user_id,
            "inspector":  inspector["fullName"],
            "status":     new_status,
        }, None

    except Exception as e:
        return None, str(e)


# ── Submit inspection ─────────────────────────────────────────────────────────

def submit_inspection(log_id, user_id, inspection_result,
                      verified_lat=None, verified_lng=None,
                      notes=None, photo_url=None):
    """
    Inspector submits their field report for a given logID.
    Updates the existing Assigned report row to 'Submitted'.
    verifiedLat/Lng stored in nearestLandmark as JSON-ish string for now
    (extend schema if you add dedicated columns later).
    """
    try:
        cursor = mysql.connection.cursor()

        # Find the open assignment for this inspector + log
        cursor.execute("""
            SELECT reportID, irTimestamp FROM inspection_reports
            WHERE targetID = %s
              AND userID   = %s
              AND verificationStatus IN ('Assigned', 'Reassigned')
            LIMIT 1
        """, (log_id, user_id))
        report = cursor.fetchone()

        if not report:
            cursor.close()
            return None, "No open assignment found for this flag and inspector"

        # Calculate resolution time in minutes
        cursor.execute("""
            SELECT TIMESTAMPDIFF(MINUTE, irTimestamp, NOW()) AS mins
            FROM inspection_reports WHERE reportID = %s
        """, (report["reportID"],))
        timing = cursor.fetchone()
        resolution_mins = timing["mins"] if timing else None

        # Build a coords string for nearestLandmark if coords provided
        landmark = None
        if verified_lat and verified_lng:
            landmark = f"{verified_lat},{verified_lng}"

        cursor.execute("""
            UPDATE inspection_reports
            SET inspectionResult    = %s,
                verificationStatus  = 'Submitted',
                remarks             = %s,
                photoPath           = %s,
                nearestLandmark     = COALESCE(%s, nearestLandmark),
                resolutionTime      = %s
            WHERE reportID = %s
        """, (
            inspection_result,
            notes,
            photo_url,
            landmark,
            resolution_mins,
            report["reportID"],
        ))
        mysql.connection.commit()
        cursor.close()

        return {
            "reportID":         report["reportID"],
            "inspectionResult": inspection_result,
            "status":           "Submitted",
            "resolutionMins":   resolution_mins,
        }, None

    except Exception as e:
        return None, str(e)


# ── Verify inspection ─────────────────────────────────────────────────────────

def verify_inspection(report_id):
    """
    Admin confirms the inspection result.
    1. Set verificationStatus → 'Verified'
    2. Update geospatial_logs.flagColor to match inspectionResult
    """
    try:
        cursor = mysql.connection.cursor()

        cursor.execute("""
            SELECT reportID, targetID, inspectionResult, verificationStatus
            FROM inspection_reports
            WHERE reportID = %s
        """, (report_id,))
        report = cursor.fetchone()

        if not report:
            cursor.close()
            return None, f"Report #{report_id} not found"

        if report["verificationStatus"] != "Submitted":
            cursor.close()
            return None, f"Report is '{report['verificationStatus']}' — only Submitted reports can be verified"

        if not report["inspectionResult"]:
            cursor.close()
            return None, "Report has no inspection result to verify"

        # Update report status
        cursor.execute("""
            UPDATE inspection_reports
            SET verificationStatus = 'Verified'
            WHERE reportID = %s
        """, (report_id,))

        # Propagate result → geospatial_logs
        cursor.execute("""
            UPDATE geospatial_logs
            SET flagColor = %s
            WHERE logID = %s
        """, (report["inspectionResult"], report["targetID"]))

        mysql.connection.commit()
        cursor.close()

        return {
            "reportID":         report_id,
            "logID":            report["targetID"],
            "newFlagColor":     report["inspectionResult"],
            "status":           "Verified",
        }, None

    except Exception as e:
        return None, str(e)


# ── Get all inspections (admin) ───────────────────────────────────────────────

def get_all_inspections(status=None, barangay_id=None, page=1, per_page=20):
    """
    Admin view: paginated inspection reports with flag + inspector details.
    Filterable by verificationStatus and barangayID.
    """
    try:
        cursor = mysql.connection.cursor()

        conditions = []
        params = []

        if status:
            conditions.append("ir.verificationStatus = %s")
            params.append(status)

        if barangay_id:
            conditions.append("g.barangayID = %s")
            params.append(barangay_id)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        offset = (page - 1) * per_page

        cursor.execute(
            f"""
            SELECT COUNT(*) AS total
            FROM inspection_reports ir
            JOIN geospatial_logs g ON ir.targetID = g.logID
            {where}
            """,
            params,
        )
        total = cursor.fetchone()["total"]

        cursor.execute(
            f"""
            SELECT
                ir.reportID,
                ir.targetID          AS logID,
                ir.inspectionResult,
                ir.verificationStatus,
                ir.remarks,
                ir.photoPath,
                ir.irTimestamp,
                ir.resolutionTime,
                ir.nearestLandmark,
                g.detectedName,
                g.flagColor,
                g.latitude,
                g.longitude,
                b.barangayName,
                u.fullName           AS inspectorName,
                u.userID             AS inspectorID
            FROM inspection_reports ir
            JOIN geospatial_logs g  ON ir.targetID  = g.logID
            LEFT JOIN barangays b   ON g.barangayID = b.barangayID
            LEFT JOIN users u       ON ir.userID    = u.userID
            {where}
            ORDER BY ir.irTimestamp DESC
            LIMIT %s OFFSET %s
            """,
            params + [per_page, offset],
        )
        rows = cursor.fetchall()
        cursor.close()

        for row in rows:
            if row.get("irTimestamp"):
                row["irTimestamp"] = str(row["irTimestamp"])

        return {
            "data":     rows,
            "total":    total,
            "page":     page,
            "per_page": per_page,
            "pages":    max(1, -(-total // per_page)),
        }, None

    except Exception as e:
        return None, str(e)
