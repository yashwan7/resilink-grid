# RESILINK GRID v4 — Resilient Medical Mesh & AI Decision Support Grid

**Principle:** *AI predicts, rules decide, logs prove.*  
**Clinical Status:** *Research prototype, not a medical device. Decision support, not a diagnosis.*

---

## 🌐 Live Deployments & Repository Links

- **Live Production Dashboard (Vercel):** [https://dashboard-pi-indol-76.vercel.app](https://dashboard-pi-indol-76.vercel.app)
- **GitHub Repository:** [https://github.com/yashwan7/resilink-grid](https://github.com/yashwan7/resilink-grid)
- **Tactical Grid Anchor:** `13.1365° N, 77.5646° E` (Yelahanka Sector, North Bengaluru 560064)


---

## 1. System Architecture & Team Ownership

| Subsystem | Team Member | Primary Technologies | Key Deliverables |
|---|---|---|---|
| **Edge Embedded, Crypto, Radio & TinyML** | **Yashwanth** (Lead) | C11, NXP MCXN236, ESP32, nRF24L01+, TinyML | 1 Hz vitals sampling, NEWS2 fallback, on-device TinyML inference, nRF24 mesh, UART bridge, replay protection. |
| **Hub Backend, Engine & Groot Gateway** | **Harshith** | Python 3.11+, FastAPI, SQLite WAL, WebCrypto | Cryptographic ingest, F8 offline emergency engine, Hub Groot Gateway, tamper-evident audit log chain, REST/SSE APIs. |
| **Doctor Dashboard & Patient Offline PWA** | **Harshavardhan** | TypeScript, React, Vite, WebCrypto P-256, Sarvam AI | ResQMesh Tactical Theme, Doctor Triage Board, F1 1 Hz Local Monitor, F5-F7 Tactical Maps, Patient Offline PWA, Multilingual Sarvam AI Groot (9 Indian languages), dynamic multilingual medical report exports. |

---

## 2. Core Protocol Specifications & Documentation

- [`PACKET_SPEC.md`](./PACKET_SPEC.md): Wire contract (26B AAD header, AES-256-GCM, ECDH P-256 HKDF-SHA256 DEK wrap, 64B ECDSA signature, delta payloads, emergency JSON schema, NACK codes).
- [`MEMORY_BUDGET_TABLE.md`](./MEMORY_BUDGET_TABLE.md): Flash (2,048 KB) & SRAM (512 KB) breakdown on NXP MCXN236.
- [`HARDWARE_PINOUT_WIRING.md`](./HARDWARE_PINOUT_WIRING.md): Wiring tables for FRDM-MCXN236, ESP32, nRF24L01+, NEO-6M GPS, MAX30102, 2.8" SPI TFT, buzzer, relay, SIM800L.
- [`hub/API_INTEGRATION_GUIDE.md`](./hub/API_INTEGRATION_GUIDE.md): Hub REST API endpoints, schemas, authentication, and integration details.
- [`SECURITY.md`](./SECURITY.md): Cryptographic security architecture and threat models.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md): Team workflow, conventions, and demo checklist.
- [`CODEOWNERS`](./CODEOWNERS): Ownership mappings for repository directories.
- [`web/README.md`](./web/README.md): Doctor dashboard, WebCrypto P-256 decryptor, F4 Triage Board, tactical map, and multilingual report generator.
- [`patient/README.md`](./patient/README.md): Patient offline PWA, Local Groot AI chatbot, two-tone siren audio engine, and emergency SOS dispatch.

---

## 3. Quickstart & Verification Guide

### 3.1 Doctor & Patient Frontend (Harshavardhan)
Requires Node.js 18+:
```bash
# Install workspace dependencies
npm install

# Run Doctor Dashboard (port 5173) and Patient App (port 5174) concurrently
npm run dev

# Run frontend test suite (WebCrypto P-256 NIST vectors, F4 priority formula, Groot guardrails, Sarvam AI)
npm test

# Build production bundles
npm run build
```

### 3.2 Hub Backend Subsystem (Harshith)
Requires Python 3.11+:
```bash
cd hub
pip install -r requirements.txt
pytest
python run.py
```

### 3.3 Edge Embedded, Crypto & TinyML (Yashwanth)
Run the 10-suite edge verification harness (T1 - T18):
```bash
python tests/test_runner.py
```

Compile host simulation for NXP MCXN236:
```bash
cd firmware/mcxn236
make clean && make
./resilink_mcxn236
```

---

## 4. Subsystem Benchmarks & Invariants

```
+-----------------------------------------------------------------------------------+
| Metric                                   | Target Value      | Verified Result    |
+------------------------------------------+-------------------+--------------------+
| TinyML Risk Classification Accuracy      | > 95.0%           | 98.69%             |
| Critical (P0) Sensitivity (Recall)       | > 98.0%           | 99.52%             |
| On-Device Model Inference Latency        | < 2.0 ms          | < 1.0 ms (420 us)  |
| TinyML Static SRAM Arena Footprint       | < 32 KB           | 16.0 KB            |
| High-Speed Radio Bridge Throughput       | 460,800 baud      | 460,800 baud + CRC |
| nRF24 Physical Frame Size                | Exactly 32 Bytes  | 8B Hdr + 24B Data  |
| Maximum Multi-Hop Relays                 | <= 4 Hops         | Enforced (Dropped) |
| Replay Protection Window Depth           | 2,048 Bits        | Verified           |
| Route Recovery Minimum Dwell Time        | 60 Seconds        | Enforced           |
| Rapid Route Transition Limit             | Max 1 per 30s     | Enforced           |
+-----------------------------------------------------------------------------------+
```
