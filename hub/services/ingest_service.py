"""
Ingest & Security Service for RESILINK GRID Hub Backend
Enforces strict ingest pipeline: length -> version -> expiry -> replay -> signature -> store.
Replay protection with 2048-bit sliding bitmap + unique index.
Trusted time in ACK.
Principle: Hub NEVER decrypts. Hub, ESP32 and relays NEVER hold keys or plaintext.
"""

import time
import datetime
from typing import Tuple, Dict, Any, Optional

from config import (
    PROTOCOL_VERSION, MAX_ENVELOPE_LEN, MIN_ENVELOPE_LEN,
    SLIDING_BITMAP_BITS, CLOCK_SKEW_MAX_SEC
)
from crypto_utils import verify_p256_signature
from db.infrastructure import get_infrastructure_db
from db.medical import store_envelope
from db.audit import append_audit_event


class IngestNACK(Exception):
    def __init__(self, code: str, detail: str):
        self.code = code
        self.detail = detail
        super().__init__(f"{code}: {detail}")


def _get_bit(bitmap_bytes: bytes, index: int) -> bool:
    byte_index = index // 8
    bit_index = index % 8
    if byte_index >= len(bitmap_bytes):
        return False
    return bool(bitmap_bytes[byte_index] & (1 << bit_index))


def _set_bit(bitmap_bytes: bytearray, index: int):
    byte_index = index // 8
    bit_index = index % 8
    if byte_index < len(bitmap_bytes):
        bitmap_bytes[byte_index] |= (1 << bit_index)


def _shift_bitmap_left(bitmap_bytes: bytearray, shift: int):
    """Shifts bitmap by `shift` positions to accommodate newer counters."""
    total_bits = len(bitmap_bytes) * 8
    if shift >= total_bits:
        for i in range(len(bitmap_bytes)):
            bitmap_bytes[i] = 0
        return

    # Convert to int, shift, convert back
    int_val = int.from_bytes(bitmap_bytes, byteorder='little')
    shifted = (int_val << shift) & ((1 << total_bits) - 1)
    new_bytes = shifted.to_bytes(len(bitmap_bytes), byteorder='little')
    bitmap_bytes[:] = new_bytes


def check_and_update_replay(device_id: str, epoch: int, counter: int) -> bool:
    """
    Checks counter against 2048-bit sliding bitmap in infrastructure.db.
    Returns True if valid (not a replay), False if replayed.
    """
    bitmap_byte_len = SLIDING_BITMAP_BITS // 8  # 256 bytes
    conn = get_infrastructure_db()
    with conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT max_counter, bitmap_blob FROM device_replay
            WHERE device_id = ? AND epoch = ?
        """, (device_id, epoch))
        row = cursor.fetchone()

        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if row is None:
            # First packet in this epoch
            initial_bitmap = bytearray(bitmap_byte_len)
            _set_bit(initial_bitmap, 0)
            cursor.execute("""
                INSERT INTO device_replay (device_id, epoch, max_counter, bitmap_blob, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (device_id, epoch, counter, bytes(initial_bitmap), now_str))
            return True

        max_counter = row["max_counter"]
        bitmap = bytearray(row["bitmap_blob"])

        if counter == max_counter:
            # Duplicate of current max
            return False

        if counter > max_counter:
            delta = counter - max_counter
            _shift_bitmap_left(bitmap, delta)
            _set_bit(bitmap, 0)
            cursor.execute("""
                UPDATE device_replay
                SET max_counter = ?, bitmap_blob = ?, updated_at = ?
                WHERE device_id = ? AND epoch = ?
            """, (counter, bytes(bitmap), now_str, device_id, epoch))
            return True
        else:
            delta = max_counter - counter
            if delta >= SLIDING_BITMAP_BITS:
                # Outside sliding window
                return False
            if _get_bit(bitmap, delta):
                # Bit already set: duplicate packet
                return False
            # Valid out-of-order packet within sliding window
            _set_bit(bitmap, delta)
            cursor.execute("""
                UPDATE device_replay
                SET bitmap_blob = ?, updated_at = ?
                WHERE device_id = ? AND epoch = ?
            """, (bytes(bitmap), now_str, device_id, epoch))
            return True


def ingest_envelope(raw_bytes: bytes, client_ip: str = "127.0.0.1") -> Dict[str, Any]:
    """
    Executes the strict ingest order:
    1. Length check -> BAD_LENGTH
    2. Version check -> BAD_VERSION
    3. Expiry check -> EXPIRED
    4. Device registry & epoch check -> UNKNOWN_DEVICE, REVOKED, UNKNOWN_EPOCH
    5. Replay check -> REPLAY
    6. Signature check -> BAD_SIGNATURE
    7. Store ciphertext in medical.db
    8. Audit log -> ENVELOPE_INGESTED
    """
    # 1. Length check
    total_len = len(raw_bytes)
    if total_len < MIN_ENVELOPE_LEN or total_len > MAX_ENVELOPE_LEN:
        raise IngestNACK("BAD_LENGTH", f"Envelope size {total_len} bytes outside allowed range [{MIN_ENVELOPE_LEN}, {MAX_ENVELOPE_LEN}]")

    # Wire format specification:
    # AAD (26 bytes):
    #   [0:1]   version (1 byte)
    #   [1:9]   device_id (8 bytes ASCII padded)
    #   [9:13]  seq (4 bytes uint32 big endian)
    #   [13:17] epoch (4 bytes uint32 big endian)
    #   [17:18] priority (1 byte: 0=P0, 1=P1, 2=P2)
    #   [18:22] counter (4 bytes uint32 big endian)
    #   [22:26] timestamp_sec (4 bytes uint32 big endian unix timestamp)
    # Ciphertext + Tag:
    #   [26 : total_len - 64]
    # Signature (64 bytes raw ECDSA):
    #   [total_len - 64 : total_len]
    aad = raw_bytes[:26]
    sig = raw_bytes[-64:]
    ciphertext_and_tag = raw_bytes[26:-64]
    if len(ciphertext_and_tag) < 16:
        raise IngestNACK("BAD_LENGTH", "Ciphertext must contain at least 16-byte GCM tag")

    ciphertext = ciphertext_and_tag[:-16]
    tag = ciphertext_and_tag[-16:]

    # Parse AAD fields
    version = aad[0]
    device_id = aad[1:9].decode('ascii', errors='replace').strip('\x00 ')
    seq = int.from_bytes(aad[9:13], byteorder='big')
    epoch = int.from_bytes(aad[13:17], byteorder='big')
    priority = aad[17]
    counter = int.from_bytes(aad[18:22], byteorder='big')
    pkt_time = int.from_bytes(aad[22:26], byteorder='big')

    # 2. Version check
    if version != PROTOCOL_VERSION:
        raise IngestNACK("BAD_VERSION", f"Protocol version {version} not supported (expected {PROTOCOL_VERSION})")

    # 3. Expiry check (TTL / clock skew)
    now_ts = int(time.time())
    if abs(now_ts - pkt_time) > CLOCK_SKEW_MAX_SEC:
        raise IngestNACK("EXPIRED", f"Packet timestamp {pkt_time} deviates > {CLOCK_SKEW_MAX_SEC}s from hub time {now_ts}")

    # 4. Device and Epoch verification
    infra_conn = get_infrastructure_db()
    cursor = infra_conn.cursor()
    cursor.execute("SELECT public_key_hex, is_revoked, current_epoch FROM devices WHERE device_id = ?", (device_id,))
    dev_row = cursor.fetchone()
    infra_conn.close()

    if dev_row is None:
        raise IngestNACK("UNKNOWN_DEVICE", f"Device ID '{device_id}' is not registered in hub")

    if dev_row["is_revoked"] == 1:
        raise IngestNACK("REVOKED", f"Device ID '{device_id}' has been revoked")

    if epoch < dev_row["current_epoch"]:
        raise IngestNACK("UNKNOWN_EPOCH", f"Epoch {epoch} is obsolete (current epoch {dev_row['current_epoch']})")

    dev_pubkey_bytes = bytes.fromhex(dev_row["public_key_hex"])

    # 5. Replay Protection (2048-bit sliding bitmap)
    is_fresh = check_and_update_replay(device_id, epoch, counter)
    if not is_fresh:
        raise IngestNACK("REPLAY", f"Duplicate counter {counter} detected for device '{device_id}' epoch {epoch}")

    # 6. Signature check (over AAD || ciphertext_and_tag)
    signed_data = aad + ciphertext_and_tag
    is_valid_sig = verify_p256_signature(dev_pubkey_bytes, signed_data, sig)
    if not is_valid_sig:
        raise IngestNACK("BAD_SIGNATURE", f"ECDSA P-256 signature verification failed for device '{device_id}'")

    # 7. Store ciphertext in medical.db
    try:
        row_id = store_envelope(
            device_id=device_id,
            seq=seq,
            epoch=epoch,
            priority=priority,
            counter=counter,
            ciphertext=ciphertext,
            tag=tag,
            sig=sig,
            aad=aad
        )
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise IngestNACK("REPLAY", f"Database duplicate constraint: {device_id} epoch {epoch} counter {counter}")
        raise e

    # 8. Audit event
    hub_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
    append_audit_event("ENVELOPE_INGESTED", {
        "device_id": device_id,
        "seq": seq,
        "epoch": epoch,
        "priority": priority,
        "counter": counter,
        "client_ip": client_ip,
        "stored_row_id": row_id
    })

    # 9. Return trusted-time ACK
    return {
        "status": "ACK",
        "hub_time": hub_time,
        "clock_unset": False,
        "seq": seq,
        "device_id": device_id,
        "priority": priority
    }
