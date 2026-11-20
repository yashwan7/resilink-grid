# RESILINK GRID v4 — ESP32 Radio Bridge Subsystem
**Author:** Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)

---

## 1. Overview & Dual Roles
The ESP32 module runs as a pure radio coprocessor running ESP-IDF. The ESP32 **never inspects or holds cryptographic keys or decrypted plaintext**; it operates purely on self-authenticating wire envelopes.

- **Node A (Sender Coprocessor):**
  - Connected via 460,800 baud UART with CRC-16 framing to the NXP FRDM-MCXN236 edge brain.
  - Implements a 2-bit priority queue (P0 Critical/SOS dispatched ahead of P1 and P2).
  - Bridges packets over Primary Wi-Fi, Backup Wi-Fi, or nRF24L01+ SPI.
  - Persists un-ACKed envelopes to Flash (NVS / SPIFFS) during complete link blackout.
  - Renders link health, IP, queue depths, and RSSI to an I2C SSD1306 OLED display.

- **Node B (Hub Gateway Receiver):**
  - Connected via USB serial to the Hub server host (Arduino UNO Q / Laptop).
  - Receives envelopes over Wi-Fi TCP or nRF24 mesh and pushes self-authenticating envelopes into the Hub ingest pipeline.

---

## 2. Pinout & Wiring Connections
See `HARDWARE_PINOUT_WIRING.md` for full electrical specifications and decoupling capacitor requirements.

---

## 3. How to Build & Flash with ESP-IDF
```bash
cd firmware/esp32
idf.py set-target esp32
idf.py build
idf.py -p /dev/tty.usbserial-XXXX flash monitor
```
