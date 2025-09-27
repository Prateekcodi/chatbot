#!/usr/bin/env python3
"""
Smart Tank Testing Scripts

This script provides automated testing for the Smart Tank monitoring system.
It includes sensor calibration, system validation, and performance testing.
"""

import requests
import json
import time
import statistics
from datetime import datetime, timedelta
from typing import List, Dict, Any
import argparse
import sys

class SmartTankTester:
    def __init__(self, api_base_url: str = "http://localhost:8000"):
        self.api_base_url = api_base_url
        self.device_id = "tank01"
        self.test_results = []
        
    def log_test(self, test_name: str, status: str, message: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"[{status.upper()}] {test_name}: {message}")
        
    def test_api_health(self) -> bool:
        """Test API health endpoint"""
        try:
            response = requests.get(f"{self.api_base_url}/health", timeout=5)
            if response.status_code == 200:
                self.log_test("API Health", "PASS", "API is responding")
                return True
            else:
                self.log_test("API Health", "FAIL", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Health", "FAIL", str(e))
            return False
            
    def test_device_status(self) -> bool:
        """Test device status endpoint"""
        try:
            response = requests.get(f"{self.api_base_url}/devices/{self.device_id}/status", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Device Status", "PASS", f"Device online: {data.get('percent_full', 0):.1f}%")
                return True
            else:
                self.log_test("Device Status", "FAIL", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Device Status", "FAIL", str(e))
            return False
            
    def test_telemetry_data(self) -> bool:
        """Test telemetry data endpoint"""
        try:
            response = requests.get(f"{self.api_base_url}/devices/{self.device_id}/telemetry?hours=1", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if len(data) > 0:
                    self.log_test("Telemetry Data", "PASS", f"Received {len(data)} data points")
                    return True
                else:
                    self.log_test("Telemetry Data", "WARN", "No data points received")
                    return False
            else:
                self.log_test("Telemetry Data", "FAIL", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Telemetry Data", "FAIL", str(e))
            return False
            
    def test_alerts_system(self) -> bool:
        """Test alerts system"""
        try:
            response = requests.get(f"{self.api_base_url}/devices/{self.device_id}/alerts", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Alerts System", "PASS", f"Found {len(data)} alerts")
                return True
            else:
                self.log_test("Alerts System", "FAIL", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Alerts System", "FAIL", str(e))
            return False
            
    def test_predictions(self) -> bool:
        """Test predictions endpoint"""
        try:
            response = requests.get(f"{self.api_base_url}/devices/{self.device_id}/predictions?days_ahead=7", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "predictions" in data:
                    self.log_test("Predictions", "PASS", f"Generated {len(data['predictions'])} predictions")
                    return True
                else:
                    self.log_test("Predictions", "FAIL", "No predictions in response")
                    return False
            else:
                self.log_test("Predictions", "FAIL", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Predictions", "FAIL", str(e))
            return False
            
    def test_sensor_accuracy(self, expected_level: float, tolerance: float = 5.0) -> bool:
        """Test sensor accuracy against expected level"""
        try:
            response = requests.get(f"{self.api_base_url}/devices/{self.device_id}/status", timeout=5)
            if response.status_code == 200:
                data = response.json()
                actual_level = data.get('percent_full', 0)
                difference = abs(actual_level - expected_level)
                
                if difference <= tolerance:
                    self.log_test("Sensor Accuracy", "PASS", 
                                f"Expected: {expected_level}%, Actual: {actual_level:.1f}%, Diff: {difference:.1f}%")
                    return True
                else:
                    self.log_test("Sensor Accuracy", "FAIL", 
                                f"Expected: {expected_level}%, Actual: {actual_level:.1f}%, Diff: {difference:.1f}%")
                    return False
            else:
                self.log_test("Sensor Accuracy", "FAIL", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Sensor Accuracy", "FAIL", str(e))
            return False
            
    def test_data_consistency(self) -> bool:
        """Test data consistency over time"""
        try:
            readings = []
            for i in range(5):
                response = requests.get(f"{self.api_base_url}/devices/{self.device_id}/status", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    readings.append(data.get('percent_full', 0))
                time.sleep(2)
                
            if len(readings) >= 3:
                std_dev = statistics.stdev(readings)
                if std_dev < 2.0:  # Less than 2% standard deviation
                    self.log_test("Data Consistency", "PASS", f"Std dev: {std_dev:.2f}%")
                    return True
                else:
                    self.log_test("Data Consistency", "WARN", f"High variation: {std_dev:.2f}%")
                    return False
            else:
                self.log_test("Data Consistency", "FAIL", "Insufficient readings")
                return False
        except Exception as e:
            self.log_test("Data Consistency", "FAIL", str(e))
            return False
            
    def test_response_times(self) -> bool:
        """Test API response times"""
        try:
            start_time = time.time()
            response = requests.get(f"{self.api_base_url}/devices/{self.device_id}/status", timeout=5)
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            if response_time < 1000:  # Less than 1 second
                self.log_test("Response Time", "PASS", f"{response_time:.0f}ms")
                return True
            else:
                self.log_test("Response Time", "WARN", f"Slow response: {response_time:.0f}ms")
                return False
        except Exception as e:
            self.log_test("Response Time", "FAIL", str(e))
            return False
            
    def test_leak_simulation(self) -> bool:
        """Simulate leak detection test"""
        try:
            # This would require actual hardware simulation
            # For now, just test the alerts endpoint
            response = requests.get(f"{self.api_base_url}/devices/{self.device_id}/alerts", timeout=5)
            if response.status_code == 200:
                self.log_test("Leak Simulation", "PASS", "Alerts endpoint accessible")
                return True
            else:
                self.log_test("Leak Simulation", "FAIL", f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Leak Simulation", "FAIL", str(e))
            return False
            
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return summary"""
        print("Starting Smart Tank System Tests...")
        print("=" * 50)
        
        tests = [
            ("API Health", self.test_api_health),
            ("Device Status", self.test_device_status),
            ("Telemetry Data", self.test_telemetry_data),
            ("Alerts System", self.test_alerts_system),
            ("Predictions", self.test_predictions),
            ("Data Consistency", self.test_data_consistency),
            ("Response Times", self.test_response_times),
            ("Leak Simulation", self.test_leak_simulation),
        ]
        
        passed = 0
        failed = 0
        warned = 0
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                if result:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log_test(test_name, "FAIL", f"Exception: {str(e)}")
                failed += 1
                
        # Count warnings
        for result in self.test_results:
            if result["status"] == "WARN":
                warned += 1
                
        summary = {
            "total_tests": len(tests),
            "passed": passed,
            "failed": failed,
            "warnings": warned,
            "success_rate": (passed / len(tests)) * 100,
            "results": self.test_results
        }
        
        print("=" * 50)
        print(f"Test Summary:")
        print(f"  Total Tests: {summary['total_tests']}")
        print(f"  Passed: {summary['passed']}")
        print(f"  Failed: {summary['failed']}")
        print(f"  Warnings: {summary['warnings']}")
        print(f"  Success Rate: {summary['success_rate']:.1f}%")
        
        return summary
        
    def save_results(self, filename: str = None):
        """Save test results to file"""
        if filename is None:
            filename = f"test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
        with open(filename, 'w') as f:
            json.dump(self.test_results, f, indent=2)
            
        print(f"Results saved to {filename}")

def main():
    parser = argparse.ArgumentParser(description="Smart Tank Testing Script")
    parser.add_argument("--api-url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--device-id", default="tank01", help="Device ID to test")
    parser.add_argument("--output", help="Output file for results")
    parser.add_argument("--test", choices=["all", "health", "sensors", "api"], default="all", help="Specific test to run")
    
    args = parser.parse_args()
    
    tester = SmartTankTester(args.api_url)
    tester.device_id = args.device_id
    
    if args.test == "all":
        summary = tester.run_all_tests()
        if args.output:
            tester.save_results(args.output)
        sys.exit(0 if summary["failed"] == 0 else 1)
    elif args.test == "health":
        success = tester.test_api_health()
        sys.exit(0 if success else 1)
    elif args.test == "sensors":
        success = tester.test_sensor_accuracy(50.0)  # Test against 50% level
        sys.exit(0 if success else 1)
    elif args.test == "api":
        success = tester.test_api_health() and tester.test_device_status()
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()