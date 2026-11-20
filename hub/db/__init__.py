"""
Isolated SQLite Database Schemas for RESILINK GRID Hub Backend.
Principle: Medical, Operational, Infrastructure, and Audit schemas NEVER join.
"""

from db.medical import init_medical_db, get_medical_db
from db.operational import init_operational_db, get_operational_db
from db.infrastructure import init_infrastructure_db, get_infrastructure_db
from db.audit import init_audit_db, get_audit_db


def init_all_databases():
    """Initializes all 4 isolated databases with WAL mode enabled."""
    init_medical_db()
    init_operational_db()
    init_infrastructure_db()
    init_audit_db()
