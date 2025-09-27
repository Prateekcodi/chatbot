# Smart Tank Testing Suite

This directory contains comprehensive testing tools for the Smart Tank monitoring system.

## Testing Components

### 1. Calibration Guide (`calibration_guide.md`)
- Step-by-step calibration instructions
- Sensor accuracy verification
- System configuration guidelines
- Troubleshooting common issues

### 2. Test Scripts (`test_scripts.py`)
- Automated API testing
- Sensor accuracy validation
- Performance benchmarking
- System health monitoring

### 3. Hardware Test (`hardware_test.ino`)
- Individual component testing
- Connection verification
- Pin configuration validation
- Real-time diagnostics

## Quick Start

### 1. Hardware Testing
1. Upload `hardware_test.ino` to your ESP32
2. Open Serial Monitor (115200 baud)
3. Verify all components are working
4. Check test results and fix any issues

### 2. Software Testing
1. Ensure backend is running
2. Run test script:
   ```bash
   python test_scripts.py --api-url http://localhost:8000
   ```
3. Review test results
4. Fix any failing tests

### 3. Calibration
1. Follow the calibration guide
2. Test with known reference values
3. Adjust calibration parameters
4. Verify accuracy

## Test Categories

### Hardware Tests
- **Ultrasonic Sensor**: Distance measurement accuracy
- **Flow Sensor**: Pulse counting and calibration
- **Relay Module**: ON/OFF functionality
- **RTC Module**: Time keeping and I2C communication
- **TDS Sensor**: Water quality measurement

### Software Tests
- **API Health**: Backend connectivity
- **Device Status**: Real-time data retrieval
- **Telemetry**: Data logging and storage
- **Alerts**: Notification system
- **Predictions**: Consumption forecasting

### Integration Tests
- **End-to-End**: Complete system workflow
- **Data Flow**: ESP32 → Backend → Dashboard
- **Alert Flow**: Detection → Notification → Resolution
- **Control Flow**: Dashboard → Backend → ESP32

## Running Tests

### Individual Tests
```bash
# Test API health only
python test_scripts.py --test health

# Test sensor accuracy
python test_scripts.py --test sensors

# Test API endpoints
python test_scripts.py --test api
```

### Complete Test Suite
```bash
# Run all tests
python test_scripts.py --test all

# Save results to file
python test_scripts.py --test all --output results.json
```

### Hardware Test
1. Upload `hardware_test.ino` to ESP32
2. Open Serial Monitor
3. Watch test results in real-time
4. Fix any hardware issues

## Test Results

### Expected Results
- **Hardware**: All 5 components should pass
- **API**: All endpoints should respond < 1 second
- **Sensors**: Accuracy within ±5% of expected values
- **Alerts**: Should trigger and resolve properly

### Common Issues

#### Hardware Issues
- **Ultrasonic**: Check wiring, mounting, obstructions
- **Flow Sensor**: Verify orientation, calibration
- **Relay**: Check power supply, connections
- **RTC**: Verify I2C wiring, battery
- **TDS**: Check analog input, voltage levels

#### Software Issues
- **API**: Check backend status, network connectivity
- **Database**: Verify connection, data persistence
- **MQTT**: Check broker connection, topic configuration
- **Dashboard**: Verify API calls, data rendering

## Troubleshooting

### Hardware Troubleshooting
1. **Check Connections**: Verify all wiring
2. **Power Supply**: Ensure adequate power
3. **Pin Conflicts**: Avoid reserved pins
4. **Voltage Levels**: Match 3.3V/5V requirements

### Software Troubleshooting
1. **Logs**: Check system logs for errors
2. **Network**: Verify connectivity
3. **Configuration**: Check environment variables
4. **Dependencies**: Ensure all packages installed

### Calibration Issues
1. **Reference Values**: Use known measurements
2. **Multiple Readings**: Take averages
3. **Environmental Factors**: Consider temperature, humidity
4. **Sensor Drift**: Recalibrate periodically

## Maintenance

### Regular Testing
- **Daily**: Check system status
- **Weekly**: Run hardware tests
- **Monthly**: Full system validation
- **Quarterly**: Recalibration

### Performance Monitoring
- **Response Times**: API latency
- **Data Accuracy**: Sensor readings
- **Alert Reliability**: Notification delivery
- **System Uptime**: Availability metrics

## Test Data

### Sample Test Scenarios
1. **Empty Tank**: 0% level, no flow
2. **Half Full**: 50% level, normal flow
3. **Full Tank**: 100% level, overflow protection
4. **Leak Simulation**: Unexpected level drop
5. **Pump Failure**: No flow when pump on

### Test Data Sets
- **Normal Operation**: Typical usage patterns
- **Edge Cases**: Extreme conditions
- **Error Conditions**: Failure scenarios
- **Load Testing**: High frequency data

## Documentation

### Test Reports
- **Hardware Test**: Component status
- **Software Test**: API functionality
- **Integration Test**: End-to-end workflow
- **Performance Test**: System metrics

### Calibration Records
- **Sensor Readings**: Raw and calibrated values
- **Reference Data**: Known measurements
- **Adjustment Factors**: Calibration parameters
- **Validation Results**: Accuracy verification

## Support

### Getting Help
1. **Check Logs**: Review system logs
2. **Test Results**: Analyze test output
3. **Documentation**: Refer to guides
4. **Community**: Ask for help

### Reporting Issues
1. **Describe Problem**: Clear description
2. **Include Logs**: Relevant log entries
3. **Test Results**: Failed test output
4. **Environment**: System configuration

## Best Practices

### Testing
- **Regular Testing**: Schedule automated tests
- **Documentation**: Record all results
- **Calibration**: Maintain accuracy
- **Monitoring**: Continuous validation

### Maintenance
- **Preventive**: Regular checks
- **Corrective**: Fix issues promptly
- **Predictive**: Monitor trends
- **Continuous**: Ongoing improvement