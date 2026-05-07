import os
import requests as http
from geopy.distance import geodesic
from app import mysql

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Center of Mataasnakahoy, Batangas
MUNICIPALITY_LAT = 13.9667
MUNICIPALITY_LNG = 121.1167
SEARCH_RADIUS_M = 5000      # 5km radius
THRESHOLD_M = 20        # 20-meter match threshold


# ── Google Places fetch ───────────────────────────────────────────────────────

def _fetch_all_places():
    """
    Paginate through Google Places Nearby Search until all results are fetched.
    Returns a flat list of place dicts.
    """
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{MUNICIPALITY_LAT},{MUNICIPALITY_LNG}",
        "radius":   SEARCH_RADIUS_M,
        "type":     "establishment",
        "key":      GOOGLE_MAPS_API_KEY,
    }

    places = []
    while True:
        resp = http.get(url, params=params, timeout=10)
        data = resp.json()

        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            break

        places.extend(data.get("results", []))

        next_token = data.get("next_page_token")
        if not next_token:
            break

        # Google requires a short delay before next_page_token is valid
        import time
        time.sleep(2)
        params = {"pagetoken": next_token, "key": GOOGLE_MAPS_API_KEY}

    return places


# ── Registry loader ───────────────────────────────────────────────────────────

def _load_registry():
    """Load all official registry entries with coordinates."""
    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT businessID, barangayID, businessName, latitude, longitude
        FROM official_registry
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    """)
    rows = cursor.fetchall()
    cursor.close()
    return rows


# ── 20-meter threshold check ──────────────────────────────────────────────────

def _find_nearest(poi_lat, poi_lng, registry):
    """
    For a given POI, find the nearest OFFICIAL_REGISTRY entry.
    Returns (nearest_row, distance_in_meters).
    """
    nearest = None
    nearest_dist = float("inf")

    for entry in registry:
        if not entry["latitude"] or not entry["longitude"]:
            continue
        dist = geodesic(
            (poi_lat, poi_lng),
            (float(entry["latitude"]), float(entry["longitude"]))
        ).meters

        if dist < nearest_dist:
            nearest_dist = dist
            nearest = entry

    return nearest, nearest_dist


# ── Barangay resolver ─────────────────────────────────────────────────────────

def _get_barangay_id_by_coords(lat, lng):
    """
    Best-effort: find which barangayID an unregistered POI belongs to
    by matching it to the nearest registry entry's barangayID.
    Falls back to barangayID=1 if nothing found.
    """
    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT barangayID, latitude, longitude
        FROM official_registry
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    """)
    rows = cursor.fetchall()
    cursor.close()

    if not rows:
        return 1  # fallback

    nearest_id = 1
    nearest_dist = float("inf")
    for row in rows:
        dist = geodesic(
            (lat, lng),
            (float(row["latitude"]), float(row["longitude"]))
        ).meters
        if dist < nearest_dist:
            nearest_dist = dist
            nearest_id = row["barangayID"]

    return nearest_id


# ── Already flagged check ─────────────────────────────────────────────────────

def _already_flagged(place_id):
    """Return True if this place_id already has a Red Flag in GEOSPATIAL_LOGS."""
    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT logID FROM geospatial_logs
        WHERE placeID = %s AND flagColor = 'Red'
        LIMIT 1
    """, (place_id,))
    row = cursor.fetchone()
    cursor.close()
    return row is not None


# ── Insert Red Flag ───────────────────────────────────────────────────────────

def _insert_red_flag(place_id, place_name, lat, lng, barangay_id):
    cursor = mysql.connection.cursor()
    cursor.execute("""
        INSERT INTO geospatial_logs
            (barangayID, reportID, detectedName, latitude, longitude,
             flagColor, placeID)
        VALUES (%s, NULL, %s, %s, %s, 'Red', %s)
    """, (barangay_id, place_name, lat, lng, place_id))
    mysql.connection.commit()
    cursor.close()


# ── Main detection runner ─────────────────────────────────────────────────────

def run_detection():
    """
    Full cycle:
    1. Fetch all Places API POIs
    2. Cross-reference against OFFICIAL_REGISTRY (20m threshold)
    3. Insert Red Flags for unmatched POIs
    Returns { new_flags, total_checked }
    """
    try:
        places = _fetch_all_places()
        registry = _load_registry()

        total_checked = len(places)
        new_flags = 0

        for place in places:
            place_id = place.get("place_id")
            place_name = place.get("name", "Unknown")
            loc = place.get("geometry", {}).get("location", {})
            lat = loc.get("lat")
            lng = loc.get("lng")

            if not lat or not lng or not place_id:
                continue

            # Skip if already red-flagged
            if _already_flagged(place_id):
                continue

            # Find nearest registry entry
            nearest, dist = _find_nearest(lat, lng, registry)

            # If no match within 20m → Red Flag candidate
            if nearest is None or dist > THRESHOLD_M:
                barangay_id = _get_barangay_id_by_coords(lat, lng)
                _insert_red_flag(place_id, place_name, lat, lng, barangay_id)
                new_flags += 1

        return {"new_flags": new_flags, "total_checked": total_checked}, None

    except Exception as e:
        return None, str(e)


# ── Get all flags ─────────────────────────────────────────────────────────────

def get_flags(color=None, barangay_id=None, page=1, per_page=50):
    """Return paginated geospatial_logs entries with optional filters."""
    try:
        cursor = mysql.connection.cursor()

        conditions = []
        params = []

        if color:
            conditions.append("g.flagColor = %s")
            params.append(color)

        if barangay_id:
            conditions.append("g.barangayID = %s")
            params.append(barangay_id)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        offset = (page - 1) * per_page

        cursor.execute(
            f"SELECT COUNT(*) AS total FROM geospatial_logs g {where}",
            params
        )
        total = cursor.fetchone()["total"]

        cursor.execute(
            f"""
            SELECT
                g.logID,
                g.detectedName,
                g.latitude,
                g.longitude,
                g.flagColor,
                g.detectedDate,
                g.nearestLandmark,
                g.placeID,
                b.barangayName
            FROM geospatial_logs g
            LEFT JOIN barangays b ON g.barangayID = b.barangayID
            {where}
            ORDER BY g.detectedDate DESC
            LIMIT %s OFFSET %s
            """,
            params + [per_page, offset]
        )
        rows = cursor.fetchall()
        cursor.close()

        for row in rows:
            if row.get("detectedDate"):
                row["detectedDate"] = str(row["detectedDate"])

        return {
            "data":     rows,
            "total":    total,
            "page":     page,
            "per_page": per_page,
            "pages":    max(1, -(-total // per_page)),
        }, None

    except Exception as e:
        return None, str(e)


# ── Insert Yellow Flag ────────────────────────────────────────────────────────

def insert_yellow_flag(business_name, lat, lng, barangay_id, notes=None):
    """Manually insert a Yellow Flag."""
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("""
            INSERT INTO geospatial_logs
                (barangayID, reportID, detectedName, latitude, longitude,
                 flagColor, nearestLandmark)
            VALUES (%s, NULL, %s, %s, %s, 'Yellow', %s)
        """, (barangay_id, business_name, lat, lng, notes))
        mysql.connection.commit()
        log_id = cursor.lastrowid
        cursor.close()
        return {"logID": log_id}, None
    except Exception as e:
        return None, str(e)


# ── Escalate to Black Flag ────────────────────────────────────────────────────

def escalate_to_black(log_id):
    """
    Update flagColor to Black.
    Only valid if current status is Red or Yellow.
    """
    try:
        cursor = mysql.connection.cursor()

        # Check current status
        cursor.execute(
            "SELECT flagColor FROM geospatial_logs WHERE logID = %s",
            (log_id,)
        )
        row = cursor.fetchone()

        if not row:
            cursor.close()
            return False, "Flag not found"

        if row["flagColor"] not in ("Red", "Yellow"):
            cursor.close()
            return False, f"Cannot escalate from '{row['flagColor']}' to Black"

        cursor.execute("""
            UPDATE geospatial_logs
            SET flagColor = 'Black'
            WHERE logID = %s
        """, (log_id,))
        mysql.connection.commit()
        cursor.close()
        return True, None

    except Exception as e:
        return False, str(e)
