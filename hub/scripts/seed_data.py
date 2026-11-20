"""
Seeded Simulated Datasets for RESILINK GRID Demo
Seed Area: Bangalore, India (12.9716° N, 77.5946° E)
Seeds Hospitals, Pharmacies with rare drugs and expiry dates, Blood Banks (8 groups),
Ambulances, Devices, Doctors, and Transmission Routes.
Principle: Honest labels (source: simulated).
"""

import json
import datetime
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from db.infrastructure import get_infrastructure_db
from db.audit import get_audit_db, append_audit_event


# Deterministic Keypair Generator for Seed Data
def _get_pubkey_hex_from_priv_hex(priv_hex: str) -> str:
    priv_int = int(priv_hex, 16)
    privkey = ec.derive_private_key(priv_int, ec.SECP256R1())
    pub = privkey.public_key()
    return pub.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint).hex()


DEMO_DEVICES = [
    {
        "device_id": "WARD_N01",
        "priv_hex": "1111111111111111111111111111111111111111111111111111111111111111",
        "is_revoked": 0,
        "epoch": 1
    },
    {
        "device_id": "WARD_N02",
        "priv_hex": "2222222222222222222222222222222222222222222222222222222222222222",
        "is_revoked": 0,
        "epoch": 1
    },
    {
        "device_id": "WARD_N03",
        "priv_hex": "3333333333333333333333333333333333333333333333333333333333333333",
        "is_revoked": 1,  # Revoked device for testing security gate
        "epoch": 1
    }
]

DEMO_DOCTORS = [
    {
        "doctor_id": "DOC_001",
        "name": "Dr. Yashwanth (Lead Trauma)",
        "priv_hex": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "is_revoked": 0
    },
    {
        "doctor_id": "DOC_002",
        "name": "Dr. Harshavardhan (Cardiology)",
        "priv_hex": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "is_revoked": 0
    }
]


def seed_all_demo_data(force: bool = False):
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    today = datetime.date.today()

    if force:
        # Clear all 4 databases for test isolation
        from db.medical import get_medical_db
        from db.operational import get_operational_db
        from db.audit import get_audit_db

        with get_medical_db() as m_conn:
            m_conn.execute("DELETE FROM envelopes")
            m_conn.execute("DELETE FROM snapshots")

        with get_operational_db() as o_conn:
            o_conn.execute("DELETE FROM emergencies")
            o_conn.execute("DELETE FROM assignments")
            o_conn.execute("DELETE FROM dispatch_outbox")
            o_conn.execute("DELETE FROM consult_sessions")

        with get_audit_db() as a_conn:
            a_conn.execute("DELETE FROM audit_events")
            a_conn.execute("DELETE FROM audit_checkpoints")

    conn = get_infrastructure_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM hospitals")
    already_seeded = cursor.fetchone()[0] > 0
    if already_seeded and not force:
        conn.close()
        return

    with conn:
        cursor = conn.cursor()
        # Clear existing infrastructure tables if force
        if force:
            cursor.execute("DELETE FROM hospitals")
            cursor.execute("DELETE FROM pharmacies")
            cursor.execute("DELETE FROM bloodbanks")
            cursor.execute("DELETE FROM ambulances")
            cursor.execute("DELETE FROM devices")
            cursor.execute("DELETE FROM doctors")
            cursor.execute("DELETE FROM routes")
            cursor.execute("DELETE FROM device_replay")



        # 1. Seed Hospitals around Bangalore
        hospitals = [
            ("HOSP-01", "Victoria Hospital (Trauma Center)", 12.9625, 77.5750, "+91-80-26701150", 45, 12, 60, 10, now_iso, "simulated"),
            ("HOSP-02", "Bowring and Lady Curzon Hospital", 12.9833, 77.6000, "+91-80-25591325", 28, 4, 30, 4, now_iso, "simulated"),
            ("HOSP-03", "Manipal Hospital Old Airport Rd", 12.9592, 77.6483, "+91-80-25024444", 62, 18, 90, 16, now_iso, "simulated"),
            ("HOSP-04", "Fortis Hospital Bannerghatta", 12.8936, 77.5978, "+91-80-66214444", 34, 8, 45, 6, now_iso, "simulated"),
            ("HOSP-05", "St. John's Medical College Hospital", 12.9344, 77.6200, "+91-80-22065000", 50, 15, 80, 12, now_iso, "simulated"),
            ("HOSP-06", "Apollo Hospital Jayanagar", 12.9295, 77.5831, "+91-80-46688888", 22, 6, 25, 4, now_iso, "simulated")
        ]
        cursor.executemany("""
            INSERT OR REPLACE INTO hospitals (id, name, lat, lon, phone, beds_free, icu_free, o2_cylinders, ventilators, as_of, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, hospitals)

        # 2. Seed Pharmacies with common and rare drugs (some near expiry <30 days for testing)
        pharmacies = [
            (
                "PHARM-01", "Apollo Pharmacy Brigade Road", 12.9719, 77.6070, "+91-80-25587788",
                json.dumps([
                    {"name": "Norepinephrine", "rare": True, "qty": 14, "expiry": (today + datetime.timedelta(days=20)).isoformat(), "as_of": now_iso},  # NEAR EXPIRY (<30d)
                    {"name": "Epinephrine (Adrenaline)", "rare": False, "qty": 50, "expiry": (today + datetime.timedelta(days=180)).isoformat(), "as_of": now_iso},
                    {"name": "Snake Antivenom Polyvalent", "rare": True, "qty": 6, "expiry": (today + datetime.timedelta(days=120)).isoformat(), "as_of": now_iso},
                    {"name": "Atropine Sulfate", "rare": False, "qty": 80, "expiry": (today + datetime.timedelta(days=300)).isoformat(), "as_of": now_iso},
                    {"name": "Expired Amiodarone Batch", "rare": True, "qty": 5, "expiry": (today - datetime.timedelta(days=5)).isoformat(), "as_of": now_iso}  # EXPIRED
                ]),
                now_iso, "simulated"
            ),
            (
                "PHARM-02", "MedPlus Pharmacy Indiranagar", 12.9784, 77.6408, "+91-80-25219900",
                json.dumps([
                    {"name": "Remdesivir 100mg", "rare": True, "qty": 10, "expiry": (today + datetime.timedelta(days=90)).isoformat(), "as_of": now_iso},
                    {"name": "Insulin Glargine", "rare": False, "qty": 40, "expiry": (today + datetime.timedelta(days=25)).isoformat(), "as_of": now_iso},  # NEAR EXPIRY (<30d)
                    {"name": "Hydrocortisone", "rare": False, "qty": 120, "expiry": (today + datetime.timedelta(days=400)).isoformat(), "as_of": now_iso}
                ]),
                now_iso, "simulated"
            ),
            (
                "PHARM-03", "Wellness Forever 24x7 Koramangala", 12.9352, 77.6245, "+91-80-25531234",
                json.dumps([
                    {"name": "Dopamine HCl", "rare": True, "qty": 20, "expiry": (today + datetime.timedelta(days=200)).isoformat(), "as_of": now_iso},
                    {"name": "Tranexamic Acid", "rare": False, "qty": 65, "expiry": (today + datetime.timedelta(days=150)).isoformat(), "as_of": now_iso}
                ]),
                now_iso, "simulated"
            )
        ]
        cursor.executemany("""
            INSERT OR REPLACE INTO pharmacies (id, name, lat, lon, phone, drugs_json, as_of, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, pharmacies)

        # 3. Seed Blood Banks (All 8 Groups: A+, A-, B+, B-, AB+, AB-, O+, O-)
        bloodbanks = [
            (
                "BLOOD-01", "Indian Red Cross Blood Bank Bangalore", 12.9810, 77.5890, "+91-80-22264205",
                json.dumps({"A+": 18, "A-": 5, "B+": 25, "B-": 6, "AB+": 9, "AB-": 2, "O+": 32, "O-": 4}),
                now_iso, "simulated"
            ),
            (
                "BLOOD-02", "Rotary TTK Blood Bank", 12.9650, 77.6120, "+91-80-25287903",
                json.dumps({"A+": 12, "A-": 3, "B+": 19, "B-": 4, "AB+": 6, "AB-": 1, "O+": 28, "O-": 3}),
                now_iso, "simulated"
            ),
            (
                "BLOOD-03", "Rashtrotthana Blood Centre", 12.9320, 77.5850, "+91-80-26637393",
                json.dumps({"A+": 15, "A-": 4, "B+": 22, "B-": 5, "AB+": 7, "AB-": 2, "O+": 30, "O-": 5}),
                now_iso, "simulated"
            )
        ]
        cursor.executemany("""
            INSERT OR REPLACE INTO bloodbanks (id, name, lat, lon, phone, units_json, as_of, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, bloodbanks)

        # 4. Seed Ambulances
        ambulances = [
            ("AMB-101", 12.9650, 77.5800, "FREE", "+91-9876543201", now_iso, "simulated"),
            ("AMB-102", 12.9750, 77.6050, "FREE", "+91-9876543202", now_iso, "simulated"),
            ("AMB-103", 12.9550, 77.6400, "FREE", "+91-9876543203", now_iso, "simulated"),
            ("AMB-104", 12.9200, 77.5900, "FREE", "+91-9876543204", now_iso, "simulated"),
            ("AMB-105", 12.9400, 77.6150, "BUSY", "+91-9876543205", now_iso, "simulated")
        ]
        cursor.executemany("""
            INSERT OR REPLACE INTO ambulances (id, lat, lon, status, contact, as_of, source)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ambulances)

        # 5. Seed Registered Devices
        for dev in DEMO_DEVICES:
            pub_hex = _get_pubkey_hex_from_priv_hex(dev["priv_hex"])
            cursor.execute("""
                INSERT OR REPLACE INTO devices (device_id, public_key_hex, is_revoked, current_epoch, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (dev["device_id"], pub_hex, dev["is_revoked"], dev["epoch"], now_iso))

        # 6. Seed Registered Doctors
        for doc in DEMO_DOCTORS:
            pub_hex = _get_pubkey_hex_from_priv_hex(doc["priv_hex"])
            cursor.execute("""
                INSERT OR REPLACE INTO doctors (doctor_id, name, public_key_hex, is_revoked, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (doc["doctor_id"], doc["name"], pub_hex, doc["is_revoked"], now_iso))

        # 7. Seed Routes (Link AI monitoring)
        routes = [
            ("ROUTE-01", "PORT_A Wi-Fi (Primary)", "ACTIVE", 0.99, -58, 12.4, now_iso),
            ("ROUTE-02", "PORT_B Backup Wi-Fi", "STANDBY", 0.95, -72, 24.8, now_iso),
            ("ROUTE-03", "MESH nRF24 Radio", "STANDBY", 0.91, -78, 48.0, now_iso),
            ("ROUTE-04", "SMS Fallback SIM800L", "STANDBY", 0.85, -84, 850.0, now_iso)
        ]
        cursor.executemany("""
            INSERT OR REPLACE INTO routes (route_id, name, status, pdr, rssi, latency_ms, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, routes)

    conn.close()

    # Genesis Audit Event
    audit_conn = get_audit_db()
    cursor = audit_conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM audit_events")
    if cursor.fetchone()[0] == 0:
        append_audit_event("SYSTEM_INITIALIZED", {
            "version": "4.0.0",
            "owner": "Harshith",
            "timestamp": now_iso,
            "hospitals_seeded": len(hospitals),
            "pharmacies_seeded": len(pharmacies),
            "bloodbanks_seeded": len(bloodbanks),
            "ambulances_seeded": len(ambulances)
        })
    audit_conn.close()


if __name__ == "__main__":
    seed_all_demo_data(force=True)
    print("RESILINK GRID Demo Datasets Seeded Successfully.")
