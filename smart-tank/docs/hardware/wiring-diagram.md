# Hardware Wiring Diagram

## ESP32 Pin Assignments

### Ultrasonic Sensor (HC-SR04)
- **VCC** → 5V (or 3.3V for 3.3V version)
- **GND** → GND
- **TRIG** → GPIO 14
- **ECHO** → GPIO 27 (with voltage divider if 5V sensor)

### Flow Sensor (YF-S201)
- **VCC** → 5V
- **GND** → GND
- **Signal** → GPIO 16 (pulse input)

### Relay Module
- **VCC** → 5V
- **GND** → GND
- **IN** → GPIO 26

### RTC Module (DS3231) - I2C
- **VCC** → 3.3V
- **GND** → GND
- **SDA** → GPIO 21
- **SCL** → GPIO 22

### TDS Sensor (Optional)
- **VCC** → 3.3V
- **GND** → GND
- **Analog Out** → GPIO 34 (ADC pin)

### Micro SD Module (Optional) - SPI
- **VCC** → 3.3V
- **GND** → GND
- **MISO** → GPIO 19
- **MOSI** → GPIO 23
- **SCK** → GPIO 18
- **CS** → GPIO 5

## Power Supply

- **ESP32**: 3.3V (from onboard regulator)
- **Sensors**: 5V or 3.3V as specified
- **Relay**: 5V for coil
- **Pump**: 12V (controlled via relay)

## Voltage Dividers

For 5V sensors connecting to 3.3V ESP32:
- Use 10kΩ and 20kΩ resistors in series
- Connect 5V signal to 10kΩ resistor
- Take output from junction of resistors
- Connect other end of 20kΩ to GND

## Safety Notes

- Use optocoupled relays for pump control
- Ensure proper grounding
- Add fuses for pump circuit
- Use waterproof connectors for outdoor installation
- Consider surge protection for power supply

## Pin Conflict Avoidance

Avoid these pins (used by ESP32 internally):
- GPIO 6-11 (flash memory)
- GPIO 16 (used by PSRAM on some boards)
- GPIO 0 (boot mode)
- GPIO 2 (boot mode)

## Recommended Pin Layout

```
ESP32 Dev Board
├── GPIO 14 → Ultrasonic TRIG
├── GPIO 27 → Ultrasonic ECHO (with divider)
├── GPIO 16 → Flow Sensor
├── GPIO 26 → Relay Control
├── GPIO 21 → RTC SDA
├── GPIO 22 → RTC SCL
├── GPIO 34 → TDS Analog
└── GPIO 5  → SD Card CS
```