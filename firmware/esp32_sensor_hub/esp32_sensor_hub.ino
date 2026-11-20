/**
 * RESQMESH v4 — ESP32 #1 Sensor Hub & Field Telemetry Station
 * Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
 * Target: ESP32-WROOM-32 / NodeMCU ESP32
 *
 * Peripherals Connected:
 *  - 0.96" I2C OLED (SSD1306 128x64): SDA=GPIO21, SCL=GPIO22
 *  - DHT11 (Temp & Humidity): Data=GPIO4 (with 10k pull-up)
 *  - MQ Gas Sensor (MQ-135/MQ-3): Analog=GPIO34 (ADC1)
 *  - Flame Sensor (Digital): DO=GPIO27 (Active LOW)
 *  - GPS NEO-6M: TX->GPIO16 (RX2), RX->GPIO17 (TX2) @ 9600 baud
 *  - Relay Module (Failsafe Trip): IN=GPIO26
 *  - Serial JSON Telemetry Output @ 115200 baud (to Uno Q / PC)
 *  - Local WiFi Access Point ("ResQMesh-Hub") + Web Dashboard at http://192.168.4.1
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <TinyGPSPlus.h>

// ================= OLED CONFIG =================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ================= PIN DEFINITIONS =============
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define MQ_ANALOG_PIN 34
#define FLAME_PIN     27
#define RELAY_PIN     26

#define GPS_RX_PIN    16
#define GPS_TX_PIN    17

// ================= PERIPHERALS =================
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

WebServer server(80);

// ================= GLOBAL STATE ================
float currentTemp = 0.0;
float currentHum = 0.0;
int currentGasRaw = 0;
bool flameDetected = false;
bool relayTripped = false;
double currentLat = 12.9716;
double currentLng = 77.5946;
int satCount = 0;
unsigned long lastSensorRead = 0;
unsigned long packetCounter = 0;

// Web page served at http://192.168.4.1
const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>ResQMesh ESP32 Telemetry</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: monospace; background: #0f172a; color: #f8fafc; padding: 15px; }
    h2 { color: #38bdf8; margin-bottom: 5px; }
    .card { background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #334155; }
    .val { font-size: 1.4rem; font-weight: bold; color: #4ade80; }
    .alert { color: #ef4444; }
  </style>
</head>
<body>
  <h2>RESQMESH v4 — ESP32 SENSOR HUB</h2>
  <div class="card">
    <div>Ambient Temperature: <span class="val" id="temp">--</span> &deg;C</div>
    <div>Ambient Humidity: <span class="val" id="hum">--</span> %</div>
  </div>
  <div class="card">
    <div>MQ Gas Level: <span class="val" id="gas">--</span> ppm</div>
    <div>Flame Status: <span class="val" id="fire">--</span></div>
    <div>Safety Relay: <span class="val" id="relay">--</span></div>
  </div>
  <div class="card">
    <div>GPS Position: <span class="val" id="gps">--</span></div>
  </div>
  <script>
    setInterval(() => {
      fetch('/api/data').then(r => r.json()).then(d => {
        document.getElementById('temp').innerText = d.temp;
        document.getElementById('hum').innerText = d.hum;
        document.getElementById('gas').innerText = d.gas;
        document.getElementById('fire').innerText = d.fire ? '!! FIRE DETECTED !!' : 'SAFE';
        document.getElementById('fire').className = d.fire ? 'val alert' : 'val';
        document.getElementById('relay').innerText = d.relay ? 'TRIPPED (HAZARD SHUTDOWN)' : 'CLOSED (NORMAL)';
        document.getElementById('relay').className = d.relay ? 'val alert' : 'val';
        document.getElementById('gps').innerText = d.lat.toFixed(5) + ', ' + d.lng.toFixed(5) + ' (Sats: ' + d.sats + ')';
      });
    }, 1000);
  </script>
</body>
</html>
)rawliteral";

void handleRoot() {
  server.send(200, "text/html", INDEX_HTML);
}

void handleApiData() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  String json = "{";
  json += "\"temp\":" + String(currentTemp, 1) + ",";
  json += "\"hum\":" + String(currentHum, 1) + ",";
  json += "\"gas\":" + String(currentGasRaw) + ",";
  json += "\"fire\":" + String(flameDetected ? "true" : "false") + ",";
  json += "\"relay\":" + String(relayTripped ? "true" : "false") + ",";
  json += "\"lat\":" + String(currentLat, 5) + ",";
  json += "\"lng\":" + String(currentLng, 5) + ",";
  json += "\"sats\":" + String(satCount) + ",";
  json += "\"packet\":" + String(packetCounter);
  json += "}";
  server.send(200, "application/json", json);
}

void setup() {
  // Serial0 for USB Debug & Uno Q Telemetry Bridge
  Serial.begin(115200);
  delay(100);

  // Hardware Serial2 for GPS NEO-6M
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Pin Configurations
  pinMode(FLAME_PIN, INPUT_PULLUP);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Relay initially normal

  // Initialize DHT11
  dht.begin();

  // Initialize I2C OLED Display
  Wire.begin(21, 22);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("[WARN] OLED SSD1306 not found at 0x3C"));
  } else {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(10, 15);
    display.println("RESQMESH v4 HUB");
    display.setCursor(10, 30);
    display.println("Initializing sensors...");
    display.display();
  }

  // Create Local WiFi Access Point
  WiFi.softAP("ResQMesh-Hub", "resilink123");
  IPAddress apIP = WiFi.softAPIP();
  Serial.print(F("[WIFI] Access Point active. IP: "));
  Serial.println(apIP);

  // Web Server Routes
  server.on("/", handleRoot);
  server.on("/api/data", handleApiData);
  server.begin();

  delay(1000);
}

void loop() {
  // Keep web server responsive
  server.handleClient();

  // Parse GPS stream
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // 1-second Telemetry Loop
  if (millis() - lastSensorRead >= 1000) {
    lastSensorRead = millis();
    packetCounter++;

    // 1. Read DHT11
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) currentTemp = t;
    if (!isnan(h)) currentHum = h;

    // 2. Read MQ Gas Sensor (ADC)
    currentGasRaw = analogRead(MQ_ANALOG_PIN);

    // 3. Read Flame Sensor (Active LOW)
    flameDetected = (digitalRead(FLAME_PIN) == LOW);

    // 4. Read GPS coordinates if valid
    if (gps.location.isValid()) {
      currentLat = gps.location.lat();
      currentLng = gps.location.lng();
      satCount = gps.satellites.value();
    }

    // 5. Automatic Failsafe Relay Logic
    // Trip relay if fire detected OR toxic gas threshold exceeded (> 2600 raw ADC)
    if (flameDetected || currentGasRaw > 2600) {
      relayTripped = true;
      digitalWrite(RELAY_PIN, HIGH); // Trip relay
    } else {
      relayTripped = false;
      digitalWrite(RELAY_PIN, LOW);  // Reset relay
    }

    // 6. Update 0.96" OLED Display
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.print(F("RESQMESH SENSOR HUB"));
    display.drawLine(0, 9, 128, 9, SSD1306_WHITE);

    // Temp & Humidity line
    display.setCursor(0, 13);
    display.printf("T:%.1fC  H:%.0f%%", currentTemp, currentHum);

    // Gas & Flame line
    display.setCursor(0, 25);
    display.printf("Gas:%d %s", currentGasRaw, (currentGasRaw > 2600) ? "!WARN" : "OK");

    display.setCursor(0, 37);
    if (flameDetected) {
      display.print(F("FLAME: !! FIRE !!"));
    } else {
      display.printf("FIRE:SAFE  RLY:%s", relayTripped ? "TRIP" : "OK");
    }

    // GPS line
    display.setCursor(0, 49);
    if (gps.location.isValid()) {
      display.printf("%.3f,%.3f", currentLat, currentLng);
    } else {
      display.print(F("GPS: Searching sat.."));
    }

    display.display();

    // 7. Output Canonical JSON over Serial to Uno Q / Dashboard
    // Format is easily parsed with ArduinoJson or line reader on Uno Q
    Serial.printf("{\"seq\":%lu,\"temp\":%.1f,\"hum\":%.1f,\"gas\":%d,\"fire\":%d,\"relay\":%d,\"lat\":%.5f,\"lng\":%.5f,\"sats\":%d}\n",
      packetCounter, currentTemp, currentHum, currentGasRaw,
      flameDetected ? 1 : 0,
      relayTripped ? 1 : 0,
      currentLat, currentLng, satCount
    );
  }
}
