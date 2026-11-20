"""
F5-F7 Facility Service
Provides radius-based queries, drug expiry checks (<30 days), offline caching with as_of timestamps,
stale badge flags (>15m), and dynamic simulation mutator.
Principle: Honest labels (simulated/cached/live). Never present cached as live.
"""

import math
import json
import random
import datetime
from typing import List, Dict, Any, Optional

from db.infrastructure import get_infrastructure_db


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def is_record_stale(as_of_iso: str, threshold_minutes: float = 15.0) -> bool:
    """Returns True if data age exceeds threshold (default 15 minutes)."""
    try:
        as_of_dt = datetime.datetime.fromisoformat(as_of_iso)
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        age_seconds = (now_dt - as_of_dt).total_seconds()
        return age_seconds > (threshold_minutes * 60.0)
    except Exception:
        return True


def get_hospitals(lat: Optional[float] = None, lon: Optional[float] = None,
                  radius_km: Optional[float] = None) -> List[Dict[str, Any]]:
    conn = get_infrastructure_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, lat, lon, phone, beds_free, icu_free, o2_cylinders, ventilators, as_of, source
        FROM hospitals
    """)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        h_lat = r["lat"]
        h_lon = r["lon"]
        dist = haversine_km(lat, lon, h_lat, h_lon) if (lat is not None and lon is not None) else None

        if radius_km is not None and dist is not None and dist > radius_km:
            continue

        stale = is_record_stale(r["as_of"])
        results.append({
            "id": r["id"],
            "name": r["name"],
            "lat": h_lat,
            "lon": h_lon,
            "phone": r["phone"],
            "beds_free": r["beds_free"],
            "icu_free": r["icu_free"],
            "o2_cylinders": r["o2_cylinders"],
            "ventilators": r["ventilators"],
            "distance_km": round(dist, 2) if dist is not None else None,
            "as_of": r["as_of"],
            "source": r["source"],
            "is_stale": stale
        })

    if lat is not None and lon is not None:
        results.sort(key=lambda x: x["distance_km"] if x["distance_km"] is not None else float('inf'))
    return results


def get_pharmacies(lat: Optional[float] = None, lon: Optional[float] = None,
                   radius_km: Optional[float] = None) -> List[Dict[str, Any]]:
    conn = get_infrastructure_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, lat, lon, phone, drugs_json, as_of, source FROM pharmacies")
    rows = cursor.fetchall()
    conn.close()

    now_date = datetime.date.today()
    results = []

    for r in rows:
        p_lat = r["lat"]
        p_lon = r["lon"]
        dist = haversine_km(lat, lon, p_lat, p_lon) if (lat is not None and lon is not None) else None

        if radius_km is not None and dist is not None and dist > radius_km:
            continue

        raw_drugs = json.loads(r["drugs_json"])
        processed_drugs = []
        for drug in raw_drugs:
            # Parse expiry date
            expiry_str = drug.get("expiry", "2099-01-01")
            try:
                exp_date = datetime.date.fromisoformat(expiry_str)
                days_left = (exp_date - now_date).days
            except Exception:
                days_left = 999

            near_expiry = (days_left <= 30 and days_left >= 0)
            expired = (days_left < 0)

            processed_drugs.append({
                "name": drug.get("name"),
                "rare": drug.get("rare", False),
                "qty": drug.get("qty", 0),
                "expiry": expiry_str,
                "days_until_expiry": days_left,
                "near_expiry": near_expiry,
                "expired": expired,
                "as_of": drug.get("as_of", r["as_of"])
            })

        stale = is_record_stale(r["as_of"])
        results.append({
            "id": r["id"],
            "name": r["name"],
            "lat": p_lat,
            "lon": p_lon,
            "phone": r["phone"],
            "drugs": processed_drugs,
            "distance_km": round(dist, 2) if dist is not None else None,
            "as_of": r["as_of"],
            "source": r["source"],
            "is_stale": stale
        })

    if lat is not None and lon is not None:
        results.sort(key=lambda x: x["distance_km"] if x["distance_km"] is not None else float('inf'))
    return results


def get_bloodbanks(lat: Optional[float] = None, lon: Optional[float] = None,
                   radius_km: Optional[float] = None) -> List[Dict[str, Any]]:
    conn = get_infrastructure_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, lat, lon, phone, units_json, as_of, source FROM bloodbanks")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        b_lat = r["lat"]
        b_lon = r["lon"]
        dist = haversine_km(lat, lon, b_lat, b_lon) if (lat is not None and lon is not None) else None

        if radius_km is not None and dist is not None and dist > radius_km:
            continue

        units = json.loads(r["units_json"])
        stale = is_record_stale(r["as_of"])
        results.append({
            "id": r["id"],
            "name": r["name"],
            "lat": b_lat,
            "lon": b_lon,
            "phone": r["phone"],
            "units": units,
            "distance_km": round(dist, 2) if dist is not None else None,
            "as_of": r["as_of"],
            "source": r["source"],
            "is_stale": stale
        })

    if lat is not None and lon is not None:
        results.sort(key=lambda x: x["distance_km"] if x["distance_km"] is not None else float('inf'))
    return results


def get_ambulances(lat: Optional[float] = None, lon: Optional[float] = None,
                   radius_km: Optional[float] = None,
                   status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_infrastructure_db()
    cursor = conn.cursor()
    query = "SELECT id, lat, lon, status, contact, as_of, source FROM ambulances"
    params = []
    if status_filter:
        query += " WHERE status = ?"
        params.append(status_filter.upper())

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        a_lat = r["lat"]
        a_lon = r["lon"]
        dist = haversine_km(lat, lon, a_lat, a_lon) if (lat is not None and lon is not None) else None

        if radius_km is not None and dist is not None and dist > radius_km:
            continue

        stale = is_record_stale(r["as_of"])
        results.append({
            "id": r["id"],
            "lat": a_lat,
            "lon": a_lon,
            "status": r["status"],
            "contact": r["contact"],
            "distance_km": round(dist, 2) if dist is not None else None,
            "as_of": r["as_of"],
            "source": r["source"],
            "is_stale": stale
        })

    if lat is not None and lon is not None:
        results.sort(key=lambda x: x["distance_km"] if x["distance_km"] is not None else float('inf'))
    return results


def mutate_facilities_simulation_step():
    """
    Simulator step: slightly mutates hospital beds and ambulance locations over time,
    updating the as_of timestamp to model real-world dynamic telemetry.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_infrastructure_db()
    with conn:
        cursor = conn.cursor()
        
        # 1. Mutate hospital beds by +/- 1
        cursor.execute("SELECT id, beds_free, icu_free FROM hospitals")
        hospitals = cursor.fetchall()
        for h in hospitals:
            delta_beds = random.choice([-1, 0, 1])
            new_beds = max(0, min(100, h["beds_free"] + delta_beds))
            delta_icu = random.choice([-1, 0, 1])
            new_icu = max(0, min(20, h["icu_free"] + delta_icu))
            cursor.execute("""
                UPDATE hospitals
                SET beds_free = ?, icu_free = ?, as_of = ?
                WHERE id = ?
            """, (new_beds, new_icu, now_iso, h["id"]))

        # 2. Mutate ambulances: slight GPS jitter (+/- 0.001 deg ~ 100m)
        cursor.execute("SELECT id, lat, lon FROM ambulances WHERE status = 'FREE'")
        ambulances = cursor.fetchall()
        for a in ambulances:
            d_lat = random.uniform(-0.0005, 0.0005)
            d_lon = random.uniform(-0.0005, 0.0005)
            cursor.execute("""
                UPDATE ambulances
                SET lat = lat + ?, lon = lon + ?, as_of = ?
                WHERE id = ?
            """, (d_lat, d_lon, now_iso, a["id"]))

    conn.close()


def sync_facility_record(facility_type: str, record: Dict[str, Any]) -> bool:
    """
    Offline sync worker: accepts an upstream record and updates locally ONLY if
    the incoming record's as_of is strictly newer than local data.
    """
    incoming_as_of = record.get("as_of")
    record_id = record.get("id")
    if not incoming_as_of or not record_id:
        return False

    table_name = facility_type.lower()
    if table_name not in ("hospitals", "pharmacies", "bloodbanks", "ambulances"):
        return False

    conn = get_infrastructure_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT as_of FROM {table_name} WHERE id = ?", (record_id,))
        row = cursor.fetchone()
        if row is not None:
            local_as_of = row["as_of"]
            if incoming_as_of <= local_as_of:
                conn.close()
                return False  # Never overwrite newer data with older

        # Update or insert
        if table_name == "hospitals":
            cursor.execute("""
                INSERT OR REPLACE INTO hospitals (id, name, lat, lon, phone, beds_free, icu_free, o2_cylinders, ventilators, as_of, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record_id, record["name"], record["lat"], record["lon"], record["phone"],
                record["beds_free"], record["icu_free"], record["o2_cylinders"], record["ventilators"],
                incoming_as_of, "cached_sync"
            ))
        elif table_name == "ambulances":
            cursor.execute("""
                INSERT OR REPLACE INTO ambulances (id, lat, lon, status, contact, as_of, source)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                record_id, record["lat"], record["lon"], record["status"], record["contact"],
                incoming_as_of, "cached_sync"
            ))
    conn.close()
    return True
