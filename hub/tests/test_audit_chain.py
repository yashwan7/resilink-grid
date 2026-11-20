"""
Test Suite: Audit Hash Chain & Checkpoints (T9, T13, T15)
Owner: Harshith
Covers:
- T9: Intact audit hash chain passes full verification
- T13: Modified / tampered event caught by /v1/audit/verify naming first bad sequence
- T15: Checkpoint creation & secondary mirror copy verification
"""

import json
import pytest
from db.audit import (
    get_audit_db, append_audit_event, verify_audit_chain, create_checkpoint
)
from config import CHECKPOINT_MIRROR_FILE


def test_t9_intact_audit_chain():
    """T9: Undisturbed HMAC-SHA256 hash chain must verify as valid from genesis to tip."""
    # Append multiple real events
    append_audit_event("ROUTE_CHANGE", {"route": "PORT_A", "state": "DEGRADING"})
    append_audit_event("EMERGENCY_TRIGGERED", {"pseudonym": "TEST-PT", "need": ["ICU"]})
    append_audit_event("AMBULANCE_ASSIGNED", {"ambulance_id": "AMB-101", "eta": 5.0})

    result = verify_audit_chain()
    assert result["valid"] is True
    assert result["total_events"] >= 3
    assert "last_hash" in result


def test_t13_tampered_audit_event_detected():
    """T13: Any modification to event type, payload, or prev_hash must be caught with bad seq named."""
    # Append known events
    ev1 = append_audit_event("EVENT_A", {"data": 100})
    ev2 = append_audit_event("EVENT_B", {"data": 200})
    ev3 = append_audit_event("EVENT_C", {"data": 300})

    target_seq = ev2["seq"]

    # Directly corrupt event in SQLite
    conn = get_audit_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE audit_events 
            SET payload_json = '{"data":999,"altered":true}' 
            WHERE seq = ?
        """, (target_seq,))
    conn.close()

    result = verify_audit_chain()
    assert result["valid"] is False
    assert result["first_bad_seq"] == target_seq
    assert "tamper detected" in result["reason"].lower()


def test_t15_signed_checkpoint_and_mirror():
    """T15: Checkpoints are cryptographically signed by Hub key and copied to secondary mirror."""
    start_seq = 1
    end_seq = 100
    end_hash = "f" * 64

    checkpoint = create_checkpoint(start_seq, end_seq, end_hash)
    assert checkpoint["checkpoint_seq"] > 0
    assert "signature_hex" in checkpoint
    assert len(checkpoint["signature_hex"]) == 128  # 64 bytes raw hex

    # Verify secondary mirror file was appended to
    assert CHECKPOINT_MIRROR_FILE.exists()
    with open(CHECKPOINT_MIRROR_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()
        assert len(lines) > 0
        last_line = json.loads(lines[-1])
        assert last_line["start_seq"] == start_seq
        assert last_line["end_seq"] == end_seq
