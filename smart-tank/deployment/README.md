# Smart Tank Deployment Guide

This guide covers deploying the Smart Tank monitoring system using Docker and other deployment methods.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git repository cloned
- Environment variables configured

### 1. Clone Repository
```bash
git clone <repository-url>
cd smart-tank
```

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

### 3. Deploy with Docker Compose
```bash
cd deployment
docker-compose up -d
```

### 4. Verify Deployment
```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f

# Test API
curl http://localhost:8000/health

# Test Dashboard
curl http://localhost:3000
```

## Deployment Options

### 1. Docker Compose (Recommended)
- **Pros**: Easy setup, all services in one file
- **Cons**: Single machine deployment
- **Use Case**: Development, testing, small production

### 2. Docker Swarm
- **Pros**: Multi-node deployment, high availability
- **Cons**: More complex setup
- **Use Case**: Production with multiple servers

### 3. Kubernetes
- **Pros**: Scalable, production-ready
- **Cons**: Complex configuration
- **Use Case**: Large-scale production

### 4. Manual Deployment
- **Pros**: Full control, custom configuration
- **Cons**: More setup work
- **Use Case**: Custom requirements

## Configuration

### Environment Variables

#### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://smart_tank:password@db:5432/smart_tank

# MQTT
MQTT_BROKER=mqtt
MQTT_PORT=1883
MQTT_USER=
MQTT_PASSWORD=

# Notifications
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Security
API_SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret
```

#### Dashboard
```bash
REACT_APP_API_URL=http://localhost:8000
```

### Database Configuration

#### PostgreSQL
```sql
-- Create database
CREATE DATABASE smart_tank;
CREATE USER smart_tank WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE smart_tank TO smart_tank;
```

#### MySQL (Alternative)
```sql
CREATE DATABASE smart_tank;
CREATE USER 'smart_tank'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON smart_tank.* TO 'smart_tank'@'%';
```

### MQTT Configuration

#### Mosquitto Configuration
```conf
# mosquitto.conf
listener 1883
allow_anonymous true

listener 9001
protocol websockets
```

## Production Deployment

### 1. Security Considerations

#### SSL/TLS
```bash
# Generate SSL certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configure Nginx with SSL
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of configuration
}
```

#### Authentication
```python
# Backend authentication
from fastapi.security import HTTPBearer
from jose import JWTError, jwt

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

#### Network Security
```bash
# Firewall rules
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 1883/tcp # MQTT
ufw deny 5432/tcp  # Database (internal only)
```

### 2. Monitoring and Logging

#### Health Checks
```yaml
# docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

#### Logging
```python
# Backend logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('smart_tank.log'),
        logging.StreamHandler()
    ]
)
```

#### Monitoring
```bash
# Install monitoring tools
docker run -d --name prometheus prom/prometheus
docker run -d --name grafana grafana/grafana
```

### 3. Backup and Recovery

#### Database Backup
```bash
# PostgreSQL backup
docker exec smart_tank_db pg_dump -U smart_tank smart_tank > backup.sql

# Restore
docker exec -i smart_tank_db psql -U smart_tank smart_tank < backup.sql
```

#### Configuration Backup
```bash
# Backup configuration
tar -czf smart_tank_config.tar.gz deployment/
```

### 4. Scaling

#### Horizontal Scaling
```yaml
# docker-compose.yml
services:
  smart-tank-api:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

#### Load Balancing
```nginx
# nginx.conf
upstream backend {
    server smart-tank-api:8000;
    server smart-tank-api-2:8000;
    server smart-tank-api-3:8000;
}

server {
    location /api/ {
        proxy_pass http://backend;
    }
}
```

## Troubleshooting

### Common Issues

#### 1. Services Not Starting
```bash
# Check logs
docker-compose logs service_name

# Check status
docker-compose ps

# Restart service
docker-compose restart service_name
```

#### 2. Database Connection Issues
```bash
# Check database
docker-compose exec db psql -U smart_tank -d smart_tank

# Check connection
docker-compose exec smart-tank-api python -c "import psycopg2; print('DB OK')"
```

#### 3. MQTT Connection Issues
```bash
# Test MQTT
docker-compose exec mqtt mosquitto_pub -h localhost -t test -m "hello"

# Check MQTT logs
docker-compose logs mqtt
```

#### 4. Dashboard Not Loading
```bash
# Check dashboard logs
docker-compose logs smart-tank-dashboard

# Check API connection
curl http://localhost:8000/health
```

### Performance Issues

#### 1. High CPU Usage
```bash
# Check resource usage
docker stats

# Optimize containers
docker-compose down
docker-compose up -d --scale smart-tank-api=2
```

#### 2. Memory Issues
```bash
# Check memory usage
docker system df

# Clean up
docker system prune -a
```

#### 3. Database Performance
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC;
```

## Maintenance

### Regular Tasks

#### Daily
- Check service status
- Monitor logs for errors
- Verify data flow

#### Weekly
- Backup database
- Update dependencies
- Check disk space

#### Monthly
- Security updates
- Performance review
- Capacity planning

### Updates

#### Application Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

#### System Updates
```bash
# Update system
sudo apt update && sudo apt upgrade

# Restart services
docker-compose restart
```

## Support

### Getting Help
1. **Check Logs**: Review service logs
2. **Documentation**: Refer to guides
3. **Community**: Ask for help
4. **Issues**: Report problems

### Monitoring
- **Health Checks**: Automated monitoring
- **Alerts**: Notification system
- **Metrics**: Performance data
- **Logs**: System events

### Backup Strategy
- **Database**: Daily backups
- **Configuration**: Version control
- **Code**: Git repository
- **Data**: Regular exports