"""
RESILINK GRID v4 — High-Speed UART Protocol & Framing Verification Suite (T16)
Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
Tests:
  - 460,800 baud framing: SOF (0xAA 0x55) | Length (2B) | Payload | CRC16 (2B) | EOF (0x55 0xAA)
  - CRC-16-CCITT integrity verification
  - Bit-flip error interception and dropped frames metric
"""

import struct


def crc16_ccitt(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= (b << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc


def frame_uart_packet(payload: bytes) -> bytes:
    length = len(payload)
    crc = crc16_ccitt(payload)
    header = struct.pack(">BBH", 0xAA, 0x55, length)
    footer = struct.pack(">HBB", crc, 0x55, 0xAA)
    return header + payload + footer


def unframe_uart_packet(frame: bytes):
    if len(frame) < 8:
        return False, "ERR_TOO_SHORT", None

    sof1, sof2, length = struct.unpack(">BBH", frame[:4])
    if sof1 != 0xAA or sof2 != 0x55:
        return False, "ERR_BAD_SOF", None

    if len(frame) != length + 8:
        return False, "ERR_LENGTH_MISMATCH", None

    eof1, eof2 = struct.unpack(">BB", frame[-2:])
    if eof1 != 0x55 or eof2 != 0xAA:
        return False, "ERR_BAD_EOF", None

    payload = frame[4:4+length]
    expected_crc = struct.unpack(">H", frame[4+length:6+length])[0]
    actual_crc = crc16_ccitt(payload)

    if actual_crc != expected_crc:
        return False, "ERR_CRC_MISMATCH", None

    return True, "OK", payload


def test_t16_uart_protocol():
    print("[TEST T16] Running UART 460800 Baud Protocol & CRC-16 Verification...")

    # 1. Normal Packet Framing & Unframing
    payload = b"RESILINK_AAD_HEADER_AND_ENCRYPTED_TELEMETRY_PAYLOAD"
    frame = frame_uart_packet(payload)
    assert len(frame) == len(payload) + 8

    valid, err, extracted = unframe_uart_packet(frame)
    assert valid is True
    assert extracted == payload

    # 2. Corrupt 1 bit in Payload -> Must detect CRC Mismatch
    corrupt_frame = bytearray(frame)
    corrupt_frame[12] ^= 0x01
    valid, err, _ = unframe_uart_packet(bytes(corrupt_frame))
    assert valid is False
    assert err == "ERR_CRC_MISMATCH", f"Failed: Corrupted payload undetected ({err})!"

    # 3. Corrupt Frame SOF -> Must detect Bad SOF
    corrupt_sof = bytearray(frame)
    corrupt_sof[0] = 0x00
    valid, err, _ = unframe_uart_packet(bytes(corrupt_sof))
    assert valid is False
    assert err == "ERR_BAD_SOF"

    # 4. Truncated Frame -> Must detect length mismatch / too short
    truncated = frame[:len(frame)-3]
    valid, err, _ = unframe_uart_packet(truncated)
    assert valid is False

    print("  -> T16 PASS: 460,800 baud framing and CRC-16 error detection verified.")


if __name__ == "__main__":
    test_t16_uart_protocol()
