# RESILINK GRID — Hub Backend (`/hub`)

**Owner:** Harshith (Hub backend, Emergency engine, Groot)  
**Principle:** *AI predicts, rules decide, logs prove.*  
**Notice:** Research prototype, not a medical device. All patient data is simulated. All risk scores and Groot answers display: `Decision support, not a diagnosis`.

---

## 1. Architectural Architecture & Security Boundaries

The Hub is built with **FastAPI**, **Python 3.12**, and **4 Isolated SQLite Databases running in Write-Ahead Logging (WAL) mode**.

```
Sensors (MAX30102) -> NXP MCXN236 -> Radios (ESP32/nRF24) -> Hub (FastAPI) -> Doctor Browser
                                                                 │
                                    ┌────────────────────────────┼───────────────────────────┐
                                    ▼                            ▼                           ▼
                             [medical.db]                [operational.db]          [infrastructure.db]
                             Ciphertext ONLY             Emergencies, Outbox       Facilities, Registry
                                                                 │
                                                                 ▼
                                                            [audit.db]
                                                        HMAC-SHA256 Hash Chain
```

### Security Invariants
1. **Zero Plaintext, Zero Keys:** The Hub, ESP32 nodes, and relays **never** hold encryption keys or decrypted patient vitals. All clinical data remains ciphertext (`medical.db`).
2. **Schema Isolation:** Schemas `medical`, `operational`, `infrastructure`, and `audit` reside in separate SQLite database files with WAL mode enabled and **never join**.
3. **Strict Ingest Order:** Length -> Version -> Expiry -> Replay -> Signature -> Store.
4. **Offline Deterministic Decisions:** F8 Emergency allocation and F4 Triage run deterministically offline with zero external LLM dependencies.
5. **Groot Isolation:** Groot operates locally over operational aggregates and documentation. Groot never receives ciphertext, plaintext, or keys, cannot mutate routing or alerts, and logs `GROOT_QUERY`.

---

## 2. Ingest Pipeline & Wire Format

### Wire Specification
```
[ AAD (26 Bytes) ] [ Ciphertext + 16B GCM Tag ] [ 64-Byte Raw ECDSA P-256 Sig ]
```
- **AAD Header (26 Bytes):**
  - `[0:1]` Protocol version (`0x01`)
  - `[1:9]` Device ID (8 bytes ASCII, e.g. `WARD_N01`)
  - `[9:13]` Sequence number (uint32 big-endian)
  - `[13:17]` Epoch ID (uint32 big-endian)
  - `[17:18]` Priority class (`0x00`=P0, `0x01`=P1, `0x02`=P2)
  - `[18:22]` Sequence counter (uint32 big-endian)
  - `[22:26]` Unix timestamp in seconds (uint32 big-endian)
- **Signature:** 64-byte raw `r || s` ECDSA P-256 signature over `AAD || Ciphertext || Tag`.

### Ingest Verification Sequence & NACK Reasons
1. `BAD_LENGTH`: Envelope size outside `[106, 1024]` bytes or truncated tag.
2. `BAD_VERSION`: Protocol version != 1.
3. `EXPIRED`: Packet timestamp deviates > 300 seconds from Hub trusted time.
4. `UNKNOWN_DEVICE` / `REVOKED` / `UNKNOWN_EPOCH`: Device unknown, flagged `is_revoked == 1`, or epoch obsolete.
5. `REPLAY`: Sequence counter detected in 2048-bit sliding bitmap or `UNIQUE(device_id, epoch, counter)` constraint.
6. `BAD_SIGNATURE`: ECDSA P-256 verification failure against device public key.
7. `store`: Saved to `medical.db -> envelopes`.
8. `ACK`: Returns Hub trusted UTC timestamp, `clock_unset: false`, and sequence number.

---

## 3. F8 Deterministic Offline Emergency Engine

Triggered via `POST /v1/emergency/trigger` (signed by NXP edge brain).

### Allocation Algorithm
1. **Ambulance Selection:**
   - Filters all ambulances where `status == 'FREE'`.
   - Computes Haversine great-circle distance from patient GPS coordinates.
   - Calculates ETA assuming 40 km/h urban traffic speed:
     $$\text{ETA (min)} = \max\left(1.0, \frac{\text{distance\_km}}{40.0} \times 60.0\right)$$
   - Allocates the nearest unit and transitions status to `BUSY`.
2. **Hospital Allocation (Weighted Multi-Criteria Scoring):**
   - Filters hospitals matching required clinical capabilities (e.g., `ICU`, `O2`, `VENTILATOR`).
   - Calculates data age penalty for stale telemetry:
     $$\text{stale\_penalty} = \min\left(50.0, (\text{age\_min} - 15.0) \times 2.0\right) \quad \text{if age} > 15 \text{ min}$$
   - Weighted score formula (lower score is superior):
     $$\text{Score} = (d_{\text{km}} \times 1.5) - (\text{beds\_free} \times 0.1) - (\text{icu\_free} \times 0.5) - (\text{o2\_bonus}) + \text{stale\_penalty}$$
   - Cascades automatically to next-best candidate if primary is full or stale.
3. **Multi-Path Dispatch Outbox:**
   - Enqueues dispatch simultaneously across:
     - `LAN_BROADCAST`: WebSocket / local broadcast notification
     - `MESH_NRF24`: 24-byte compact payload to ambulance mesh node
     - `SMS_SIM800L`: Cellular AT-command string for GSM modem
     - `ONLINE_SYNC`: Persistent outbox queue with exponential backoff ($2^{\text{retry}}$ seconds).
4. **Idempotency & State Machine:**
   - Deduplicated by `(device_id, counter)`.
   - State progression: `REQUESTED` -> `ASSIGNED` -> `EN_ROUTE` -> `ARRIVED`.
   - Operator human override supported via `POST /v1/emergency/{id}/override`.

---

## 4. Published Contracts for Teammates

### Contract for Harshavardhan (Doctor Client Fine Ranking Formula)
Hub exposes unencrypted metadata ranking only (ordered by SOS, coarse class P0/P1/P2, arrival time).  
After client-side WebCrypto decryption, the Doctor Dashboard executes fine prioritization using:

```typescript
// Contract Formula published by Harshith:
const priorityScore = (clinicalScore * timeSensitivity) / Math.max(1.0, etaMinutes);

// Parameters:
// - clinicalScore (0-100): Decrypted TinyML risk score.
// - timeSensitivity weights:
//     * CRITICAL (P0): 10.0
//     * HIGH (P1):      5.0
//     * MED (P2):       2.0
//     * LOW (P2):       1.0
// - etaMinutes: Estimated ambulance arrival time from Hub Emergency Engine.
// Notice: SOS must remain pinned to top. Always display "Decision support, not a diagnosis".
```

---

## 5. Audit Hash Chain & Checkpoints

- **RFC 8785 Canonical JSON:** All event payloads are canonicalized (keys sorted, compact separators, UTF-8).
- **HMAC-SHA256:** Chain link formula:
  $$\text{Hash}_n = \text{HMAC-SHA256}\left(\text{Secret}, \text{Canonical}(\text{seq}_n, \text{prev\_hash}_n, \text{ts}_n, \text{type}_n, \text{payload}_n)\right)$$
- **Signed Checkpoints:** Created every 100 events / 10 minutes, signed by Hub ECDSA key, and duplicated to `data/checkpoints_mirror/checkpoints.jsonl`.
- **Tamper Detection:** `GET /v1/audit/verify` traverses from genesis (`0`*64) to tip, pinpointing the exact `first_bad_seq` upon any byte alteration.

---

## 6. Seeded Bangalore Facilities (F5–F7)

- **Hospitals:** Victoria Hospital (Trauma Center), Bowring & Lady Curzon, Manipal Hospital Old Airport Rd, Fortis Hospital Bannerghatta, St. John's Medical College, Apollo Hospital Jayanagar.
- **Pharmacies & Drug Expiry:** Includes Norepinephrine, Epinephrine, Snake Antivenom Polyvalent, Atropine, Remdesivir, Insulin. Near-expiry medications (<30 days) are flagged with `near_expiry: true`.
- **Blood Banks:** 8-group live inventory (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`).
- **Ambulances:** Real-time units `AMB-101` to `AMB-105` with live telemetry.

---

## 7. How to Run & Verify

### Quick Start (Docker-less)
```bash
# 1. Run Hub Backend (FastAPI on http://localhost:8000)
python run.py
# or: make run

# 2. Run Comprehensive Pytest Suite (All 26 Tests: T2-T9, T13, T15, T17, T18)
python -m pytest tests/ -v
# or: make test

# 3. Run Full End-to-End Demo Script
python scripts/demo_script.py
# or: make demo

# 4. Run Audit Tamper Proof Demo
python scripts/tamper_demo.py
# or: make tamper

# 5. Export OpenAPI Specification (saved to hub/openapi.json)
python scripts/export_openapi.py
# or: make openapi
```

---

## 8. Interactive Demo Script Walkthrough

To run the full demonstration presented to judges and teammates:

```bash
python scripts/demo_script.py
```

### Script Execution Flow:
1. **Schema Check:** Verifies WAL mode and clean isolation across `medical.db`, `operational.db`, `infrastructure.db`, and `audit.db`.
2. **Golden Path Ingest:** WARD_N01 submits encrypted P0 envelope. Hub validates signature, checks 2048-bit replay window, stores ciphertext in `medical.db`, and issues trusted-time ACK.
3. **Security Invariant Demonstration:**
   - Ingests envelope with flipped bit -> Rejected: `BAD_SIGNATURE`.
   - Ingests duplicate counter -> Rejected: `REPLAY`.
   - Ingests revoked device (`WARD_N03`) -> Rejected: `REVOKED`.
4. **F8 Offline Emergency Trigger:** P0 emergency triggers nearest FREE ambulance assignment (`AMB-102`, ETA 1.8 min) and optimal hospital allocation (`Victoria Hospital Trauma Center`). Multi-path dispatch enqueued to LAN, mesh, and SMS.
5. **Idempotency Proof:** Duplicate trigger re-sent -> Recognized idempotently without double-booking.
6. **F4 Triage Queue:** Inspects priority metadata queue (SOS pinned to top).
7. **Facility Intelligence:** Finds Bangalore hospitals and flags near-expiry medications (<30 days).
8. **Audit Chain Verification:** Confirms unbroken cryptographic hash chain.
9. **Groot Voice Advisory:** Queries transmission link state, returns response in ~1.0 ms with mandatory clinical disclaimer.
