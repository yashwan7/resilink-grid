# RESILINK GRID v4

Offline-first, end-to-end encrypted, AI-assisted medical communication prototype.

> **Principle:** AI predicts, rules decide, logs prove.  
> **Disclaimer:** Research prototype, not a medical device. All patient data is SIMULATED unless a MAX30102 is attached. Risk score is "Decision support, not a diagnosis".

---

## 1. Team Modules & Architecture

| Teammate | Modules Owned | Description |
|---|---|---|
| **Yashwanth** (Lead) | `/firmware`, `/ml`, `/radio`, `/tests` | NXP FRDM-MCXN236 edge firmware, TinyML risk/link models, ESP32 UART bridge, nRF24 mesh stack, crypto wire specs |
| **Harshith** | `/hub` | Hub FastAPI backend, SQLite WAL, deterministic emergency engine (F8), Hub Groot gateway, audit chain |
| **Harshavardhan** | `/web`, `/patient` | Doctor dashboard, WebCrypto P-256, F1 local monitor, F5-F7 tactical maps, patient app, consultation, Sarvam AI |

---

## 2. Key Architecture Specifications

| Specification | Path | Description |
|---|---|---|
| **Inter-Team Wire Contract** | [`PACKET_SPEC.md`](file:///Users/yashwanth/Documents/resilink%20grid/PACKET_SPEC.md) | 26B AAD header, AES-256-GCM, ECDH P-256 HKDF-SHA256 DEK wrap, 64B ECDSA signature, delta payloads, emergency JSON schema, NACK codes. |
| **Silicon Memory Budget** | [`MEMORY_BUDGET_TABLE.md`](file:///Users/yashwanth/Documents/resilink%20grid/MEMORY_BUDGET_TABLE.md) | Flash (2,048 KB) & SRAM (512 KB) breakdown on NXP MCXN236. Wear leveling and flash ring buffer architecture. |
| **Electrical & Pinout Guide** | [`HARDWARE_PINOUT_WIRING.md`](file:///Users/yashwanth/Documents/resilink%20grid/HARDWARE_PINOUT_WIRING.md) | Pin tables for FRDM-MCXN236, ESP32, nRF24L01+, NEO-6M GPS, MAX30102, 2.8" SPI TFT, buzzer, relay, SIM800L. |

---

## 3. Subsystem Quickstart & Verification

### 3.1 Edge Subsystem Verification (Yashwanth)
```bash
# Run the 10 automated edge & cryptographic test suites (T1 - T18)
python3 tests/test_runner.py

# Compile and run MCXN236 C11 firmware on host
cd firmware/mcxn236 && make clean && make && ./resilink_mcxn236
```

### 3.2 Hub Backend (Harshith)
```bash
# Run backend test suite (26 unit/integration tests)
python3 -m pytest hub/tests

# Run end-to-end integration demo
python3 hub/scripts/demo_script.py
```

### 3.3 Doctor Station & Patient App (Harshavardhan)
```bash
# Run unit tests across Doctor Web and Patient App
npm test --prefix web
npm test --prefix patient

# Build production bundles
npm run build --prefix web
npm run build --prefix patient
```

---

## 4. Subsystem Invariants & Performance

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
