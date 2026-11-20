"""
Tamper Demonstration Script for RESILINK GRID Hub Backend
Owner: Harshith
Demonstrates HMAC-SHA256 hash chain security:
1. Confirms intact audit chain (PASS)
2. Modifies an audit record directly in the SQLite file
3. Executes /v1/audit/verify to prove detection and pinpoint the first bad sequence
"""

import sys
import json
from pathlib import Path

# Add hub directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.audit import get_audit_db, verify_audit_chain, append_audit_event
from db import init_all_databases
from scripts.seed_data import seed_all_demo_data


def run_tamper_demo():
    print("=" * 70)
    print(" RESILINK GRID - Audit Hash Chain Tamper Proof Demonstration")
    print("=" * 70)

    # 1. Initialize & Ensure some events exist
    init_all_databases()
    seed_all_demo_data()

    append_audit_event("ROUTE_CHANGE", {"route": "PORT_A", "state": "DEGRADING", "reason": "RSSI drop"})
    append_audit_event("EMERGENCY_TRIGGERED", {"pseudonym": "PATIENT-DEMO-99", "need": ["ICU", "O2"]})
    append_audit_event("AMBULANCE_ASSIGNED", {"ambulance_id": "AMB-101", "eta_minutes": 8.5})

    # 2. Verify clean state
    print("\n[Step 1] Verifying intact audit chain before tampering...")
    status_before = verify_audit_chain()
    print(f"Result: {json.dumps(status_before, indent=2)}")
    assert status_before["valid"] is True, "Audit chain should be valid initially!"
    print(">>> VERDICT: PASS (Chain is cryptographically intact)")

    # 3. Choose a record to corrupt
    target_seq = 2
    print(f"\n[Step 2] Corrupting audit event at sequence {target_seq} directly in SQLite...")
    conn = get_audit_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("SELECT seq, event_type, payload_json, hash FROM audit_events WHERE seq = ?", (target_seq,))
        row = cursor.fetchone()
        print(f"Original Event [{row['seq']}]: type='{row['event_type']}', payload={row['payload_json']}")

        # Attacker tries to conceal emergency or modify payload
        fake_payload = json.dumps({"tampered": True, "note": "Malicious actor altered this record"})
        cursor.execute("""
            UPDATE audit_events
            SET payload_json = ?
            WHERE seq = ?
        """, (fake_payload, target_seq))
    conn.close()
    print(f"Corrupted record at seq {target_seq} without updating HMAC hash.")

    # 4. Verify chain after tampering
    print(f"\n[Step 3] Running /v1/audit/verify against corrupted database...")
    status_after = verify_audit_chain()
    print(f"Result: {json.dumps(status_after, indent=2)}")

    assert status_after["valid"] is False, "Verification MUST fail on tampered record!"
    assert status_after["first_bad_seq"] == target_seq, f"Expected first_bad_seq={target_seq}, got {status_after['first_bad_seq']}"

    print(f"\n>>> Tamper Successfully Caught!")
    print(f">>> Identified First Bad Sequence: {status_after['first_bad_seq']}")
    print(f">>> Reason: {status_after['reason']}")
    print("=" * 70)


if __name__ == "__main__":
    run_tamper_demo()
