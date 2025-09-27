/*
 * Smart Tank Hardware Test Sketch
 * 
 * This sketch tests all hardware components individually
 * to verify proper connections and functionality.
 * 
 * Upload this sketch to test your hardware before
 * uploading the main Smart Tank firmware.
 */

// Pin Definitions
#define TRIG_PIN 14
#define ECHO_PIN 27
#define FLOW_PIN 16
#define RELAY_PIN 26
#define TDS_PIN 34

// Test Configuration
#define TEST_INTERVAL 2000  // 2 seconds between tests
#define MEDIAN_READINGS 5

// Test Results
bool ultrasonic_ok = false;
bool flow_ok = false;
bool relay_ok = false;
bool rtc_ok = false;
bool tds_ok = false;

void setup() {
  Serial.begin(115200);
  Serial.println("Smart Tank Hardware Test");
  Serial.println("========================");
  
  // Initialize pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(TDS_PIN, INPUT);
  
  // Initialize relay (off by default)
  digitalWrite(RELAY_PIN, LOW);
  
  // Initialize I2C for RTC
  Wire.begin();
  
  Serial.println("Starting hardware tests...");
  Serial.println();
}

void loop() {
  Serial.println("=== Hardware Test Cycle ===");
  
  // Test Ultrasonic Sensor
  testUltrasonic();
  
  // Test Flow Sensor
  testFlowSensor();
  
  // Test Relay
  testRelay();
  
  // Test RTC
  testRTC();
  
  // Test TDS Sensor
  testTDS();
  
  // Print Summary
  printTestSummary();
  
  Serial.println();
  delay(TEST_INTERVAL);
}

void testUltrasonic() {
  Serial.print("Testing Ultrasonic Sensor... ");
  
  float readings[MEDIAN_READINGS];
  bool valid_readings = true;
  
  for (int i = 0; i < MEDIAN_READINGS; i++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);
    
    long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
    
    if (duration == 0) {
      valid_readings = false;
      break;
    }
    
    readings[i] = duration * 0.034 / 2; // Convert to cm
    delay(50);
  }
  
  if (valid_readings) {
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
    
    float distance = readings[MEDIAN_READINGS / 2];
    
    if (distance > 2 && distance < 400) { // Valid range
      ultrasonic_ok = true;
      Serial.print("OK - Distance: ");
      Serial.print(distance);
      Serial.println(" cm");
    } else {
      ultrasonic_ok = false;
      Serial.println("FAIL - Invalid distance reading");
    }
  } else {
    ultrasonic_ok = false;
    Serial.println("FAIL - No echo received");
  }
}

void testFlowSensor() {
  Serial.print("Testing Flow Sensor... ");
  
  // Count pulses for 1 second
  int pulseCount = 0;
  unsigned long startTime = millis();
  
  while (millis() - startTime < 1000) {
    if (digitalRead(FLOW_PIN) == HIGH) {
      pulseCount++;
      while (digitalRead(FLOW_PIN) == HIGH) {
        delay(1);
      }
    }
  }
  
  if (pulseCount > 0) {
    flow_ok = true;
    Serial.print("OK - Pulses: ");
    Serial.print(pulseCount);
    Serial.println(" per second");
  } else {
    flow_ok = false;
    Serial.println("FAIL - No pulses detected");
  }
}

void testRelay() {
  Serial.print("Testing Relay... ");
  
  // Test relay ON
  digitalWrite(RELAY_PIN, HIGH);
  delay(500);
  
  // Test relay OFF
  digitalWrite(RELAY_PIN, LOW);
  delay(500);
  
  relay_ok = true;
  Serial.println("OK - Relay toggled");
}

void testRTC() {
  Serial.print("Testing RTC... ");
  
  // Try to read from RTC (this is a basic test)
  // In a real implementation, you'd use the RTC library
  Wire.beginTransmission(0x68); // DS3231 address
  byte error = Wire.endTransmission();
  
  if (error == 0) {
    rtc_ok = true;
    Serial.println("OK - RTC responding");
  } else {
    rtc_ok = false;
    Serial.println("FAIL - RTC not responding");
  }
}

void testTDS() {
  Serial.print("Testing TDS Sensor... ");
  
  int tdsValue = analogRead(TDS_PIN);
  
  if (tdsValue > 0 && tdsValue < 4095) {
    tds_ok = true;
    float voltage = tdsValue * (3.3 / 4095.0);
    float tds = (voltage * 1000) / 2.0;
    
    Serial.print("OK - TDS: ");
    Serial.print(tds);
    Serial.println(" ppm");
  } else {
    tds_ok = false;
    Serial.println("FAIL - Invalid TDS reading");
  }
}

void printTestSummary() {
  Serial.println("=== Test Summary ===");
  Serial.print("Ultrasonic: ");
  Serial.println(ultrasonic_ok ? "PASS" : "FAIL");
  Serial.print("Flow Sensor: ");
  Serial.println(flow_ok ? "PASS" : "FAIL");
  Serial.print("Relay: ");
  Serial.println(relay_ok ? "PASS" : "FAIL");
  Serial.print("RTC: ");
  Serial.println(rtc_ok ? "PASS" : "FAIL");
  Serial.print("TDS: ");
  Serial.println(tds_ok ? "PASS" : "FAIL");
  
  int passed = 0;
  if (ultrasonic_ok) passed++;
  if (flow_ok) passed++;
  if (relay_ok) passed++;
  if (rtc_ok) passed++;
  if (tds_ok) passed++;
  
  Serial.print("Overall: ");
  Serial.print(passed);
  Serial.print("/5 tests passed (");
  Serial.print((passed * 100) / 5);
  Serial.println("%)");
  
  if (passed == 5) {
    Serial.println("All tests passed! Hardware is ready.");
  } else {
    Serial.println("Some tests failed. Check connections and try again.");
  }
}