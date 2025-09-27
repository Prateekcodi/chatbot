/*
 * Smart Tank Monitor - ESP32 Firmware
 * 
 * Features:
 * - Ultrasonic tank level monitoring
 * - Flow sensor for consumption tracking
 * - RTC for accurate timestamps
 * - MQTT telemetry publishing
 * - Leak detection and pump control
 * - Overflow protection
 * 
 * Hardware:
 * - ESP32 Dev Board
 * - HC-SR04 Ultrasonic Sensor (GPIO 14, 27)
 * - YF-S201 Flow Sensor (GPIO 16)
 * - 5V Relay Module (GPIO 26)
 * - DS3231 RTC Module (I2C: GPIO 21, 22)
 * - Optional: TDS Sensor (GPIO 34)
 * - Optional: Micro SD Card (SPI)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <RTClib.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

// Pin Definitions
#define TRIG_PIN 14
#define ECHO_PIN 27
#define FLOW_PIN 16
#define RELAY_PIN 26
#define TDS_PIN 34

// Configuration
#define TANK_HEIGHT_CM 150.0
#define TANK_DIAMETER_CM 100.0
#define TANK_CAPACITY_LITERS 1178.0  // π * (50cm)² * 150cm / 1000
#define LEAK_THRESHOLD_PERCENT 1.0
#define OVERFLOW_THRESHOLD_PERCENT 95.0
#define READING_INTERVAL_MS 30000    // 30 seconds
#define MEDIAN_READINGS 5
#define FLOW_CALIBRATION_FACTOR 7.5  // Pulses per liter

// WiFi and MQTT Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_MQTT_BROKER";
const int mqtt_port = 1883;
const char* mqtt_user = "YOUR_MQTT_USER";
const char* mqtt_password = "YOUR_MQTT_PASSWORD";
const char* device_id = "tank01";

// Global Variables
WiFiClient espClient;
PubSubClient client(espClient);
RTC_DS3231 rtc;

// Sensor Data
struct TankData {
  float level_cm;
  float percent_full;
  float flow_l_min;
  float tds_ppm;
  bool pump_state;
  unsigned long timestamp;
  float temperature;
};

TankData currentData;
TankData previousData;

// Flow sensor variables
volatile int flowPulseCount = 0;
unsigned long lastFlowTime = 0;
float flowRate = 0.0;

// Ultrasonic sensor variables
float ultrasonicReadings[MEDIAN_READINGS];
int readingIndex = 0;

// Alert states
bool leakAlert = false;
bool overflowAlert = false;
bool pumpFaultAlert = false;

// EEPROM addresses for configuration
#define EEPROM_SIZE 512
#define TANK_HEIGHT_ADDR 0
#define TANK_DIAMETER_ADDR 4
#define LEAK_THRESHOLD_ADDR 8

void setup() {
  Serial.begin(115200);
  
  // Initialize EEPROM
  EEPROM.begin(EEPROM_SIZE);
  
  // Load configuration from EEPROM
  loadConfiguration();
  
  // Initialize pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(TDS_PIN, INPUT);
  
  // Initialize relay (pump off by default)
  digitalWrite(RELAY_PIN, LOW);
  
  // Initialize RTC
  if (!rtc.begin()) {
    Serial.println("RTC not found!");
  } else if (rtc.lostPower()) {
    Serial.println("RTC lost power, setting time");
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }
  
  // Attach flow sensor interrupt
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), flowPulse, RISING);
  
  // Initialize WiFi
  setupWiFi();
  
  // Initialize MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  // Initialize sensor arrays
  for (int i = 0; i < MEDIAN_READINGS; i++) {
    ultrasonicReadings[i] = 0.0;
  }
  
  Serial.println("Smart Tank Monitor initialized");
}

void loop() {
  // Maintain MQTT connection
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  // Read sensors
  readSensors();
  
  // Process data and detect issues
  processData();
  
  // Send telemetry
  sendTelemetry();
  
  // Handle alerts
  handleAlerts();
  
  delay(READING_INTERVAL_MS);
}

void setupWiFi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect(device_id, mqtt_user, mqtt_password)) {
      Serial.println("connected");
      client.subscribe("tank/control");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  if (String(topic) == "tank/control") {
    StaticJsonDocument<200> doc;
    deserializeJson(doc, message);
    
    if (doc.containsKey("pump")) {
      bool pumpState = doc["pump"];
      setPumpState(pumpState);
    }
    
    if (doc.containsKey("config")) {
      JsonObject config = doc["config"];
      if (config.containsKey("tank_height")) {
        TANK_HEIGHT_CM = config["tank_height"];
        saveConfiguration();
      }
    }
  }
}

void readSensors() {
  // Read ultrasonic sensor with median filtering
  float level = readUltrasonicLevel();
  currentData.level_cm = level;
  currentData.percent_full = calculatePercentFull(level);
  
  // Read flow sensor
  currentData.flow_l_min = readFlowRate();
  
  // Read TDS sensor (optional)
  currentData.tds_ppm = readTDS();
  
  // Read temperature from RTC
  currentData.temperature = rtc.getTemperature();
  
  // Get timestamp
  DateTime now = rtc.now();
  currentData.timestamp = now.unixtime();
  
  // Get pump state
  currentData.pump_state = digitalRead(RELAY_PIN) == HIGH;
}

float readUltrasonicLevel() {
  // Take multiple readings for median filtering
  float readings[MEDIAN_READINGS];
  
  for (int i = 0; i < MEDIAN_READINGS; i++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);
    
    long duration = pulseIn(ECHO_PIN, HIGH);
    float distance = duration * 0.034 / 2; // Convert to cm
    
    readings[i] = distance;
    delay(50);
  }
  
  // Sort readings for median
  for (int i = 0; i < MEDIAN_READINGS - 1; i++) {
    for (int j = i + 1; j < MEDIAN_READINGS; j++) {
      if (readings[i] > readings[j]) {
        float temp = readings[i];
        readings[i] = readings[j];
        readings[j] = temp;
      }
    }
  }
  
  return readings[MEDIAN_READINGS / 2]; // Return median
}

float readFlowRate() {
  // Calculate flow rate from pulse count
  unsigned long currentTime = millis();
  unsigned long timeDiff = currentTime - lastFlowTime;
  
  if (timeDiff >= 1000) { // Update every second
    flowRate = (flowPulseCount * 60.0) / (FLOW_CALIBRATION_FACTOR * (timeDiff / 1000.0));
    flowPulseCount = 0;
    lastFlowTime = currentTime;
  }
  
  return flowRate;
}

float readTDS() {
  // Read TDS sensor (optional)
  int tdsValue = analogRead(TDS_PIN);
  float voltage = tdsValue * (3.3 / 4095.0);
  float tds = (voltage * 1000) / 2.0; // Rough conversion
  return tds;
}

float calculatePercentFull(float level_cm) {
  if (level_cm >= TANK_HEIGHT_CM) return 0.0;
  if (level_cm <= 0) return 100.0;
  return 100.0 * (1.0 - (level_cm / TANK_HEIGHT_CM));
}

void processData() {
  // Check for leaks
  if (!currentData.pump_state && !previousData.pump_state) {
    float levelChange = previousData.level_cm - currentData.level_cm;
    float percentChange = (levelChange / TANK_HEIGHT_CM) * 100.0;
    
    if (percentChange > LEAK_THRESHOLD_PERCENT) {
      leakAlert = true;
    }
  }
  
  // Check for overflow
  if (currentData.percent_full >= OVERFLOW_THRESHOLD_PERCENT && currentData.pump_state) {
    overflowAlert = true;
    setPumpState(false); // Emergency stop
  }
  
  // Check for pump faults
  if (currentData.pump_state && currentData.flow_l_min < 0.1) {
    // Pump is on but no flow detected
    pumpFaultAlert = true;
  }
  
  // Update previous data
  previousData = currentData;
}

void sendTelemetry() {
  StaticJsonDocument<300> doc;
  
  doc["device_id"] = device_id;
  doc["ts"] = currentData.timestamp;
  doc["level_cm"] = currentData.level_cm;
  doc["tank_height_cm"] = TANK_HEIGHT_CM;
  doc["percent_full"] = currentData.percent_full;
  doc["flow_l_min"] = currentData.flow_l_min;
  doc["pump_state"] = currentData.pump_state ? "ON" : "OFF";
  doc["temperature_c"] = currentData.temperature;
  doc["tds_ppm"] = currentData.tds_ppm;
  
  String telemetry;
  serializeJson(doc, telemetry);
  
  client.publish("tank/telemetry", telemetry.c_str());
  
  Serial.println("Telemetry sent: " + telemetry);
}

void handleAlerts() {
  if (leakAlert) {
    sendAlert("LEAK_DETECTED", "Water level dropping without pump running");
    leakAlert = false;
  }
  
  if (overflowAlert) {
    sendAlert("OVERFLOW", "Tank level critical, pump stopped");
    overflowAlert = false;
  }
  
  if (pumpFaultAlert) {
    sendAlert("PUMP_FAULT", "Pump running but no flow detected");
    pumpFaultAlert = false;
  }
}

void sendAlert(String alertType, String message) {
  StaticJsonDocument<200> doc;
  
  doc["device_id"] = device_id;
  doc["alert_type"] = alertType;
  doc["message"] = message;
  doc["timestamp"] = currentData.timestamp;
  doc["level_cm"] = currentData.level_cm;
  doc["percent_full"] = currentData.percent_full;
  
  String alert;
  serializeJson(doc, alert);
  
  client.publish("tank/alerts", alert.c_str());
  
  Serial.println("Alert sent: " + alert);
}

void setPumpState(bool state) {
  digitalWrite(RELAY_PIN, state ? HIGH : LOW);
  currentData.pump_state = state;
  
  Serial.println("Pump " + String(state ? "ON" : "OFF"));
}

void flowPulse() {
  flowPulseCount++;
}

void loadConfiguration() {
  // Load tank height from EEPROM
  float height = 0;
  EEPROM.get(TANK_HEIGHT_ADDR, height);
  if (height > 0 && height < 500) {
    TANK_HEIGHT_CM = height;
  }
  
  // Load other configuration parameters
  // Add more as needed
}

void saveConfiguration() {
  EEPROM.put(TANK_HEIGHT_ADDR, TANK_HEIGHT_CM);
  EEPROM.commit();
}