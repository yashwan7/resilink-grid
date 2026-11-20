"""
Consultation Signalling API Routes
POST /v1/consult/session
GET /v1/consult/session/{id}
"""

import uuid
import json
import datetime
from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel, Field
from typing import Optional

from db.operational import get_operational_db
from db.audit import append_audit_event

router = APIRouter(prefix="/v1/consult", tags=["Consultation"])


class ConsultSessionCreate(BaseModel):
    patient_pseudonym: str = Field(..., description="Patient pseudonym")
    doctor_id: str = Field(..., description="Target doctor ID")
    signaling_data: Optional[str] = Field(None, description="WebRTC SDP offer or offline encrypted note bundle")


@router.post("/session")
def create_consult_session(req: ConsultSessionCreate):
    """Initializes consultation signalling session or offline store-and-forward queue."""
    session_id = f"consult-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    conn = get_operational_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO consult_sessions (session_id, patient_pseudonym, doctor_id, status, signaling_data_json, created_at)
            VALUES (?, ?, ?, 'ACTIVE', ?, ?)
        """, (session_id, req.patient_pseudonym, req.doctor_id, req.signaling_data, now_iso))
    conn.close()

    append_audit_event("CONSULT_STARTED", {
        "session_id": session_id,
        "patient_pseudonym": req.patient_pseudonym,
        "doctor_id": req.doctor_id
    })

    return {
        "status": "SUCCESS",
        "session_id": session_id,
        "created_at": now_iso
    }


@router.get("/session/{id}")
def get_consult_session(id: str = Path(...)):
    """Retrieves consultation session metadata."""
    conn = get_operational_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consult_sessions WHERE session_id = ?", (id,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail="Consultation session not found")

    return dict(row)
