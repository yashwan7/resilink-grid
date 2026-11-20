"""
Pytest Fixtures for RESILINK GRID Hub Backend Tests
"""

import sys
import os
from pathlib import Path

# Ensure hub root is in sys.path
HUB_ROOT = Path(__file__).resolve().parent.parent
if str(HUB_ROOT) not in sys.path:
    sys.path.insert(0, str(HUB_ROOT))

import pytest
import time
import shutil

# Configure test environment
os.environ["HUB_DEBUG"] = "False"

from config import DATA_DIR, CHECKPOINT_MIRROR_FILE, PROTOCOL_VERSION
from db import init_all_databases
from scripts.seed_data import seed_all_demo_data, DEMO_DEVICES, DEMO_DOCTORS
from crypto_utils import sign_p256



@pytest.fixture(autouse=True)
def setup_test_databases():
    """Initializes and seeds isolated test databases before each test."""
    init_all_databases()
    seed_all_demo_data(force=True)
    yield


@pytest.fixture
def test_device():
    return DEMO_DEVICES[0]  # WARD_N01


@pytest.fixture
def test_doctor():
    return DEMO_DOCTORS[0]  # DOC_001


def make_envelope(device_id: str, priv_hex: str, seq: int = 1, epoch: int = 1,
                  priority: int = 0, counter: int = 1, pkt_time: int = None,
                  version: int = PROTOCOL_VERSION, payload: bytes = b"TEST_PAYLOAD") -> bytes:
    if pkt_time is None:
        pkt_time = int(time.time())

    dev_id_bytes = device_id.encode('ascii').ljust(8, b'\x00')[:8]
    aad = (
        bytes([version]) +
        dev_id_bytes +
        seq.to_bytes(4, byteorder='big') +
        epoch.to_bytes(4, byteorder='big') +
        bytes([priority]) +
        counter.to_bytes(4, byteorder='big') +
        pkt_time.to_bytes(4, byteorder='big')
    )
    ciphertext = b"\xcc" * len(payload)
    tag = b"\xdd" * 16
    ciphertext_and_tag = ciphertext + tag
    sig = sign_p256(priv_hex, aad + ciphertext_and_tag)
    return aad + ciphertext_and_tag + sig
