/**
 * RESQMESH v4 — ESP32 #2 Radio Mesh, Biometric RFID Triage & Blackout Safety
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 * Target: ESP32-WROOM-32 / NodeMCU ESP32
 *
 * Hardware Wiring:
 * -------------------------------------------------------------
 * 1. nRF24L01+ Wireless Antenna (SPI):
 *    - VCC  -> 3.3V (MANDATORY: 10uF cap across VCC & GND!)
 *    - GND  -> GND
 *    - SCK  -> GPIO 18
 *    - MISO -> GPIO 19
 *    - MOSI -> GPIO 23
 *    - CSN  -> GPIO 5
 *    - CE   -> GPIO 4
 *
 * 2. RFID-RC522 Module (Shared SPI):
 *    - 3.3V -> 3.3V (NEVER CONNECT TO 5V!)
 *    - GND  -> GND
 *    - RST  -> GPIO 22
 *    - SCK  -> GPIO 18
 *    - MISO -> GPIO 19
 *    - MOSI -> GPIO 23
 *    - SDA  -> GPIO 21 (Dedicated Chip Select)
 *
 * 3. Piezo Buzzer:
 *    - Positive (+) -> GPIO 25
 *    - Negative (-) -> GND
 *
 * 4. LDR Module & Emergency Blackout LED:
 *    - LDR VCC -> 3.3V
 *    - LDR GND -> GND
 *    - LDR AO  -> GPIO 32 (ADC1)
 *    - LED Anode (+) -> 220 ohm resistor -> GPIO 14
 *    - LED Cathode (-) -> GND
 *
 * 5. Optional SG90 Servo (Triage Gate):
 *    - Signal -> GPIO 13
 * -------------------------------------------------------------
 */

#include <SPI.h>
#include <MFRC522.h>
#include <RF24.h>
#include <ESP32Servo.h>

// ================= PIN DEFINITIONS =============
#define NRF_CE_PIN     4
#define NRF_CSN_PIN    5

#define RFID_SS_PIN    21
#define RFID_RST_PIN   22

#define BUZZER_PIN     25
#define LDR_PIN        32
#define EMERGENCY_LED  14
#define SERVO_PIN      13

// ================= PERIPHERALS =================
RF24 radio(NRF_CE_PIN, NRF_CSN_PIN);
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
Servo triageGateServo;

// nRF24 Radio Mesh Pipe Addresses
const byte meshAddress[6] = "RESQM";

// ================= GLOBAL STATE ================
String lastScannedUID = "NONE";
String lastTriageLevel = "WAITING_SCAN";
int lightRaw = 0;
bool isBlackout = false;
unsigned long lastTelemetryTick = 0;
unsigned long gateOpenTime = 0;
bool isGateOpen = false;
unsigned long rfPacketCounter = 0;

// Radio payload struct (32 bytes max for nRF24)
struct TelemetryPacket {
  uint32_t seq;
  uint16_t light;
  uint8_t  blackout;
  uint8_t  triageCode; // 1=Green, 2=Yellow, 3=Red
  char     rfidTag[10];
};

void soundBeep(int freq, int durationMs) {
  tone(BUZZER_PIN, freq, durationMs);
}

void openTriageGate() {
  triageGateServo.write(90); // Barrier opens
  isGateOpen = true;
  gateOpenTime = millis();
}

void closeTriageGate() {
  triageGateServo.write(0);  // Barrier closes
  isGateOpen = false;
}

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println(F("\n=============================================="));
  Serial.println(F("RESQMESH v4 — ESP32 #2 RADIO MESH & RFID NODE"));
  Serial.println(F("=============================================="));

  // GPIO modes
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  pinMode(EMERGENCY_LED, OUTPUT);
  digitalWrite(EMERGENCY_LED, LOW);

  pinMode(LDR_PIN, INPUT);

  // Initialize Servo
  triageGateServo.attach(SERVO_PIN);
  closeTriageGate();

  // Initialize SPI Bus (Used by both nRF24 and RC522)
  SPI.begin();

  // Initialize RFID RC522
  rfid.PCD_Init();
  delay(50);
  byte rfidVer = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  if (rfidVer == 0x00 || rfidVer == 0xFF) {
    Serial.println(F("[WARN] RFID RC522 communication failed or not detected"));
  } else {
    Serial.printf("[OK] RFID RC522 initialized. Firmware Ver: 0x%02X\n", rfidVer);
  }

  // Initialize nRF24L01+ Radio
  if (!radio.begin()) {
    Serial.println(F("[WARN] nRF24L01+ hardware not responding (Check 3.3V & 10uF cap)"));
  } else {
    radio.openWritingPipe(meshAddress);
    radio.setPALevel(RF24_PA_LOW); // Low power for safe bench testing
    radio.setDataRate(RF24_250KBPS); // Maximum range & penetration
    radio.stopListening();
    Serial.println(F("[OK] nRF24L01+ mesh transceiver initialized @ 250kbps"));
  }

  // Initial Startup Chime
  soundBeep(2200, 100);
  delay(120);
  soundBeep(3300, 150);
  Serial.println(F("[READY] System initialized. Place RFID tag to triage.\n"));
}

void loop() {
  // 1. Read LDR Ambient Light Sensor
  lightRaw = analogRead(LDR_PIN);

  // Blackout Threshold: Covering LDR or night blackout drops reading
  // In bright light: ~2500-3500. Under finger/dark: < 1000
  if (lightRaw < 1000) {
    if (!isBlackout) {
      isBlackout = true;
      digitalWrite(EMERGENCY_LED, HIGH); // Auto Emergency Beacon ON!
      soundBeep(1800, 80);               // Subtle alert chime
      Serial.println(F("[ALERT] CAMP BLACKOUT DETECTED! Emergency Light Active"));
    }
  } else {
    if (isBlackout) {
      isBlackout = false;
      digitalWrite(EMERGENCY_LED, LOW);  // Daytime light, beacon OFF
      Serial.println(F("[INFO] Normal ambient light restored. Emergency Light Deactivated"));
    }
  }

  // 2. Check RFID Tag Tap
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    // Read UID string
    String uidStr = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
      uidStr += String(rfid.uid.uidByte[i], HEX);
      if (i < rfid.uid.size - 1) uidStr += ":";
    }
    uidStr.toUpperCase();
    lastScannedUID = uidStr;

    // Pseudo-deterministic triage classification based on UID hash
    byte lastByte = rfid.uid.uidByte[rfid.uid.size - 1];
    uint8_t triageNum = 1;
    if (lastByte % 3 == 0) {
      lastTriageLevel = "CODE_RED (IMMEDIATE)";
      triageNum = 3;
      soundBeep(3500, 250); // High urgency beep
    } else if (lastByte % 2 == 0) {
      lastTriageLevel = "CODE_YELLOW (DELAYED)";
      triageNum = 2;
      soundBeep(2400, 150);
    } else {
      lastTriageLevel = "CODE_GREEN (MINOR)";
      triageNum = 1;
      soundBeep(1800, 100);
    }

    Serial.printf("[RFID SCANNED] UID: %s | Assigned: %s\n", lastScannedUID.c_str(), lastTriageLevel.c_str());

    // Open Triage Gate for 3.5 seconds
    openTriageGate();

    // Broadcast Immediate Radio Mesh Packet
    TelemetryPacket pkt;
    pkt.seq = ++rfPacketCounter;
    pkt.light = (uint16_t)lightRaw;
    pkt.blackout = isBlackout ? 1 : 0;
    pkt.triageCode = triageNum;
    strncpy(pkt.rfidTag, lastScannedUID.c_str(), sizeof(pkt.rfidTag) - 1);
    pkt.rfidTag[sizeof(pkt.rfidTag) - 1] = '\0';

    radio.write(&pkt, sizeof(pkt));

    // Halt RFID tag to avoid duplicate rapid re-reads
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  // 3. Auto-close triage gate after 3.5 seconds
  if (isGateOpen && (millis() - gateOpenTime > 3500)) {
    closeTriageGate();
  }

  // 4. Periodic 1-Second Telemetry Broadcast (JSON over Serial)
  if (millis() - lastTelemetryTick >= 1000) {
    lastTelemetryTick = millis();
    rfPacketCounter++;

    // Broadcast standard beacon packet over nRF24
    TelemetryPacket beacon;
    beacon.seq = rfPacketCounter;
    beacon.light = (uint16_t)lightRaw;
    beacon.blackout = isBlackout ? 1 : 0;
    beacon.triageCode = 0;
    strncpy(beacon.rfidTag, lastScannedUID.c_str(), sizeof(beacon.rfidTag) - 1);
    beacon.rfidTag[sizeof(beacon.rfidTag) - 1] = '\0';
    radio.write(&beacon, sizeof(beacon));

    // Output JSON for Uno Q Touch Screen & ResQMesh Hub
    Serial.printf("{\"node\":\"ESP32_NODE_2\",\"seq\":%lu,\"light\":%d,\"blackout\":%s,\"led\":%d,\"rfid\":\"%s\",\"triage\":\"%s\",\"gate\":%s}\n",
      rfPacketCounter,
      lightRaw,
      isBlackout ? "true" : "false",
      isBlackout ? 1 : 0,
      lastScannedUID.c_str(),
      lastTriageLevel.c_str(),
      isGateOpen ? "\"OPEN\"" : "\"CLOSED\""
    );
  }
}
