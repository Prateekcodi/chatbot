# Smart Tank: Consumption Forecast + Leak Alerts

A comprehensive IoT solution for monitoring water tank levels, predicting consumption, detecting leaks, and providing real-time alerts using ESP32 and ultrasonic sensors.

## 🎯 Project Overview

A device that measures tank level, logs usage, predicts days until empty, detects leaks and pump faults, and notifies you. ESP32 handles sensing and connectivity while a lightweight server processes data for predictions and notifications.

## ✨ Features

- **Real-time tank level monitoring** with ultrasonic sensor
- **Consumption tracking** with flow sensors
- **Smart predictions** for days until empty
- **Leak detection** and pump fault alerts
- **Overflow protection** with automatic pump control
- **Web dashboard** with charts and notifications
- **Mobile-friendly interface**

## 🛠 Hardware Requirements

### Core Components
- ESP32 development board
- Ultrasonic distance sensor (HC-SR04) - ₹150
- Water flow sensor (YF-S201) - ₹300
- Relay module for pump control - ₹150
- RTC module (DS3231) - ₹150
- Wires, headers, project box - ₹400

**Total Core Cost: ~₹1,150**

### Optional Components
- Micro SD module for offline logging - ₹200
- TDS sensor for water quality - ₹600

**Total with Extras: ~₹1,950**

## 📁 Repository Structure

```
smart-tank/
├── firmware/           # ESP32 Arduino code
├── backend/           # FastAPI server
├── dashboard/         # React web interface
├── docs/             # Documentation and schematics
├── testing/          # Calibration and test scripts
└── deployment/       # Docker and deployment configs
```

## 🚀 Quick Start

1. **Hardware Setup**: Follow wiring diagrams in `docs/hardware/`
2. **Firmware**: Upload ESP32 code from `firmware/`
3. **Backend**: Deploy server from `backend/`
4. **Dashboard**: Run web interface from `dashboard/`

## 📊 Data Flow

```
ESP32 Sensors → MQTT/HTTP → Backend Server → Database → Web Dashboard
                     ↓
              Prediction Engine → Alert System → Notifications
```

## 🔧 Key Algorithms

- **Consumption Calculation**: Flow sensor + level delta analysis
- **Leak Detection**: Unexpected level changes when pump is off
- **Prediction**: Moving average consumption with trend analysis
- **Safety**: Overflow protection and pump fault detection

## 📱 Dashboard Features

- Real-time tank level and percentage
- Consumption history charts
- Days-until-empty prediction
- Alert management
- Manual pump controls
- Historical data analysis

## 🔒 Security

- MQTT over TLS for telemetry
- API authentication for controls
- Secure pump activation with confirmation

## 📋 Testing

- Ultrasonic sensor calibration
- Flow sensor verification
- Leak simulation tests
- Notification system validation

## 🎯 Next Steps

Choose what to build first:
- **Firmware**: Complete ESP32 code with all sensors
- **Backend**: FastAPI server with prediction engine
- **Dashboard**: React web interface
- **Testing**: Calibration and validation scripts

## 📞 Support

For questions or issues, refer to the documentation in each component folder or create an issue in this repository.