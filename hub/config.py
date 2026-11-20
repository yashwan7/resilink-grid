"""
RESILINK GRID - Hub Backend Configuration
Hub owner: Harshith
Principle: AI predicts, rules decide, logs prove.
"""

import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Isolated SQLite Databases (WAL Mode - Schemas NEVER join)
MEDICAL_DB_PATH = DATA_DIR / "medical.db"
OPERATIONAL_DB_PATH = DATA_DIR / "operational.db"
INFRASTRUCTURE_DB_PATH = DATA_DIR / "infrastructure.db"
AUDIT_DB_PATH = DATA_DIR / "audit.db"

# Secondary location for signed audit checkpoints
CHECKPOINT_MIRROR_DIR = DATA_DIR / "checkpoints_mirror"
CHECKPOINT_MIRROR_DIR.mkdir(parents=True, exist_ok=True)
CHECKPOINT_MIRROR_FILE = CHECKPOINT_MIRROR_DIR / "checkpoints.jsonl"

# Server Configuration
HOST = os.getenv("HUB_HOST", "0.0.0.0")
PORT = int(os.getenv("HUB_PORT", "8000"))
DEBUG = os.getenv("HUB_DEBUG", "False").lower() in ("true", "1")

# Protocol & Security Limits
PROTOCOL_VERSION = 1
MAX_BODY_SIZE_BYTES = 64 * 1024  # 64 KB
MAX_ENVELOPE_LEN = 1024           # Max radio/IP envelope bytes
MIN_ENVELOPE_LEN = 26 + 16 + 64   # Header (26B) + Min GCM Tag (16B) + Sig (64B)
SLIDING_BITMAP_BITS = 2048
CLOCK_SKEW_MAX_SEC = 300          # 5 minutes maximum drift for TTL
SNAPSHOT_RATE_LIMIT_PER_MIN = 30

# Static HMAC Secret for Audit Hash Chain (in production loaded from HSM/secure enclave)
AUDIT_HMAC_KEY = os.getenv("AUDIT_HMAC_KEY", "resilink-hub-audit-hmac-secret-key-v4-2026").encode("utf-8")

# Hub Authority Keypair (ECDSA P-256 for checkpoint signing & trusted time)
# Default seed for deterministic demo testing
HUB_PRIVATE_KEY_HEX = os.getenv(
    "HUB_PRIVATE_KEY_HEX",
    "4a259c19b8849646c2fb3763f35062b9f3900be46fcad27d0a07409249e0a05a"
)

# Demo area center (Bangalore, India)
DEMO_CENTER_LAT = 12.9716
DEMO_CENTER_LON = 77.5946

# Constant guardrail statement
DECISION_SUPPORT_DISCLAIMER = "Decision support, not a diagnosis"
