# RESILINK GRID v4 — Doctor Dashboard, Local Monitor & Tactical Map (`/web`)

**Owner:** Harshavardhan (Lead: Doctor Dashboard, Patient App, Tactical Maps, Consultation)  
**Branch:** `feature/harshavardhan-web-patient`  
**Stack:** React 18, TypeScript, Vite, WebCrypto API, Leaflet, Vitest

---

## 1. Quick Start & Run Steps

### Development Mode
```bash
# From repository root:
npm run dev:web

# Or from /web directory:
cd web
npm install
npm run dev
```
The Doctor Dashboard will start at `http://localhost:5173`.

### Production Build (for FastAPI Hub Static Serving)
```bash
npm run build --workspace=web
# Or inside /web:
npm run build
```
Production assets are generated in `web/dist/` for static file mounting by Harshith's FastAPI Hub backend (`FastAPI.mount("/static", StaticFiles(directory="web/dist"))`).

### Run Test Suite (WebCrypto, T14 Vectors, Ranking Math)
```bash
npm test --workspace=web
# Or inside /web:
npm test
```

---

## 2. Exact Triage Ranking Formula & Architecture (F4)

Hub only holds ciphertext and ranks incoming envelopes by 2-bit clear wire headers (`P0 > P1 > P2`), SOS flag, and arrival time. Once the doctor unlocks their private key and decrypts the batch via WebCrypto, fine priority ranking is computed on-client:

$$\text{Fine Priority Score} = \frac{\text{Severity Score} \times \text{Time Sensitivity Multiplier}}{\text{Time to Help (Ambulance ETA in minutes)}}$$

### Parameters:
1. **Severity Score (0–100):** Computed from decrypted TinyML edge risk index or clinical parameter thresholds.
2. **Time Sensitivity Multiplier:**
   - `CRITICAL (P0)`: **1.0** (Immediate life threat)
   - `HIGH (P1)`: **0.7** (Urgent physiological degradation)
   - `MED (P2)`: **0.4** (Monitoring required)
   - `LOW (P3)`: **0.2** (Stable baseline)
3. **Time to Help ($\text{ETA}_{\text{min}}$):** Real-time ETA in minutes provided by the emergency dispatch engine (clamped at minimum $1.0\text{ min}$ to prevent division by zero).
4. **SOS Override:** Any patient transmitting an active SOS trigger is pinned to the top of the priority board regardless of arrival sequence or numeric score.

### Regulatory Principle
> **"Decision support, not a diagnosis"**  
> Prominently displayed across all triage cards, patient views, and Groot answers. Research prototype, not a certified medical device.

---

## 3. Cryptographic Implementation & Key Handling

### WebCrypto Only & Non-Extractable Discipline
- Keys are generated using standard `window.crypto.subtle`.
- Doctor signing keypair (ECDSA P-256) and key-agreement keypair (ECDH P-256) are created with `extractable: false`.
- Private keys can never be exported or inspected in JavaScript runtime memory; they reside protected in browser IndexedDB.
- Unlocking is gated by PIN protection (default PIN: `1234`) and an optional simulated RFID Smart Card tap hook (`UID: 04:A1:B2:C3`).

### 33-Byte Compressed P-256 Point Decompression (`BigInt sqrt`, T14)
NXP FRDM-MCXN236 edge brain transmits public keys in compact 33-byte compressed format (`0x02` or `0x03` prefix + 32-byte $X$). Because WebCrypto only imports 65-byte uncompressed points (`0x04 || X || Y`), we implemented pure `BigInt` elliptic curve point decompression on secp256r1:

$$y^2 = x^3 - 3x + b \pmod p$$
$$\text{Since } p \equiv 3 \pmod 4, \quad y = (x^3 - 3x + b)^{(p+1)/4} \pmod p$$

Verified against NIST T14 test vectors in `src/crypto/p256.test.ts`.

### Epoch DEK Unwrapping
- **HKDF Info String:** `"RESILINK-v3"|deviceID|epochID|msgID`
- **GCM AAD Header (26 bytes):** `node_id (4B) | seq (4B) | epoch (4B) | priority (2B) | counter (8B) | reserved (4B)`
- **Nonce (12 bytes):** `node_id (4B) | epoch (4B) | counter (4B)`

---

## 4. Module Features Overview

| Feature | Route / Component | Description |
|---|---|---|
| **F1 Local Monitor** | `/local` / `LocalMonitor.tsx` | 1 Hz live vitals (HR, SpO2, Temp, Resp), 60s responsive SVG sparklines, TinyML risk badge, link state, GPS fix. Plaintext stays strictly on localhost; never sent to hub. |
| **F3 Delta Snapshots** | `TriageBoard.tsx` | Reconstructs timeline from keyframes + deltas. Doctor signs `SNAPSHOT_REQUEST` via ECDSA; Hub logs audit event as `"access request"` (honest wording). |
| **F4 Priority Board** | `/` / `TriageBoard.tsx` | Coarse ranking before decryption; fine formula ranking post-decryption. Color-coded (CRITICAL, HIGH, MED, LOW), SOS pinned, live re-sorting. |
| **F5-F7 Tactical Map** | `/map` / `FacilityMap.tsx` | Offline vector map viewer with layers for Hospitals (beds, ICU, O2, vents), Pharmacies (drug list, rare badges, expiry warnings), Blood Banks (8-group grid), Ambulances. Active emergency dispatch line with live ETA. |
| **F8 Emergency Outbox** | `AdminAuditView.tsx` | State machine `REQUESTED -> ASSIGNED -> EN_ROUTE -> ARRIVED` with human override. |
| **Admin & Audit Chain** | `/admin` / `AdminAuditView.tsx` | Recipient list, epoch rotation, key revocation, HMAC/SHA-256 chain verification with one-click **Simulate Tampering** proof. |
| **Tele-Consultation** | `/consult` / `ConsultationView.tsx` | WebRTC video/audio peer session when online; store-and-forward encrypted message queue when offline. |
| **Hub Groot Assistant** | Drawer / `GrootHubDrawer.tsx` | Voice PTT ("Hey Groot") & text queries. Answers aggregates only (link health, free ambulances, audit validity). No plaintext access. |

---

## 5. Screenshots & Verification Checklist

- [x] **Triage Board (Pre-Decryption):** Shows coarse wire ranking (`P0`, `P1`, `P2`), locked ciphertext badges.
- [x] **Triage Board (Post-Decryption):** Batch decrypts via WebCrypto, displays exact fine scores, risk factors, and color-coded tags.
- [x] **Medic Conflict Modal:** Simulates concurrent triage upgrade from two medics; visualizes conflict resolution and escalation.
- [x] **Local Monitor (`/local`):** 1 Hz live vitals and 60-second SVG sparklines with interactive scenario presets (Normal, Tachycardia, Hypoxia, Sepsis).
- [x] **Tactical Map:** Layer toggling, drug search with expiry warning badges (<30 days), 8-group blood availability grid, active emergency dispatch line.
- [x] **Audit Tamper Proof:** Click "Simulate Tampering (Seq #2)" -> Instant red cryptographic violation banner pointing to sequence #2.
- [x] **Groot Hub Advisory:** Query link state and free ambulances with voice and text.
