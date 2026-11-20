"""
Audit Schema (Isolated Database)
Implements append-only HMAC-SHA256 hash chain over RFC 8785 canonical JSON.
Signed checkpoints every 100 events/10 min, dual-location persistence, and tamper verification.
Principle: Schemas NEVER join. Logs prove.
"""

import sqlite3
import json
import datetime
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path

from config import AUDIT_DB_PATH, CHECKPOINT_MIRROR_FILE
from crypto_utils import canonical_json, compute_audit_hash, sign_with_hub_key, verify_p256_signature, get_hub_public_key_bytes

GENESIS_PREV_HASH = "0" * 64


def get_audit_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(AUDIT_DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


def init_audit_db():
    conn = get_audit_db()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_events (
                seq INTEGER PRIMARY KEY,
                prev_hash TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                hash TEXT NOT NULL
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_checkpoints (
                checkpoint_seq INTEGER PRIMARY KEY AUTOINCREMENT,
                start_seq INTEGER NOT NULL,
                end_seq INTEGER NOT NULL,
                end_hash TEXT NOT NULL,
                signature_hex TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );
        """)
    conn.close()


def append_audit_event(event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Appends a new event to the audit hash chain with canonical JSON and HMAC-SHA256.
    Atomic transaction ensures sequence numbers are strictly gap-free.
    """
    conn = get_audit_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("SELECT seq, hash FROM audit_events ORDER BY seq DESC LIMIT 1;")
        last_row = cursor.fetchone()

        if last_row is None:
            seq = 1
            prev_hash = GENESIS_PREV_HASH
        else:
            seq = last_row["seq"] + 1
            prev_hash = last_row["hash"]

        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Ensure payload is canonical JSON string
        canonical_payload_bytes = canonical_json(payload)
        canonical_payload_str = canonical_payload_bytes.decode('utf-8')
        canonical_payload_dict = json.loads(canonical_payload_str)

        calculated_hash = compute_audit_hash(
            prev_hash=prev_hash,
            seq=seq,
            timestamp=timestamp,
            event_type=event_type,
            payload=canonical_payload_dict
        )

        cursor.execute("""
            INSERT INTO audit_events (seq, prev_hash, timestamp, event_type, payload_json, hash)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (seq, prev_hash, timestamp, event_type, canonical_payload_str, calculated_hash))

    conn.close()

    # Check if checkpoint is needed (every 100 events)
    if seq % 100 == 0:
        create_checkpoint(seq - 99, seq, calculated_hash)

    return {
        "seq": seq,
        "prev_hash": prev_hash,
        "timestamp": timestamp,
        "event_type": event_type,
        "hash": calculated_hash
    }


def create_checkpoint(start_seq: int, end_seq: int, end_hash: str) -> Dict[str, Any]:
    """
    Creates a signed checkpoint by the Hub authority and copies it to a secondary location.
    """
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    checkpoint_msg = f"RESILINK_CHECKPOINT:{start_seq}:{end_seq}:{end_hash}:{timestamp}".encode('utf-8')
    sig_raw = sign_with_hub_key(checkpoint_msg)
    sig_hex = sig_raw.hex()

    conn = get_audit_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_checkpoints (start_seq, end_seq, end_hash, signature_hex, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (start_seq, end_seq, end_hash, sig_hex, timestamp))
        cp_id = cursor.lastrowid
    conn.close()

    checkpoint_data = {
        "checkpoint_seq": cp_id,
        "start_seq": start_seq,
        "end_seq": end_seq,
        "end_hash": end_hash,
        "signature_hex": sig_hex,
        "timestamp": timestamp
    }

    # Write to secondary location (append-only file)
    try:
        with open(CHECKPOINT_MIRROR_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(checkpoint_data) + "\n")
    except Exception as e:
        print(f"[AUDIT WARNING] Failed to write secondary checkpoint mirror: {e}")

    return checkpoint_data


def verify_audit_chain() -> Dict[str, Any]:
    """
    Verifies the integrity of the audit hash chain from genesis to tip.
    Returns valid: True or names the first bad sequence number.
    """
    conn = get_audit_db()
    cursor = conn.cursor()
    cursor.execute("SELECT seq, prev_hash, timestamp, event_type, payload_json, hash FROM audit_events ORDER BY seq ASC;")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return {
            "valid": True,
            "total_events": 0,
            "message": "Audit log is empty (clean state)"
        }

    expected_prev_hash = GENESIS_PREV_HASH

    for idx, row in enumerate(rows):
        expected_seq = idx + 1
        seq = row["seq"]
        prev_hash = row["prev_hash"]
        timestamp = row["timestamp"]
        event_type = row["event_type"]
        payload_json = row["payload_json"]
        recorded_hash = row["hash"]

        # Check sequence continuity
        if seq != expected_seq:
            return {
                "valid": False,
                "first_bad_seq": seq,
                "reason": f"Sequence break: expected seq {expected_seq}, found {seq}"
            }

        # Check hash chaining link
        if prev_hash != expected_prev_hash:
            return {
                "valid": False,
                "first_bad_seq": seq,
                "reason": f"Hash chain broken at seq {seq}: prev_hash does not match previous event hash"
            }

        # Re-compute HMAC-SHA256
        try:
            payload_dict = json.loads(payload_json)
            recalculated_hash = compute_audit_hash(
                prev_hash=prev_hash,
                seq=seq,
                timestamp=timestamp,
                event_type=event_type,
                payload=payload_dict
            )
        except Exception as e:
            return {
                "valid": False,
                "first_bad_seq": seq,
                "reason": f"Corrupt payload at seq {seq}: {str(e)}"
            }

        if recalculated_hash != recorded_hash:
            return {
                "valid": False,
                "first_bad_seq": seq,
                "reason": f"Cryptographic tamper detected at seq {seq}: hash mismatch"
            }

        expected_prev_hash = recorded_hash

    return {
        "valid": True,
        "total_events": len(rows),
        "last_seq": rows[-1]["seq"],
        "last_hash": rows[-1]["hash"]
    }
