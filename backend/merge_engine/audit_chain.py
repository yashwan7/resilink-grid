"""
ResQMesh Cryptographic Audit Log & SQLite WAL Hash Chain.
Implements append-only HMAC-SHA256 chain over canonical JSON payloads.
Principle: Schemas NEVER join. Logs prove.
"""

import os
import sqlite3
import json
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

AUDIT_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "resqmesh_audit.db"))
GENESIS_PREV_HASH = "0" * 64
HMAC_SECRET = os.getenv("AUDIT_HMAC_KEY", "RESQMESH_SECURE_HMAC_SECRET_V4").encode("utf-8")


def get_audit_db() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(AUDIT_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(AUDIT_DB_PATH, timeout=10.0)
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
                checkpoint_id INTEGER PRIMARY KEY AUTOINCREMENT,
                seq INTEGER NOT NULL,
                checkpoint_hash TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );
        """)
    conn.close()


def canonical_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=True)


def compute_event_hash(seq: int, prev_hash: str, timestamp: str, event_type: str, canonical_payload: str) -> str:
    message = f"{seq}|{prev_hash}|{timestamp}|{event_type}|{canonical_payload}".encode("utf-8")
    return hmac.new(HMAC_SECRET, message, hashlib.sha256).hexdigest()


def append_audit_event(event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    init_audit_db()
    conn = get_audit_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("SELECT seq, hash FROM audit_events ORDER BY seq DESC LIMIT 1;")
        last = cursor.fetchone()

        if last is None:
            seq = 1
            prev_hash = GENESIS_PREV_HASH
        else:
            seq = last["seq"] + 1
            prev_hash = last["hash"]

        timestamp = datetime.now(timezone.utc).isoformat()
        payload_str = canonical_json(payload)
        event_hash = compute_event_hash(seq, prev_hash, timestamp, event_type, payload_str)

        cursor.execute("""
            INSERT INTO audit_events (seq, prev_hash, timestamp, event_type, payload_json, hash)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (seq, prev_hash, timestamp, event_type, payload_str, event_hash))

    conn.close()
    return {
        "seq": seq,
        "prev_hash": prev_hash,
        "timestamp": timestamp,
        "event_type": event_type,
        "hash": event_hash,
        "payload": payload
    }


def verify_audit_chain() -> Tuple[bool, int, Optional[str]]:
    init_audit_db()
    conn = get_audit_db()
    cursor = conn.cursor()
    cursor.execute("SELECT seq, prev_hash, timestamp, event_type, payload_json, hash FROM audit_events ORDER BY seq ASC;")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return True, 0, None

    expected_prev = GENESIS_PREV_HASH
    for r in rows:
        seq = r["seq"]
        prev_hash = r["prev_hash"]
        ts = r["timestamp"]
        ev_type = r["event_type"]
        p_json = r["payload_json"]
        recorded_hash = r["hash"]

        if prev_hash != expected_prev:
            return False, seq, f"Chain broken at seq {seq}: prev_hash {prev_hash} != {expected_prev}"

        computed = compute_event_hash(seq, prev_hash, ts, ev_type, p_json)
        if computed != recorded_hash:
            return False, seq, f"Hash mismatch at seq {seq}: computed {computed} != recorded {recorded_hash}"

        expected_prev = recorded_hash

    return True, len(rows), None


def get_recent_audit_events(limit: int = 50) -> List[Dict[str, Any]]:
    init_audit_db()
    conn = get_audit_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT seq, prev_hash, timestamp, event_type, payload_json, hash 
        FROM audit_events 
        ORDER BY seq DESC 
        LIMIT ?;
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        try:
            payload = json.loads(r["payload_json"])
        except Exception:
            payload = r["payload_json"]
        result.append({
            "seq": r["seq"],
            "prev_hash": r["prev_hash"],
            "timestamp": r["timestamp"],
            "event_type": r["event_type"],
            "payload": payload,
            "hash": r["hash"]
        })
    return result
