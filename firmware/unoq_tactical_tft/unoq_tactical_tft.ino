#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <XPT2046_Touchscreen.h>

// ---------------- PIN CONFIG ----------------
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

// ---------------- COLORS ----------------
#define BG       0x0000
#define WHITE    0xFFFF
#define RED      0xF800
#define GREEN    0x07E0
#define CYAN     0x07FF
#define YELLOW   0xFFE0
#define GREY     0x7BEF
#define ORANGE   0xFD20
#define DARK     0x10A2
#define DARK_BOX 0x0841

// ---------------- PAGE STATE MACHINE ----------------
enum PageState {
  PAGE_MAIN_DASHBOARD,
  PAGE_GROOT_AI,
  PAGE_RF_METRICS
};

PageState currentPage = PAGE_MAIN_DASHBOARD;

// ---------------- CLINICAL TELEMETRY VARIABLES ----------------
float spO2 = 89.0;
float heartRate = 134.0;
int   news2Score = 9;

// ---------------- RF LINK & DEGRADATION METRICS ----------------
int   rfRssi = -68;       // dBm
float rfSnr = 8.6;        // dB
float rfPacketLoss = 0.18; // percent
int   rfChannel = 110;    // 2.4GHz channel
int   rfRetries = 2;
bool  rfAdapting = false;

// ---------------- GROOT AI PRE-BUILT Q&A PROTOCOLS ----------------
const int TOTAL_QA = 3;
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
    "HR 134 BPM, Core Temp 39.2C, Sepsis Risk?",
    "DIAG: Systemic Inflammatory Shock Response (NEWS2: 9)",
    "ORDER: 30 mL/kg IV Crystalloid Bolus + Blood Draw",
    "ROUTE: Reserve Trauma Bed @ Manipal North Hospital",
    YELLOW
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

// ---------------- BUZZER HELPER ----------------
void beep(int freq = 2400, int duration = 40) {
  tone(BUZZER_PIN, freq);
  delay(duration);
  noTone(BUZZER_PIN);
}

// ---------------- TOUCH HANDLING ----------------
bool readTouch(int &x, int &y) {
  digitalWrite(TFT_CS, HIGH); // Free SPI bus for touch controller

  if (!ts.touched()) return false;

  TS_Point p = ts.getPoint();

  if (p.z < 160) return false;

  x = map(p.x, TS_MINX, TS_MAXX, tft.width() - 1, 0);
  y = map(p.y, TS_MINY, TS_MAXY, tft.height() - 1, 0);

  x = constrain(x, 0, tft.width() - 1);
  y = constrain(y, 0, tft.height() - 1);

  return true;
}

// ====================================================================
// ----------------- PAGE 1: MAIN TACTICAL DASHBOARD -----------------
// ====================================================================

void drawDashboard() {
  tft.fillScreen(BG);

  // Top Header Bar
  tft.fillRect(0, 0, 320, 28, DARK);
  tft.drawFastHLine(0, 28, 320, GREY);

  tft.setTextColor(CYAN);
  tft.setTextSize(2);
  tft.setCursor(8, 6);
  tft.print("RESQMESH GRID");

  tft.setTextSize(1);
  tft.setTextColor(WHITE);
  tft.setCursor(175, 10);
  tft.print("YELAHANKA [13.13N, 77.56E]");

  // Left Section Header: SpO2
  tft.setTextColor(GREY);
  tft.setTextSize(1);
  tft.setCursor(15, 38);
  tft.print("OXYGEN SATURATION (SpO2)");

  // Right Section Header: Heart Rate
  tft.setCursor(185, 38);
  tft.print("HEART RATE (BPM)");

  // Middle Vitals Bar Outline
  tft.drawRect(15, 104, 290, 16, WHITE);

  // Middle Status Section
  tft.setTextColor(YELLOW);
  tft.setTextSize(2);
  tft.setCursor(15, 130);
  tft.print("NEWS2");

  tft.setTextSize(1);
  tft.setTextColor(GREY);
  tft.setCursor(130, 130);
  tft.print("RF TELEMETRY STATUS");

  // Bottom Interactive Touch Buttons
  // Left: [ RF MESH METRICS ] (X: 12 to 152, Y: 188 to 232)
  tft.fillRoundRect(12, 188, 140, 44, 6, 0x011F); // Navy blue
  tft.drawRoundRect(12, 188, 140, 44, 6, CYAN);
  tft.setTextColor(WHITE);
  tft.setTextSize(2);
  tft.setCursor(26, 196);
  tft.print("RF MESH");
  tft.setTextSize(1);
  tft.setTextColor(CYAN);
  tft.setCursor(26, 216);
  tft.print("[GRAPH & METRICS]");

  // Right: [ GROOT AI ] (X: 168 to 308, Y: 188 to 232)
  tft.fillRoundRect(168, 188, 140, 44, 6, 0x0320); // Medical Green
  tft.drawRoundRect(168, 188, 140, 44, 6, GREEN);
  tft.setTextColor(WHITE);
  tft.setTextSize(2);
  tft.setCursor(184, 196);
  tft.print("GROOT AI");
  tft.setTextSize(1);
  tft.setTextColor(GREEN);
  tft.setCursor(184, 216);
  tft.print("[EDGE ADVISORY]");
}

void drawValues() {
  // 1. SpO2 (Big Number)
  tft.fillRect(12, 52, 145, 45, BG);
  tft.setTextColor(spO2 < 90.0 ? RED : (spO2 < 94.0 ? YELLOW : GREEN));
  tft.setTextSize(4);
  tft.setCursor(15, 56);
  tft.print((int)spO2);

  tft.setTextSize(1);
  tft.setTextColor(WHITE);
  tft.setCursor(95, 78);
  tft.print("% SpO2");

  // 2. Heart Rate (Big Number)
  tft.fillRect(180, 52, 130, 45, BG);
  tft.setTextColor(heartRate > 120.0 ? RED : (heartRate > 100.0 ? ORANGE : CYAN));
  tft.setTextSize(4);
  tft.setCursor(185, 56);
  tft.print((int)heartRate);

  tft.setTextSize(1);
  tft.setTextColor(WHITE);
  tft.setCursor(265, 78);
  tft.print("BPM");

  // 3. SpO2 Progress Meter Bar
  tft.fillRect(17, 106, 286, 12, BG);
  int barWidth = map((int)spO2, 70, 100, 0, 286);
  barWidth = constrain(barWidth, 0, 286);

  uint16_t barColor = GREEN;
  if (spO2 < 94.0) barColor = YELLOW;
  if (spO2 < 90.0) barColor = RED;
  tft.fillRect(17, 106, barWidth, 12, barColor);

  // 4. NEWS2 Score
  tft.fillRect(15, 150, 95, 26, BG);
  tft.setTextColor(news2Score >= 7 ? RED : (news2Score >= 4 ? YELLOW : GREEN));
  tft.setTextSize(2);
  tft.setCursor(15, 152);
  tft.print(news2Score);
  tft.setTextSize(1);
  tft.setCursor(45, 156);
  tft.print("/ 12 [CRIT]");

  // 5. Live RF Telemetry Status Line
  tft.fillRect(130, 148, 180, 28, BG);
  tft.setTextSize(1);
  tft.setTextColor(CYAN);
  tft.setCursor(130, 150);
  tft.print("2.4GHz MESH: ");
  tft.setTextColor(WHITE);
  tft.print(rfRssi);
  tft.print("dBm");

  tft.setCursor(130, 164);
  tft.setTextColor(rfPacketLoss > 0.5 ? RED : GREEN);
  tft.print("LOSS: ");
  tft.print(rfPacketLoss, 2);
  tft.print("% | SNR: ");
  tft.print(rfSnr, 1);
  tft.print("dB");
}

// ====================================================================
// ----------------- PAGE 2: GROOT AI ASSISTANT PAGE -----------------
// ====================================================================

void drawGrootAiPage() {
  tft.fillScreen(BG);

  // Top Bar with [< BACK] Button
  tft.fillRect(0, 0, 320, 28, DARK);
  tft.drawFastHLine(0, 28, 320, GREY);

  // [< BACK] Button (X: 6 to 76, Y: 4 to 24)
  tft.fillRoundRect(6, 4, 70, 22, 3, 0x2104);
  tft.drawRoundRect(6, 4, 70, 22, 3, WHITE);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 11);
  tft.print("< BACK");

  tft.setTextColor(GREEN);
  tft.setTextSize(2);
  tft.setCursor(88, 6);
  tft.print("GROOT AI BOT");

  tft.setTextSize(1);
  tft.setTextColor(GREY);
  tft.setCursor(240, 11);
  tft.print("EDGE INFERENCE");

  // User Query Bubble
  GrootQA current = grootQAs[activeQaIndex];

  tft.fillRoundRect(10, 36, 300, 26, 4, 0x1125);
  tft.drawRoundRect(10, 36, 300, 26, 4, CYAN);
  tft.setTextColor(CYAN);
  tft.setTextSize(1);
  tft.setCursor(16, 44);
  tft.print("Q: ");
  tft.setTextColor(WHITE);
  tft.print(current.prompt);

  // Groot AI Answer Card
  tft.fillRoundRect(10, 68, 300, 80, 5, DARK);
  tft.drawRoundRect(10, 68, 300, 80, 5, current.tagColor);

  tft.setTextColor(current.tagColor);
  tft.setTextSize(1);
  tft.setCursor(16, 76);
  tft.print(current.diagnosis);

  tft.drawFastHLine(16, 88, 288, GREY);

  tft.setTextColor(YELLOW);
  tft.setCursor(16, 96);
  tft.print("ACTION: ");
  tft.setTextColor(WHITE);
  tft.print(current.action);

  tft.setTextColor(CYAN);
  tft.setCursor(16, 114);
  tft.print("ROUTING: ");
  tft.setTextColor(WHITE);
  tft.print(current.routing);

  tft.setTextColor(GREY);
  tft.setCursor(16, 134);
  tft.print("Pre-built Clinical Advisory ");
  tft.print(activeQaIndex + 1);
  tft.print(" of ");
  tft.print(TOTAL_QA);

  // Type Prompt Space / Interactive Input Box
  tft.fillRoundRect(10, 154, 300, 24, 3, 0x0821);
  tft.drawRoundRect(10, 154, 300, 24, 3, GREY);
  tft.setTextColor(GREY);
  tft.setTextSize(1);
  tft.setCursor(18, 161);
  tft.print("> Type or select pre-built prompt below...");

  // Bottom Interactive Touch Chips (Pre-built prompts)
  // Left Chip: [ NEXT QUERY ] (X: 10 to 154, Y: 186 to 232)
  tft.fillRoundRect(10, 186, 144, 46, 5, 0x011F);
  tft.drawRoundRect(10, 186, 144, 46, 5, CYAN);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(20, 198);
  tft.print("NEXT PROMPT / Q&A");
  tft.setCursor(20, 212);
  tft.setTextColor(CYAN);
  tft.print("[TAP TO CYCLE]");

  // Right Chip: [ EXECUTE ACTION ] (X: 166 to 310, Y: 186 to 232)
  tft.fillRoundRect(166, 186, 144, 46, 5, 0x0320);
  tft.drawRoundRect(166, 186, 144, 46, 5, GREEN);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(176, 198);
  tft.print("ORDER INTERVENTION");
  tft.setCursor(176, 212);
  tft.setTextColor(YELLOW);
  tft.print("[DISPATCH PROTOCOL]");
}

// ====================================================================
// ------------- PAGE 3: RF METRICS & DEGRADATION GRAPH --------------
// ====================================================================

void drawRfMetricsPage() {
  tft.fillScreen(BG);

  // Top Bar with [< BACK] Button
  tft.fillRect(0, 0, 320, 28, DARK);
  tft.drawFastHLine(0, 28, 320, GREY);

  // [< BACK] Button (X: 6 to 76, Y: 4 to 24)
  tft.fillRoundRect(6, 4, 70, 22, 3, 0x2104);
  tft.drawRoundRect(6, 4, 70, 22, 3, WHITE);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 11);
  tft.print("< BACK");

  tft.setTextColor(CYAN);
  tft.setTextSize(2);
  tft.setCursor(84, 6);
  tft.print("RF MESH METRICS");

  tft.setTextSize(1);
  tft.setTextColor(GREEN);
  tft.setCursor(250, 11);
  tft.print("nRF24 2.4G");

  // RF Link Info Card
  tft.fillRoundRect(10, 34, 300, 52, 4, DARK);
  tft.drawRoundRect(10, 34, 300, 52, 4, CYAN);

  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(16, 40);
  tft.print("TOPOLOGY: NODE-01 [GATEWAY] <-> NODE-02 [TRIAGE]");

  tft.setTextColor(CYAN);
  tft.setCursor(16, 54);
  tft.print("RSSI: ");
  tft.setTextColor(WHITE);
  tft.print(rfRssi);
  tft.print(" dBm  |  SNR: ");
  tft.print(rfSnr, 1);
  tft.print(" dB  |  CH: ");
  tft.print(rfChannel);

  tft.setTextColor(rfPacketLoss > 0.4 ? RED : GREEN);
  tft.setCursor(16, 68);
  tft.print("PER LOSS: ");
  tft.print(rfPacketLoss, 2);
  tft.print("%  |  RETRIES: ");
  tft.print(rfRetries);
  tft.print("  |  AUTH: HMAC-SHA256 OK");

  // Dynamic Graph Container
  tft.drawRect(10, 92, 300, 88, WHITE);
  tft.fillRect(11, 93, 298, 86, DARK_BOX);

  tft.setTextColor(GREY);
  tft.setTextSize(1);
  tft.setCursor(16, 96);
  tft.print("REAL-TIME RF SIGNAL DEGRADATION (RSSI SWEEP)");

  // Grid lines
  tft.drawFastHLine(11, 125, 298, 0x18E3);
  tft.drawFastHLine(11, 155, 298, 0x18E3);

  tft.setCursor(260, 118);
  tft.print("-50 dBm");
  tft.setCursor(260, 148);
  tft.print("-90 dBm");

  // Bottom Action Buttons
  // Left: [ ADAPT CHANNEL / FREQ HOP ] (X: 10 to 154, Y: 188 to 232)
  tft.fillRoundRect(10, 188, 144, 44, 5, 0x011F);
  tft.drawRoundRect(10, 188, 144, 44, 5, CYAN);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(20, 198);
  tft.print("ADAPT FREQUENCY");
  tft.setCursor(20, 212);
  tft.setTextColor(CYAN);
  tft.print("[AUTO CHANNEL HOP]");

  // Right: [ PING PEERS ] (X: 166 to 310, Y: 188 to 232)
  tft.fillRoundRect(166, 188, 144, 44, 5, 0x2104);
  tft.drawRoundRect(166, 188, 144, 44, 5, GREEN);
  tft.setTextColor(WHITE);
  tft.setTextSize(1);
  tft.setCursor(182, 198);
  tft.print("PING MESH PEERS");
  tft.setCursor(182, 212);
  tft.setTextColor(GREEN);
  tft.print("[ACK: 3 NODES OK]");
}

// ---------------- LIVE RF SWEEP GRAPH DRAWING ----------------
void renderRfGraphStep() {
  static int graphX = 14;
  static int lastGraphY = 135;
  const int minX = 14;
  const int maxX = 250;

  // Clear upcoming columns
  tft.drawFastVLine(graphX + 1, 108, 68, DARK_BOX);
  tft.drawFastVLine(graphX + 2, 108, 68, DARK_BOX);

  // Synthesize realistic RF multipath fading / RSSI variations
  int currentY = 135 + (int)(sin(graphX * 0.12) * 14.0) + random(-3, 4);
  currentY = constrain(currentY, 110, 172);

  uint16_t traceColor = (currentY > 150) ? RED : ((currentY > 135) ? YELLOW : CYAN);
  tft.drawLine(graphX - 1, lastGraphY, graphX, currentY, traceColor);
  lastGraphY = currentY;

  graphX++;
  if (graphX >= maxX) {
    graphX = minX;
  }
}

// ====================================================================
// ----------------------------- SETUP --------------------------------
// ====================================================================

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  pinMode(TFT_CS, OUTPUT);
  pinMode(TOUCH_CS, OUTPUT);
  digitalWrite(TFT_CS, HIGH);
  digitalWrite(TOUCH_CS, HIGH);

  SPI.begin();

  tft.begin();
  tft.setRotation(1);

  ts.begin();

  beep(2400, 80);

  drawDashboard();
  drawValues();
}

// ====================================================================
// -------------------------- MAIN LOOP -------------------------------
// ====================================================================

void loop() {
  unsigned long now = millis();
  int x = 0, y = 0;

  // 1. TOUCH INTERACTION
  if (readTouch(x, y)) {

    // ======== NAVIGATION FOR PAGE 1: MAIN DASHBOARD ========
    if (currentPage == PAGE_MAIN_DASHBOARD) {
      if (y >= 185 && y <= 236) {
        // LEFT BUTTON: OPEN RF MESH METRICS
        if (x <= 155) {
          beep(2000, 50);
          currentPage = PAGE_RF_METRICS;
          drawRfMetricsPage();
          delay(150); // Debounce
        }
        // RIGHT BUTTON: OPEN GROOT AI ADVISORY
        else if (x >= 160) {
          beep(2600, 60);
          currentPage = PAGE_GROOT_AI;
          drawGrootAiPage();
          delay(150); // Debounce
        }
      }
    }

    // ======== NAVIGATION FOR PAGE 2: GROOT AI PAGE ========
    else if (currentPage == PAGE_GROOT_AI) {
      // TOP-LEFT: [< BACK] BUTTON (Y <= 34, X <= 80)
      if (y <= 34 && x <= 80) {
        beep(1800, 40);
        currentPage = PAGE_MAIN_DASHBOARD;
        drawDashboard();
        drawValues();
        delay(150);
      }
      // BOTTOM BUTTONS (Y: 185 to 236)
      else if (y >= 185 && y <= 236) {
        // LEFT: NEXT PROMPT / Q&A
        if (x <= 155) {
          beep(2200, 45);
          activeQaIndex = (activeQaIndex + 1) % TOTAL_QA;
          drawGrootAiPage();
          delay(150);
        }
        // RIGHT: ORDER INTERVENTION / DISPATCH
        else if (x >= 160) {
          beep(3200, 120);
          // Visual Confirmation Flash
          tft.fillRoundRect(166, 186, 144, 46, 5, GREEN);
          tft.setTextColor(WHITE);
          tft.setTextSize(2);
          tft.setCursor(182, 202);
          tft.print("DISPATCHED");
          delay(400);
          drawGrootAiPage();
        }
      }
    }

    // ======== NAVIGATION FOR PAGE 3: RF METRICS PAGE ========
    else if (currentPage == PAGE_RF_METRICS) {
      // TOP-LEFT: [< BACK] BUTTON (Y <= 34, X <= 80)
      if (y <= 34 && x <= 80) {
        beep(1800, 40);
        currentPage = PAGE_MAIN_DASHBOARD;
        drawDashboard();
        drawValues();
        delay(150);
      }
      // BOTTOM BUTTONS (Y: 185 to 236)
      else if (y >= 185 && y <= 236) {
        // LEFT: ADAPT FREQUENCY / CHANNEL HOP
        if (x <= 155) {
          beep(2800, 80);
          rfChannel = (rfChannel == 110) ? 115 : 110;
          rfRssi = -62;
          rfPacketLoss = 0.04;
          drawRfMetricsPage();
          delay(150);
        }
        // RIGHT: PING PEERS
        else if (x >= 160) {
          beep(2400, 60);
          tft.fillRoundRect(166, 188, 144, 44, 5, GREEN);
          tft.setTextColor(WHITE);
          tft.setTextSize(2);
          tft.setCursor(194, 202);
          tft.print("PONG! 3ms");
          delay(400);
          drawRfMetricsPage();
        }
      }
    }
  }

  // 2. LIVE RF GRAPH SWEEP (When on RF Metrics Page, update every 30ms)
  if (currentPage == PAGE_RF_METRICS) {
    renderRfGraphStep();
  }

  // 3. PERIODIC PHYSIOLOGICAL DYNAMICS (Every 20ms on Main Dashboard)
  if (currentPage == PAGE_MAIN_DASHBOARD && (now - lastUpdate >= 20)) {
    lastUpdate = now;

    // Realistic biological sinus fluctuation
    spO2 = 89.2 + (sin(now * 0.001) * 1.5);
    heartRate = 133.0 + (cos(now * 0.002) * 3.0);
  }

  // 4. REDRAW DASHBOARD (Every 80ms on Main Dashboard)
  if (currentPage == PAGE_MAIN_DASHBOARD && (now - lastDraw >= 80)) {
    lastDraw = now;
    drawValues();
  }
}
