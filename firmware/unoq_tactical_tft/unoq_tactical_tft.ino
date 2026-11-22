#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <XPT2046_Touchscreen.h>

// ====================================================================
//                     PIN DEFINITIONS (UNO Q / ESP32)
// ====================================================================
#define TFT_CS    10
#define TFT_DC     9
#define TFT_RST    8
#define TOUCH_CS   7
#define BUZZER_PIN 4   // Audio feedback

Adafruit_ILI9341 tft(TFT_CS, TFT_DC, TFT_RST);
XPT2046_Touchscreen ts(TOUCH_CS);

// ---------------- TOUCH CALIBRATION ----------------
#define TS_MINX 200
#define TS_MAXX 3800
#define TS_MINY 200
#define TS_MAXY 3800

// ---------------- 16-BIT 565 COLOR PALETTE ----------------
#define BG          0x0000
#define WHITE       0xFFFF
#define RED         0xF800
#define GREEN       0x07E0
#define CYAN        0x07FF
#define YELLOW      0xFFE0
#define GREY        0x7BEF
#define LIGHT_GREY  0xC618
#define ORANGE      0xFD20
#define DARK        0x10A2
#define DARK_BOX    0x0841
#define NAVY_BLUE   0x0115
#define PURPLE      0x915C

// ====================================================================
//                    TACTICAL OS PAGE STATE MACHINE
// ====================================================================
enum PageState {
  PAGE_MAIN_DASHBOARD = 0,
  PAGE_GROOT_AI       = 1,
  PAGE_RF_METRICS     = 2,
  PAGE_TRIAGE_MATRIX  = 3,
  PAGE_CRYPTO_SEAL    = 4,
  PAGE_GPS_MAP        = 5
};

PageState currentPage = PAGE_MAIN_DASHBOARD;

// ---------------- PHYSIOLOGICAL TELEMETRY ----------------
float spO2 = 89.2;
float heartRate = 133.0;
int   news2Score = 9;

// ---------------- RF TELEMETRY ----------------
int   rfRssi = -68;
float rfSnr = 8.6;
float rfPacketLoss = 0.18;
int   rfChannel = 110;
int   rfRetries = 2;

// ---------------- MASS CASUALTY TRIAGE COUNTS ----------------
int triageRed    = 3;   // Immediate / Critical
int triageYellow = 7;   // Urgent / Delayed
int triageGreen  = 18;  // Minor / Walking wounded
int triageBlack  = 1;   // Deceased / Expectant

// ---------------- ZERO-TRUST CRYPTO TELEMETRY ----------------
uint32_t packetNonce = 328491;
bool cryptoVerified = true;

// ---------------- GROOT AI PRE-BUILT CLINICAL SCENARIOS ----------------
const int TOTAL_QA = 4;
int activeQaIndex = 0;

struct GrootQA {
  const char* prompt;
  const char* diagnosis;
  const char* action;
  const char* routing;
  uint16_t    tagColor;
};

GrootQA grootQAs[TOTAL_QA] = {
  {
    "SpO2 89%, Resp 28/min, Severe Hypoxia?",
    "DIAG: Acute Respiratory Fatigue & Oxygen Deficit",
    "ORDER: High-Flow 15 L/min Non-Rebreather Mask",
    "ROUTE: Allocate O2 Cyl Bay 02 -> ALS 108 Dispatched",
    RED
  },
  {
    "HR 134 BPM, Temp 39.2C, Sepsis Protocol?",
    "DIAG: Systemic Inflammatory Shock Response (NEWS2: 9)",
    "ORDER: 30 mL/kg IV Crystalloid Bolus + Blood Draw",
    "ROUTE: Reserve Trauma Bed @ Manipal North Hospital",
    YELLOW
  },
  {
    "Blunt Thoracic Trauma, Asymmetric Breath?",
    "DIAG: Suspected Tension Pneumothorax Left Lobe",
    "ORDER: Immediate 14G Needle Decompression 2nd ICS",
    "ROUTE: Fast-Track to Aster CMI Cardiothoracic ICU",
    RED
  },
  {
    "Node-02 PER > 15%, Link Degraded, Jamming?",
    "DIAG: 2.4GHz RF Interference Detected on Ch 110",
    "ORDER: Adaptive Frequency Hop to Ch 115 (2.480 GHz)",
    "ROUTE: HMAC-SHA256 Mesh Seal Verified (14/14 Packets)",
    CYAN
  }
};

// ---------------- TIMERS ----------------
unsigned long lastUpdate = 0;
unsigned long lastDraw   = 0;

// ====================================================================
//                         BUZZER HAPTICS
// ====================================================================
void beep(int freq = 2400, int duration = 40) {
  tone(BUZZER_PIN, freq);
  delay(duration);
  noTone(BUZZER_PIN);
}

// ====================================================================
//                     TOUCH DIGITIZER READOUT
// ====================================================================
bool readTouch(int &x, int &y) {
  digitalWrite(TFT_CS, HIGH); // Free SPI bus for Touch controller

  if (!ts.touched()) return false;

  TS_Point p = ts.getPoint();
  if (p.z < 150) return false;

  x = map(p.x, TS_MINX, TS_MAXX, tft.width() - 1, 0);
  y = map(p.y, TS_MINY, TS_MAXY, tft.height() - 1, 0);

  x = constrain(x, 0, tft.width() - 1);
  y = constrain(y, 0, tft.height() - 1);

  return true;
}

// ====================================================================
//                     TOP NAV BAR COMPONENT
// ====================================================================
void drawTopNavBar(const char* title, const char* subtitle, uint16_t titleColor = CYAN) {
  tft.fillRect(0, 0, 320, 28, DARK);
  tft.drawFastHLine(0, 28, 320, GREY);

  // [< BACK] BUTTON
  tft.fillRoundRect(5, 3, 62, 22, 3, NAVY_BLUE);
  tft.drawRoundRect(5, 3, 62, 22, 3, WHITE);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(12, 10);
  tft.print("< BACK");

  // PAGE TITLE
  tft.setTextColor(titleColor);
  tft.setTextSize(2);
  tft.setCursor(76, 6);
  tft.print(title);

  // SUBTITLE
  tft.setTextSize(1);
  tft.setTextColor(LIGHT_GREY);
  tft.setCursor(225, 10);
  tft.print(subtitle);
}

// ====================================================================
//                 PAGE 1: MAIN TACTICAL VITALS HUD
// ====================================================================
void drawDashboard() {
  tft.fillScreen(BG);

  // Top Tactical Header
  tft.fillRect(0, 0, 320, 26, DARK);
  tft.drawFastHLine(0, 26, 320, GREY);

  tft.setTextColor(CYAN);
  tft.setTextSize(2);
  tft.setCursor(6, 6);
  tft.print("RESQMESH OS");

  tft.setTextSize(1);
  tft.setTextColor(WHITE);
  tft.setCursor(170, 10);
  tft.print("YELAHANKA [13.13N, 77.56E]");

  // Vitals Labels
  tft.setTextColor(GREY);
  tft.setTextSize(1);
  tft.setCursor(14, 34);
  tft.print("OXYGEN SATURATION (SpO2)");

  tft.setCursor(185, 34);
  tft.print("HEART RATE (BPM)");

  // SpO2 Progress Bar Frame
  tft.drawRect(14, 95, 292, 14, WHITE);

  // NEWS2 & RF Live Status Banner
  tft.setTextColor(YELLOW);
  tft.setTextSize(2);
  tft.setCursor(14, 118);
  tft.print("NEWS2");

  tft.setTextSize(1);
  tft.setTextColor(GREY);
  tft.setCursor(130, 118);
  tft.print("NODE-01 LINK TELEMETRY");

  // ---------------- 4 TACTICAL LAUNCH BUTTONS ----------------
  // ROW 1: [ GROOT AI ] & [ RF MESH ]
  tft.fillRoundRect(10, 154, 145, 36, 4, NAVY_BLUE);
  tft.drawRoundRect(10, 154, 145, 36, 4, CYAN);
  tft.setTextColor(CYAN);
  tft.setTextSize(2);
  tft.setCursor(20, 163);
  tft.print("GROOT AI");

  tft.fillRoundRect(165, 154, 145, 36, 4, NAVY_BLUE);
  tft.drawRoundRect(165, 154, 145, 36, 4, GREEN);
  tft.setTextColor(GREEN);
  tft.setTextSize(2);
  tft.setCursor(178, 163);
  tft.print("RF MESH");

  // ROW 2: [ TRIAGE MATRIX ] & [ ZERO-TRUST CRYPTO ]
  tft.fillRoundRect(10, 196, 145, 36, 4, NAVY_BLUE);
  tft.drawRoundRect(10, 196, 145, 36, 4, ORANGE);
  tft.setTextColor(ORANGE);
  tft.setTextSize(2);
  tft.setCursor(22, 205);
  tft.print("TRIAGE");

  tft.fillRoundRect(165, 196, 145, 36, 4, NAVY_BLUE);
  tft.drawRoundRect(165, 196, 145, 36, 4, YELLOW);
  tft.setTextColor(YELLOW);
  tft.setTextSize(2);
  tft.setCursor(175, 205);
  tft.print("MAP / GPS");
}

void drawValues() {
  // SpO2 Value
  tft.fillRect(12, 48, 145, 42, BG);
  tft.setTextColor(spO2 < 90.0 ? RED : (spO2 < 94.0 ? YELLOW : GREEN));
  tft.setTextSize(4);
  tft.setCursor(14, 52);
  tft.print((int)spO2);

  tft.setTextSize(1);
  tft.setTextColor(WHITE);
  tft.setCursor(92, 74);
  tft.print("% SpO2");

  // Heart Rate Value
  tft.fillRect(180, 48, 130, 42, BG);
  tft.setTextColor(heartRate > 120.0 ? RED : (heartRate > 100.0 ? ORANGE : CYAN));
  tft.setTextSize(4);
  tft.setCursor(185, 52);
  tft.print((int)heartRate);

  tft.setTextSize(1);
  tft.setTextColor(WHITE);
  tft.setCursor(265, 74);
  tft.print("BPM");

  // SpO2 Dynamic Bar
  tft.fillRect(16, 97, 288, 10, BG);
  int barWidth = map((int)spO2, 70, 100, 0, 288);
  barWidth = constrain(barWidth, 0, 288);
  uint16_t barColor = (spO2 < 90.0) ? RED : ((spO2 < 94.0) ? YELLOW : GREEN);
  tft.fillRect(16, 97, barWidth, 10, barColor);

  // NEWS2 Score
  tft.fillRect(14, 134, 95, 18, BG);
  tft.setTextColor(news2Score >= 7 ? RED : (news2Score >= 4 ? YELLOW : GREEN));
  tft.setTextSize(2);
  tft.setCursor(14, 135);
  tft.print(news2Score);
  tft.setTextSize(1);
  tft.setCursor(44, 139);
  tft.print("/ 12 [CRIT]");

  // RF Quick Line
  tft.fillRect(130, 132, 180, 20, BG);
  tft.setTextSize(1);
  tft.setTextColor(CYAN);
  tft.setCursor(130, 133);
  tft.print("RSSI: ");
  tft.setTextColor(WHITE);
  tft.print(rfRssi);
  tft.print("dBm | LOSS: ");
  tft.setTextColor(rfPacketLoss > 0.4 ? RED : GREEN);
  tft.print(rfPacketLoss, 2);
  tft.print("%");
}

// ====================================================================
//                 PAGE 2: GROOT AI EDGE ADVISOR
// ====================================================================
void drawGrootAiPage() {
  tft.fillScreen(BG);
  drawTopNavBar("GROOT AI", "EDGE BOT", GREEN);

  GrootQA current = grootQAs[activeQaIndex];

  // Active Prompt Box
  tft.fillRoundRect(8, 34, 304, 26, 4, NAVY_BLUE);
  tft.drawRoundRect(8, 34, 304, 26, 4, CYAN);
  tft.setTextColor(CYAN);
  tft.setTextSize(1);
  tft.setCursor(14, 42);
  tft.print("Q: ");
  tft.setTextColor(WHITE);
  tft.print(current.prompt);

  // AI Advisory Card
  tft.fillRoundRect(8, 64, 304, 82, 4, DARK);
  tft.drawRoundRect(8, 64, 304, 82, 4, current.tagColor);

  tft.setTextColor(current.tagColor);
  tft.setTextSize(1);
  tft.setCursor(14, 72);
  tft.print(current.diagnosis);

  tft.drawFastHLine(14, 84, 292, GREY);

  tft.setTextColor(YELLOW);
  tft.setCursor(14, 92);
  tft.print("ORDER: ");
  tft.setTextColor(WHITE);
  tft.print(current.action);

  tft.setTextColor(CYAN);
  tft.setCursor(14, 110);
  tft.print("ROUTE: ");
  tft.setTextColor(WHITE);
  tft.print(current.routing);

  tft.setTextColor(LIGHT_GREY);
  tft.setCursor(14, 130);
  tft.print("Clinical Rule Engine: UK NEWS2 + Groot LLM v2");

  // Prompt Input Box Placeholder
  tft.fillRoundRect(8, 150, 304, 24, 3, DARK_BOX);
  tft.drawRoundRect(8, 150, 304, 24, 3, GREY);
  tft.setTextColor(GREY);
  tft.setTextSize(1);
  tft.setCursor(14, 158);
  tft.print("> Type prompt / voice query... [HMAC SHA256]");

  // Bottom Buttons
  tft.fillRoundRect(8, 182, 148, 48, 5, NAVY_BLUE);
  tft.drawRoundRect(8, 182, 148, 48, 5, CYAN);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(18, 194);
  tft.print("NEXT SCENARIO");
  tft.setCursor(18, 210);
  tft.setTextColor(CYAN);
  tft.print("[TAP TO CYCLE 1-4]");

  tft.fillRoundRect(164, 182, 148, 48, 5, NAVY_BLUE);
  tft.drawRoundRect(164, 182, 148, 48, 5, GREEN);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(174, 194);
  tft.print("ORDER INTERVENTION");
  tft.setCursor(174, 210);
  tft.setTextColor(GREEN);
  tft.print("[DISPATCH 108 / ICU]");
}

// ====================================================================
//            PAGE 3: RF SPECTRUM & OSCILLOSCOPE SWEEP
// ====================================================================
void drawRfMetricsPage() {
  tft.fillScreen(BG);
  drawTopNavBar("RF SPECTRUM", "2.4GHz MESH", CYAN);

  // Link Stats Box
  tft.fillRoundRect(8, 34, 304, 48, 4, DARK);
  tft.drawRoundRect(8, 34, 304, 48, 4, CYAN);

  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 40);
  tft.print("TOPOLOGY: NODE-01 [HQ] <-> NODE-02 [FIELD TRIAGE]");

  tft.setTextColor(CYAN);
  tft.setCursor(14, 54);
  tft.print("RSSI: ");
  tft.setTextColor(WHITE);
  tft.print(rfRssi);
  tft.print("dBm  |  SNR: ");
  tft.print(rfSnr, 1);
  tft.print("dB  |  CH: ");
  tft.print(rfChannel);

  tft.setTextColor(rfPacketLoss > 0.4 ? RED : GREEN);
  tft.setCursor(14, 68);
  tft.print("PER LOSS: ");
  tft.print(rfPacketLoss, 2);
  tft.print("%  |  RETRIES: ");
  tft.print(rfRetries);
  tft.print("  |  AUTH: HMAC-OK");

  // Graph Window
  tft.drawRect(8, 86, 304, 90, WHITE);
  tft.fillRect(9, 87, 302, 88, DARK_BOX);

  tft.setTextColor(GREY);
  tft.setTextSize(1);
  tft.setCursor(14, 90);
  tft.print("REAL-TIME RF SIGNAL DEGRADATION (RSSI SWEEP)");

  tft.drawFastHLine(9, 120, 302, 0x18E3);
  tft.drawFastHLine(9, 150, 302, 0x18E3);

  tft.setCursor(264, 114);
  tft.print("-50 dBm");
  tft.setCursor(264, 144);
  tft.print("-90 dBm");

  // Action Buttons
  tft.fillRoundRect(8, 184, 148, 46, 5, NAVY_BLUE);
  tft.drawRoundRect(8, 184, 148, 46, 5, CYAN);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(18, 196);
  tft.print("ADAPT FREQUENCY");
  tft.setCursor(18, 210);
  tft.setTextColor(CYAN);
  tft.print("[AUTO CHANNEL HOP]");

  tft.fillRoundRect(164, 184, 148, 46, 5, NAVY_BLUE);
  tft.drawRoundRect(164, 184, 148, 46, 5, GREEN);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(176, 196);
  tft.print("PING MESH PEERS");
  tft.setCursor(176, 210);
  tft.setTextColor(GREEN);
  tft.print("[ACK: 4 NODES OK]");
}

void renderRfGraphStep() {
  static int graphX = 12;
  static int lastGraphY = 135;
  const int minX = 12;
  const int maxX = 255;

  tft.drawFastVLine(graphX + 1, 102, 70, DARK_BOX);
  tft.drawFastVLine(graphX + 2, 102, 70, DARK_BOX);

  int currentY = 135 + (int)(sin(graphX * 0.12) * 14.0) + random(-3, 4);
  currentY = constrain(currentY, 105, 168);

  uint16_t traceColor = (currentY > 150) ? RED : ((currentY > 135) ? YELLOW : CYAN);
  tft.drawLine(graphX - 1, lastGraphY, graphX, currentY, traceColor);
  lastGraphY = currentY;

  graphX++;
  if (graphX >= maxX) {
    graphX = minX;
  }
}

// ====================================================================
//         PAGE 4: MASS CASUALTY INCIDENT (START) TRIAGE MATRIX
// ====================================================================
void drawTriagePage() {
  tft.fillScreen(BG);
  drawTopNavBar("TRIAGE MATRIX", "START PROTOCOL", ORANGE);

  // 4 Triage Classification Cards (2x2 Grid)
  // 1. RED (Immediate)
  tft.fillRoundRect(8, 34, 148, 48, 4, DARK);
  tft.drawRoundRect(8, 34, 148, 48, 4, RED);
  tft.fillRect(12, 38, 8, 40, RED);
  tft.setTextColor(RED);
  tft.setTextSize(1);
  tft.setCursor(26, 40);
  tft.print("RED (IMMEDIATE)");
  tft.setTextSize(3);
  tft.setCursor(26, 52);
  tft.print(triageRed);
  tft.setTextSize(1);
  tft.setTextColor(LIGHT_GREY);
  tft.setCursor(70, 64);
  tft.print("VICTIMS");

  // 2. YELLOW (Delayed)
  tft.fillRoundRect(164, 34, 148, 48, 4, DARK);
  tft.drawRoundRect(164, 34, 148, 48, 4, YELLOW);
  tft.fillRect(168, 38, 8, 40, YELLOW);
  tft.setTextColor(YELLOW);
  tft.setTextSize(1);
  tft.setCursor(182, 40);
  tft.print("YELLOW (URGENT)");
  tft.setTextSize(3);
  tft.setCursor(182, 52);
  tft.print(triageYellow);
  tft.setTextSize(1);
  tft.setTextColor(LIGHT_GREY);
  tft.setCursor(226, 64);
  tft.print("VICTIMS");

  // 3. GREEN (Minor)
  tft.fillRoundRect(8, 88, 148, 48, 4, DARK);
  tft.drawRoundRect(8, 88, 148, 48, 4, GREEN);
  tft.fillRect(12, 92, 8, 40, GREEN);
  tft.setTextColor(GREEN);
  tft.setTextSize(1);
  tft.setCursor(26, 94);
  tft.print("GREEN (MINIMAL)");
  tft.setTextSize(3);
  tft.setCursor(26, 106);
  tft.print(triageGreen);
  tft.setTextSize(1);
  tft.setTextColor(LIGHT_GREY);
  tft.setCursor(70, 118);
  tft.print("AMBULATORY");

  // 4. BLACK (Deceased)
  tft.fillRoundRect(164, 88, 148, 48, 4, DARK);
  tft.drawRoundRect(164, 88, 148, 48, 4, GREY);
  tft.fillRect(168, 92, 8, 40, GREY);
  tft.setTextColor(GREY);
  tft.setTextSize(1);
  tft.setCursor(182, 94);
  tft.print("BLACK (EXPECTANT)");
  tft.setTextSize(3);
  tft.setCursor(182, 106);
  tft.print(triageBlack);
  tft.setTextSize(1);
  tft.setTextColor(LIGHT_GREY);
  tft.setCursor(226, 118);
  tft.print("MORTUARY");

  // Hospital Bed Capacity
  tft.fillRoundRect(8, 142, 304, 34, 4, DARK_BOX);
  tft.drawRoundRect(8, 142, 304, 34, 4, WHITE);
  tft.setTextSize(1);
  tft.setTextColor(CYAN);
  tft.setCursor(14, 146);
  tft.print("HOSPITAL BEDS:");
  tft.setTextColor(WHITE);
  tft.print(" Manipal: 2 ICU | Aster: 4 Trauma");
  tft.setTextColor(YELLOW);
  tft.setCursor(14, 160);
  tft.print("DISPATCH STATUS:");
  tft.setTextColor(GREEN);
  tft.print(" 3 ALS Ambulances Active");

  // Bottom Interactive Buttons
  tft.fillRoundRect(8, 184, 148, 46, 5, NAVY_BLUE);
  tft.drawRoundRect(8, 184, 148, 46, 5, RED);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(18, 196);
  tft.print("+1 RED VICTIM");
  tft.setCursor(18, 210);
  tft.setTextColor(RED);
  tft.print("[ADD EMERGENCY]");

  tft.fillRoundRect(164, 184, 148, 46, 5, NAVY_BLUE);
  tft.drawRoundRect(164, 184, 148, 46, 5, ORANGE);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(176, 196);
  tft.print("VIEW CRYPTO");
  tft.setCursor(176, 210);
  tft.setTextColor(ORANGE);
  tft.print("[HARDWARE SEAL]");
}

// ====================================================================
//         PAGE 5: ZERO-TRUST HARDWARE CRYPTO ENGINE
// ====================================================================
void drawCryptoPage() {
  tft.fillScreen(BG);
  drawTopNavBar("CRYPTO SEAL", "ZERO-TRUST", YELLOW);

  // Security Status Card
  tft.fillRoundRect(8, 34, 304, 142, 4, DARK);
  tft.drawRoundRect(8, 34, 304, 142, 4, YELLOW);

  tft.setTextColor(YELLOW);
  tft.setTextSize(1);
  tft.setCursor(14, 42);
  tft.print("HARDWARE CRYPTOGRAPHIC ENGINE TELEMETRY");

  tft.drawFastHLine(14, 54, 292, GREY);

  tft.setTextColor(CYAN);
  tft.setCursor(14, 62);
  tft.print("CIPHER SUITE: ");
  tft.setTextColor(WHITE);
  tft.print("ChaCha20-Poly1305 + HMAC-SHA256");

  tft.setTextColor(CYAN);
  tft.setCursor(14, 78);
  tft.print("SECTOR NODE ID: ");
  tft.setTextColor(GREEN);
  tft.print("0x7E3A-BLR-YELAHANKA-01");

  tft.setTextColor(CYAN);
  tft.setCursor(14, 94);
  tft.print("TX PACKET NONCE: ");
  tft.setTextColor(WHITE);
  tft.print("0x");
  tft.print(packetNonce, HEX);
  tft.print(" (LIVE)");

  tft.setTextColor(CYAN);
  tft.setCursor(14, 110);
  tft.print("TAMPER DIGEST: ");
  tft.setTextColor(YELLOW);
  tft.print("8f7b...9a12 [SEALED]");

  tft.setTextColor(CYAN);
  tft.setCursor(14, 126);
  tft.print("REPLAY SHIELD: ");
  tft.setTextColor(GREEN);
  tft.print("100% (ZERO REPLAYS DETECTED)");

  tft.setTextColor(CYAN);
  tft.setCursor(14, 142);
  tft.print("PUBLIC KEY PIN: ");
  tft.setTextColor(WHITE);
  tft.print("ed25519:e4a8109bfcd87a...");

  tft.setTextColor(GREEN);
  tft.setCursor(14, 158);
  tft.print("PROOF STATUS: VALID (PEER VERIFIED AT 10ms)");

  // Bottom Action Buttons
  tft.fillRoundRect(8, 184, 148, 46, 5, NAVY_BLUE);
  tft.drawRoundRect(8, 184, 148, 46, 5, GREEN);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(18, 196);
  tft.print("RE-VERIFY SEAL");
  tft.setCursor(18, 210);
  tft.setTextColor(GREEN);
  tft.print("[RUN SHA256 TEST]");

  tft.fillRoundRect(164, 184, 148, 46, 5, NAVY_BLUE);
  tft.drawRoundRect(164, 184, 148, 46, 5, YELLOW);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(176, 196);
  tft.print("ROTATE KEYS");
  tft.setCursor(176, 210);
  tft.setTextColor(YELLOW);
  tft.print("[NEW SESSION KEY]");
}

// ====================================================================
//         PAGE 6: OFF-GRID GPS SECTOR RADAR & MAP
// ====================================================================
void drawMapPage() {
  tft.fillScreen(BG);
  drawTopNavBar("SECTOR MAP", "13.13N, 77.56E", CYAN);

  // Radar Grid Window
  tft.drawRect(8, 34, 160, 142, CYAN);
  tft.fillRect(9, 35, 158, 140, DARK_BOX);

  // Radar concentric circles
  tft.drawCircle(88, 105, 25, 0x18E3);
  tft.drawCircle(88, 105, 50, 0x18E3);
  tft.drawCircle(88, 105, 65, 0x18E3);
  tft.drawFastHLine(9, 105, 158, 0x18E3);
  tft.drawFastVLine(88, 35, 140, 0x18E3);

  // Plot Tactical Nodes on Radar
  tft.fillCircle(88, 105, 4, GREEN);   // Center: Node 01 (You)
  tft.setCursor(94, 98);
  tft.setTextColor(GREEN);
  tft.setTextSize(1);
  tft.print("N01(HQ)");

  tft.fillCircle(115, 75, 4, YELLOW);  // Node 02 Field Triage
  tft.setCursor(120, 68);
  tft.setTextColor(YELLOW);
  tft.print("N02");

  tft.fillCircle(55, 60, 4, CYAN);     // Node 03 Drone Relay
  tft.setCursor(35, 52);
  tft.setTextColor(CYAN);
  tft.print("DRONE");

  tft.fillCircle(128, 140, 4, RED);    // Node 04 Ambulance
  tft.setCursor(105, 145);
  tft.setTextColor(RED);
  tft.print("ALS-108");

  // Right Side Telemetry Panel
  tft.fillRoundRect(174, 34, 138, 142, 4, DARK);
  tft.drawRoundRect(174, 34, 138, 142, 4, WHITE);

  tft.setTextColor(CYAN);
  tft.setTextSize(1);
  tft.setCursor(180, 40);
  tft.print("SECTOR COORDS:");
  tft.setTextColor(WHITE);
  tft.setCursor(180, 52);
  tft.print("13.1365N 77.5646E");

  tft.setTextColor(CYAN);
  tft.setCursor(180, 68);
  tft.print("ALTITUDE:");
  tft.setTextColor(WHITE);
  tft.setCursor(180, 80);
  tft.print("914m ASL (BLR)");

  tft.setTextColor(CYAN);
  tft.setCursor(180, 96);
  tft.print("BEARING / GNSS:");
  tft.setTextColor(GREEN);
  tft.setCursor(180, 108);
  tft.print("034 NE | 12 SATS");

  tft.setTextColor(CYAN);
  tft.setCursor(180, 124);
  tft.print("WEATHER MESH:");
  tft.setTextColor(WHITE);
  tft.setCursor(180, 136);
  tft.print("27C | 64% RH");

  tft.setTextColor(YELLOW);
  tft.setCursor(180, 154);
  tft.print("GRID: AIR-GAPPED");

  // Bottom Buttons
  tft.fillRoundRect(8, 184, 148, 46, 5, NAVY_BLUE);
  tft.drawRoundRect(8, 184, 148, 46, 5, CYAN);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(18, 196);
  tft.print("RE-CENTER RADAR");
  tft.setCursor(18, 210);
  tft.setTextColor(CYAN);
  tft.print("[1.5 KM RADIUS]");

  tft.fillRoundRect(164, 184, 148, 46, 5, 0x3800);
  tft.drawRoundRect(164, 184, 148, 46, 5, RED);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(176, 196);
  tft.print("SOS BEACON");
  tft.setCursor(176, 210);
  tft.setTextColor(YELLOW);
  tft.print("[BROADCAST STROBE]");
}

// ====================================================================
// ----------------------------- SETUP --------------------------------
// ====================================================================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n[RESQMESH OS] UNO Q Booting Pro Multi-Page Tactical System...");

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  pinMode(TFT_CS, OUTPUT);
  pinMode(TOUCH_CS, OUTPUT);
  digitalWrite(TFT_CS, HIGH);
  digitalWrite(TOUCH_CS, HIGH);

  // 1. HARDWARE RESET PULSE (CRITICAL: 100% Solves White Screen)
  pinMode(TFT_RST, OUTPUT);
  digitalWrite(TFT_RST, HIGH);
  delay(15);
  digitalWrite(TFT_RST, LOW);
  delay(50);
  digitalWrite(TFT_RST, HIGH);
  delay(150);

  // 2. SPI BUS INITIALIZATION
  SPI.begin();

  // 3. ILI9341 SAFE 4MHz - 8MHz CLOCK FOR ZEPHYR / STM32
  Serial.println("[RESQMESH OS] Initializing ILI9341 at 8MHz...");
  tft.begin(8000000);
  tft.setRotation(1);

  // Immediate visual check
  tft.fillScreen(BG);
  Serial.println("[RESQMESH OS] Screen cleared to BLACK.");

  // 4. TOUCH DIGITIZER
  ts.begin();
  Serial.println("[RESQMESH OS] Touch initialized.");

  beep(2400, 80);

  drawDashboard();
  drawValues();
  Serial.println("[RESQMESH OS] Tactical OS Online.");
}

// ====================================================================
// -------------------------- MAIN LOOP -------------------------------
// ====================================================================
void loop() {
  unsigned long now = millis();
  int x = 0, y = 0;

  // ---------------- TOUCH EVENT ROUTER ----------------
  if (readTouch(x, y)) {

    // 1. GLOBAL [< BACK] BUTTON (Valid on any page except Main Dashboard)
    if (currentPage != PAGE_MAIN_DASHBOARD && y <= 32 && x <= 75) {
      beep(1800, 40);
      currentPage = PAGE_MAIN_DASHBOARD;
      drawDashboard();
      drawValues();
      delay(180); // Debounce
      return;
    }

    // 2. MAIN DASHBOARD NAVIGATION
    if (currentPage == PAGE_MAIN_DASHBOARD) {
      // ROW 1 BUTTONS (Y: 154 to 190)
      if (y >= 150 && y <= 192) {
        // [ GROOT AI ]
        if (x <= 155) {
          beep(2600, 50);
          currentPage = PAGE_GROOT_AI;
          drawGrootAiPage();
          delay(180);
        }
        // [ RF MESH ]
        else if (x >= 160) {
          beep(2200, 50);
          currentPage = PAGE_RF_METRICS;
          drawRfMetricsPage();
          delay(180);
        }
      }
      // ROW 2 BUTTONS (Y: 194 to 236)
      else if (y >= 194 && y <= 238) {
        // [ TRIAGE MATRIX ]
        if (x <= 155) {
          beep(2800, 50);
          currentPage = PAGE_TRIAGE_MATRIX;
          drawTriagePage();
          delay(180);
        }
        // [ GPS / MAP ]
        else if (x >= 160) {
          beep(3000, 50);
          currentPage = PAGE_GPS_MAP;
          drawMapPage();
          delay(180);
        }
      }
    }

    // 3. GROOT AI PAGE ACTIONS
    else if (currentPage == PAGE_GROOT_AI) {
      if (y >= 180 && y <= 236) {
        // Cycle Scenario
        if (x <= 155) {
          beep(2200, 40);
          activeQaIndex = (activeQaIndex + 1) % TOTAL_QA;
          drawGrootAiPage();
          delay(180);
        }
        // Order Dispatch
        else if (x >= 160) {
          beep(3400, 120);
          tft.fillRoundRect(164, 182, 148, 48, 5, GREEN);
          tft.setTextColor(WHITE);
          tft.setTextSize(2);
          tft.setCursor(180, 198);
          tft.print("DISPATCHED");
          delay(400);
          drawGrootAiPage();
        }
      }
    }

    // 4. RF METRICS PAGE ACTIONS
    else if (currentPage == PAGE_RF_METRICS) {
      if (y >= 180 && y <= 236) {
        // Frequency Hopping
        if (x <= 155) {
          beep(2800, 80);
          rfChannel = (rfChannel == 110) ? 115 : ((rfChannel == 115) ? 120 : 110);
          rfRssi = -62;
          rfPacketLoss = 0.03;
          drawRfMetricsPage();
          delay(180);
        }
        // Ping Mesh Peers
        else if (x >= 160) {
          beep(2400, 50);
          tft.fillRoundRect(164, 184, 148, 46, 5, GREEN);
          tft.setTextColor(WHITE);
          tft.setTextSize(2);
          tft.setCursor(190, 198);
          tft.print("PONG! 3ms");
          delay(400);
          drawRfMetricsPage();
        }
      }
    }

    // 5. TRIAGE MATRIX ACTIONS
    else if (currentPage == PAGE_TRIAGE_MATRIX) {
      if (y >= 180 && y <= 236) {
        // +1 Red Victim
        if (x <= 155) {
          beep(3200, 90);
          triageRed++;
          drawTriagePage();
          delay(180);
        }
        // Go to Crypto Page
        else if (x >= 160) {
          beep(2600, 50);
          currentPage = PAGE_CRYPTO_SEAL;
          drawCryptoPage();
          delay(180);
        }
      }
    }

    // 6. CRYPTO SEAL ACTIONS
    else if (currentPage == PAGE_CRYPTO_SEAL) {
      if (y >= 180 && y <= 236) {
        // Re-verify Seal
        if (x <= 155) {
          beep(2900, 60);
          packetNonce += 7;
          tft.fillRoundRect(8, 184, 148, 46, 5, GREEN);
          tft.setTextColor(WHITE);
          tft.setTextSize(2);
          tft.setCursor(24, 198);
          tft.print("SEAL OK!");
          delay(400);
          drawCryptoPage();
        }
        // Rotate Keys
        else if (x >= 160) {
          beep(3100, 80);
          packetNonce = random(100000, 999999);
          tft.fillRoundRect(164, 184, 148, 46, 5, YELLOW);
          tft.setTextColor(BG);
          tft.setTextSize(2);
          tft.setCursor(180, 198);
          tft.print("ROTATED");
          delay(400);
          drawCryptoPage();
        }
      }
    }

    // 7. GPS RADAR ACTIONS
    else if (currentPage == PAGE_GPS_MAP) {
      if (y >= 180 && y <= 236) {
        // Re-center Radar
        if (x <= 155) {
          beep(2400, 40);
          drawMapPage();
          delay(180);
        }
        // SOS Siren Strobe
        else if (x >= 160) {
          // Tactical Strobe Alert
          for (int i = 0; i < 4; i++) {
            tft.fillScreen(RED);
            tone(BUZZER_PIN, 3500);
            delay(80);
            tft.fillScreen(WHITE);
            tone(BUZZER_PIN, 2000);
            delay(80);
          }
          noTone(BUZZER_PIN);
          drawMapPage();
        }
      }
    }
  }

  // ---------------- BACKGROUND CONTINUOUS TASKS ----------------
  // Real-time oscilloscope waveform when on RF page
  if (currentPage == PAGE_RF_METRICS) {
    renderRfGraphStep();
  }

  // Smooth vital sign drift on Main Dashboard
  if (currentPage == PAGE_MAIN_DASHBOARD && (now - lastUpdate >= 30)) {
    lastUpdate = now;
    spO2 = 89.2 + (sin(now * 0.001) * 1.5);
    heartRate = 133.0 + (cos(now * 0.002) * 3.0);
    packetNonce++;
  }

  // Fast HUD redraw on Main Dashboard
  if (currentPage == PAGE_MAIN_DASHBOARD && (now - lastDraw >= 90)) {
    lastDraw = now;
    drawValues();
  }
}
