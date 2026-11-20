"""
Test Suite: Dispatch Outbox & Offline Retry
Owner: Harshith
Covers:
- Multi-path dispatch queue generation
- Offline retrying worker with exponential backoff
"""

import time
import datetime
from services.emergency_service import trigger_emergency, process_outbox_retry_worker
from crypto_utils import canonical_json, sign_p256
from db.operational import get_operational_db


def test_multi_path_dispatch_and_outbox_retry(test_device):
    now_ts = int(time.time())
    dev_id = test_device["device_id"]
    priv = test_device["priv_hex"]

    canonical_trigger = {
        "class": "P0",
        "counter": 2001,
        "device_id": dev_id,
        "lat": 12.9716,
        "lon": 77.5946,
        "need": ["ICU"],
        "pseudonym": "PT-OUTBOX",
        "ts": now_ts
    }
    sig = sign_p256(priv, canonical_json(canonical_trigger))

    res = trigger_emergency(
        pseudonym="PT-OUTBOX",
        lat=12.9716,
        lon=77.5946,
        ts_sec=now_ts,
        priority_class="P0",
        need=["ICU"],
        device_id=dev_id,
        counter=2001,
        signature_bytes=sig
    )
    emg_id = res["emergency_id"]

    # Verify all 4 channels are in outbox
    conn = get_operational_db()
    cursor = conn.cursor()
    cursor.execute("SELECT channel, status, retries FROM dispatch_outbox WHERE emergency_id = ?", (emg_id,))
    outbox_entries = cursor.fetchall()
    channels = [r["channel"] for r in outbox_entries]
    conn.close()

    assert "LAN_BROADCAST" in channels
    assert "MESH_NRF24" in channels
    assert "SMS_SIM800L" in channels
    assert "ONLINE_SYNC" in channels

    # Run outbox retry worker
    process_outbox_retry_worker()

    conn = get_operational_db()
    cursor = conn.cursor()
    cursor.execute("SELECT channel, status, retries, next_attempt FROM dispatch_outbox WHERE emergency_id = ? AND channel = 'SMS_SIM800L'", (emg_id,))
    sms_entry = cursor.fetchone()
    conn.close()

    # Retry count should increment and next_attempt set
    assert sms_entry["retries"] >= 1
    assert sms_entry["next_attempt"] is not None
