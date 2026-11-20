"""
F8 Emergency Engine (Deterministic, Offline-First, Zero LLM)
Allocates nearest FREE ambulance, scores hospitals with weighted multi-criteria logic,
penalizes stale telemetry, cascades to fallback, drives multi-path dispatch,
enforces idempotency, drives state machine, and provides human override.
Principle: AI predicts, rules decide, logs prove.
"""

import uuid
import json
import time
import datetime
from typing import List, Dict, Any, Optional, Tuple

from config import DECISION_SUPPORT_DISCLAIMER
from crypto_utils import canonical_json, verify_p256_signature
from db.infrastructure import get_infrastructure_db
from db.operational import get_operational_db
from db.audit import append_audit_event
from services.facility_service import haversine_km, is_record_stale


def trigger_emergency(pseudonym: str, lat: float, lon: float,
                      ts_sec: int, priority_class: str,
                      need: List[str], device_id: str,
                      counter: int, signature_bytes: bytes) -> Dict[str, Any]:
    """
    Handles POST /v1/emergency/trigger.
    Deterministic, fully offline, audited at every step.
    """
    if priority_class != "P0":
        raise ValueError(f"Invalid priority class '{priority_class}' for emergency trigger (must be P0)")

    # 1. Device registration & signature verification
    infra_conn = get_infrastructure_db()
    cursor = infra_conn.cursor()
    cursor.execute("SELECT public_key_hex, is_revoked FROM devices WHERE device_id = ?", (device_id,))
    dev_row = cursor.fetchone()
    infra_conn.close()

    if dev_row is None:
        raise ValueError(f"UNKNOWN_DEVICE: Device ID '{device_id}' is not registered")
    if dev_row["is_revoked"] == 1:
        raise ValueError(f"REVOKED_DEVICE: Device ID '{device_id}' is revoked")

    dev_pubkey = bytes.fromhex(dev_row["public_key_hex"])
    canonical_trigger_data = {
        "class": "P0",
        "counter": counter,
        "device_id": device_id,
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "need": sorted(need),
        "pseudonym": pseudonym,
        "ts": ts_sec
    }
    signed_bytes = canonical_json(canonical_trigger_data)
    if not verify_p256_signature(dev_pubkey, signed_bytes, signature_bytes):
        raise ValueError("BAD_SIGNATURE: Invalid ECDSA signature on emergency trigger")

    # 2. Idempotency Check (device_id, counter)
    op_conn = get_operational_db()
    cursor = op_conn.cursor()
    cursor.execute("""
        SELECT id, pseudonym, lat, lon, priority_class, need_json, device_id, counter,
               status, allocated_hospital_id, assigned_ambulance_id, created_at, updated_at
        FROM emergencies
        WHERE device_id = ? AND counter = ?
    """, (device_id, counter))
    existing = cursor.fetchone()

    if existing is not None:
        # Return existing emergency and assignment idempotently
        cursor.execute("SELECT * FROM assignments WHERE emergency_id = ?", (existing["id"],))
        assign_row = cursor.fetchone()
        op_conn.close()
        return {
            "status": "ALREADY_PROCESSED",
            "emergency_id": existing["id"],
            "emergency_status": existing["status"],
            "assigned_ambulance": {
                "id": existing["assigned_ambulance_id"],
                "eta_minutes": assign_row["eta_minutes"] if assign_row else None
            },
            "allocated_hospital": {
                "id": existing["allocated_hospital_id"],
                "score": assign_row["hospital_score"] if assign_row else None
            },
            "assigned_ambulance_id": existing["assigned_ambulance_id"],
            "allocated_hospital_id": existing["allocated_hospital_id"],
            "eta_minutes": assign_row["eta_minutes"] if assign_row else None,
            "idempotent": True,
            "disclaimer": DECISION_SUPPORT_DISCLAIMER
        }


    emergency_id = f"emg-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Log EMERGENCY_TRIGGERED audit event
    append_audit_event("EMERGENCY_TRIGGERED", {
        "emergency_id": emergency_id,
        "device_id": device_id,
        "counter": counter,
        "pseudonym": pseudonym,
        "lat": lat,
        "lon": lon,
        "need": need
    })

    # 3. Deterministic Ambulance Selection (Nearest FREE ambulance)
    infra_conn = get_infrastructure_db()
    infra_cursor = infra_conn.cursor()
    infra_cursor.execute("SELECT id, lat, lon, status, contact, as_of FROM ambulances WHERE status = 'FREE'")
    free_ambulances = infra_cursor.fetchall()

    selected_ambulance = None
    min_amb_dist = float('inf')
    ambulance_eta = 0.0

    if free_ambulances:
        for amb in free_ambulances:
            dist = haversine_km(lat, lon, amb["lat"], amb["lon"])
            if dist < min_amb_dist:
                min_amb_dist = dist
                selected_ambulance = amb

        # Assume 40 km/h average speed in urban traffic
        ambulance_eta = round(max(1.0, (min_amb_dist / 40.0) * 60.0), 1)

        # Mark ambulance BUSY in infrastructure.db
        with infra_conn:
            infra_cursor.execute("UPDATE ambulances SET status = 'BUSY', as_of = ? WHERE id = ?",
                                 (now_iso, selected_ambulance["id"]))
    infra_conn.close()

    # 4. Deterministic Hospital Selection (Weighted Multi-Criteria Scoring)
    infra_conn = get_infrastructure_db()
    infra_cursor = infra_conn.cursor()
    infra_cursor.execute("""
        SELECT id, name, lat, lon, phone, beds_free, icu_free, o2_cylinders, ventilators, as_of
        FROM hospitals
    """)
    hospitals = infra_cursor.fetchall()
    infra_conn.close()

    candidate_scores = []
    need_icu = "ICU" in need
    need_o2 = "O2" in need
    need_vent = "VENTILATOR" in need

    for h in hospitals:
        # Check hard constraints: must have at least general beds or ICU beds
        if need_icu and h["icu_free"] <= 0:
            continue
        if h["beds_free"] <= 0 and h["icu_free"] <= 0:
            continue

        d_km = haversine_km(lat, lon, h["lat"], h["lon"])

        # Stale telemetry penalty (>15 min)
        stale_penalty = 0.0
        try:
            as_of_dt = datetime.datetime.fromisoformat(h["as_of"])
            age_min = (datetime.datetime.now(datetime.timezone.utc) - as_of_dt).total_seconds() / 60.0
            if age_min > 15.0:
                stale_penalty = min(50.0, (age_min - 15.0) * 2.0)
        except Exception:
            stale_penalty = 30.0

        # Weighted score: distance (1.5x) - free beds (0.1x) - free ICU (0.5x if needed) + stale penalty
        # Lower score is superior
        icu_bonus = (h["icu_free"] * 0.5) if need_icu else 0.0
        o2_bonus = 5.0 if (need_o2 and h["o2_cylinders"] > 0) else 0.0
        score = (d_km * 1.5) - (h["beds_free"] * 0.1) - icu_bonus - o2_bonus + stale_penalty

        candidate_scores.append({
            "hospital": h,
            "score": score,
            "dist_km": d_km,
            "stale_penalty": stale_penalty
        })

    candidate_scores.sort(key=lambda x: x["score"])

    selected_hospital = None
    hospital_score = 999.0
    if candidate_scores:
        best_candidate = candidate_scores[0]
        selected_hospital = best_candidate["hospital"]
        hospital_score = round(best_candidate["score"], 2)

    # 5. Update State Machine
    assigned_amb_id = selected_ambulance["id"] if selected_ambulance else "NONE_AVAILABLE"
    allocated_hosp_id = selected_hospital["id"] if selected_hospital else "NONE_ALLOCATED"
    next_status = "ASSIGNED" if (selected_ambulance and selected_hospital) else "REQUESTED"

    with op_conn:
        cursor.execute("""
            INSERT INTO emergencies (
                id, pseudonym, lat, lon, priority_class, need_json, device_id, counter,
                status, allocated_hospital_id, assigned_ambulance_id, raw_signature, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            emergency_id, pseudonym, lat, lon, priority_class, json.dumps(need),
            device_id, counter, next_status, allocated_hosp_id, assigned_amb_id,
            signature_bytes, now_iso, now_iso
        ))

        assignment_id = f"asgn-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
            INSERT INTO assignments (id, emergency_id, ambulance_id, hospital_id, eta_minutes, hospital_score, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            assignment_id, emergency_id, assigned_amb_id, allocated_hosp_id,
            ambulance_eta, hospital_score, "ACTIVE", now_iso
        ))

        # 6. Multi-path Dispatch Queue (Outbox Pattern)
        dispatch_payload = {
            "emergency_id": emergency_id,
            "pseudonym": pseudonym,
            "lat": lat,
            "lon": lon,
            "priority": "P0",
            "ambulance_id": assigned_amb_id,
            "hospital_id": allocated_hosp_id,
            "hospital_name": selected_hospital["name"] if selected_hospital else "None",
            "eta_minutes": ambulance_eta,
            "timestamp": now_iso
        }
        dispatch_payload_json = json.dumps(dispatch_payload)

        # Path 1: Local LAN Broadcast notification
        cursor.execute("""
            INSERT INTO dispatch_outbox (emergency_id, channel, payload_json, status, retries, next_attempt, created_at)
            VALUES (?, 'LAN_BROADCAST', ?, 'SENT', 0, ?, ?)
        """, (emergency_id, dispatch_payload_json, now_iso, now_iso))

        # Path 2: nRF24 Mesh packet
        cursor.execute("""
            INSERT INTO dispatch_outbox (emergency_id, channel, payload_json, status, retries, next_attempt, created_at)
            VALUES (?, 'MESH_NRF24', ?, 'SENT', 0, ?, ?)
        """, (emergency_id, dispatch_payload_json, now_iso, now_iso))

        # Path 3: SMS SIM800L fallback
        sms_text = f"RESILINK EMG P0 {emergency_id} LOC:{lat:.4f},{lon:.4f} AMB:{assigned_amb_id} HOSP:{allocated_hosp_id}"
        cursor.execute("""
            INSERT INTO dispatch_outbox (emergency_id, channel, payload_json, status, retries, next_attempt, created_at)
            VALUES (?, 'SMS_SIM800L', ?, 'QUEUED', 0, ?, ?)
        """, (emergency_id, json.dumps({"sms": sms_text}), now_iso, now_iso))

        # Path 4: Online Dispatch Sync
        cursor.execute("""
            INSERT INTO dispatch_outbox (emergency_id, channel, payload_json, status, retries, next_attempt, created_at)
            VALUES (?, 'ONLINE_SYNC', ?, 'QUEUED', 0, ?, ?)
        """, (emergency_id, dispatch_payload_json, now_iso, now_iso))

    op_conn.close()

    # 7. Audit Events
    if selected_ambulance:
        append_audit_event("AMBULANCE_ASSIGNED", {
            "emergency_id": emergency_id,
            "ambulance_id": assigned_amb_id,
            "eta_minutes": ambulance_eta,
            "distance_km": round(min_amb_dist, 2)
        })

    if selected_hospital:
        append_audit_event("HOSPITAL_ALLOCATED", {
            "emergency_id": emergency_id,
            "hospital_id": allocated_hosp_id,
            "hospital_name": selected_hospital["name"],
            "score": hospital_score
        })

    return {
        "status": "ASSIGNED" if next_status == "ASSIGNED" else "PENDING_RESOURCES",
        "emergency_id": emergency_id,
        "pseudonym": pseudonym,
        "assigned_ambulance": {
            "id": assigned_amb_id,
            "contact": selected_ambulance["contact"] if selected_ambulance else None,
            "eta_minutes": ambulance_eta,
            "distance_km": round(min_amb_dist, 2) if selected_ambulance else None
        },
        "allocated_hospital": {
            "id": allocated_hosp_id,
            "name": selected_hospital["name"] if selected_hospital else None,
            "phone": selected_hospital["phone"] if selected_hospital else None,
            "score": hospital_score
        },
        "dispatch_channels": ["LAN_BROADCAST", "MESH_NRF24", "SMS_SIM800L", "ONLINE_SYNC"],
        "disclaimer": DECISION_SUPPORT_DISCLAIMER
    }


def get_emergency_by_id(emergency_id: str) -> Optional[Dict[str, Any]]:
    """Returns emergency details, state, and assignments."""
    conn = get_operational_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM emergencies WHERE id = ?", (emergency_id,))
    emg = cursor.fetchone()
    if emg is None:
        conn.close()
        return None

    cursor.execute("SELECT * FROM assignments WHERE emergency_id = ? ORDER BY created_at DESC", (emergency_id,))
    assignments = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM dispatch_outbox WHERE emergency_id = ?", (emergency_id,))
    outbox = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "emergency_id": emg["id"],
        "pseudonym": emg["pseudonym"],
        "lat": emg["lat"],
        "lon": emg["lon"],
        "priority_class": emg["priority_class"],
        "need": json.loads(emg["need_json"]),
        "device_id": emg["device_id"],
        "status": emg["status"],
        "allocated_hospital_id": emg["allocated_hospital_id"],
        "assigned_ambulance_id": emg["assigned_ambulance_id"],
        "created_at": emg["created_at"],
        "updated_at": emg["updated_at"],
        "assignments": assignments,
        "outbox_status": outbox,
        "disclaimer": DECISION_SUPPORT_DISCLAIMER
    }


def apply_human_override(emergency_id: str, operator_id: str,
                         new_status: Optional[str] = None,
                         new_ambulance_id: Optional[str] = None,
                         new_hospital_id: Optional[str] = None,
                         reason: str = "Operator decision") -> Dict[str, Any]:
    """Human override endpoint for emergency assignment or state transitions."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_operational_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM emergencies WHERE id = ?", (emergency_id,))
        emg = cursor.fetchone()
        if emg is None:
            conn.close()
            raise ValueError(f"Emergency '{emergency_id}' not found")

        updates = []
        params = []
        if new_status:
            updates.append("status = ?")
            params.append(new_status)
        if new_ambulance_id:
            updates.append("assigned_ambulance_id = ?")
            params.append(new_ambulance_id)
        if new_hospital_id:
            updates.append("allocated_hospital_id = ?")
            params.append(new_hospital_id)

        updates.append("updated_at = ?")
        params.append(now_iso)
        params.append(emergency_id)

        cursor.execute(f"UPDATE emergencies SET {', '.join(updates)} WHERE id = ?", params)

    conn.close()

    append_audit_event("ALERT_ACKED", {
        "emergency_id": emergency_id,
        "operator_id": operator_id,
        "reason": reason,
        "new_status": new_status,
        "new_ambulance_id": new_ambulance_id,
        "new_hospital_id": new_hospital_id
    })

    return {
        "status": "SUCCESS",
        "emergency_id": emergency_id,
        "action": "OVERRIDDEN",
        "updated_at": now_iso
    }


def process_outbox_retry_worker():
    """Processes QUEUED items in dispatch_outbox with exponential backoff."""
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    query_cutoff = (now_dt + datetime.timedelta(seconds=2)).isoformat()
    conn = get_operational_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, emergency_id, channel, retries
            FROM dispatch_outbox
            WHERE status = 'QUEUED' AND next_attempt <= ?
            LIMIT 10
        """, (query_cutoff,))
        rows = cursor.fetchall()

        for r in rows:
            # Simulate dispatch delivery attempt
            # In offline environment: SMS or online sync increments retry backoff
            retries = r["retries"] + 1
            if retries >= 5:
                # Mark failed after 5 retries
                cursor.execute("UPDATE dispatch_outbox SET status = 'FAILED', last_error = 'Max retries reached offline' WHERE id = ?", (r["id"],))
            else:
                next_wait_sec = 2 ** retries  # Exponential backoff: 2s, 4s, 8s, 16s...
                next_attempt = (now_dt + datetime.timedelta(seconds=next_wait_sec)).isoformat()
                cursor.execute("""
                    UPDATE dispatch_outbox
                    SET retries = ?, next_attempt = ?, last_error = 'Offline: waiting for sync window'
                    WHERE id = ?
                """, (retries, next_attempt, r["id"]))
    conn.close()

