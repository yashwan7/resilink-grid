# RESILINK GRID v4 — Canonical Packet & Wire Specification
**Author:** Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)  
**Target Consumers:** Harshith (Hub Backend), Harshavardhan (Doctor & Patient Web/PWA)  
**Protocol Version:** `0x04`  
**Security Architecture:** Zero-Trust, End-to-End Encrypted (E2EE), Offline-First

---

## 1. Architectural Principles
1. **Plaintext Boundary:** The Hub, ESP32 Radio Nodes, and intermediate MESH Relays **never hold cryptographic keys or medical plaintext**.
2. **Cleartext Exception (Audited & Consented):** The only clinical-related field exposed on the wire in clear is the 2-bit coarse priority class (`P0`, `P1`, `P2`) in the envelope header for network Quality of Service (QoS). Under emergency SOS override, a signed, consented, minimal `EmergencyTrigger` JSON payload (pseudonym, GPS coordinates, timestamp, required capability) is emitted to enable offline dispatch without exposing historical telemetry or diagnoses.
3. **Multi-Recipient Envelope:** Data is encrypted once with a per-epoch Data Encryption Key (DEK). The DEK is then wrapped individually for each authorized recipient (attending doctors AND the patient's own mobile device) using ECDH-derived key-wrapping keys.

---

## 2. Cryptographic Primitives & Parameters
* All multi-byte integers are serialized in **Big-Endian (Network Byte Order)**.

| Component | Standard / Algorithm | Parameters / Curve | Representation / Encoding |
|---|---|---|---|
| **Asymmetric Signature** | ECDSA | SECP256R1 (NIST P-256) + SHA-256 | 64-byte raw IEEE P1363 (`r \|\| s`), where `r` and `s` are 32 bytes each |
| **Key Agreement** | ECDH | SECP256R1 (NIST P-256) | Uncompressed (65B: `0x04 \|\| X \|\| Y`) or Compressed (33B: `0x02/0x03 \|\| X`) |
| **Key Derivation (KDF)** | HKDF | RFC 5869 with HMAC-SHA256 | Hash: SHA-256, Salt: 32 bytes (or zeros if empty), Info string defined below |
| **Symmetric Cipher** | AES-GCM | 256-bit Key (`DEK`), 12-byte IV/Nonce | 16-byte Authentication Tag (`tag`) appended to ciphertext |
| **Digest / Checksum** | SHA-256 / CRC-16-CCITT | Standard polynomial (`0x1021`) | Audit chains: SHA-256; UART framing: CRC-16 |

### 2.1 HKDF-SHA256 Derivation Formula
To wrap the DEK for Recipient $R_i$:
1. Edge node generates ephemeral P-256 keypair: $(sk_{eph}, pk_{eph})$.
2. Compute shared secret $Z = \text{ECDH}(sk_{eph}, pk_{R_i})$.
3. Extract and Expand Key Wrapping Key ($KWK$):
   $$\text{PRK} = \text{HKDF-Extract}(\text{salt}=\text{ephemeral\_pubkey}[1:33], \text{IKM}=Z)$$
   $$\text{info} = \text{"RESILINK-v3"} \,\|\, \text{deviceID (4B)} \,\|\, \text{epochID (4B)} \,\|\, \text{msgID (4B)}$$
   $$KWK = \text{HKDF-Expand}(\text{PRK}, \text{info}, \text{length}=32)$$
4. Wrap DEK:
   $$\text{wrapped\_dek} = \text{AES-256-GCM-Encrypt}(K=KWK, IV=\text{nonce}_{wrap}, P=\text{DEK}, AAD=\text{recipient\_id})$$
   *(Wrapped DEK record = 12B IV + 32B Ciphertext + 16B Tag = 60 bytes)*

### 2.2 AES-GCM Nonce Construction (12 Bytes)
$$\text{Nonce} = \text{node\_id (4 bytes)} \,\|\, \text{epoch\_id (4 bytes)} \,\|\, \text{counter (4 bytes)}$$
* **Rule:** `epoch_id` increments monotonically on every hardware reboot (persisted in flash). `counter` increments strictly monotonically for every encrypted record. Nonce re-use is mathematically impossible.

---

## 3. Wire Envelope Specification

### 3.1 Authenticated Additional Data (AAD) Header (26 Bytes Fixed)
Every envelope starts with a fixed 26-byte AAD header that is authenticated by the AES-GCM tag and verified by ECDSA:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Magic (0x5247)       | Protocol (0x04) | MsgType (1B)|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Node ID (32-bit)                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Epoch ID (32-bit)                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Sequence (32-bit)                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Counter (32-bit)                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Priority (1B) | Flags (1B)    |      Payload Length (16-bit)  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

#### Field Definitions:
- `Magic` (2 Bytes): Fixed constant `0x5247` ("RG" in ASCII).
- `Protocol Version` (1 Byte): `0x04`.
- `MsgType` (1 Byte):
  - `0x01`: `HEARTBEAT_TELEMETRY` (Coarse risk badge + status in clear header; payload empty or encrypted minimal diagnostics)
  - `0x02`: `SNAPSHOT_KEYFRAME` (Full uncompressed baseline physiological state)
  - `0x03`: `SNAPSHOT_DELTA` (Delta-encoded physiological state against keyframe)
  - `0x04`: `SNAPSHOT_REQUEST` (Doctor-signed request to pull keyframe + deltas)
  - `0x05`: `EMERGENCY_TRIGGER` (Consented plaintext emergency dispatch envelope)
  - `0x06`: `ACK_ENVELOPE` (Hub / Peer acknowledgement with trusted time)
  - `0x07`: `NACK_ENVELOPE` (Rejection envelope with machine error code)
- `Node ID` (4 Bytes): Globally unique 32-bit identifier for the transmitting NXP unit.
- `Epoch ID` (4 Bytes): Monotonically increasing boot epoch.
- `Sequence` (4 Bytes): Node transmission sequence number.
- `Counter` (4 Bytes): Nonce counter matching the GCM IV.
- `Priority` (1 Byte):
  - `0x00`: `P0` (Critical / SOS / Cardiac arrest / Severe Hypoxia)
  - `0x01`: `P1` (High / Tachycardia / Sepsis warning)
  - `0x02`: `P2` (Normal / Routine telemetry)
- `Flags` (1 Byte):
  - Bit 0 (`0x01`): `SIMULATED_DATA` (1 if simulated, 0 if physical MAX30102)
  - Bit 1 (`0x02`): `CONSENT_GRANTED` (1 if patient granted emergency broadcast)
  - Bit 2 (`0x04`): `DISAGREEMENT_FLAG` (1 if TinyML and NEWS2 rule disagree)
  - Bit 3 (`0x08`): `BATTERY_LOW` (1 if battery < 15%)
  - Bits 4-7: Reserved (Must be 0)
- `Payload Length` (2 Bytes): Big-endian length of the encrypted ciphertext payload.

---

### 3.2 Full Encrypted Wire Envelope Layout
```
+-------------------------------------------------------------+
| AAD Header (26 Bytes fixed)                                 |
+-------------------------------------------------------------+
| Recipient Count (1 Byte: N)                                 |
+-------------------------------------------------------------+
| Recipient Wraps Block [1 .. N]:                             |
|   - Recipient ID (4 Bytes)                                  |
|   - Ephemeral Public Key (33 Bytes compressed SEC1)         |
|   - Wrap IV (12 Bytes)                                      |
|   - Wrapped DEK Ciphertext (32 Bytes)                       |
|   - Wrap Auth Tag (16 Bytes)                                |
|   (Total per recipient = 4 + 33 + 12 + 32 + 16 = 97 Bytes)  |
+-------------------------------------------------------------+
| Ciphertext Payload (Variable: Length specified in AAD)      |
+-------------------------------------------------------------+
| AES-GCM Authentication Tag (16 Bytes)                       |
+-------------------------------------------------------------+
| ECDSA P-256 Raw Signature (64 Bytes: r[32] || s[32])        |
+-------------------------------------------------------------+
```

* **ECDSA Signature Scope:** Signed over `AAD || Recipient_Wraps_Block || Ciphertext || GCM_Tag`. Any alteration to header, wrapped keys, ciphertext, or tag will cause ECDSA verification to fail before decryption is even attempted.

---

## 4. Payload Schemas (Inside the Decrypted Ciphertext)

### 4.1 Physiological Sample (Internal 1 Hz Stream & Local Web View)
```json
{
  "ts": 1774135281,
  "hr": 78,
  "spo2": 98.4,
  "temp": 36.8,
  "resp": 16,
  "motion": 0.04,
  "sim": false
}
```

### 4.2 Keyframe Payload (`MsgType = 0x02`)
Baseline absolute record emitted every $N$ samples (default $N = 30$ seconds, or triggered upon doctor request / `NO_BASE` NACK):
```
Offset  Size  Type       Field
0       4     uint32_t   keyframe_id
4       8     uint64_t   timestamp_epoch_ms
12      2     uint16_t   hr_bpm (x10, e.g. 785 = 78.5 bpm)
14      2     uint16_t   spo2_pct (x100, e.g. 9840 = 98.40%)
16      2     int16_t    temp_c (x100, e.g. 3680 = 36.80 C)
18      2     uint16_t   resp_rate (x10, e.g. 160 = 16.0 rpm)
20      1     uint8_t    risk_score (0 - 100)
21      1     uint8_t    risk_class (0=LOW, 1=MED, 2=HIGH, 3=CRITICAL)
22      1     uint8_t    top_factor_1 (Enum: HR, SPO2, TEMP, RESP)
23      1     uint8_t    top_factor_2
24      1     uint8_t    top_factor_3
25      1     uint8_t    model_version (e.g. 4)
```

### 4.3 Delta Payload (`MsgType = 0x03`)
Compact differential encoding referencing `keyframe_id`. Multiple 1-second intervals are packed into one delta payload:
```
Offset  Size  Type       Field
0       4     uint32_t   ref_keyframe_id
4       2     uint16_t   delta_seq_offset (seconds since keyframe)
6       1     uint8_t    sample_count (K)
7       K*4   bytes      Delta Samples:
                         - d_hr:   int8_t  (-128 to +127 relative to prev)
                         - d_spo2: int8_t  (-128 to +127 relative to prev)
                         - d_temp: int8_t  (in 0.1 C increments)
                         - d_resp: int8_t  (-128 to +127)
```

---

## 5. Emergency Trigger Specification (`MsgType = 0x05`)
When the edge AI classifies vitals as `CRITICAL` (P0) and `patient_consent == true`, the device broadcasts an emergency trigger.

### Plaintext JSON Payload (Over-The-Wire)
```json
{
  "pseudonym": "PATIENT-MCX-9942",
  "device_id": "MCXN236-01",
  "lat": 12.971598,
  "lon": 77.594566,
  "gps_fix": true,
  "fix_age_s": 2,
  "ts": 1774135310,
  "class": "P0",
  "score": 94,
  "need": ["ICU", "O2"]
}
```
* **Security & Privacy Note:** Signed with device ECDSA key. The signature is carried in the standard envelope signature field. No diagnostics, medical history, or raw vitals are exposed.

---

## 6. Doctor Snapshot Request (`MsgType = 0x04`)
Sent by an authorized doctor client to retrieve full keyframe + deltas:
```json
{
  "doctor_id": "DOC-CARDIO-44",
  "target_device_id": "MCXN236-01",
  "request_nonce": 9823411,
  "since_timestamp": 1774135200,
  "sig": "<64-byte raw ECDSA signature of doctor>"
}
```

---

## 7. Rejection Codes (NACK)
When the Hub or Device rejects a packet, it returns `MsgType = 0x07` with a 1-byte status code:
- `0x01`: `BAD_LENGTH` — Declared length does not match wire size.
- `0x02`: `BAD_VERSION` — Protocol version != `0x04`.
- `0x03`: `EXPIRED` — Packet timestamp > 300 seconds skewed from hub trusted time.
- `0x04`: `REPLAY` — Duplicate `(node_id, epoch, counter)` or counter regression inside sliding window.
- `0x05`: `BAD_SIGNATURE` — ECDSA signature validation failed.
- `0x06`: `UNKNOWN_DEVICE` — Node ID not present in registered device whitelist.
- `0x07`: `REVOKED` — Device or Doctor credential has been revoked.
- `0x08`: `UNKNOWN_EPOCH` — Node epoch is older than registered active epoch.
- `0x09`: `NO_BASE` — Delta received referencing unknown `keyframe_id`; triggers keyframe re-send.
