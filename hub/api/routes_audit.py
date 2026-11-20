"""
Audit Hash Chain API Routes
GET /v1/audit/verify (names first bad seq if tampered)
GET /v1/audit/checkpoints
GET /v1/audit/events
POST /v1/audit/tamper-demo
"""

import sqlite3
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from db.audit import verify_audit_chain, get_audit_db, create_checkpoint

router = APIRouter(prefix="/v1/audit", tags=["Audit"])


@router.get("/verify")
def get_audit_verification():
    """
    Verifies the entire HMAC-SHA256 hash chain from genesis to tip.
    Returns valid: true or names first bad sequence number.
    """
    res = verify_audit_chain()
    return res


@router.get("/checkpoints")
def list_audit_checkpoints(limit: int = Query(20, ge=1, le=100)):
    """Returns signed checkpoints created every 100 events / 10 minutes."""
    conn = get_audit_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT checkpoint_seq, start_seq, end_seq, end_hash, signature_hex, timestamp
        FROM audit_checkpoints
        ORDER BY checkpoint_seq DESC LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"count": len(rows), "checkpoints": rows}


@router.get("/events")
def list_audit_events(limit: int = Query(50, ge=1, le=200),
                      event_type: str = Query(None)):
    """Returns audit log records."""
    conn = get_audit_db()
    cursor = conn.cursor()
    if event_type:
        cursor.execute("""
            SELECT seq, prev_hash, timestamp, event_type, payload_json, hash
            FROM audit_events
            WHERE event_type = ?
            ORDER BY seq DESC LIMIT ?
        """, (event_type, limit))
    else:
        cursor.execute("""
            SELECT seq, prev_hash, timestamp, event_type, payload_json, hash
            FROM audit_events
            ORDER BY seq DESC LIMIT ?
        """, (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"count": len(rows), "events": rows}


class TamperDemoRequest(BaseModel):
    seq: int = Field(..., description="Audit sequence number to tamper with")
    new_event_type: str = Field("UNAUTHORIZED_MUTATION", description="Modified event type")


@router.post("/tamper-demo")
def trigger_tamper_demo(req: TamperDemoRequest):
    """
    Demonstration utility: intentionally corrupts an audit event in SQLite
    to prove that /v1/audit/verify instantly catches the tampering and names the exact sequence.
    """
    conn = get_audit_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("SELECT seq FROM audit_events WHERE seq = ?", (req.seq,))
        if cursor.fetchone() is None:
            conn.close()
            raise HTTPException(status_code=404, detail=f"Audit seq {req.seq} does not exist")

        cursor.execute("""
            UPDATE audit_events
            SET event_type = ?
            WHERE seq = ?
        """, (req.new_event_type, req.seq))
    conn.close()

    return {
        "status": "TAMPERED",
        "seq": req.seq,
        "message": f"Audit record at seq {req.seq} has been altered. Run /v1/audit/verify to see detection."
    }
