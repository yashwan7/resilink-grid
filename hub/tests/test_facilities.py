"""
Test Suite: Facilities Service (T17)
Owner: Harshith
Covers:
- Haversine radius queries for hospitals, pharmacies, blood banks, and ambulances
- Near-expiry (<30 days) and expired drug flagging
- Blood bank 8-group availability
- Stale data detection (>15 minutes)
"""

import datetime
from services.facility_service import (
    get_hospitals, get_pharmacies, get_bloodbanks, get_ambulances,
    haversine_km, is_record_stale
)


def test_t17_haversine_distance_calculation():
    """T17a: Verifies Haversine formula against known coordinates."""
    # Distance between Bangalore Center (12.9716, 77.5946) and Manipal Hospital (12.9592, 77.6483) ~ 5.9 km
    dist = haversine_km(12.9716, 77.5946, 12.9592, 77.6483)
    assert 5.0 < dist < 7.0


def test_t17_drug_near_expiry_flagging():
    """T17b: Pharmacies must accurately flag medications with <30 days to expiry."""
    pharmacies = get_pharmacies(12.9716, 77.5946, radius_km=15.0)
    assert len(pharmacies) > 0

    found_near_expiry = False
    found_expired = False

    for p in pharmacies:
        for d in p["drugs"]:
            if d["near_expiry"]:
                found_near_expiry = True
                assert 0 <= d["days_until_expiry"] <= 30
            if d["expired"]:
                found_expired = True
                assert d["days_until_expiry"] < 0

    assert found_near_expiry, "Should detect at least one near-expiry medication from seed data"
    assert found_expired, "Should detect at least one expired medication from seed data"


def test_t17_bloodbank_all_eight_groups():
    """T17c: Blood banks must expose unit availability for all 8 standard blood groups."""
    bloodbanks = get_bloodbanks(12.9716, 77.5946, radius_km=15.0)
    assert len(bloodbanks) > 0

    required_groups = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
    for bb in bloodbanks:
        assert set(bb["units"].keys()) == required_groups
        assert all(isinstance(v, int) for v in bb["units"].values())


def test_t17_staleness_badge_detection():
    """T17d: Telemetry older than 15 minutes must be flagged as stale."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    old_iso = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=20)).isoformat()

    assert is_record_stale(now_iso, threshold_minutes=15) is False
    assert is_record_stale(old_iso, threshold_minutes=15) is True
