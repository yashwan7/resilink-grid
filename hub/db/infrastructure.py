"""
Infrastructure Schema (Isolated Database)
Holds facility data (hospitals, pharmacies, blood banks, ambulances), devices, doctors, routes, and replay state.
Principle: Schemas NEVER join.
"""

import sqlite3
import datetime
from typing import Optional, List, Dict, Any
from config import INFRASTRUCTURE_DB_PATH


def get_infrastructure_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(INFRASTRUCTURE_DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


def init_infrastructure_db():
    conn = get_infrastructure_db()
    with conn:
        # Hospitals table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS hospitals (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                phone TEXT NOT NULL,
                beds_free INTEGER NOT NULL,
                icu_free INTEGER NOT NULL,
                o2_cylinders INTEGER NOT NULL,
                ventilators INTEGER NOT NULL,
                as_of TEXT NOT NULL,
                source TEXT NOT NULL
            );
        """)

        # Pharmacies table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pharmacies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                phone TEXT NOT NULL,
                drugs_json TEXT NOT NULL,
                as_of TEXT NOT NULL,
                source TEXT NOT NULL
            );
        """)

        # Blood banks table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS bloodbanks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                phone TEXT NOT NULL,
                units_json TEXT NOT NULL,
                as_of TEXT NOT NULL,
                source TEXT NOT NULL
            );
        """)

        # Ambulances table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ambulances (
                id TEXT PRIMARY KEY,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                status TEXT NOT NULL,
                contact TEXT NOT NULL,
                as_of TEXT NOT NULL,
                source TEXT NOT NULL
            );
        """)

        # Devices registry (medical node credentials & revocation status)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                device_id TEXT PRIMARY KEY,
                public_key_hex TEXT NOT NULL,
                is_revoked INTEGER NOT NULL DEFAULT 0,
                current_epoch INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );
        """)

        # Doctors registry (doctor credentials for signed snapshot requests)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS doctors (
                doctor_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                public_key_hex TEXT NOT NULL,
                is_revoked INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
        """)

        # Device replay filter state: 2048-bit sliding bitmap + max counter per (device, epoch)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS device_replay (
                device_id TEXT NOT NULL,
                epoch INTEGER NOT NULL,
                max_counter INTEGER NOT NULL,
                bitmap_blob BLOB NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (device_id, epoch)
            );
        """)

        # Network routes tracking (for Link AI & Groot status queries)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS routes (
                route_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT NOT NULL,
                pdr REAL NOT NULL,
                rssi INTEGER NOT NULL,
                latency_ms REAL NOT NULL,
                last_seen TEXT NOT NULL
            );
        """)
    conn.close()
