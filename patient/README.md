# RESILINK GRID v4 — Patient App & Local Groot AI (`/patient`)

**Owner:** Harshavardhan (Doctor Dashboard, Patient App, Maps, Consultation)  
**Branch:** `feature/harshavardhan-web-patient`  
**Stack:** React 18, TypeScript, Vite, WebCrypto API, WebAudio API, Vitest

---

## 1. Quick Start & Run Steps

### Development Mode
```bash
# From repository root:
npm run dev:patient

# Or from /patient directory:
cd patient
npm install
npm run dev
```
The Patient Application will start at `http://localhost:5174`.

### Run Test Suite (Groot Guardrails, Emergency Rules)
```bash
npm test --workspace=patient
# Or inside /patient:
npm test
```

### Production Build
```bash
npm run build --workspace=patient
```

---

## 2. Patient Offline PWA & Non-Extractable Key

- **Private Key Ownership:** Every patient device generates its own non-extractable P-256 ECDH/ECDSA keypair stored in browser IndexedDB.
- **Local Decryption:** The patient app decrypts its own physiological records locally. Plaintext and clinical reports are never forwarded to the hub or cloud.
- **Offline Reliability:** Operates with zero network connectivity. All vitals telemetry, TinyML risk metrics, and Groot AI reports function offline.

---

## 3. High/Critical Alarm Protocol & Siren (F9)

When the TinyML risk engine detects a `CRITICAL` or `HIGH` physiological state (e.g., SpO2 < 88%, severe tachycardia):
1. **Pulsating WebAudio Siren:** Continuous two-tone pulsating alarm (880 Hz to 440 Hz sweep) that sounds through device speakers until explicitly acknowledged.
2. **Device Haptic Vibration:** Fires repeating vibration pattern `[300ms on, 100ms off, 300ms on]` using `navigator.vibrate`.
3. **Full-Screen High-Contrast Modal:** Displays urgent condition warning, current risk index, and one-tap emergency action.
4. **Consented Minimal Plaintext Emergency Trigger:**
   - Prominently requests patient consent before transmitting:
     ```json
     {
       "pseudonym": "WARD-A-BED3",
       "lat": 12.9647,
       "lon": 77.5768,
       "ts": 1732147200000,
       "class": "P0",
       "need": ["ICU", "O2"]
     }
     ```
   - **Trade-off Notice:** Location and priority are sent in clear to enable offline ambulance dispatch and hospital capability matching; all clinical vitals stay encrypted.
5. **Live Dispatch Tracking:** Tracks assigned ambulance vehicle ID, driver phone number, destination hospital, and live ETA in minutes.

---

## 4. Local Patient Groot AI & Safety Guardrails

Patient Groot provides on-device natural language synthesis and explanations of decrypted vitals.

### Mandatory Clinical Guardrails:
1. **"Decision support, not a diagnosis"** displayed prominently on every report and response.
2. **Strict Refusal of Medication Dosing:** Groot refuses any inquiry regarding drug dosages, directing the user to consultation or emergency services.
3. **Strict Refusal of Definitive Diagnosis:** Groot explains physiological factor deviations (e.g., hypoxia, tachycardia) without making clinical claims.
4. **Emergency Hotline Display:** Prominently presents emergency contact numbers (`108 / 112`).

---

## 5. Offline Consultation Queue

- **Online Mode:** Direct WebRTC encrypted consultation with Dr. Harshavardhan.
- **Offline Mode:** Encrypted store-and-forward voice notes and messages queue locally in IndexedDB with clear `"Offline - queued"` badges, automatically synchronizing upon reconnect.
- **Selective Sharing:** Patient explicitly chooses whether to share risk reports, 60s vitals timelines, or GPS coordinates with the doctor.
