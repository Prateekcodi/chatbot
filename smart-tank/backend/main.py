"""
Smart Tank Backend - FastAPI Server

Features:
- MQTT telemetry ingestion
- Tank level monitoring and predictions
- Leak detection algorithms
- Alert management
- REST API for dashboard
- Real-time notifications
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json
import logging
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import paho.mqtt.client as mqtt
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./smart_tank.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Pydantic models
class TelemetryData(BaseModel):
    device_id: str
    ts: int
    level_cm: float
    tank_height_cm: float
    percent_full: float
    flow_l_min: float
    pump_state: str
    temperature_c: float
    tds_ppm: float

class AlertData(BaseModel):
    device_id: str
    alert_type: str
    message: str
    timestamp: int
    level_cm: float
    percent_full: float

class TankStatus(BaseModel):
    device_id: str
    current_level: float
    percent_full: float
    flow_rate: float
    pump_state: bool
    temperature: float
    tds: float
    last_update: datetime
    days_until_empty: Optional[float] = None
    consumption_today: Optional[float] = None
    consumption_week: Optional[float] = None

class PredictionRequest(BaseModel):
    device_id: str
    days_ahead: int = 7

# Database models
class Telemetry(Base):
    __tablename__ = "telemetry"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    timestamp = Column(DateTime, index=True)
    level_cm = Column(Float)
    tank_height_cm = Column(Float)
    percent_full = Column(Float)
    flow_l_min = Column(Float)
    pump_state = Column(String)
    temperature_c = Column(Float)
    tds_ppm = Column(Float)

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    alert_type = Column(String)
    message = Column(String)
    timestamp = Column(DateTime, index=True)
    level_cm = Column(Float)
    percent_full = Column(Float)
    resolved = Column(Boolean, default=False)

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True)
    tank_height_cm = Column(Float)
    tank_diameter_cm = Column(Float)
    tank_capacity_liters = Column(Float)
    leak_threshold_percent = Column(Float, default=1.0)
    overflow_threshold_percent = Column(Float, default=95.0)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(
    title="Smart Tank API",
    description="API for Smart Tank monitoring and prediction system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Global variables
mqtt_client = None
device_status = {}

# MQTT Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

# Notification settings
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Simple token verification - implement proper JWT in production
    if credentials.credentials != "your-secret-token":
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials.credentials

# MQTT Callbacks
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Connected to MQTT broker")
        client.subscribe("tank/telemetry")
        client.subscribe("tank/alerts")
    else:
        logger.error(f"Failed to connect to MQTT broker: {rc}")

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode())
        
        if topic == "tank/telemetry":
            process_telemetry(payload)
        elif topic == "tank/alerts":
            process_alert(payload)
            
    except Exception as e:
        logger.error(f"Error processing MQTT message: {e}")

def process_telemetry(data: dict):
    """Process incoming telemetry data"""
    try:
        db = SessionLocal()
        
        # Store telemetry data
        telemetry = Telemetry(
            device_id=data["device_id"],
            timestamp=datetime.fromtimestamp(data["ts"]),
            level_cm=data["level_cm"],
            tank_height_cm=data["tank_height_cm"],
            percent_full=data["percent_full"],
            flow_l_min=data["flow_l_min"],
            pump_state=data["pump_state"],
            temperature_c=data["temperature_c"],
            tds_ppm=data["tds_ppm"]
        )
        
        db.add(telemetry)
        db.commit()
        
        # Update device status
        device_status[data["device_id"]] = {
            "current_level": data["level_cm"],
            "percent_full": data["percent_full"],
            "flow_rate": data["flow_l_min"],
            "pump_state": data["pump_state"] == "ON",
            "temperature": data["temperature_c"],
            "tds": data["tds_ppm"],
            "last_update": datetime.fromtimestamp(data["ts"])
        }
        
        # Run prediction and leak detection
        asyncio.create_task(run_analysis(data["device_id"]))
        
        db.close()
        
    except Exception as e:
        logger.error(f"Error processing telemetry: {e}")

def process_alert(data: dict):
    """Process incoming alert data"""
    try:
        db = SessionLocal()
        
        alert = Alert(
            device_id=data["device_id"],
            alert_type=data["alert_type"],
            message=data["message"],
            timestamp=datetime.fromtimestamp(data["timestamp"]),
            level_cm=data["level_cm"],
            percent_full=data["percent_full"]
        )
        
        db.add(alert)
        db.commit()
        
        # Send notification
        send_notification(alert)
        
        db.close()
        
    except Exception as e:
        logger.error(f"Error processing alert: {e}")

async def run_analysis(device_id: str):
    """Run prediction and leak detection analysis"""
    try:
        db = SessionLocal()
        
        # Get recent telemetry data
        recent_data = db.query(Telemetry).filter(
            Telemetry.device_id == device_id,
            Telemetry.timestamp >= datetime.utcnow() - timedelta(days=7)
        ).order_by(Telemetry.timestamp.desc()).all()
        
        if len(recent_data) < 2:
            db.close()
            return
        
        # Calculate consumption and predictions
        consumption_data = calculate_consumption(recent_data)
        days_until_empty = predict_days_until_empty(consumption_data, device_status.get(device_id, {}))
        
        # Update device status with predictions
        if device_id in device_status:
            device_status[device_id]["days_until_empty"] = days_until_empty
            device_status[device_id]["consumption_today"] = consumption_data.get("today", 0)
            device_status[device_id]["consumption_week"] = consumption_data.get("week", 0)
        
        # Check for leaks
        await check_leak_detection(device_id, recent_data)
        
        db.close()
        
    except Exception as e:
        logger.error(f"Error in analysis: {e}")

def calculate_consumption(telemetry_data: List[Telemetry]) -> Dict[str, float]:
    """Calculate consumption from telemetry data"""
    if len(telemetry_data) < 2:
        return {"today": 0, "week": 0}
    
    # Calculate daily consumption
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    
    today_data = [t for t in telemetry_data if t.timestamp.date() == today]
    week_data = [t for t in telemetry_data if t.timestamp.date() >= week_ago]
    
    # Calculate consumption from level changes
    today_consumption = 0
    if len(today_data) >= 2:
        level_change = today_data[-1].level_cm - today_data[0].level_cm
        # Convert to liters (assuming circular tank)
        tank_radius = 50  # cm - should be from device config
        tank_area = 3.14159 * tank_radius * tank_radius
        today_consumption = abs(level_change * tank_area / 1000)  # Convert to liters
    
    week_consumption = 0
    if len(week_data) >= 2:
        level_change = week_data[-1].level_cm - week_data[0].level_cm
        tank_radius = 50  # cm
        tank_area = 3.14159 * tank_radius * tank_radius
        week_consumption = abs(level_change * tank_area / 1000)
    
    return {
        "today": today_consumption,
        "week": week_consumption
    }

def predict_days_until_empty(consumption_data: Dict[str, float], device_status: Dict[str, Any]) -> Optional[float]:
    """Predict days until tank is empty"""
    if not device_status or "percent_full" not in device_status:
        return None
    
    current_percent = device_status["percent_full"]
    if current_percent <= 0:
        return 0
    
    # Use weekly average consumption
    weekly_consumption = consumption_data.get("week", 0)
    if weekly_consumption <= 0:
        return None
    
    daily_consumption = weekly_consumption / 7
    if daily_consumption <= 0:
        return None
    
    # Calculate remaining volume
    tank_capacity = 1178  # liters - should be from device config
    remaining_volume = (current_percent / 100) * tank_capacity
    
    days_until_empty = remaining_volume / daily_consumption
    
    return max(0, days_until_empty)

async def check_leak_detection(device_id: str, telemetry_data: List[Telemetry]):
    """Check for potential leaks"""
    if len(telemetry_data) < 2:
        return
    
    # Get device configuration
    db = SessionLocal()
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        db.close()
        return
    
    # Check for unexpected level drops when pump is off
    recent_data = telemetry_data[:10]  # Last 10 readings
    
    for i in range(1, len(recent_data)):
        current = recent_data[i-1]
        previous = recent_data[i]
        
        # If pump was off and level dropped significantly
        if (current.pump_state == "OFF" and 
            previous.pump_state == "OFF" and
            current.level_cm < previous.level_cm):
            
            level_drop = previous.level_cm - current.level_cm
            percent_drop = (level_drop / device.tank_height_cm) * 100
            
            if percent_drop > device.leak_threshold_percent:
                # Create leak alert
                alert = Alert(
                    device_id=device_id,
                    alert_type="LEAK_DETECTED",
                    message=f"Unexpected level drop of {percent_drop:.1f}% detected",
                    timestamp=datetime.utcnow(),
                    level_cm=current.level_cm,
                    percent_full=current.percent_full
                )
                
                db.add(alert)
                db.commit()
                
                # Send notification
                send_notification(alert)
                
                break
    
    db.close()

def send_notification(alert: Alert):
    """Send notification via Telegram"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    
    message = f"""
🚨 Smart Tank Alert
Device: {alert.device_id}
Type: {alert.alert_type}
Message: {alert.message}
Level: {alert.level_cm:.1f} cm ({alert.percent_full:.1f}%)
Time: {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
"""
    
    try:
        import requests
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message
        }
        requests.post(url, data=data)
    except Exception as e:
        logger.error(f"Error sending Telegram notification: {e}")

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Smart Tank API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/devices/{device_id}/status", response_model=TankStatus)
async def get_device_status(device_id: str, db: Session = Depends(get_db)):
    """Get current status of a device"""
    if device_id not in device_status:
        raise HTTPException(status_code=404, detail="Device not found")
    
    status = device_status[device_id]
    
    return TankStatus(
        device_id=device_id,
        current_level=status["current_level"],
        percent_full=status["percent_full"],
        flow_rate=status["flow_rate"],
        pump_state=status["pump_state"],
        temperature=status["temperature"],
        tds=status["tds"],
        last_update=status["last_update"],
        days_until_empty=status.get("days_until_empty"),
        consumption_today=status.get("consumption_today"),
        consumption_week=status.get("consumption_week")
    )

@app.get("/devices/{device_id}/telemetry")
async def get_telemetry(
    device_id: str, 
    hours: int = 24,
    db: Session = Depends(get_db)
):
    """Get telemetry data for a device"""
    since = datetime.utcnow() - timedelta(hours=hours)
    
    telemetry = db.query(Telemetry).filter(
        Telemetry.device_id == device_id,
        Telemetry.timestamp >= since
    ).order_by(Telemetry.timestamp.desc()).all()
    
    return [
        {
            "timestamp": t.timestamp,
            "level_cm": t.level_cm,
            "percent_full": t.percent_full,
            "flow_l_min": t.flow_l_min,
            "pump_state": t.pump_state,
            "temperature_c": t.temperature_c,
            "tds_ppm": t.tds_ppm
        }
        for t in telemetry
    ]

@app.get("/devices/{device_id}/alerts")
async def get_alerts(
    device_id: str,
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get alerts for a device"""
    query = db.query(Alert).filter(Alert.device_id == device_id)
    
    if resolved is not None:
        query = query.filter(Alert.resolved == resolved)
    
    alerts = query.order_by(Alert.timestamp.desc()).limit(50).all()
    
    return [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "message": a.message,
            "timestamp": a.timestamp,
            "level_cm": a.level_cm,
            "percent_full": a.percent_full,
            "resolved": a.resolved
        }
        for a in alerts
    ]

@app.post("/devices/{device_id}/alerts/{alert_id}/resolve")
async def resolve_alert(
    device_id: str,
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Mark an alert as resolved"""
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.device_id == device_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.resolved = True
    db.commit()
    
    return {"message": "Alert resolved"}

@app.get("/devices/{device_id}/predictions")
async def get_predictions(
    device_id: str,
    days_ahead: int = 7,
    db: Session = Depends(get_db)
):
    """Get consumption predictions for a device"""
    # Get historical data
    since = datetime.utcnow() - timedelta(days=30)
    telemetry = db.query(Telemetry).filter(
        Telemetry.device_id == device_id,
        Telemetry.timestamp >= since
    ).order_by(Telemetry.timestamp.asc()).all()
    
    if len(telemetry) < 2:
        return {"predictions": [], "message": "Insufficient data for predictions"}
    
    # Calculate daily consumption
    daily_consumption = calculate_daily_consumption(telemetry)
    
    # Generate predictions
    predictions = []
    current_date = datetime.utcnow().date()
    
    for i in range(days_ahead):
        date = current_date + timedelta(days=i)
        predicted_consumption = daily_consumption
        predictions.append({
            "date": date.isoformat(),
            "predicted_consumption": predicted_consumption
        })
    
    return {"predictions": predictions}

def calculate_daily_consumption(telemetry: List[Telemetry]) -> float:
    """Calculate average daily consumption from telemetry data"""
    if len(telemetry) < 2:
        return 0
    
    # Group by date and calculate daily consumption
    daily_data = {}
    for t in telemetry:
        date = t.timestamp.date()
        if date not in daily_data:
            daily_data[date] = []
        daily_data[date].append(t)
    
    daily_consumptions = []
    for date, data in daily_data.items():
        if len(data) >= 2:
            level_change = data[-1].level_cm - data[0].level_cm
            # Convert to liters (assuming circular tank)
            tank_radius = 50  # cm
            tank_area = 3.14159 * tank_radius * tank_radius
            consumption = abs(level_change * tank_area / 1000)
            daily_consumptions.append(consumption)
    
    return sum(daily_consumptions) / len(daily_consumptions) if daily_consumptions else 0

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize MQTT client on startup"""
    global mqtt_client
    
    mqtt_client = mqtt.Client()
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    
    if MQTT_USER and MQTT_PASSWORD:
        mqtt_client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
    
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
        logger.info("MQTT client started")
    except Exception as e:
        logger.error(f"Failed to connect to MQTT broker: {e}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        logger.info("MQTT client stopped")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)