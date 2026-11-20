"""
Medical Schema (Isolated Database)
Holds ciphertext-only envelopes and encrypted snapshots.
Principle: Hub NEVER holds keys or plaintext. Schemas NEVER join.
"""

import sqlite3
import datetime
from typing import Optional, List, Dict, Any
from config import MEDICAL_DB_PATH


def get_medical_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(MEDICAL_DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


def init_medical_db():
    conn = get_medical_db()
    with conn:
        # Envelopes table: strictly ciphertext, tags, signatures, and unencrypted headers
        conn.execute("""
            CREATE TABLE IF NOT EXISTS envelopes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                seq INTEGER NOT NULL,
                epoch INTEGER NOT NULL,
                priority INTEGER NOT NULL,
                counter INTEGER NOT NULL,
                ciphertext BLOB NOT NULL,
                tag BLOB NOT NULL,
                sig BLOB NOT NULL,
                aad BLOB NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(device_id, epoch, counter)
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_envelopes_device ON envelopes(device_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_envelopes_priority ON envelopes(priority, created_at);")

        # Snapshots table: encrypted keyframe and delta snapshots requested by doctors
        conn.execute("""
            CREATE TABLE IF NOT EXISTS snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                snapshot_id TEXT UNIQUE NOT NULL,
                doctor_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                request_sig BLOB NOT NULL,
                keyframe_id TEXT NOT NULL,
                ciphertext BLOB NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_device ON snapshots(device_id);")
    conn.close()


def store_envelope(device_id: str, seq: int, epoch: int, priority: int,
                   counter: int, ciphertext: bytes, tag: bytes,
                   sig: bytes, aad: bytes) -> int:
    conn = get_medical_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO envelopes (device_id, seq, epoch, priority, counter, ciphertext, tag, sig, aad, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            device_id, seq, epoch, priority, counter,
            ciphertext, tag, sig, aad,
            datetime.datetime.now(datetime.timezone.utc).isoformat()
        ))
        row_id = cursor.lastrowid
    conn.close()
    return row_id


def store_snapshot(snapshot_id: str, doctor_id: str, device_id: str,
                   request_sig: bytes, keyframe_id: str, ciphertext: bytes) -> int:
    conn = get_medical_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO snapshots (snapshot_id, doctor_id, device_id, request_sig, keyframe_id, ciphertext, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            snapshot_id, doctor_id, device_id, request_sig, keyframe_id, ciphertext,
            datetime.datetime.now(datetime.timezone.utc).isoformat()
        ))
        row_id = cursor.lastrowid
    conn.close()
    return row_id


def purge_expired_medical_records(retention_days: int = 7) -> int:
    """Retention deletion: purged records are counted so they can be audited."""
    cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=retention_days)).isoformat()
    conn = get_medical_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM envelopes WHERE created_at < ?", (cutoff,))
        count = cursor.rowcount
    conn.close()
    return count
