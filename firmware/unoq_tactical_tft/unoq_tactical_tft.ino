/*
  ==========================================================================================
  ResQMesh Tactical Field Unit v4.5 - Arduino UNO Q Interactive Edition
  Target Board: Arduino UNO Q (Zephyr RTOS Core, High-Performance 32-bit Architecture)
  Display: 2.8" SPI TFT LCD (ILI9341 320x240) + XPT2046 Resistive Touch Controller
  
  ARDUINO UNO Q PIN MAPPING:
    - TFT_CS:     Pin 10
    - TFT_DC:     Pin 9
    - TFT_RST:    Pin 8
    - TOUCH_CS:   Pin 7
    - BUZZER_PIN: Pin 4
    - SPI CLK:    Pin 13 (Shared: TFT SCK + T_CLK)
    - SPI MISO:   Pin 12 (Shared: TFT SDO + T_DO)
    - SPI MOSI:   Pin 11 (Shared: TFT SDI + T_DIN)
  ==========================================================================================
*/

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <XPT2046_Touchscreen.h>

// ---------------- ARDUINO UNO Q HARDWARE PIN DEFINITIONS ----------------
#define TFT_CS      10  // Chip select for ILI9341
#define TFT_DC       9  // Data/Command for ILI9341
#define TFT_RST      8  // Reset pin for ILI9341
#define TOUCH_CS     7  // Chip select for XPT2046 Touch Controller
#define BUZZER_PIN   4  // Haptic feedback piezo buzzer

Adafruit_ILI9341 tft(TFT_CS, TFT_DC, TFT_RST);
XPT2046_Touchscreen ts(TOUCH_CS);

// ---------------- TOUCH CALIBRATION (2.8" ILI9341 LANDSCAPE) ----------------
#define TS_MINX 220
#define TS_MAXX 3800
#define TS_MINY 220
#define TS_MAXY 3800

// ---------------- 16-BIT TACTICAL COLOR PALETTE ----------------
#define BG_BLACK      0x0000
#define C_WHITE       0xFFFF
#define C_RED         0xF800
#define C_GREEN       0x07E0
#define C_CYAN        0x07FF
#define C_YELLOW      0xFFE0
#define C_AMBER       0xFD20
#define C_GREY        0x632C
#define C_DARK_CARD   0x10A2
#define C_CARD_BORDER 0x2965
#define C_NAVY_BTN    0x0155
#define C_FOREST_BTN  0x03E0

// ---------------- STATE MACHINE ----------------
enum ScreenMode {
  MODE_TACTICAL_HUD,
  MODE_GROOT_AI,
  MODE_DISPATCH_ANIMATION,
  MODE_EMERGENCY_SOS
};

ScreenMode currentMode = MODE_TACTICAL_HUD;

// ---------------- MULTILINGUAL ENGINE ----------------
enum Language {
  LANG_EN,
  LANG_HI,
  LANG_KN
};

Language currentLang = LANG_EN;

// ---------------- PATIENT DATA MODEL ----------------
struct VitalsProfile {
  const char* id;
  const char* triageTag;
  uint16_t    tagColor;
  float       spO2;
  int         hr;
  float       temp;
  int         rr;
  int         news2;
  const char* statusEn;
  const char* statusHi;
  const char* statusKn;
  const char* actionEn;
  const char* actionHi;
  const char* actionKn;
};

VitalsProfile patientProfiles[3] = {
  {
    "PT-RED-104", "CODE RED", C_RED, 88.5, 138, 39.4, 30, 10,
    "CRITICAL: Acute Hypoxia & Severe Sepsis",
    "GAMBHIR: Shwasan Sankat & Sepsis Rog",
    "ATHI THEEVRA: Usirata Thondare Sepsis",
    "Action: 15L NRB O2 + IV Fluids + ICU Bed",
    "Karyavahi: 15L Oxygen + IV Drip Turant De",
    "Krama: 15L Aamlajanaka + IV Drip Bekaagide"
  },
  {
    "PT-YEL-208", "CODE YELLOW", C_YELLOW, 94.0, 98, 38.2, 22, 5,
    "URGENT: Moderate Dyspnea & Pyrexia",
    "MADHYAM: Saans Lene Me Takleef",
    "MADHYAMA: Usirata Thondare Jvara",
    "Action: 4L Nasal Cannula + Paracetamol IV",
    "Karyavahi: 4L Oxygen + Bukhar Ki Dawai",
    "Krama: 4L Aamlajanaka + Jvarada Aushadhi"
  },
  {
    "PT-GRN-301", "CODE GREEN", C_GREEN, 98.8, 72, 36.8, 16, 0,
    "STABLE: Vital Signs Normal Range",
    "STHIR: Sabhi Lakshan Samanya",
    "STHIRAVAGIDE: Yella Lakshanagalu Uttama",
    "Action: Routine Monitoring via Mesh Hop",
    "Karyavahi: Niyamit Jaanch Jari Rakhein",
    "Krama: Niyaritha Parishilane Madi"
  }
};

int activePtIndex = 0;

float simulatedSpO2 = 88.5;
int   simulatedHR   = 138;

// ---------------- HAPTIC AUDIO TONES ----------------
void playAudioChirp(int freq, int durationMs) {
  tone(BUZZER_PIN, freq);
  delay(durationMs);
  noTone(BUZZER_PIN);
}

void playTacticalSirenStep() {
  for (int f = 1600; f < 3000; f += 250) {
    tone(BUZZER_PIN, f);
    delay(8);
  }
  for (int f = 3000; f > 1600; f -= 250) {
    tone(BUZZER_PIN, f);
    delay(8);
  }
  noTone(BUZZER_PIN);
}

// ---------------- BULLETPROOF TOUCH READER ----------------
bool readTouch(int &x, int &y) {
  // Free SPI MISO line by setting TFT_CS HIGH
  digitalWrite(TFT_CS, HIGH);

  if (!ts.touched()) return false;

  TS_Point p = ts.getPoint();

  // Filter light noise touches
  if (p.z < 160) return false;

  // Calibrate coordinate plane (Landscape Rotation 1)
  x = map(p.x, TS_MINX, TS_MAXX, tft.width() - 1, 0);
  y = map(p.y, TS_MINY, TS_MAXY, tft.height() - 1, 0);

  x = constrain(x, 0, tft.width() - 1);
  y = constrain(y, 0, tft.height() - 1);

  // Live Serial Debugging
  Serial.print("[UNO-Q TOUCH] X: ");
  Serial.print(x);
  Serial.print(" | Y: ");
  Serial.print(y);
  Serial.print(" | Z: ");
  Serial.println(p.z);

  return true;
}

// ---------------- HEADER HELPER ----------------
void drawHeader(const char* title, const char* rightTag, uint16_t tagColor) {
  tft.fillRect(0, 0, 320, 26, C_DARK_CARD);
  tft.drawFastHLine(0, 26, 320, C_CARD_BORDER);

  tft.setTextColor(C_CYAN);
  tft.setTextSize(1);
  tft.setCursor(6, 9);
  tft.print(title);

  tft.setTextColor(tagColor);
  tft.setCursor(168, 9);
  tft.print(rightTag);
}

// ---------------- SCREEN 1: TACTICAL HUD (STATIC) ----------------
void renderHudStatic() {
  tft.fillScreen(BG_BLACK);
  drawHeader("RESQMESH UNO-Q v4.5", "YELAHANKA [13.13N, 77.56E]", C_WHITE);

  // Left Box: Patient ID & Triage Tag
  tft.fillRoundRect(6, 32, 150, 78, 4, C_DARK_CARD);
  tft.drawRoundRect(6, 32, 150, 78, 4, C_CARD_BORDER);
  tft.setTextColor(C_GREY);
  tft.setTextSize(1);
  tft.setCursor(12, 38);
  tft.print("TRIAGE CLASSIFICATION");

  // Right Box: NEWS2 Score & Risk
  tft.fillRoundRect(164, 32, 150, 78, 4, C_DARK_CARD);
  tft.drawRoundRect(164, 32, 150, 78, 4, C_CARD_BORDER);
  tft.setTextColor(C_GREY);
  tft.setCursor(170, 38);
  tft.print("NEWS2 CLINICAL SCORE");

  // Center Box: Live ECG Waveform Container
  tft.fillRoundRect(6, 116, 308, 64, 4, 0x0821);
  tft.drawRoundRect(6, 116, 308, 64, 4, C_CARD_BORDER);
  tft.setTextColor(C_GREY);
  tft.setCursor(12, 120);
  tft.print("LIVE LEAD-II ECG TRACE");
  tft.setCursor(215, 120);
  tft.print("PULSE MONITOR");

  // Bottom Touch Buttons (3 Large Hitbox Buttons)
  // Button 1: [CYCLE TRIAGE] (X: 4 to 104, Y: 184 to 238)
  tft.fillRoundRect(4, 184, 100, 52, 6, C_NAVY_BTN);
  tft.drawRoundRect(4, 184, 100, 52, 6, C_CYAN);
  tft.setTextColor(C_WHITE);
  tft.setTextSize(1);
  tft.setCursor(16, 200);
  tft.print("CYCLE PT");
  tft.setCursor(16, 214);
  tft.setTextColor(C_CYAN);
  tft.print("[SIMULATE]");

  // Button 2: [GROOT AI ADVISOR] (X: 110 to 210, Y: 184 to 238)
  tft.fillRoundRect(110, 184, 100, 52, 6, 0x0320);
  tft.drawRoundRect(110, 184, 100, 52, 6, C_GREEN);
  tft.setTextColor(C_WHITE);
  tft.setCursor(122, 200);
  tft.print("GROOT AI");
  tft.setCursor(122, 214);
  tft.setTextColor(C_GREEN);
  tft.print("[ADVISOR]");

  // Button 3: [SOS CODE RED] (X: 216 to 316, Y: 184 to 238)
  tft.fillRoundRect(216, 184, 100, 52, 6, 0x6000);
  tft.drawRoundRect(216, 184, 100, 52, 6, C_RED);
  tft.setTextColor(C_WHITE);
  tft.setCursor(232, 200);
  tft.print("SOS SIREN");
  tft.setCursor(232, 214);
  tft.setTextColor(C_RED);
  tft.print("[EMERGENCY]");
}

// ---------------- SCREEN 1: DYNAMIC VALUES ----------------
void updateHudValues() {
  VitalsProfile& pt = patientProfiles[activePtIndex];

  // 1. Patient Tag Box
  tft.fillRect(12, 50, 138, 54, C_DARK_CARD);
  tft.setTextColor(C_WHITE);
  tft.setTextSize(2);
  tft.setCursor(12, 52);
  tft.print(pt.id);

  tft.fillRoundRect(12, 74, 136, 24, 3, pt.tagColor);
  tft.setTextColor(C_WHITE);
  tft.setTextSize(1);
  tft.setCursor(18, 82);
  tft.print(pt.triageTag);
  tft.print(" ");
  tft.print(simulatedHR);
  tft.print("BPM");

  // 2. NEWS2 Box
  tft.fillRect(170, 50, 138, 54, C_DARK_CARD);
  tft.setTextColor(pt.tagColor);
  tft.setTextSize(3);
  tft.setCursor(174, 52);
  tft.print(pt.news2);

  tft.setTextSize(1);
  tft.setTextColor(C_WHITE);
  tft.setCursor(212, 54);
  tft.print("RISK SCORE");

  tft.setCursor(174, 82);
  tft.setTextColor(simulatedSpO2 < 90.0 ? C_RED : C_CYAN);
  tft.print("SpO2: ");
  tft.print(simulatedSpO2, 1);
  tft.print("% ");
  tft.print(pt.temp, 1);
  tft.print("C");

  // 3. SpO2 Progress Meter
  tft.fillRect(170, 146, 136, 12, BG_BLACK);
  tft.drawRect(170, 146, 136, 12, C_WHITE);
  int bar = map((int)simulatedSpO2, 70, 100, 0, 132);
  bar = constrain(bar, 0, 132);
  tft.fillRect(172, 148, bar, 8, pt.tagColor);

  tft.fillRect(172, 160, 136, 14, 0x0821);
  tft.setCursor(172, 162);
  tft.setTextColor(C_GREY);
  tft.print("NEWS2: ");
  tft.setTextColor(pt.tagColor);
  if (pt.news2 >= 7) tft.print("TIER 3 SEVERE");
  else if (pt.news2 >= 5) tft.print("TIER 2 MEDIUM");
  else tft.print("TIER 1 NORMAL");
}

// ---------------- LIVE ECG DRAWING STEP ----------------
void renderLiveEcg() {
  static int ecgX = 14;
  static int lastEcgY = 148;
  const int minX = 14;
  const int maxX = 160;

  tft.drawFastVLine(ecgX + 1, 132, 34, 0x0821);
  tft.drawFastVLine(ecgX + 2, 132, 34, 0x0821);
  tft.drawFastVLine(ecgX + 3, 132, 34, 0x0821);

  int cyclePeriod = (activePtIndex == 0) ? 20 : 36;
  int pos = ecgX % cyclePeriod;
  int y = 148;

  if (pos == 5) y = 145;
  else if (pos == 8) y = 152;
  else if (pos == 10) y = 134;
  else if (pos == 12) y = 156;
  else if (pos == 16) y = 144;

  uint16_t waveColor = patientProfiles[activePtIndex].tagColor;
  tft.drawLine(ecgX - 1, lastEcgY, ecgX, y, waveColor);
  lastEcgY = y;

  ecgX++;
  if (ecgX >= maxX) {
    ecgX = minX;
  }
}

// ---------------- SCREEN 2: GROOT AI ADVISORY (MULTILINGUAL) ----------------
void renderGrootAiScreen() {
  tft.fillScreen(BG_BLACK);
  drawHeader("GROOT CLINICAL AI", "EDGE DECISION ENGINE", C_GREEN);

  // [< BACK] Button (X: 4 to 78, Y: 30 to 58)
  tft.fillRoundRect(4, 30, 74, 28, 4, C_DARK_CARD);
  tft.drawRoundRect(4, 30, 74, 28, 4, C_WHITE);
  tft.setTextColor(C_WHITE);
  tft.setTextSize(1);
  tft.setCursor(14, 40);
  tft.print("< BACK");

  // [LANG: EN / HI / KN] Toggle Button (X: 84 to 216, Y: 30 to 58)
  tft.fillRoundRect(84, 30, 132, 28, 4, 0x011F);
  tft.drawRoundRect(84, 30, 132, 28, 4, C_CYAN);
  tft.setTextColor(C_CYAN);
  tft.setCursor(92, 40);
  if (currentLang == LANG_EN) tft.print("LANG: ENGLISH");
  else if (currentLang == LANG_HI) tft.print("LANG: HINDI");
  else tft.print("LANG: KANNADA");

  // Patient badge (X: 222 to 316, Y: 30 to 58)
  VitalsProfile& pt = patientProfiles[activePtIndex];
  tft.fillRoundRect(222, 30, 94, 28, 4, pt.tagColor);
  tft.setTextColor(C_WHITE);
  tft.setCursor(230, 40);
  tft.print(pt.id);

  // Main Protocol Card
  tft.fillRoundRect(4, 64, 312, 114, 5, C_DARK_CARD);
  tft.drawRoundRect(4, 64, 312, 114, 5, pt.tagColor);

  tft.setTextColor(pt.tagColor);
  tft.setTextSize(1);
  tft.setCursor(12, 72);
  tft.print("TRIAGE STATUS & DIAGNOSIS:");

  tft.setTextColor(C_WHITE);
  tft.setTextSize(1);
  tft.setCursor(12, 86);
  if (currentLang == LANG_EN) tft.print(pt.statusEn);
  else if (currentLang == LANG_HI) tft.print(pt.statusHi);
  else tft.print(pt.statusKn);

  tft.drawFastHLine(12, 102, 296, C_CARD_BORDER);

  tft.setTextColor(C_YELLOW);
  tft.setCursor(12, 110);
  tft.print("CLINICAL DIRECTIVE / PROTOCOL:");

  tft.setTextColor(C_WHITE);
  tft.setCursor(12, 124);
  if (currentLang == LANG_EN) tft.print(pt.actionEn);
  else if (currentLang == LANG_HI) tft.print(pt.actionHi);
  else tft.print(pt.actionKn);

  tft.setTextColor(C_CYAN);
  tft.setCursor(12, 144);
  tft.print("RESOURCE: ");
  tft.setTextColor(C_WHITE);
  tft.print("Manipal North ICU Bay 02 | O2 Cyl Reserved");

  tft.setTextColor(C_GREY);
  tft.setCursor(12, 160);
  tft.print("Mesh Verification: HMAC-SHA256 Hash Chain [VALID]");

  // Bottom Buttons
  // Left: [CHANGE LANGUAGE] (X: 4 to 156, Y: 184 to 238)
  tft.fillRoundRect(4, 184, 152, 52, 6, C_NAVY_BTN);
  tft.drawRoundRect(4, 184, 152, 52, 6, C_CYAN);
  tft.setTextColor(C_WHITE);
  tft.setTextSize(1);
  tft.setCursor(16, 200);
  tft.print("TAP: SWITCH LANG");
  tft.setCursor(16, 214);
  tft.setTextColor(C_CYAN);
  tft.print("EN / HINDI / KANNADA");

  // Right: [DISPATCH 108 AMBULANCE] (X: 164 to 316, Y: 184 to 238)
  tft.fillRoundRect(164, 184, 152, 52, 6, 0x8000);
  tft.drawRoundRect(164, 184, 152, 52, 6, C_RED);
  tft.setTextColor(C_WHITE);
  tft.setTextSize(1);
  tft.setCursor(180, 200);
  tft.print("DISPATCH 108");
  tft.setCursor(180, 214);
  tft.setTextColor(C_YELLOW);
  tft.print("AMBULANCE / DRONE");
}

// ---------------- SCREEN 3: ANIMATED DISPATCH SEQUENCE ----------------
void runDispatchAnimation() {
  tft.fillScreen(BG_BLACK);
  drawHeader("EMERGENCY DISPATCH", "AIR & GROUND UNITS", C_RED);

  tft.fillRoundRect(14, 46, 292, 138, 5, C_DARK_CARD);
  tft.drawRoundRect(14, 46, 292, 138, 5, C_RED);

  tft.setTextColor(C_WHITE);
  tft.setTextSize(2);
  tft.setCursor(30, 60);
  tft.print("108 AMBULANCE");
  tft.setTextColor(C_GREEN);
  tft.setCursor(30, 84);
  tft.print("DISPATCHED!");

  tft.setTextSize(1);
  tft.setTextColor(C_WHITE);
  tft.setCursor(30, 112);
  tft.print("Assigned: ALS Vehicle KA-04-ME-108");
  tft.setCursor(30, 126);
  tft.print("Route: Yelahanka Sector -> Manipal North");
  tft.setCursor(30, 140);
  tft.setTextColor(C_YELLOW);
  tft.print("ETA: 3.8 MINUTES | PRIORITY 1 ESCORT");

  tft.drawRect(30, 160, 260, 14, C_WHITE);
  for (int p = 0; p <= 256; p += 32) {
    tft.fillRect(32, 162, p, 10, C_GREEN);
    playAudioChirp(2000 + (p * 5), 35);
    delay(90);
  }

  playAudioChirp(3400, 180);
  delay(1200);

  currentMode = MODE_GROOT_AI;
  renderGrootAiScreen();
}

// ---------------- SCREEN 4: EMERGENCY SOS MODE ----------------
void runEmergencySosMode() {
  static unsigned long lastStrobe = 0;
  static bool strobeState = false;

  unsigned long now = millis();
  if (now - lastStrobe >= 250) {
    lastStrobe = now;
    strobeState = !strobeState;

    if (strobeState) {
      tft.fillScreen(C_RED);
      tft.setTextColor(C_WHITE);
      tft.setTextSize(4);
      tft.setCursor(24, 70);
      tft.print("CODE RED!");
      tft.setTextSize(2);
      tft.setCursor(36, 120);
      tft.print("CASUALTY OVERFLOW");
      tft.setTextSize(1);
      tft.setCursor(68, 180);
      tft.print("[ TAP SCREEN TO MUTE ]");
      playTacticalSirenStep();
    } else {
      tft.fillScreen(BG_BLACK);
      tft.setTextColor(C_RED);
      tft.setTextSize(4);
      tft.setCursor(24, 70);
      tft.print("CODE RED!");
      tft.setTextSize(2);
      tft.setCursor(36, 120);
      tft.print("CASUALTY OVERFLOW");
      tft.setTextSize(1);
      tft.setTextColor(C_WHITE);
      tft.setCursor(68, 180);
      tft.print("[ TAP SCREEN TO MUTE ]");
    }
  }

  int tx = 0, ty = 0;
  if (readTouch(tx, ty)) {
    playAudioChirp(1200, 80);
    currentMode = MODE_TACTICAL_HUD;
    renderHudStatic();
    updateHudValues();
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

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

  playAudioChirp(2400, 100);
  delay(50);
  playAudioChirp(3200, 150);

  renderHudStatic();
  updateHudValues();

  Serial.println("\n==================================================");
  Serial.println("[RESQMESH] Arduino UNO Q Tactical Touch Online.");
  Serial.println("Tap screen to see real-time X/Y coordinates.");
  Serial.println("==================================================");
}

// ---------------- MAIN LOOP ----------------
void loop() {
  static unsigned long lastTouch = 0;
  static unsigned long lastTelemetry = 0;
  static unsigned long lastEcg = 0;
  unsigned long now = millis();

  // If in Emergency SOS mode, strobe siren loop handles touch to mute
  if (currentMode == MODE_EMERGENCY_SOS) {
    runEmergencySosMode();
    return;
  }

  // 1. TOUCH INTERACTION (Poll every 35ms)
  if (now - lastTouch >= 35) {
    lastTouch = now;
    int tx = 0, ty = 0;

    if (readTouch(tx, ty)) {

      // -------- SCREEN 1: TACTICAL HUD TOUCH --------
      if (currentMode == MODE_TACTICAL_HUD) {
        // Bottom Button Row: Y >= 175
        if (ty >= 175) {

          // BUTTON 1: CYCLE PATIENT (Left third: X <= 106)
          if (tx <= 106) {
            playAudioChirp(2000, 45);
            activePtIndex = (activePtIndex + 1) % 3;
            simulatedSpO2 = patientProfiles[activePtIndex].spO2;
            simulatedHR   = patientProfiles[activePtIndex].hr;
            updateHudValues();
            delay(120); // Debounce
          }

          // BUTTON 2: GROOT AI ADVISOR (Middle third: 107 to 213)
          else if (tx >= 107 && tx <= 213) {
            playAudioChirp(2600, 60);
            currentMode = MODE_GROOT_AI;
            renderGrootAiScreen();
            delay(150); // Debounce
          }

          // BUTTON 3: SOS SIREN (Right third: X >= 214)
          else if (tx >= 214) {
            playAudioChirp(3600, 80);
            currentMode = MODE_EMERGENCY_SOS;
            delay(150); // Debounce
          }
        }
      }

      // -------- SCREEN 2: GROOT AI ADVISOR TOUCH --------
      else if (currentMode == MODE_GROOT_AI) {

        // [< BACK] BUTTON (Top-Left: Y <= 60, X <= 80)
        if (ty <= 60 && tx <= 80) {
          playAudioChirp(1800, 40);
          currentMode = MODE_TACTICAL_HUD;
          renderHudStatic();
          updateHudValues();
          delay(150);
        }

        // [SWITCH LANGUAGE] (Top Lang bar OR Bottom-Left Button)
        else if ((ty <= 60 && tx >= 84 && tx <= 220) || (ty >= 175 && tx <= 160)) {
          playAudioChirp(2200, 45);
          if (currentLang == LANG_EN) currentLang = LANG_HI;
          else if (currentLang == LANG_HI) currentLang = LANG_KN;
          else currentLang = LANG_EN;
          renderGrootAiScreen();
          delay(150);
        }

        // [DISPATCH 108 AMBULANCE] (Bottom-Right Button: Y >= 175, X >= 161)
        else if (ty >= 175 && tx >= 161) {
          runDispatchAnimation();
        }
      }
    }
  }

  // 2. LIVE ECG SWEEP (Every 25ms on HUD)
  if (currentMode == MODE_TACTICAL_HUD && (now - lastEcg >= 25)) {
    lastEcg = now;
    renderLiveEcg();
  }

  // 3. PERIODIC VITALS DYNAMICS (Every 1200ms)
  if (currentMode == MODE_TACTICAL_HUD && (now - lastTelemetry >= 1200)) {
    lastTelemetry = now;
    if (activePtIndex == 0) { // Code Red
      simulatedHR = 136 + random(0, 6);
      simulatedSpO2 = 88.0 + (random(0, 12) / 10.0);
    } else if (activePtIndex == 1) { // Code Yellow
      simulatedHR = 96 + random(0, 4);
      simulatedSpO2 = 93.8 + (random(0, 6) / 10.0);
    }
    updateHudValues();
  }
}
