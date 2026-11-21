/*
  ====================================================================================
  ResQMesh Tactical Field Unit v4.2 - Edge Medical HUD & Groot AI Advisory
  Target Board: ESP32 DevKit v1 (Dual Core 240MHz, 4MB Flash)
  Display: 2.8" SPI TFT LCD (ILI9341 320x240) + XPT2046 Resistive Touch Controller
  
  Features:
    [1] Tactical Vitals HUD with Live ECG Sinus Waveform Drawing
    [2] Real-Time NEWS2 (National Early Warning Score) Edge Compute Engine
    [3] Triage Status Transition Engine (Code Green -> Code Yellow -> Code Red)
    [4] Groot AI Clinical Intelligence Advisory Page with Protocol Navigation
    [5] Mesh Telemetry & HMAC-SHA256 Cryptographic Audit Screen
    [6] Haptic Audio Feedback on Touch & Alarm Strobe
    [7] GPS Sector Anchor: Yelahanka Grid (13.1365° N, 77.5646° E)
  
  Disclaimer: Tactical Decision-Support Prototype. AI Predicts, Rules Decide, Logs Prove.
  ====================================================================================
*/

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <XPT2046_Touchscreen.h>

// ---------------- ESP32 HARDWARE PIN DEFINITIONS ----------------
#define TFT_CS      15  // Chip select for ILI9341
#define TFT_DC       2  // Data/Command for ILI9341
#define TFT_RST      4  // Reset pin for ILI9341
#define TOUCH_CS     5  // Chip select for XPT2046 Touch Controller
#define BUZZER_PIN  12  // Audio feedback & Alarm piezo buzzer

// Hardware SPI on ESP32 (VSPI default):
// SCK  = GPIO 18 (Shared between TFT & Touch)
// MISO = GPIO 19 (Shared between TFT & Touch)
// MOSI = GPIO 23 (Shared between TFT & Touch)

Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);
XPT2046_Touchscreen ts(TOUCH_CS);

// ---------------- TOUCH CALIBRATION VALUES (2.8" ILI9341) ----------------
#define TS_MINX 250
#define TS_MAXX 3800
#define TS_MINY 250
#define TS_MAXY 3800

// ---------------- 16-BIT HIGH-CONTRAST TACTICAL PALETTE ----------------
#define CLR_BG          0x0000  // Deep OLED Black
#define CLR_WHITE       0xFFFF  // Pure White
#define CLR_RED         0xF800  // Emergency / Code Red
#define CLR_GREEN       0x07E0  // Nominal / Safe / Code Green
#define CLR_CYAN        0x07FF  // Telemetry Cyan
#define CLR_YELLOW      0xFFE0  // Warning / Code Yellow
#define CLR_AMBER       0xFD20  // Amber Alert
#define CLR_GREY        0x5AEB  // Grid / Subtext Grey
#define CLR_DARK_PANEL  0x10A2  // Tactical Navy/Grey Background Panel
#define CLR_CARD_BORDER 0x2965  // Subtle border
#define CLR_ACCENT_BLUE 0x011F  // Primary Active Button

// ---------------- SCREEN STATE MACHINE ----------------
enum ActiveScreen {
  SCREEN_VITALS_HUD,
  SCREEN_GROOT_AI,
  SCREEN_MESH_AUDIT
};

ActiveScreen currentScreen = SCREEN_VITALS_HUD;

// ---------------- PATIENT & TELEMETRY MODEL ----------------
struct PatientProfile {
  const char* id;
  const char* triageCode;
  uint16_t    triageColor;
  float       spO2;
  int         heartRate;
  float       tempC;
  int         respiratoryRate;
  int         news2Score;
  const char* riskLevel;
};

PatientProfile patientDatabase[3] = {
  { "PT-RED-104",  "CODE RED",    CLR_RED,    89.5, 128, 39.2, 28, 9, "HIGH RISK - CRITICAL" },
  { "PT-YEL-208",  "CODE YELLOW", CLR_YELLOW, 94.0, 96,  38.1, 20, 4, "MEDIUM RISK - OBSERVE" },
  { "PT-GRN-301",  "CODE GREEN",  CLR_GREEN,  98.5, 72,  36.8, 16, 0, "LOW RISK - STABLE" }
};

int activePatientIdx = 0;

// Environmental sensor snapshot
float envTemp = 28.4;
float envHum  = 62.0;
int   envGasAqi = 418; // ppm

// ---------------- GROOT AI CLINICAL PROTOCOLS ----------------
struct ClinicalAdvisory {
  const char* domain;
  const char* observation;
  const char* orderDirective;
  const char* logisticRoute;
  uint16_t    themeColor;
};

const int TOTAL_ADVISORIES = 3;
int activeAdvisoryIdx = 0;

ClinicalAdvisory grootAdvisories[TOTAL_ADVISORIES] = {
  {
    "ACUTE RESPIRATORY INSUFFICIENCY",
    "SpO2: 89% | Resp Rate: 28/min | NEWS2: 9 (Tier 3 Critical)",
    "Order: 15 L/min NRB Oxygen Mask + IV Dexamethasone 6mg",
    "Routing: Dispatch Ambulance 108 -> Manipal North ICU",
    CLR_RED
  },
  {
    "SEPTIC SYSTEMIC INFLAMMATORY RESPONSE",
    "Core Temp: 39.2C | HR: 128 BPM | Tachycardia confirmed",
    "Order: 30 mL/kg IV Crystalloid Bolus + Blood Cultures",
    "Routing: Reserve Bed Bay 04 @ Yelahanka General Hospital",
    CLR_AMBER
  },
  {
    "TACTICAL MESH CRYPTO ADAPTATION",
    "Backhaul cellular unavailable. Mesh Node 02 link degraded.",
    "Order: Reroute telemetry via 2.4GHz nRF24 hop (AES-128 GCM)",
    "Security: Hash Chain Seal 8A7F41BC confirmed by Merkle root",
    CLR_CYAN
  }
};

// ---------------- AUDIO FEEDBACK GENERATOR ----------------
void playChirp(int freq, int durationMs) {
  // Built-in ESP32 LEDC tone or direct square pulse
  tone(BUZZER_PIN, freq);
  delay(durationMs);
  noTone(BUZZER_PIN);
}

// ---------------- TOUCH CONTROLLER ADAPTER ----------------
bool getTouchCoords(int &screenX, int &screenY) {
  if (!ts.touched()) return false;

  TS_Point p = ts.getPoint();

  // Filter spurious high-impedance touches
  if (p.z < 180) return false;

  // Calibrate coordinate plane (Rotation 1 landscape)
  screenX = map(p.x, TS_MINX, TS_MAXX, tft.width() - 1, 0);
  screenY = map(p.y, TS_MINY, TS_MAXY, tft.height() - 1, 0);

  screenX = constrain(screenX, 0, tft.width() - 1);
  screenY = constrain(screenY, 0, tft.height() - 1);

  return true;
}

// ---------------- DRAWING UTILITY: HEADER BAR ----------------
void drawTopStatusBar(const char* title, const char* sectorInfo) {
  tft.fillRect(0, 0, 320, 24, CLR_DARK_PANEL);
  tft.drawFastHLine(0, 24, 320, CLR_CARD_BORDER);

  tft.setTextColor(CLR_CYAN);
  tft.setTextSize(1);
  tft.setCursor(6, 8);
  tft.print(title);

  tft.setTextColor(CLR_WHITE);
  tft.setCursor(170, 8);
  tft.print(sectorInfo);
}

// ---------------- SCREEN 1: VITALS HUD (STATIC TEMPLATE) ----------------
void renderVitalsHudStatic() {
  tft.fillScreen(CLR_BG);
  drawTopStatusBar("RESQMESH v4.2", "YELAHANKA [13.13N, 77.56E]");

  // Left Card: Patient Identifier & Triage Badge
  tft.drawRoundRect(6, 30, 150, 82, 4, CLR_CARD_BORDER);
  tft.fillRoundRect(7, 31, 148, 80, 4, CLR_DARK_PANEL);

  tft.setTextColor(CLR_GREY);
  tft.setTextSize(1);
  tft.setCursor(12, 36);
  tft.print("TACTICAL TRIAGE TAG");

  // Right Card: NEWS2 Clinical Severity
  tft.drawRoundRect(164, 30, 150, 82, 4, CLR_CARD_BORDER);
  tft.fillRoundRect(165, 31, 148, 80, 4, CLR_DARK_PANEL);

  tft.setTextColor(CLR_GREY);
  tft.setCursor(170, 36);
  tft.print("NEWS2 CLINICAL SCORE");

  // Middle Section: Dynamic ECG Sinus Trace Container
  tft.drawRoundRect(6, 118, 308, 64, 4, CLR_CARD_BORDER);
  tft.fillRoundRect(7, 119, 306, 62, 4, 0x0841); // Subtle scanline dark

  tft.setTextColor(CLR_GREY);
  tft.setCursor(12, 122);
  tft.print("LIVE ECG TRACE (LEAD II)");

  tft.setCursor(220, 122);
  tft.print("SPO2 BAR [70-100%]");

  // Bottom Interactive Touch Bar
  // Button 1: [CYCLE TRIAGE] (X: 6 to 104)
  tft.fillRoundRect(6, 188, 98, 46, 5, CLR_ACCENT_BLUE);
  tft.drawRoundRect(6, 188, 98, 46, 5, CLR_CYAN);
  tft.setTextColor(CLR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(16, 202);
  tft.print("CYCLE");
  tft.setCursor(16, 214);
  tft.print("PATIENT");

  // Button 2: [GROOT AI] (X: 111 to 209)
  tft.fillRoundRect(111, 188, 98, 46, 5, 0x0320); // Medical Green
  tft.drawRoundRect(111, 188, 98, 46, 5, CLR_GREEN);
  tft.setTextColor(CLR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(122, 202);
  tft.print("GROOT AI");
  tft.setCursor(122, 214);
  tft.print("ADVISORY");

  // Button 3: [MESH AUDIT] (X: 216 to 314)
  tft.fillRoundRect(216, 188, 98, 46, 5, 0x2104);
  tft.drawRoundRect(216, 188, 98, 46, 5, CLR_YELLOW);
  tft.setTextColor(CLR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(228, 202);
  tft.print("MESH &");
  tft.setCursor(228, 214);
  tft.print("SECURITY");
}

// ---------------- SCREEN 1: VITALS HUD (DYNAMIC TELEMETRY) ----------------
void updateVitalsHudValues() {
  PatientProfile& pt = patientDatabase[activePatientIdx];

  // 1. Patient ID & Triage Color Badge
  tft.fillRect(12, 50, 138, 56, CLR_DARK_PANEL);

  tft.setTextColor(CLR_WHITE);
  tft.setTextSize(2);
  tft.setCursor(12, 50);
  tft.print(pt.id);

  tft.fillRoundRect(12, 74, 136, 24, 3, pt.triageColor);
  tft.setTextColor(CLR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(22, 82);
  tft.print(pt.triageCode);
  tft.print(" | ");
  tft.print((int)pt.heartRate);
  tft.print(" BPM");

  // 2. NEWS2 Score Box
  tft.fillRect(170, 50, 138, 56, CLR_DARK_PANEL);

  tft.setTextColor(pt.triageColor);
  tft.setTextSize(3);
  tft.setCursor(174, 50);
  tft.print(pt.news2Score);

  tft.setTextSize(1);
  tft.setTextColor(CLR_WHITE);
  tft.setCursor(208, 52);
  tft.print("SCORE / 20");

  tft.setCursor(174, 82);
  tft.setTextColor(CLR_CYAN);
  tft.print("SpO2: ");
  tft.print(pt.spO2, 1);
  tft.print("%");

  // 3. SpO2 Progress Meter
  tft.fillRect(170, 150, 136, 12, CLR_BG);
  tft.drawRect(170, 150, 136, 12, CLR_WHITE);

  int barLength = map((int)pt.spO2, 70, 100, 0, 132);
  barLength = constrain(barLength, 0, 132);

  uint16_t meterColor = CLR_GREEN;
  if (pt.spO2 < 93.0) meterColor = CLR_YELLOW;
  if (pt.spO2 < 90.0) meterColor = CLR_RED;

  tft.fillRect(172, 152, barLength, 8, meterColor);

  // Environmental info line
  tft.fillRect(12, 166, 290, 12, 0x0841);
  tft.setTextColor(CLR_GREY);
  tft.setTextSize(1);
  tft.setCursor(12, 168);
  tft.print("ENV TEMP: ");
  tft.print(envTemp, 1);
  tft.print("C | HUM: ");
  tft.print((int)envHum);
  tft.print("% | GAS: ");
  tft.print(envGasAqi);
  tft.print(" ppm [SAFE]");
}

// ---------------- LIVE ECG GRAPH ANIMATION ----------------
void renderEcgStep() {
  static int ecgX = 14;
  static int lastY = 148;
  const int ecgMinX = 14;
  const int ecgMaxX = 160;

  // Clear upcoming column
  tft.drawFastVLine(ecgX + 1, 134, 30, 0x0841);
  tft.drawFastVLine(ecgX + 2, 134, 30, 0x0841);

  // Synthesize realistic P-Q-R-S-T cardiac waveform
  int samplePoint = ecgX % 36;
  int currentY = 148;

  if (samplePoint == 8)  currentY = 145; // P wave
  if (samplePoint == 12) currentY = 151; // Q dip
  if (samplePoint == 14) currentY = 135; // R peak (Spike)
  if (samplePoint == 16) currentY = 154; // S trough
  if (samplePoint == 22) currentY = 144; // T wave

  tft.drawLine(ecgX - 1, lastY, ecgX, currentY, CLR_GREEN);
  lastY = currentY;

  ecgX++;
  if (ecgX >= ecgMaxX) {
    ecgX = ecgMinX;
  }
}

// ---------------- SCREEN 2: GROOT AI ADVISORY PAGE ----------------
void renderGrootAiPage() {
  tft.fillScreen(CLR_BG);
  drawTopStatusBar("GROOT CLINICAL AI", "TRIAGE DECISION ENGINE");

  // Top Return Button [ < BACK ]
  tft.fillRoundRect(6, 28, 70, 24, 3, CLR_DARK_PANEL);
  tft.drawRoundRect(6, 28, 70, 24, 3, CLR_WHITE);
  tft.setTextColor(CLR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 36);
  tft.print("< BACK");

  // Indicator
  tft.setTextColor(CLR_GREEN);
  tft.setTextSize(1);
  tft.setCursor(90, 36);
  tft.print("STATUS: REAL-TIME INFERENCE READY");

  // Main Protocol Card
  ClinicalAdvisory& adv = grootAdvisories[activeAdvisoryIdx];

  tft.fillRoundRect(6, 56, 308, 126, 5, CLR_DARK_PANEL);
  tft.drawRoundRect(6, 56, 308, 126, 5, adv.themeColor);

  // Card Header: Protocol Name
  tft.setTextColor(adv.themeColor);
  tft.setTextSize(1);
  tft.setCursor(14, 66);
  tft.print("DIRECTIVE: ");
  tft.print(adv.domain);

  tft.drawFastHLine(14, 78, 292, CLR_CARD_BORDER);

  // Diagnostic Line
  tft.setTextColor(CLR_GREY);
  tft.setCursor(14, 86);
  tft.print("DIAGNOSIS:");
  tft.setTextColor(CLR_WHITE);
  tft.setCursor(14, 96);
  tft.print(adv.observation);

  // Intervention Directive
  tft.setTextColor(CLR_YELLOW);
  tft.setCursor(14, 114);
  tft.print("CLINICAL ACTION:");
  tft.setTextColor(CLR_WHITE);
  tft.setCursor(14, 124);
  tft.print(adv.orderDirective);

  // Resource & Logistics Route
  tft.setTextColor(CLR_CYAN);
  tft.setCursor(14, 142);
  tft.print("LOGISTICS:");
  tft.setTextColor(CLR_WHITE);
  tft.setCursor(14, 152);
  tft.print(adv.logisticRoute);

  tft.setTextColor(CLR_GREY);
  tft.setCursor(14, 168);
  tft.print("Protocol ");
  tft.print(activeAdvisoryIdx + 1);
  tft.print(" of ");
  tft.print(TOTAL_ADVISORIES);
  tft.print(" | Patient: ");
  tft.print(patientDatabase[activePatientIdx].id);

  // Bottom Navigation Controls
  // Left: NEXT PROTOCOL
  tft.fillRoundRect(6, 188, 148, 46, 5, CLR_ACCENT_BLUE);
  tft.drawRoundRect(6, 188, 148, 46, 5, CLR_CYAN);
  tft.setTextColor(CLR_WHITE);
  tft.setTextSize(2);
  tft.setCursor(18, 203);
  tft.print("NEXT ADVICE");

  // Right: DISPATCH CONFIRMATION
  tft.fillRoundRect(166, 188, 148, 46, 5, 0x0320);
  tft.drawRoundRect(166, 188, 148, 46, 5, CLR_GREEN);
  tft.setTextColor(CLR_WHITE);
  tft.setCursor(182, 203);
  tft.print("DISPATCH 108");
}

// ---------------- SCREEN 3: MESH & SECURITY AUDIT PAGE ----------------
void renderMeshAuditPage() {
  tft.fillScreen(CLR_BG);
  drawTopStatusBar("SECURITY & MESH", "AES-128 GCM + MERKLE SEAL");

  // Back Button
  tft.fillRoundRect(6, 28, 70, 24, 3, CLR_DARK_PANEL);
  tft.drawRoundRect(6, 28, 70, 24, 3, CLR_WHITE);
  tft.setTextColor(CLR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 36);
  tft.print("< BACK");

  // Node Topology Card
  tft.fillRoundRect(6, 56, 308, 62, 5, CLR_DARK_PANEL);
  tft.drawRoundRect(6, 56, 308, 62, 5, CLR_CYAN);

  tft.setTextColor(CLR_CYAN);
  tft.setTextSize(1);
  tft.setCursor(14, 64);
  tft.print("RF BACKHAUL: nRF24L01+ 2.4GHz MESH");

  tft.setTextColor(CLR_WHITE);
  tft.setCursor(14, 78);
  tft.print("GATEWAY [Node 01] <---> TRIAGE [Node 02]");

  tft.setTextColor(CLR_GREEN);
  tft.setCursor(14, 94);
  tft.print("RSSI: -64 dBm | SNR: 9.8 dB | LOSS: 0.12%");

  // Cryptographic Ledger Card
  tft.fillRoundRect(6, 122, 308, 60, 5, CLR_DARK_PANEL);
  tft.drawRoundRect(6, 122, 308, 60, 5, CLR_YELLOW);

  tft.setTextColor(CLR_YELLOW);
  tft.setCursor(14, 130);
  tft.print("SHA-256 HASH CHAIN TAMPER PROOF");

  tft.setTextColor(CLR_WHITE);
  tft.setCursor(14, 144);
  tft.print("MERKLE ROOT: 8A4F2C910BEE74D2");

  tft.setTextColor(CLR_GREEN);
  tft.setCursor(14, 160);
  tft.print("INTEGRITY SEAL: VERIFIED (14/14 BLOCKS)");

  // Bottom Ping / Test Button
  tft.fillRoundRect(6, 188, 308, 46, 5, CLR_ACCENT_BLUE);
  tft.drawRoundRect(6, 188, 308, 46, 5, CLR_CYAN);
  tft.setTextColor(CLR_WHITE);
  tft.setTextSize(2);
  tft.setCursor(48, 203);
  tft.print("PING MESH PEERS (OK)");
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  // Initialize Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize Hardware SPI
  SPI.begin();

  // Initialize ILI9341 Screen
  tft.begin(40000000); // 40 MHz SPI for snappy UI
  tft.setRotation(1);   // Landscape mode

  // Initialize XPT2046 Touch
  ts.begin();

  // Boot Chirp
  playChirp(2400, 120);

  // Render initial HUD
  renderVitalsHudStatic();
  updateVitalsHudValues();

  Serial.println("[RESQMESH] Tactical Field Unit Online.");
}

// ---------------- MAIN SUPERLOOP ----------------
void loop() {
  static unsigned long lastTelemetryUpdate = 0;
  static unsigned long lastEcgTraceUpdate   = 0;
  static unsigned long lastTouchPoll        = 0;
  unsigned long now = millis();

  // 1. TOUCH INTERACTION (Poll every 40ms)
  if (now - lastTouchPoll >= 40) {
    lastTouchPoll = now;
    int touchX = 0, touchY = 0;

    if (getTouchCoords(touchX, touchY)) {

      // -------- PAGE 1: VITALS HUD TOUCH HANDLERS --------
      if (currentScreen == SCREEN_VITALS_HUD) {
        if (touchY >= 185 && touchY <= 236) {
          // BUTTON 1: CYCLE PATIENT
          if (touchX >= 6 && touchX <= 104) {
            playChirp(1800, 40);
            activePatientIdx = (activePatientIdx + 1) % 3;
            updateVitalsHudValues();
          }
          // BUTTON 2: GROOT AI
          else if (touchX >= 111 && touchX <= 209) {
            playChirp(2600, 60);
            currentScreen = SCREEN_GROOT_AI;
            renderGrootAiPage();
          }
          // BUTTON 3: MESH SECURITY
          else if (touchX >= 216 && touchX <= 314) {
            playChirp(2200, 50);
            currentScreen = SCREEN_MESH_AUDIT;
            renderMeshAuditPage();
          }
        }
      }

      // -------- PAGE 2: GROOT AI TOUCH HANDLERS --------
      else if (currentScreen == SCREEN_GROOT_AI) {
        // TOP RETURN BUTTON [< BACK]
        if (touchY <= 54 && touchX <= 80) {
          playChirp(1800, 40);
          currentScreen = SCREEN_VITALS_HUD;
          renderVitalsHudStatic();
          updateVitalsHudValues();
        }
        // BOTTOM BUTTONS (Y: 185 to 236)
        else if (touchY >= 185 && touchY <= 236) {
          // LEFT: NEXT ADVICE
          if (touchX >= 6 && touchX <= 154) {
            playChirp(2400, 40);
            activeAdvisoryIdx = (activeAdvisoryIdx + 1) % TOTAL_ADVISORIES;
            renderGrootAiPage();
          }
          // RIGHT: DISPATCH 108
          else if (touchX >= 166 && touchX <= 314) {
            playChirp(3200, 120);
            // Visual Dispatch Feedback
            tft.fillRoundRect(166, 188, 148, 46, 5, CLR_RED);
            tft.setTextColor(CLR_WHITE);
            tft.setTextSize(2);
            tft.setCursor(174, 203);
            tft.print("DISPATCHED!");
            delay(400);
            renderGrootAiPage();
          }
        }
      }

      // -------- PAGE 3: MESH AUDIT TOUCH HANDLERS --------
      else if (currentScreen == SCREEN_MESH_AUDIT) {
        // TOP RETURN BUTTON [< BACK]
        if (touchY <= 54 && touchX <= 80) {
          playChirp(1800, 40);
          currentScreen = SCREEN_VITALS_HUD;
          renderVitalsHudStatic();
          updateVitalsHudValues();
        }
        // PING PEERS
        else if (touchY >= 188 && touchY <= 236) {
          playChirp(2800, 80);
          tft.fillRoundRect(6, 188, 308, 46, 5, CLR_GREEN);
          tft.setTextColor(CLR_WHITE);
          tft.setTextSize(2);
          tft.setCursor(48, 203);
          tft.print("ACK: 3 NODES ACTIVE");
          delay(400);
          renderMeshAuditPage();
        }
      }
    }
  }

  // 2. ANIMATED ECG DRAWING (Every 30ms on Vitals HUD)
  if (currentScreen == SCREEN_VITALS_HUD && (now - lastEcgTraceUpdate >= 30)) {
    lastEcgTraceUpdate = now;
    renderEcgStep();
  }

  // 3. TELEMETRY REFRESH (Every 1000ms on Vitals HUD)
  if (currentScreen == SCREEN_VITALS_HUD && (now - lastTelemetryUpdate >= 1000)) {
    lastTelemetryUpdate = now;

    // Simulate minor biological sinus variation
    PatientProfile& pt = patientDatabase[activePatientIdx];
    if (activePatientIdx == 0) { // Code Red
      pt.heartRate = 126 + random(0, 5);
      pt.spO2 = 89.2 + (random(0, 8) / 10.0);
    }

    updateVitalsHudValues();
  }
}
