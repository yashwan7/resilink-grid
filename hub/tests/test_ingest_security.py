"""
Test Suite: Ingest and Security Gates (T2 - T8)
Owner: Harshith
Covers:
- T2: Replay attack rejection (2048-bit sliding bitmap + unique DB index)
- T3: Corrupted / bad signature rejection
- T4: Late / expired packet rejection (TTL)
- T5: Bad length / bad version rejection
- T6: Unknown and revoked device rejection
- T7: Unknown / obsolete epoch rejection
- T8: Valid out-of-order packets within sliding bitmap window accepted
"""

import time
import pytest
from services.ingest_service import ingest_envelope, IngestNACK
from conftest import make_envelope
from config import PROTOCOL_VERSION, CLOCK_SKEW_MAX_SEC


def test_t2_replay_attack_rejection(test_device):
    """T2: Replayed sequence counters must be rejected with NACK REPLAY."""
    env = make_envelope(test_device["device_id"], test_device["priv_hex"], counter=10)
    
    # First ingest must succeed
    ack = ingest_envelope(env)
    assert ack["status"] == "ACK"

    # Replay of exact same counter must fail
    with pytest.raises(IngestNACK) as exc_info:
        ingest_envelope(env)
    assert exc_info.value.code == "REPLAY"


def test_t3_bad_signature_rejection(test_device):
    """T3: Flipped bit in ciphertext or tag must cause BAD_SIGNATURE rejection."""
    env = make_envelope(test_device["device_id"], test_device["priv_hex"], counter=20)
    
    # Flip a bit in the ciphertext region
    tampered = bytearray(env)
    tampered[28] ^= 0x01

    with pytest.raises(IngestNACK) as exc_info:
        ingest_envelope(bytes(tampered))
    assert exc_info.value.code == "BAD_SIGNATURE"


def test_t4_expired_packet_rejection(test_device):
    """T4: Packet with timestamp drifting beyond CLOCK_SKEW_MAX_SEC must be rejected."""
    old_time = int(time.time()) - (CLOCK_SKEW_MAX_SEC + 60)
    env = make_envelope(test_device["device_id"], test_device["priv_hex"], counter=30, pkt_time=old_time)

    with pytest.raises(IngestNACK) as exc_info:
        ingest_envelope(env)
    assert exc_info.value.code == "EXPIRED"


def test_t5_bad_length_and_version(test_device):
    """T5: Envelopes with invalid length or protocol version must be rejected."""
    # Bad length (truncated)
    short_env = b"\x01" * 10
    with pytest.raises(IngestNACK) as exc_info:
        ingest_envelope(short_env)
    assert exc_info.value.code == "BAD_LENGTH"

    # Bad version
    bad_ver_env = make_envelope(test_device["device_id"], test_device["priv_hex"], counter=40, version=99)
    with pytest.raises(IngestNACK) as exc_info:
        ingest_envelope(bad_ver_env)
    assert exc_info.value.code == "BAD_VERSION"


def test_t6_unknown_and_revoked_device(test_device):
    """T6: Unregistered devices and revoked devices must be rejected."""
    # Unknown device
    unknown_env = make_envelope("UNKNOWN9", test_device["priv_hex"], counter=50)
    with pytest.raises(IngestNACK) as exc_info:
        ingest_envelope(unknown_env)
    assert exc_info.value.code == "UNKNOWN_DEVICE"

    # Revoked device (WARD_N03 in seed data has is_revoked = 1)
    revoked_env = make_envelope("WARD_N03", "3333333333333333333333333333333333333333333333333333333333333333", counter=50)
    with pytest.raises(IngestNACK) as exc_info:
        ingest_envelope(revoked_env)
    assert exc_info.value.code == "REVOKED"


def test_t7_unknown_epoch(test_device):
    """T7: Packets with an obsolete epoch must be rejected."""
    # Device current epoch is 1; packet with epoch 0 must be rejected
    obsolete_env = make_envelope(test_device["device_id"], test_device["priv_hex"], epoch=0, counter=60)
    with pytest.raises(IngestNACK) as exc_info:
        ingest_envelope(obsolete_env)
    assert exc_info.value.code == "UNKNOWN_EPOCH"


def test_t8_out_of_order_packets_in_sliding_window(test_device):
    """T8: Out-of-order packets arriving within the 2048-bit sliding window must be accepted."""
    dev_id = test_device["device_id"]
    priv = test_device["priv_hex"]

    # First packet: counter 100
    ack1 = ingest_envelope(make_envelope(dev_id, priv, counter=100))
    assert ack1["status"] == "ACK"

    # Second packet: counter 105 (advances max_counter to 105)
    ack2 = ingest_envelope(make_envelope(dev_id, priv, counter=105))
    assert ack2["status"] == "ACK"

    # Out-of-order packet arriving later: counter 102 (within 2048 window of 105)
    ack3 = ingest_envelope(make_envelope(dev_id, priv, counter=102))
    assert ack3["status"] == "ACK"

    # Duplicate of out-of-order packet 102 must be rejected
    with pytest.raises(IngestNACK) as exc_info:
        ingest_envelope(make_envelope(dev_id, priv, counter=102))
    assert exc_info.value.code == "REPLAY"

    # Advance counter to 3000 (valid newer packet)
    ack4 = ingest_envelope(make_envelope(dev_id, priv, counter=3000))
    assert ack4["status"] == "ACK"

    # Now counter 103 is (3000 - 103) = 2897 > 2048 delta behind 3000; must be rejected as REPLAY
    with pytest.raises(IngestNACK) as exc_info:
        ingest_envelope(make_envelope(dev_id, priv, counter=103))
    assert exc_info.value.code == "REPLAY"

