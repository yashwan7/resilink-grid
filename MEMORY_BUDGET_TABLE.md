# NXP FRDM-MCXN236 Memory Budget & Flash Partition Table
**Target SoC:** NXP MCX N236 (Arm Cortex-M33 @ 150 MHz)  
**Total On-Chip Flash:** 2,048 KB (2.0 MB) Dual-Bank  
**Total On-Chip SRAM:** 512 KB with ECC  
**Hardware Security:** ELS (EdgeLock Secure Subsystem), AES-256 accelerator, PUF, Fallback to mbedTLS v3.x

---

## 1. Executive Summary & Design Principle
> **Rule:** *Drop sensors before crypto if memory becomes constrained.*  
> Cryptographic integrity and zero-trust tamper protection are absolute invariants. Sensor sampling can be throttled or simulated; cryptographic wrapping and verification cannot be compromised.

With 2,048 KB Flash and 512 KB SRAM, the MCXN236 offers generous headroom for the full RESILINK GRID v4 stack. The table below represents the **Phase 0 Baseline vs. Final Feature-Complete Budget** (including dual TinyML models, delta snapshot ring buffers, and mbedTLS crypto).

---

## 2. Static Flash Budget Allocation (2,048 KB Total)

| Region / Component | Description | Phase 0 Baseline (KB) | Final v4 Budget (KB) | % of Flash | Notes |
|---|---|---|---|---|---|
| **Bootloader & Vector Table** | MCUXpresso Secure Bootloader + Vector Relocation | 32 | 32 | 1.6% | Bank 0 Sector 0 |
| **RTOS Kernel (Zephyr/FreeRTOS)** | Scheduler, MPU configuration, IPC primitives | 48 | 64 | 3.1% | Core OS primitives |
| **mbedTLS Cryptographic Engine** | AES-256-GCM, ECDH P-256, ECDSA P-256, HKDF, SHA-256 | 60 | 96 | 4.7% | Optimized for size (`-Os`), hardware acceleration hooks |
| **TinyML Risk Model (INT8)** | Quantized Clinical Risk Network Weights & Biases | 0 | 48 | 2.3% | TFLite Micro flatbuffer array |
| **TinyML Link-State Model (INT8)** | RF Link Degradation Model Weights | 0 | 18 | 0.9% | Quantized decision weights |
| **Sensor & Hardware Drivers** | MAX30102, NEO-6M NMEA parser, SPI TFT, UART, Buzzer | 24 | 42 | 2.1% | Includes multi-scenario seeded simulator |
| **Delta Snapshot Engine** | Keyframe compression, delta packing, ring buffer logic | 0 | 28 | 1.4% | Bit-packing & verification algorithms |
| **Route & QoS Manager** | Stability controller, multi-route dispatcher, retry FSM | 12 | 30 | 1.5% | Hysteresis rules, SOS flood manager |
| **Application Logic & UI** | 1 Hz main loop, sparkline renderer, state machines | 30 | 65 | 3.2% | TFT graphics primitives & local UART JSON |
| **Flash Snapshot Ring Buffer** | Dedicated non-volatile circular buffer for patient records | 0 | 256 | 12.5% | Bank 1 dedicated flash partition (wear-leveled) |
| **NVS / Config / Key Partition** | Device ECDSA Key, Recipient Whitelist, Epoch Counter | 16 | 32 | 1.6% | Monotonic counter protected against rollback |
| **OTA / Firmware Bank B** | Dual-bank A/B firmware update reservation | 1,024 | 1,024 | 50.0% | Safe field-update capability |
| **Unallocated / Headroom** | Spare capacity for future algorithm expansion | 802 | 313 | 15.1% | High safety margin |
| **TOTAL FLASH** | | **2,048 KB** | **2,048 KB** | **100.0%** | |

---

## 3. Dynamic SRAM Allocation Budget (512 KB Total)

| Subsystem / Heap | Phase 0 Baseline (KB) | Final v4 Budget (KB) | % of SRAM | Allocation Strategy & Verification |
|---|---|---|---|---|
| **Kernel & Core BSS / Data** | 24 | 36 | 7.0% | Static global variables, interrupt stacks |
| **Thread Stacks** | 16 | 32 | 6.3% | Main (8K), Crypto (8K), Radio/UART (8K), Display (8K) |
| **mbedTLS Dynamic Heap** | 20 | 38 | 7.4% | Dedicated crypto pool (P-256 point ops, GCM context) |
| **TFLite Micro Risk Tensor Arena** | 0 | 24 | 4.7% | Dedicated static memory arena for risk model activations |
| **TFLite Micro Link Tensor Arena** | 0 | 12 | 2.3% | Static arena for link-state inference |
| **Display Frame Buffer & Sparkline** | 12 | 28 | 5.5% | 2.8" SPI TFT lines buffer + 60 s physiological history |
| **Delta Snapshot RAM Cache** | 0 | 16 | 3.1% | In-memory uncommitted ring buffer before flash commit |
| **Radio TX/RX Priority Queues** | 8 | 24 | 4.7% | Multi-tier buffer: P0 (Emergency), P1 (High), P2 (Normal) |
| **Local UART Web Stream Buffer** | 4 | 8 | 1.6% | 1 Hz JSON serialization buffer (localhost stream) |
| **Sensor DMA / NMEA FIFO Buffers** | 6 | 12 | 2.3% | Circular UART RX buffer for NEO-6M GPS & MAX30102 I2C |
| **Emergency Outbox & Retry Queue** | 0 | 16 | 3.1% | Persistent RAM retry queue when radio is blocked |
| **Free / Safety Reserve** | 422 | 266 | 51.9% | Uncommitted heap & peak stack surge reserve |
| **TOTAL SRAM** | **512 KB** | **512 KB** | **100.0%** | |

---

## 4. Flash Wear-Leveling & Epoch Monotonicity
1. **Epoch Counter Discipline:**
   - Dedicated 4 KB Flash sector.
   - On every boot, the active epoch counter is incremented by 1.
   - To avoid premature flash wear, the sector uses a rolling bit-field (1 write per boot across 4096 bytes before sector erase).
   - Expected endurance: 100,000 erase cycles $\times$ 4,096 boots/erase = $>400$ million boots.
2. **Snapshot Ring Buffer Partition (256 KB):**
   - 64 sectors of 4 KB each.
   - Circular FIFO format storing compressed Keyframe + Delta records.
   - At 1 snapshot every 30 seconds (average size 80 bytes), 256 KB stores over 3,200 snapshots (~26.6 hours of offline continuous recording).
   - Oldest records are pruned automatically when flash fills.
