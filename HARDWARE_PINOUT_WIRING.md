# RESILINK GRID v4 — Hardware Pinout, Wiring & Electrical Specification
**Author:** Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)  
**System Architecture:** NXP FRDM-MCXN236 (Edge Brain) + ESP32 (Radio Coprocessor) + nRF24L01+ Mesh + NEO-6M GPS + MAX30102 + 2.8" SPI TFT + Buzzer + Relay + SIM800L

---

## 1. System Block Diagram & Power Rails

```
                                  +5V External / USB
                                          |
                     +--------------------+--------------------+
                     |                    |                    |
             +---------------+    +---------------+    +---------------+
             | NXP FRDM-     |    | ESP32 Node A  |    | SIM800L GSM   |
             | MCXN236       |    | (Radio Bridge)|    | (Peak 2A!)    |
             +-------+-------+    +-------+-------+    +-------+-------+
                     | 3.3V               | 3.3V               |
     +---------------+---------------+    |                    |
     |               |               |    |                    |
+----+----+     +----+----+     +----+----+----+               |
| MAX30102|     | 2.8" TFT|     | nRF24L01+    |               |
| I2C Sens|     | SPI Disp|     | [10uF Cap!]  |               |
+---------+     +---------+     +--------------+               |
     |               |                    |                    |
+----+----+     +----+----+               |                    |
| NEO-6M  |     | Buzzer  |               +--------------------+
| GPS UART|     | & Relay |                 High-Speed UART
+---------+     +---------+                 460,800 baud + CRC
```

---

## 2. NXP FRDM-MCXN236 Pinout Table

The FRDM-MCXN236 uses Arduino Uno R3 / Freedom expansion headers:

| Header Pin | FRDM Signal | Peripheral / Mode | Connected Device | Wire Color | Voltage | Description |
|---|---|---|---|---|---|---|
| **P1-1** | `V3_3` | POWER | All 3.3V Sensors & Displays | RED | +3.3V | Primary regulated 3.3V rail |
| **P1-7** | `GND` | GROUND | System Common Ground | BLACK | 0V | Star-ground topology |
| **P1-3** | `RESET` | SYSTEM | Pushbutton | - | 3.3V | Active-low reset |
| **P2-2** | `P0_16` | LPI2C0_SCL | MAX30102 Pulse Oximeter | YELLOW | 3.3V | I2C Clock (4.7kΩ pull-up to 3.3V) |
| **P2-4** | `P0_17` | LPI2C0_SDA | MAX30102 Pulse Oximeter | GREEN | 3.3V | I2C Data (4.7kΩ pull-up to 3.3V) |
| **P2-6** | `P0_18` | GPIO_IN | MAX30102 INT | BLUE | 3.3V | Active-low interrupt line |
| **P3-1** | `P1_8` | LPSPI1_PCS0 | 2.8" SPI TFT CS | ORANGE| 3.3V | Chip Select (Active Low) |
| **P3-3** | `P1_9` | LPSPI1_SCK | 2.8" SPI TFT SCK | BROWN | 3.3V | SPI Clock (up to 30 MHz) |
| **P3-5** | `P1_10`| LPSPI1_SOUT | 2.8" SPI TFT MOSI| VIOLET| 3.3V | Master Out Slave In |
| **P3-7** | `P1_11`| LPSPI1_SIN | 2.8" SPI TFT MISO| GRAY  | 3.3V | Master In Slave Out (Touch if used) |
| **P3-9** | `P1_12`| GPIO_OUT | 2.8" SPI TFT DC | WHITE | 3.3V | Data/Command selector |
| **P3-11**| `P1_13`| GPIO_OUT | 2.8" SPI TFT RESET| PINK | 3.3V | Hardware display reset |
| **P4-2** | `P2_2` | LPUART1_RX | NEO-6M GPS TX | BLUE  | 3.3V | GPS NMEA RX @ 9600 baud |
| **P4-4** | `P2_3` | LPUART1_TX | NEO-6M GPS RX | GREEN | 3.3V | GPS Configuration TX |
| **P4-6** | `P2_4` | GPIO_IN | NEO-6M GPS PPS | YELLOW| 3.3V | Precise 1 PPS pulse interrupt |
| **P5-1** | `P3_0` | LPUART2_RX | ESP32 UART TX | BLUE  | 3.3V | High-Speed Radio Bridge (460,800 baud) |
| **P5-3** | `P3_1` | LPUART2_TX | ESP32 UART RX | GREEN | 3.3V | High-Speed Radio Bridge (460,800 baud) |
| **P5-5** | `P3_2` | GPIO_OUT | Piezo Buzzer PWM | RED   | 3.3V | Timer PWM tone output (2.7 kHz) |
| **P5-7** | `P3_3` | GPIO_IN | Alert ACK Button | WHITE | 3.3V | Active-low user silence button (pull-up)|
| **P5-9** | `P3_4` | GPIO_OUT | Safety Relay Driver | ORANGE| 3.3V | Controls NPN/MOSFET relay coil |
| **P5-11**| `P3_5` | GPIO_IN | Scenario Select Button| GRAY| 3.3V | Simulates Normal/Tachy/Hypoxia/Sepsis |
| **P6-1** | `P4_0` | LPUART3_RX | SIM800L TX | BLUE  | 3.3V | SMS Fallback RX @ 115,200 baud |
| **P6-3** | `P4_1` | LPUART3_TX | SIM800L RX | GREEN | 3.3V | SMS Fallback TX (Via voltage divider!) |

---

## 3. ESP32 Radio Bridge (Node A & Node B) Pinout

The ESP32 runs ESP-IDF and serves as the physical radio bridge:

| ESP32 Pin | Function | Peripheral | Connected To | Notes |
|---|---|---|---|---|
| **GPIO 16** | UART2_RX | Hardware UART | NXP FRDM LPUART2_TX | 460,800 baud bridge |
| **GPIO 17** | UART2_TX | Hardware UART | NXP FRDM LPUART2_RX | 460,800 baud bridge |
| **GPIO 18** | SPI_SCK | VSPI | nRF24L01+ SCK | Hardware SPI (10 MHz) |
| **GPIO 19** | SPI_MISO | VSPI | nRF24L01+ MISO | Hardware SPI |
| **GPIO 23** | SPI_MOSI | VSPI | nRF24L01+ MOSI | Hardware SPI |
| **GPIO 5**  | GPIO_OUT | Output | nRF24L01+ CSN | Chip Select Not (Active Low) |
| **GPIO 4**  | GPIO_OUT | Output | nRF24L01+ CE | Chip Enable (Active High) |
| **GPIO 2**  | GPIO_IN | Interrupt | nRF24L01+ IRQ | Falling edge interrupt on RX/TX |
| **GPIO 21** | I2C_SDA | I2C0 | 0.96" SSD1306 OLED | Display link health / IP / Queue |
| **GPIO 22** | I2C_SCL | I2C0 | 0.96" SSD1306 OLED | Display link health / IP / Queue |

---

## 4. Critical Electrical & RF Guidelines

### 4.1 nRF24L01+ Decoupling Capacitor (MANDATORY)
> [!CAUTION]
> **Severe RF Brownout Hazard:** The nRF24L01+ module draws sharp transient currents of up to 13.5 mA during burst transmission. On breadboards and unbuffered dev kits, the parasitic inductance causes a transient $V_{DD}$ drop exceeding 400 mV, which corrupts the internal state machine and drops packets.
> 
> **Requirement:**
> 1. Solder a **10 µF tantalum or low-ESR electrolytic capacitor** in parallel with a **100 nF ceramic capacitor** directly across the `VCC` (Pin 2) and `GND` (Pin 1) pins of the nRF24L01+ female header.
> 2. Keep trace lengths under 5 mm. Never power the nRF24L01+ directly from the 3.3V output of a USB-to-UART converter; power only from the dedicated on-board 3.3V LDO.

### 4.2 SIM800L GSM Module Power Supply
> [!WARNING]
> SIM800L requires **3.7V – 4.2V** (nominal 4.0V) and can draw **up to 2.0A peak** during GSM transmission bursts.
> - **Do NOT power SIM800L from the 3.3V or 5V pins of the NXP or ESP32 board.**
> - Use a dedicated DC-DC buck converter (LM2596 or MP1584) tuned to 4.0V with a 1,000 µF electrolytic capacitor.
> - SIM800L UART RX logic level is 2.8V. Use a resistor divider (1kΩ + 2kΩ) on the NXP 3.3V TX line to protect the SIM800L RX input.

### 4.3 2.4 GHz Spectrum & Wi-Fi Coexistence
- Standard 802.11 b/g/n Wi-Fi utilizes channels 1 (2.412 GHz), 6 (2.437 GHz), and 11 (2.462 GHz) with 20 MHz bandwidth.
- **nRF24 Mesh Frequency Selection:** The nRF24 stack configures RF channel 84 (2.484 GHz) or channel 100 (2.500 GHz) outside the standard Wi-Fi bands.
- **Regulatory Status [OPEN]:** In India, WPC regulations designate the 2.400–2.4835 GHz band for license-exempt low-power devices (<100 mW EIRP). Operating at RF channels $>83$ requires verification with regional spectrum guidelines or fallback to channel 76 (2.476 GHz) in the Wi-Fi guard band.
