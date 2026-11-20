# RESILINK GRID v4 — Edge Embedded, Crypto, Radio & TinyML Subsystem
**Team Lead:** Yashwanth (Embedded, Crypto, Radio, Edge AI)  
**Teammates:** Harshith (`/hub` Backend & Groot), Harshavardhan (`/web` & `/patient` Dashboards)  
**System Invariant:** *AI predicts, rules decide, logs prove.*  
**Clinical Status:** *Research prototype, not a medical device. Decision support, not a diagnosis.*

---

## 1. Master Deliverables Index

| Deliverable | Location | Description & Consumer |
|---|---|---|
| **Inter-Team Wire Contract** | [`PACKET_SPEC.md`](file:///Users/yashwanth/Documents/resilink%20grid/PACKET_SPEC.md) | **Must-read for Harshith & Harshavardhan**. 26B AAD header, AES-256-GCM, ECDH P-256 HKDF-SHA256 DEK wrap, 64B ECDSA signature, delta payloads, emergency JSON schema, NACK codes. |
| **Silicon Memory Budget** | [`MEMORY_BUDGET_TABLE.md`](file:///Users/yashwanth/Documents/resilink%20grid/MEMORY_BUDGET_TABLE.md) | Phase 0 baseline vs. final Flash (2,048 KB) & SRAM (512 KB) breakdown on NXP MCXN236. Wear leveling and flash ring buffer architecture. |
| **Electrical & Pinout Guide** | [`HARDWARE_PINOUT_WIRING.md`](file:///Users/yashwanth/Documents/resilink%20grid/HARDWARE_PINOUT_WIRING.md) | Complete pin tables for FRDM-MCXN236, ESP32, nRF24L01+, NEO-6M GPS, MAX30102, 2.8" SPI TFT, buzzer, relay, SIM800L. Mandatory 10µF+100nF decoupling capacitor guidance. |
| **NXP MCXN236 Firmware** | [`firmware/mcxn236/`](file:///Users/yashwanth/Documents/resilink%20grid/firmware/mcxn236/) | Production C11 firmware: 1 Hz vitals sampling, seeded simulator, TinyML risk inference, NEWS2 fallback, disagreement detector, delta compression, buzzer/relay, emergency trigger, local UART stream. |
| **ESP32 Radio Bridge** | [`firmware/esp32/`](file:///Users/yashwanth/Documents/resilink%20grid/firmware/esp32/) | ESP-IDF coprocessor: 460,800 baud CRC-16 UART bridge, 2-bit priority-first queue (P0 > P1 > P2), dual-AP Wi-Fi failover, flash spillover, I2C SSD1306 OLED status. |
| **TinyML & Edge AI** | [`ml/`](file:///Users/yashwanth/Documents/resilink%20grid/ml/) | Clinical risk model (98.69% acc, 99.52% P0 recall), RF link-state model, NEWS2 engine, INT8 quantizer, exported C headers (`risk_model_data.h`, `link_model_data.h`), and Jupyter Notebook. |
| **nRF24 Mesh Stack** | [`radio/`](file:///Users/yashwanth/Documents/resilink%20grid/radio/) | 32-byte over-the-air frames (8B header + 24B payload), 240B/288B/336B padding buckets, sliding bitmap ACK, out-of-order reassembly, max 4 hops, LRU duplicate cache. |
| **Master Verification Suite** | [`tests/`](file:///Users/yashwanth/Documents/resilink%20grid/tests/) | Automated test harness executing T1, T2, T3, T6, T10, T11, T12, T14, T16, T18. Logs execution timestamp, firmware SHA256 hash, and target hardware revision. |

---

## 2. Quickstart Execution Guide

### 2.1 Run the Full Verification Test Runner (T1 - T18)
```bash
python3 tests/test_runner.py
```
*Executes all 10 verification suites and prints an audit certificate with execution date and firmware SHA-256 hash.*

### 2.2 Compile and Run the MCXN236 Edge Firmware on Host
```bash
cd firmware/mcxn236
make clean && make
./resilink_mcxn236
```

### 2.3 Retrain TinyML Models and Re-export C Headers
```bash
python3 ml/train_risk_model.py
python3 ml/train_link_model.py
```

---

## 3. Subsystem Benchmarks & Invariants

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