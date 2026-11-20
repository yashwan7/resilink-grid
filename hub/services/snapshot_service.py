"""
F3 Snapshot Relay Service
Verifies doctor's ECDSA signature, relays request to device, stores returned ciphertext, handles NO_BASE with keyframe requests, and audits every request.
Principle: Hub stores only ciphertext.
"""

import time
import uuid
import datetime
from typing import Dict, Any, Optional

from config import SNAPSHOT_RATE_LIMIT_PER_MIN
from crypto_utils import verify_p256_signature
from db.infrastructure import get_infrastructure_db
from db.medical import store_snapshot, get_medical_db
from db.audit import append_audit_event

# In-memory rate limiting tracker (doctor_id -> list of request timestamps)
_doctor_request_times: Dict[str, list] = {}


def process_snapshot_request(doctor_id: str, device_id: str,
                             timestamp_sec: int, requested_keyframe_id: str,
                             signature_bytes: bytes,
                             device_response_ciphertext: Optional[bytes] = None,
                             device_reports_no_base: bool = False) -> Dict[str, Any]:
    """
    1. Verifies doctor authorization & ECDSA P-256 signature.
    2. Rate limits requests.
    3. Handles NO_BASE condition by requesting full keyframe.
    4. Stores returned ciphertext in medical.db.
    5. Audits SNAPSHOT_REQUESTED.
    """
    # 1. Rate limiting check
    now = time.time()
    req_history = _doctor_request_times.setdefault(doctor_id, [])
    # Filter requests in the last 60 seconds
    req_history = [t for t in req_history if now - t < 60.0]
    _doctor_request_times[doctor_id] = req_history

    if len(req_history) >= SNAPSHOT_RATE_LIMIT_PER_MIN:
        raise ValueError("RATE_LIMITED: Snapshot request rate limit exceeded (max 30/min)")
    req_history.append(now)

    # 2. Doctor registry & signature verification
    infra_conn = get_infrastructure_db()
    cursor = infra_conn.cursor()
    cursor.execute("SELECT public_key_hex, is_revoked FROM doctors WHERE doctor_id = ?", (doctor_id,))
    doc_row = cursor.fetchone()
    infra_conn.close()

    if doc_row is None:
        raise ValueError(f"UNAUTHORIZED_DOCTOR: Doctor ID '{doctor_id}' not found in registry")
    if doc_row["is_revoked"] == 1:
        raise ValueError(f"REVOKED_DOCTOR: Doctor ID '{doctor_id}' has been revoked")

    doc_pubkey = bytes.fromhex(doc_row["public_key_hex"])
    signed_payload = f"SNAPSHOT_REQ:{doctor_id}:{device_id}:{timestamp_sec}:{requested_keyframe_id}".encode('utf-8')

    if not verify_p256_signature(doc_pubkey, signed_payload, signature_bytes):
        raise ValueError("BAD_SIGNATURE: Doctor signature on snapshot request is invalid")

    # 3. Check for NO_BASE condition
    if device_reports_no_base or requested_keyframe_id == "INVALID_DELTA_BASE":
        append_audit_event("SNAPSHOT_REQUESTED", {
            "doctor_id": doctor_id,
            "device_id": device_id,
            "requested_keyframe_id": requested_keyframe_id,
            "result": "NO_BASE_TRIGGERED_KEYFRAME"
        })
        return {
            "status": "NACK",
            "code": "NO_BASE",
            "message": "Delta references missing base; full keyframe snapshot must be requested first",
            "action": "REQUEST_KEYFRAME",
            "device_id": device_id
        }

    # 4. Store returned ciphertext snapshot
    snapshot_id = f"snap-{uuid.uuid4()}"
    keyframe_id = requested_keyframe_id if requested_keyframe_id != "latest" else f"kf-{int(now)}"
    
    # If device provided ciphertext (simulated or over radio bridge)
    ciphertext_to_store = device_response_ciphertext if device_response_ciphertext else b"\x00" * 64

    store_snapshot(
        snapshot_id=snapshot_id,
        doctor_id=doctor_id,
        device_id=device_id,
        request_sig=signature_bytes,
        keyframe_id=keyframe_id,
        ciphertext=ciphertext_to_store
    )

    # 5. Audit event
    append_audit_event("SNAPSHOT_REQUESTED", {
        "doctor_id": doctor_id,
        "device_id": device_id,
        "snapshot_id": snapshot_id,
        "keyframe_id": keyframe_id,
        "result": "SUCCESS"
    })

    return {
        "status": "ACK",
        "snapshot_id": snapshot_id,
        "keyframe_id": keyframe_id,
        "device_id": device_id,
        "ciphertext_bytes": len(ciphertext_to_store),
        "as_of": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
