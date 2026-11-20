# RESILINK GRID — API Integration Guide for Teammates
# Hub: http://localhost:8000 | FastAPI Docs: http://localhost:8000/docs

---

## 🔵 For HARSHAVARDHAN (Web / Doctor Dashboard)

### Base URL
```
http://<hub-ip>:8000
```

---

### 1. Get Triage Queue (Metadata Only — no ciphertext)
```http
GET /v1/triage/queue
```
**Response:**
```json
{
  "count": 2,
  "queue": [
    {
      "device_id": "WARD_N01",
      "priority": "P0",
      "is_sos": true,
      "coarse_class": "CRITICAL",
      "arrived_at": "2026-11-21T...",
      "ciphertext_bytes": 30,
      "disclaimer": "Decision support, not a diagnosis"
    }
  ]
}
```
> Hub sorts: SOS (P0) first, then P1, then FIFO. **Fine ranking runs client-side after WebCrypto decryption.**

---

### 2. Get Fine-Ranking Formula Contract (for your dashboard JS)
```http
GET /v1/triage/formula
```
**Returns the exact formula from Harshith:**
```json
{
  "formula": "priority_score = (clinical_score * time_sensitivity) / Math.max(1.0, eta_minutes)",
  "weights": { "CRITICAL": 10.0, "HIGH": 5.0, "MED": 2.0, "LOW": 1.0 },
  "disclaimer_required": "Decision support, not a diagnosis"
}
```

---

### 3. Request Encrypted Snapshot (Doctor Signs Request)
```http
POST /v1/snapshots/request
Content-Type: application/json

{
  "doctor_id": "DOC_001",
  "device_id": "WARD_N01",
  "timestamp": 1795200000,
  "requested_keyframe_id": "latest",
  "signature_hex": "<64-byte raw ECDSA P-256 sig hex over 'SNAPSHOT_REQ:DOC_001:WARD_N01:1795200000:latest'>"
}
```
**Response on success:**
```json
{ "status": "ACK", "snapshot_id": "snap-...", "ciphertext_bytes": 128 }
```
**Response on NO_BASE (request full keyframe):**
```json
{ "status": "NACK", "code": "NO_BASE", "action": "REQUEST_KEYFRAME" }
```

---

### 4. Start Consultation Session (WebRTC Signalling / Offline Queue)
```http
POST /v1/consult/session
Content-Type: application/json

{
  "patient_pseudonym": "PATIENT-ALPHA-77",
  "doctor_id": "DOC_001",
  "signaling_data": "<SDP offer or null for offline queue>"
}
```
**Response:**
```json
{ "status": "SUCCESS", "session_id": "consult-abc123" }
```

---

### 5. Hospitals / Pharmacies / Blood Banks / Ambulances (Radius Search)
```http
GET /v1/facilities/hospitals?lat=12.9716&lon=77.5946&radius_km=10
GET /v1/facilities/pharmacies?lat=12.9716&lon=77.5946&radius_km=10
GET /v1/facilities/bloodbanks?lat=12.9716&lon=77.5946&radius_km=10
GET /v1/facilities/ambulances?lat=12.9716&lon=77.5946&status=FREE
```
**Drug near-expiry flag in pharmacy response:**
```json
{ "name": "Norepinephrine", "near_expiry": true, "days_until_expiry": 20 }
```

---

### 6. Audit Hash Chain Verification (For compliance/audit panel)
```http
GET /v1/audit/verify
```
**Response (clean):** `{ "valid": true, "total_events": 42 }`  
**Response (tampered):** `{ "valid": false, "first_bad_seq": 7, "reason": "Cryptographic tamper detected..." }`

---

### 7. Groot Chat (AI Advisory, local, no plaintext)
```http
POST /v1/groot/query
Content-Type: application/json

{ "query": "What active ambulances are free?", "source": "chat" }
```
**Response includes `wake_to_answer_latency_ms` and always appends disclaimer.**

---

---

## 🟡 For YASHWANTH (Firmware / NXP MCXN236 / ESP32 Node B)

### Full OpenAPI spec available at:
```
http://localhost:8000/openapi.json
# or locally: hub/openapi.json
```

---

### 1. Ingest Encrypted Envelope (Primary Endpoint — POST from Node B)

**Option A: Raw binary (octet-stream)**
```http
POST /v1/ingest/envelope
Content-Type: application/octet-stream
Body: <raw wire bytes>
```

**Option B: JSON hex**
```http
POST /v1/ingest/envelope
Content-Type: application/json

{ "envelope_hex": "<hex-encoded wire bytes>" }
```

**Wire Format (from NXP edge brain → ESP32 Node B → Hub):**
```
[ AAD 26 bytes ][ Ciphertext ][ 16-byte GCM Tag ][ 64-byte ECDSA Sig ]

AAD Layout (26 bytes):
  [0]       Protocol version: 0x01
  [1:9]     Device ID: 8 bytes ASCII padded (e.g. 'WARD_N01')
  [9:13]    Seq number: uint32 big-endian
  [13:17]   Epoch: uint32 big-endian
  [17]      Priority: 0x00=P0, 0x01=P1, 0x02=P2
  [18:22]   Counter: uint32 big-endian (monotonically increasing)
  [22:26]   Unix timestamp: uint32 big-endian

Signature: 64-byte raw ECDSA P-256 (r||s) over (AAD || Ciphertext || GCM Tag)
```

**ACK Response:**
```json
{
  "status": "ACK",
  "hub_time": "2026-11-21T...",
  "clock_unset": false,
  "seq": 1,
  "device_id": "WARD_N01",
  "priority": 0
}
```

**NACK Codes (use for retry/routing logic on Node B):**
| Code | Action |
|------|--------|
| `BAD_LENGTH` | Check wire serialiser |
| `BAD_VERSION` | Firmware version mismatch |
| `EXPIRED` | NTP sync required, Hub time in ACK |
| `UNKNOWN_DEVICE` | Device not registered in Hub |
| `REVOKED` | Device revoked — stop transmitting |
| `UNKNOWN_EPOCH` | Epoch rollback detected — advance epoch |
| `REPLAY` | Counter duplicate — advance counter |
| `BAD_SIGNATURE` | Key or serialisation error |

---

### 2. Emergency Trigger (SOS P0 from Node B — Signed by NXP)

```http
POST /v1/emergency/trigger
Content-Type: application/json

{
  "pseudonym": "PATIENT-ALPHA-77",
  "lat": 12.9716,
  "lon": 77.5946,
  "ts": 1795200000,
  "class": "P0",
  "need": ["ICU", "O2"],
  "device_id": "WARD_N01",
  "counter": 501,
  "signature_hex": "<64-byte ECDSA sig hex>"
}
```

**Signature target — canonical JSON (keys sorted, compact):**
```json
{"class":"P0","counter":501,"device_id":"WARD_N01","lat":12.9716,"lon":77.5946,"need":["ICU","O2"],"pseudonym":"PATIENT-ALPHA-77","ts":1795200000}
```

**Response:**
```json
{
  "status": "ASSIGNED",
  "emergency_id": "emg-...",
  "assigned_ambulance": { "id": "AMB-102", "eta_minutes": 1.8 },
  "allocated_hospital": { "id": "HOSP-01", "name": "Victoria Hospital", "phone": "+91-80-..." },
  "dispatch_channels": ["LAN_BROADCAST", "MESH_NRF24", "SMS_SIM800L", "ONLINE_SYNC"]
}
```

---

### 3. Device Registration (One-time setup — Hub Admin)
Devices must be registered with their ECDSA P-256 public key before ingest is accepted.  
Add directly to `infrastructure.db → devices` table or via a future `/v1/admin/devices` endpoint.

```sql
INSERT INTO devices (device_id, public_key_hex, is_revoked, current_epoch, created_at)
VALUES ('WARD_N04', '<65-byte uncompressed P-256 pubkey hex>', 0, 1, '2026-11-21T...');
```

---

### 4. Run Hub Locally for Integration Testing
```bash
cd hub
pip install -r requirements.txt
python run.py
# Server starts on http://0.0.0.0:8000
# Interactive docs: http://localhost:8000/docs
```

---

### Notes for Both Teammates
- **Hub NEVER decrypts.** All clinical data stays ciphertext on the Hub.
- **Schemas are isolated.** No cross-schema queries. The doctor client decrypts with WebCrypto non-extractable keys.
- **Groot never receives ciphertext/keys/plaintext.** It operates on aggregates only.
- **All risk/clinical output must display:** `"Decision support, not a diagnosis"`
