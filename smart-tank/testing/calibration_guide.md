# Smart Tank Calibration Guide

This guide will help you calibrate your Smart Tank monitoring system for accurate readings.

## Prerequisites

- ESP32 with uploaded firmware
- All sensors connected and powered
- Serial monitor or web dashboard access
- Known reference measurements

## 1. Ultrasonic Sensor Calibration

### Step 1: Physical Setup
1. Mount the ultrasonic sensor at the top of your tank
2. Ensure it's pointing directly down at the water surface
3. Measure the distance from sensor to tank bottom (empty tank)
4. Measure the distance from sensor to water surface when tank is full

### Step 2: Software Calibration
1. Open the Arduino IDE serial monitor
2. Note the raw distance readings for empty and full tank
3. Update the firmware with your tank dimensions:

```cpp
#define TANK_HEIGHT_CM 150.0  // Your tank height
#define TANK_DIAMETER_CM 100.0  // Your tank diameter
```

### Step 3: Verification
1. Fill tank to known levels (25%, 50%, 75%, 100%)
2. Compare readings with expected values
3. Adjust calibration if needed

## 2. Flow Sensor Calibration

### Step 1: Physical Setup
1. Install flow sensor in the water line
2. Ensure proper orientation (arrow shows flow direction)
3. Connect to ESP32 GPIO 16

### Step 2: Calibration Process
1. Run a known volume of water through the sensor
2. Count the pulses generated
3. Calculate calibration factor:

```cpp
// If 1000ml generates 75 pulses
#define FLOW_CALIBRATION_FACTOR 7.5  // Pulses per liter
```

### Step 3: Verification
1. Run 1 liter of water through the sensor
2. Verify the reading is approximately 1.0 L/min
3. Adjust calibration factor if needed

## 3. RTC (Real-Time Clock) Calibration

### Step 1: Set Initial Time
1. Upload firmware with current date/time
2. Verify time is correct in serial monitor
3. Check time persists after power cycle

### Step 2: NTP Sync (if WiFi available)
1. Ensure WiFi credentials are correct
2. Check if time syncs automatically
3. Verify timezone settings

## 4. Tank Capacity Calibration

### Step 1: Calculate Theoretical Capacity
```cpp
// For cylindrical tank
float tank_capacity = PI * (diameter/2)² * height / 1000; // liters
```

### Step 2: Physical Verification
1. Fill tank completely
2. Measure actual water volume
3. Adjust capacity value if needed

## 5. Leak Detection Calibration

### Step 1: Set Threshold
1. Determine acceptable leak rate (e.g., 1% per hour)
2. Update firmware:

```cpp
#define LEAK_THRESHOLD_PERCENT 1.0
```

### Step 2: Test Leak Detection
1. Simulate small leak (drain small amount)
2. Verify alert triggers
3. Adjust threshold if needed

## 6. Pump Control Calibration

### Step 1: Relay Testing
1. Test relay activation/deactivation
2. Verify pump starts/stops correctly
3. Check for proper electrical connections

### Step 2: Safety Limits
1. Set overflow protection level:

```cpp
#define OVERFLOW_THRESHOLD_PERCENT 95.0
```

2. Test overflow protection
3. Verify pump stops at threshold

## 7. Temperature Sensor Calibration (Optional)

### Step 1: Reference Reading
1. Use known temperature reference
2. Compare with sensor reading
3. Apply offset if needed

### Step 2: TDS Sensor Calibration (Optional)
1. Use TDS calibration solution
2. Adjust reading to match known value
3. Verify accuracy over time

## 8. MQTT Configuration

### Step 1: Broker Connection
1. Set MQTT broker address
2. Configure authentication if needed
3. Test message publishing

### Step 2: Topic Configuration
1. Verify telemetry messages
2. Check alert messages
3. Test control commands

## 9. Dashboard Calibration

### Step 1: API Connection
1. Verify backend is running
2. Check API endpoints
3. Test data flow

### Step 2: Display Calibration
1. Compare dashboard readings with physical measurements
2. Adjust display units if needed
3. Verify chart accuracy

## 10. Complete System Test

### Step 1: Full Cycle Test
1. Start with empty tank
2. Fill tank completely
3. Monitor all readings
4. Verify predictions

### Step 2: Alert Testing
1. Test leak detection
2. Test overflow protection
3. Test pump control
4. Verify notifications

## Troubleshooting

### Common Issues

1. **Inaccurate Level Readings**
   - Check sensor mounting
   - Verify tank dimensions
   - Check for obstructions

2. **Flow Sensor Not Working**
   - Check wiring
   - Verify calibration factor
   - Check sensor orientation

3. **RTC Time Issues**
   - Check battery
   - Verify timezone
   - Check NTP sync

4. **MQTT Connection Issues**
   - Check broker address
   - Verify credentials
   - Check network connectivity

5. **Dashboard Not Updating**
   - Check API connection
   - Verify data flow
   - Check browser console

### Calibration Checklist

- [ ] Ultrasonic sensor readings accurate
- [ ] Flow sensor calibrated
- [ ] RTC time correct
- [ ] Tank capacity verified
- [ ] Leak detection working
- [ ] Pump control functional
- [ ] MQTT messages flowing
- [ ] Dashboard displaying correctly
- [ ] Alerts triggering properly
- [ ] Notifications working

## Maintenance Schedule

### Daily
- Check sensor readings
- Verify alerts
- Monitor dashboard

### Weekly
- Clean sensors
- Check connections
- Verify predictions

### Monthly
- Recalibrate sensors
- Update firmware
- Check battery levels

### Quarterly
- Full system test
- Replace batteries
- Update documentation