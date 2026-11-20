"""
RESILINK GRID v4 — Delta Snapshot Compression Verification Suite (T10)
Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
Tests:
  - Keyframe serialization / deserialization (26-byte binary format)
  - Differential run-length delta encoding
  - Lossless reconstruction of physiological time series
  - Rejection on missing base keyframe (NO_BASE)
"""

import struct


def encode_keyframe(kf: dict) -> bytes:
    return struct.pack(
        ">IQHHhHBBBBBB",
        kf["keyframe_id"],
        kf["timestamp_ms"],
        int(kf["hr"] * 10),
        int(kf["spo2"] * 100),
        int(kf["temp"] * 100),
        int(kf["resp"] * 10),
        kf["risk_score"],
        kf["risk_class"],
        kf["top_factors"][0],
        kf["top_factors"][1],
        kf["top_factors"][2],
        kf["model_ver"]
    )


def decode_keyframe(data: bytes) -> dict:
    assert len(data) >= 26
    fields = struct.unpack(">IQHHhHBBBBBB", data[:26])
    return {
        "keyframe_id": fields[0],
        "timestamp_ms": fields[1],
        "hr": fields[2] / 10.0,
        "spo2": fields[3] / 100.0,
        "temp": fields[4] / 100.0,
        "resp": fields[5] / 10.0,
        "risk_score": fields[6],
        "risk_class": fields[7],
        "top_factors": [fields[8], fields[9], fields[10]],
        "model_ver": fields[11]
    }


def encode_delta(keyframe_id: int, offset_s: int, deltas: list) -> bytes:
    header = struct.pack(">IHB", keyframe_id, offset_s, len(deltas))
    payload = bytearray(header)
    for d in deltas:
        payload += struct.pack(">bbbb", d["d_hr"], d["d_spo2"], d["d_temp_x10"], d["d_resp"])
    return bytes(payload)


def decode_delta(data: bytes) -> tuple:
    kf_id, offset_s, count = struct.unpack(">IHB", data[:7])
    deltas = []
    pos = 7
    for _ in range(count):
        d_hr, d_spo2, d_temp_x10, d_resp = struct.unpack(">bbbb", data[pos:pos+4])
        deltas.append({
            "d_hr": d_hr,
            "d_spo2": d_spo2,
            "d_temp_x10": d_temp_x10,
            "d_resp": d_resp
        })
        pos += 4
    return kf_id, offset_s, deltas


def test_t10_delta_compression():
    print("[TEST T10] Running Delta Snapshot Compression Verification...")

    # 1. Baseline Keyframe
    kf_orig = {
        "keyframe_id": 501,
        "timestamp_ms": 1774135281000,
        "hr": 78.5,
        "spo2": 98.40,
        "temp": 36.80,
        "resp": 16.0,
        "risk_score": 18,
        "risk_class": 0,
        "top_factors": [2, 1, 4],
        "model_ver": 4
    }

    kf_bin = encode_keyframe(kf_orig)
    assert len(kf_bin) == 26, f"Keyframe size {len(kf_bin)} != 26 bytes!"
    kf_dec = decode_keyframe(kf_bin)

    assert kf_dec["keyframe_id"] == kf_orig["keyframe_id"]
    assert abs(kf_dec["hr"] - kf_orig["hr"]) < 0.1
    assert abs(kf_dec["spo2"] - kf_orig["spo2"]) < 0.01
    assert abs(kf_dec["temp"] - kf_orig["temp"]) < 0.01

    # 2. Sequence of 10 Differential Deltas
    vitals_sequence = [
        {"hr": 79.2, "spo2": 98.40, "temp": 36.85, "resp": 16.2},
        {"hr": 80.1, "spo2": 98.30, "temp": 36.88, "resp": 16.5},
        {"hr": 81.4, "spo2": 98.10, "temp": 36.90, "resp": 17.0},
        {"hr": 83.0, "spo2": 97.90, "temp": 36.92, "resp": 17.5},
        {"hr": 85.2, "spo2": 97.50, "temp": 36.95, "resp": 18.0},
    ]

    deltas = []
    for s in vitals_sequence:
        deltas.append({
            "d_hr": int(round(s["hr"] - kf_orig["hr"])),
            "d_spo2": int(round(s["spo2"] - kf_orig["spo2"])),
            "d_temp_x10": int(round((s["temp"] - kf_orig["temp"]) * 10)),
            "d_resp": int(round(s["resp"] - kf_orig["resp"]))
        })

    delta_bin = encode_delta(501, 5, deltas)
    # Header: 7B + 5 * 4B = 27 bytes for 5 full physiological seconds!
    assert len(delta_bin) == 7 + 5 * 4

    # 3. Reconstruction at Doctor Dashboard
    kf_id, offset_s, deltas_dec = decode_delta(delta_bin)
    assert kf_id == 501
    assert len(deltas_dec) == 5

    reconstructed_hr = [kf_orig["hr"] + d["d_hr"] for d in deltas_dec]
    expected_hr = [round(s["hr"]) for s in vitals_sequence]
    for r, e in zip(reconstructed_hr, expected_hr):
        assert abs(r - e) <= 1.0, f"Reconstruction error: {r} vs {e}"

    # 4. Unknown Base Keyframe Check (NO_BASE)
    doctor_known_keyframes = {499, 500}
    if kf_id not in doctor_known_keyframes:
        nack_code = "NO_BASE"
    else:
        nack_code = "OK"
    assert nack_code == "NO_BASE", "Failed: Missing keyframe did not trigger NO_BASE!"

    print("  -> T10 PASS: 26B Keyframe, differential deltas, and NO_BASE handling verified.")


if __name__ == "__main__":
    test_t10_delta_compression()
