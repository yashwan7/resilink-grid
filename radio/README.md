# RESILINK GRID v4 — nRF24L01+ Custom Fragmentation & Mesh Stack
**Owner:** Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)

---

## 1. Stack Specifications
- **Physical Over-The-Air Frame:** Strictly 32 bytes (matches nRF24 hardware FIFO payload depth).
- **Header:** 8 Bytes (`msg_id (2B)`, `frag_idx (1B)`, `total_frags (1B)`, `hop_count (1B)`, `ttl_s (1B)`, `flags (1B)`, `crc8 (1B)`).
- **Payload:** 24 Bytes.
- **Maximum Envelope Capacity:** Up to 32 fragments $\times 24\text{ bytes} = 768\text{ bytes}$ (ample for complete multi-recipient encrypted medical envelopes).
- **Padding Buckets:** Automatic padding to 240, 288, or 336 bytes to defeat side-channel traffic analysis.
- **Selective Bitmap ACK & Retransmit:** Sliding 32-bit bitmap acknowledges received fragments; missing fragments re-requested individually.
- **Mesh Relay Control:**
  - Maximum 4 hops (`hop_count >= 4` dropped).
  - TTL decrement per hop.
  - 64-entry LRU duplicate cache (`msg_id` + `frag_idx`) to prevent broadcast storm loops.
- **Spectrum Agility:** Channel scanner avoids standard 20 MHz 802.11 b/g/n Wi-Fi channels (1, 6, 11).

---

## 2. Critical Electrical Requirement (Decoupling Capacitor)
> [!CAUTION]
> **Severe RF Brownout Alert:** Peak current during nRF24L01+ TX burst is ~13.5 mA. Trace resistance and dev board breadboard clips cause $V_{DD}$ transient dips that reset the radio IC.
> **You MUST solder a 10 µF tantalum / electrolytic capacitor and 100 nF ceramic capacitor directly across nRF24 VCC (pin 2) and GND (pin 1).**

---

## 3. Regulatory Status
- **India Spectrum Status [OPEN]:** In India, WPC regulations designate 2.400–2.4835 GHz as license-exempt under 100 mW EIRP. nRF24 channels $\le 83$ (2.483 GHz) are compliant. Channel 76 (2.476 GHz) is the selected default guard band channel.
