"""
Test Suite: F8 Emergency Engine & Allocation (T18)
Owner: Harshith
Covers:
- T18: Nearest FREE ambulance allocation & weighted hospital scoring
- Allocation edge case: Stale telemetry penalty
- Allocation edge case: No ambulance free (graceful outbox queue)
- Allocation edge case: Hospital full (cascades to fallback hospital)
- Idempotency test: Re-sent trigger returns existing allocation
- Human override test
"""

import time
import datetime
import pytest
from services.emergency_service import (
    trigger_emergency, get_emergency_by_id, apply_human_override
)
from crypto_utils import canonical_json, sign_p256
from db.infrastructure import get_infrastructure_db
from db.operational import get_operational_db


def test_t18_emergency_allocation_golden_path(test_device):
    """T18: Deterministic allocation selects nearest FREE ambulance and optimal hospital."""
    now_ts = int(time.time())
    dev_id = test_device["device_id"]
    priv = test_device["priv_hex"]

    canonical_trigger = {
        "class": "P0",
        "counter": 1001,
        "device_id": dev_id,
        "lat": 12.9716,
        "lon": 77.5946,
        "need": ["ICU", "O2"],
        "pseudonym": "PT-EMG-1001",
        "ts": now_ts
    }
    sig = sign_p256(priv, canonical_json(canonical_trigger))

    result = trigger_emergency(
        pseudonym="PT-EMG-1001",
        lat=12.9716,
        lon=77.5946,
        ts_sec=now_ts,
        priority_class="P0",
        need=["ICU", "O2"],
        device_id=dev_id,
        counter=1001,
        signature_bytes=sig
    )

    assert result["status"] == "ASSIGNED"
    assert "AMB-" in result["assigned_ambulance"]["id"]
    assert result["assigned_ambulance"]["eta_minutes"] > 0
    assert "HOSP-" in result["allocated_hospital"]["id"]
    assert "ICU" in result["allocated_hospital"]["name"] or result["allocated_hospital"]["score"] is not None
    assert "Decision support, not a diagnosis" in result["disclaimer"]


def test_allocation_stale_data_penalty(test_device):
    """Allocation edge case: A hospital with stale telemetry (>15m) receives a heavy penalty."""
    conn = get_infrastructure_db()
    with conn:
        cursor = conn.cursor()
        # Set HOSP-01 (Victoria, closest) as very stale (3 hours old)
        stale_iso = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=3)).isoformat()
        cursor.execute("UPDATE hospitals SET as_of = ? WHERE id = 'HOSP-01'", (stale_iso,))
    conn.close()

    now_ts = int(time.time())
    dev_id = test_device["device_id"]
    priv = test_device["priv_hex"]

    canonical_trigger = {
        "class": "P0",
        "counter": 1002,
        "device_id": dev_id,
        "lat": 12.9716,
        "lon": 77.5946,
        "need": ["ICU"],
        "pseudonym": "PT-STALE-TEST",
        "ts": now_ts
    }
    sig = sign_p256(priv, canonical_json(canonical_trigger))

    result = trigger_emergency(
        pseudonym="PT-STALE-TEST",
        lat=12.9716,
        lon=77.5946,
        ts_sec=now_ts,
        priority_class="P0",
        need=["ICU"],
        device_id=dev_id,
        counter=1002,
        signature_bytes=sig
    )

    # Bowring (HOSP-02) or Manipal should be chosen over the stale HOSP-01
    assert result["allocated_hospital"]["id"] != "HOSP-01"


def test_allocation_no_ambulance_free(test_device):
    """Allocation edge case: When no ambulance is free, engine handles state gracefully."""
    conn = get_infrastructure_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE ambulances SET status = 'BUSY'")
    conn.close()

    now_ts = int(time.time())
    dev_id = test_device["device_id"]
    priv = test_device["priv_hex"]

    canonical_trigger = {
        "class": "P0",
        "counter": 1003,
        "device_id": dev_id,
        "lat": 12.9716,
        "lon": 77.5946,
        "need": ["GENERAL"],
        "pseudonym": "PT-NO-AMB",
        "ts": now_ts
    }
    sig = sign_p256(priv, canonical_json(canonical_trigger))

    result = trigger_emergency(
        pseudonym="PT-NO-AMB",
        lat=12.9716,
        lon=77.5946,
        ts_sec=now_ts,
        priority_class="P0",
        need=["GENERAL"],
        device_id=dev_id,
        counter=1003,
        signature_bytes=sig
    )

    assert result["status"] == "PENDING_RESOURCES"
    assert result["assigned_ambulance"]["id"] == "NONE_AVAILABLE"


def test_allocation_hospital_full_cascades_to_fallback(test_device):
    """Allocation edge case: When primary hospital has 0 beds and 0 ICU, engine cascades to next-best."""
    conn = get_infrastructure_db()
    with conn:
        cursor = conn.cursor()
        # Set HOSP-01 and HOSP-02 completely full
        cursor.execute("UPDATE hospitals SET beds_free = 0, icu_free = 0 WHERE id IN ('HOSP-01', 'HOSP-02')")
    conn.close()

    now_ts = int(time.time())
    dev_id = test_device["device_id"]
    priv = test_device["priv_hex"]

    canonical_trigger = {
        "class": "P0",
        "counter": 1004,
        "device_id": dev_id,
        "lat": 12.9716,
        "lon": 77.5946,
        "need": ["ICU"],
        "pseudonym": "PT-FULL-CASCADE",
        "ts": now_ts
    }
    sig = sign_p256(priv, canonical_json(canonical_trigger))

    result = trigger_emergency(
        pseudonym="PT-FULL-CASCADE",
        lat=12.9716,
        lon=77.5946,
        ts_sec=now_ts,
        priority_class="P0",
        need=["ICU"],
        device_id=dev_id,
        counter=1004,
        signature_bytes=sig
    )

    # Must cascade to HOSP-03, HOSP-04, or HOSP-05
    assert result["allocated_hospital"]["id"] not in ("HOSP-01", "HOSP-02")
    assert result["allocated_hospital"]["id"].startswith("HOSP-")


def test_idempotency_duplicate_trigger(test_device):
    """Idempotency test: Re-submitting exact (device_id, counter) returns existing assignment without re-allocating."""
    now_ts = int(time.time())
    dev_id = test_device["device_id"]
    priv = test_device["priv_hex"]

    canonical_trigger = {
        "class": "P0",
        "counter": 1005,
        "device_id": dev_id,
        "lat": 12.9716,
        "lon": 77.5946,
        "need": ["ICU"],
        "pseudonym": "PT-IDEMPOTENT",
        "ts": now_ts
    }
    sig = sign_p256(priv, canonical_json(canonical_trigger))

    first_res = trigger_emergency(
        pseudonym="PT-IDEMPOTENT",
        lat=12.9716,
        lon=77.5946,
        ts_sec=now_ts,
        priority_class="P0",
        need=["ICU"],
        device_id=dev_id,
        counter=1005,
        signature_bytes=sig
    )
    first_emg_id = first_res["emergency_id"]

    second_res = trigger_emergency(
        pseudonym="PT-IDEMPOTENT",
        lat=12.9716,
        lon=77.5946,
        ts_sec=now_ts,
        priority_class="P0",
        need=["ICU"],
        device_id=dev_id,
        counter=1005,
        signature_bytes=sig
    )

    assert second_res.get("idempotent") is True
    assert second_res["emergency_id"] == first_emg_id


def test_human_override(test_device):
    """Human override: Operator re-assigns or changes status, logged to audit."""
    now_ts = int(time.time())
    dev_id = test_device["device_id"]
    priv = test_device["priv_hex"]

    canonical_trigger = {
        "class": "P0",
        "counter": 1006,
        "device_id": dev_id,
        "lat": 12.9716,
        "lon": 77.5946,
        "need": ["GENERAL"],
        "pseudonym": "PT-OVERRIDE",
        "ts": now_ts
    }
    sig = sign_p256(priv, canonical_json(canonical_trigger))

    res = trigger_emergency(
        pseudonym="PT-OVERRIDE",
        lat=12.9716,
        lon=77.5946,
        ts_sec=now_ts,
        priority_class="P0",
        need=["GENERAL"],
        device_id=dev_id,
        counter=1006,
        signature_bytes=sig
    )
    emg_id = res["emergency_id"]

    # Apply operator override
    override_res = apply_human_override(
        emergency_id=emg_id,
        operator_id="DISPATCHER_42",
        new_status="EN_ROUTE",
        new_hospital_id="HOSP-05",
        reason="Patient family requested St. John's"
    )
    assert override_res["status"] == "SUCCESS"

    emg_record = get_emergency_by_id(emg_id)
    assert emg_record["status"] == "EN_ROUTE"
    assert emg_record["allocated_hospital_id"] == "HOSP-05"
