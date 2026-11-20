"""
Operational Schema (Isolated Database)
Holds emergency states, ambulance/hospital assignments, dispatch outbox, and consultation sessions.
Principle: Schemas NEVER join.
"""

import sqlite3
import datetime
from typing import Optional, List, Dict, Any
from config import OPERATIONAL_DB_PATH


def get_operational_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(OPERATIONAL_DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


def init_operational_db():
    conn = get_operational_db()
    with conn:
        # Emergencies table: offline deterministic engine state machine
        conn.execute("""
            CREATE TABLE IF NOT EXISTS emergencies (
                id TEXT PRIMARY KEY,
                pseudonym TEXT NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                priority_class TEXT NOT NULL,
                need_json TEXT NOT NULL,
                device_id TEXT NOT NULL,
                counter INTEGER NOT NULL,
                status TEXT NOT NULL,
                allocated_hospital_id TEXT,
                assigned_ambulance_id TEXT,
                raw_signature BLOB,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(device_id, counter)
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status);")

        # Assignments table: records allocation decisions
        conn.execute("""
            CREATE TABLE IF NOT EXISTS assignments (
                id TEXT PRIMARY KEY,
                emergency_id TEXT NOT NULL,
                ambulance_id TEXT NOT NULL,
                hospital_id TEXT NOT NULL,
                eta_minutes REAL NOT NULL,
                hospital_score REAL NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)

        # Dispatch outbox table: offline-resilient multi-path delivery and retrying outbox
        conn.execute("""
            CREATE TABLE IF NOT EXISTS dispatch_outbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emergency_id TEXT NOT NULL,
                channel TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL,
                retries INTEGER NOT NULL DEFAULT 0,
                next_attempt TEXT NOT NULL,
                last_error TEXT,
                created_at TEXT NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_outbox_pending ON dispatch_outbox(status, next_attempt);")

        # Consult sessions table: patient-doctor consultation signalling & offline queue
        conn.execute("""
            CREATE TABLE IF NOT EXISTS consult_sessions (
                session_id TEXT PRIMARY KEY,
                patient_pseudonym TEXT NOT NULL,
                doctor_id TEXT NOT NULL,
                status TEXT NOT NULL,
                signaling_data_json TEXT,
                created_at TEXT NOT NULL
            );
        """)
    conn.close()
