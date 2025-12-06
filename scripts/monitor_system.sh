#!/bin/bash
###############################################################################
# Documentiulia System Monitor
# Monitors critical system metrics and sends alerts
###############################################################################

# Configuration
LOG_DIR="/var/log/documentiulia"
ALERT_EMAIL="admin@documentiulia.ro"
ALERT_WEBHOOK=""  # Optional: Slack/Discord webhook URL

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
DB_CONN_THRESHOLD=80

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create log directory
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
ALERT_TRIGGERED=false
ALERT_MESSAGE=""

echo "==========================================="
echo "Documentiulia System Monitor"
echo "==========================================="
echo "Time: $TIMESTAMP"
echo ""

# 1. CPU Usage
echo "Checking CPU usage..."
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d'.' -f1)
if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
    echo -e "${RED}✗${NC} CPU: ${CPU_USAGE}% (threshold: ${CPU_THRESHOLD}%)"
    ALERT_TRIGGERED=true
    ALERT_MESSAGE+="CPU usage critical: ${CPU_USAGE}%\n"
else
    echo -e "${GREEN}✓${NC} CPU: ${CPU_USAGE}%"
fi

# 2. Memory Usage
echo "Checking memory usage..."
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEMORY_USAGE" -gt "$MEMORY_THRESHOLD" ]; then
    echo -e "${RED}✗${NC} Memory: ${MEMORY_USAGE}% (threshold: ${MEMORY_THRESHOLD}%)"
    ALERT_TRIGGERED=true
    ALERT_MESSAGE+="Memory usage critical: ${MEMORY_USAGE}%\n"
else
    echo -e "${GREEN}✓${NC} Memory: ${MEMORY_USAGE}%"
fi

# 3. Disk Usage
echo "Checking disk usage..."
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    echo -e "${RED}✗${NC} Disk: ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
    ALERT_TRIGGERED=true
    ALERT_MESSAGE+="Disk usage critical: ${DISK_USAGE}%\n"
else
    echo -e "${GREEN}✓${NC} Disk: ${DISK_USAGE}%"
fi

# 4. Database Connections
echo "Checking database connections..."
DB_CONNECTIONS=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'accountech_production';" 2>/dev/null | xargs)
DB_MAX_CONNECTIONS=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "SHOW max_connections;" 2>/dev/null | xargs)

if [ ! -z "$DB_CONNECTIONS" ] && [ ! -z "$DB_MAX_CONNECTIONS" ]; then
    DB_USAGE_PCT=$((DB_CONNECTIONS * 100 / DB_MAX_CONNECTIONS))
    if [ "$DB_USAGE_PCT" -gt "$DB_CONN_THRESHOLD" ]; then
        echo -e "${RED}✗${NC} DB Connections: ${DB_CONNECTIONS}/${DB_MAX_CONNECTIONS} (${DB_USAGE_PCT}%)"
        ALERT_TRIGGERED=true
        ALERT_MESSAGE+="Database connections critical: ${DB_CONNECTIONS}/${DB_MAX_CONNECTIONS}\n"
    else
        echo -e "${GREEN}✓${NC} DB Connections: ${DB_CONNECTIONS}/${DB_MAX_CONNECTIONS} (${DB_USAGE_PCT}%)"
    fi
else
    echo -e "${YELLOW}⚠${NC} Could not check database connections"
fi

# 5. Service Status
echo "Checking services..."

# Check PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✓${NC} PostgreSQL: Running"
else
    echo -e "${RED}✗${NC} PostgreSQL: Stopped"
    ALERT_TRIGGERED=true
    ALERT_MESSAGE+="PostgreSQL service is down\n"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓${NC} Nginx: Running"
else
    echo -e "${YELLOW}⚠${NC} Nginx: Not running"
fi

# Check PHP-FPM
if systemctl is-active --quiet php8.2-fpm; then
    echo -e "${GREEN}✓${NC} PHP-FPM: Running"
else
    echo -e "${RED}✗${NC} PHP-FPM: Stopped"
    ALERT_TRIGGERED=true
    ALERT_MESSAGE+="PHP-FPM service is down\n"
fi

# 6. Application Health
echo "Checking application health..."
if [ -f "/var/www/documentiulia.ro/scripts/health_check.php" ]; then
    HEALTH_SCORE=$(php /var/www/documentiulia.ro/scripts/health_check.php 2>&1 | grep "Health Score:" | awk '{print $3}' | cut -d'%' -f1)
    if [ ! -z "$HEALTH_SCORE" ]; then
        if [ "$HEALTH_SCORE" -lt 80 ]; then
            echo -e "${RED}✗${NC} Health Score: ${HEALTH_SCORE}%"
            ALERT_TRIGGERED=true
            ALERT_MESSAGE+="Application health score low: ${HEALTH_SCORE}%\n"
        else
            echo -e "${GREEN}✓${NC} Health Score: ${HEALTH_SCORE}%"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Could not determine health score"
    fi
else
    echo -e "${YELLOW}⚠${NC} Health check script not found"
fi

# 7. Recent Errors
echo "Checking recent errors..."
if [ -f "/var/log/php8.2-fpm.log" ]; then
    ERROR_COUNT=$(tail -1000 /var/log/php8.2-fpm.log | grep -c "PHP Fatal error\|PHP Warning" || true)
    if [ "$ERROR_COUNT" -gt 10 ]; then
        echo -e "${YELLOW}⚠${NC} PHP Errors (last 1000 lines): $ERROR_COUNT"
    else
        echo -e "${GREEN}✓${NC} PHP Errors (last 1000 lines): $ERROR_COUNT"
    fi
fi

if [ -f "/var/log/nginx/error.log" ]; then
    NGINX_ERROR_COUNT=$(tail -1000 /var/log/nginx/error.log | grep -c "error" || true)
    if [ "$NGINX_ERROR_COUNT" -gt 20 ]; then
        echo -e "${YELLOW}⚠${NC} Nginx Errors (last 1000 lines): $NGINX_ERROR_COUNT"
    else
        echo -e "${GREEN}✓${NC} Nginx Errors (last 1000 lines): $NGINX_ERROR_COUNT"
    fi
fi

# 8. Log monitoring metrics
echo ""
echo "Monitoring Metrics:"
cat > "${LOG_DIR}/metrics_$(date +%Y%m%d_%H%M%S).json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "cpu_usage": $CPU_USAGE,
  "memory_usage": $MEMORY_USAGE,
  "disk_usage": $DISK_USAGE,
  "db_connections": ${DB_CONNECTIONS:-0},
  "db_max_connections": ${DB_MAX_CONNECTIONS:-100},
  "health_score": ${HEALTH_SCORE:-0},
  "php_errors": ${ERROR_COUNT:-0},
  "nginx_errors": ${NGINX_ERROR_COUNT:-0}
}
EOF

echo "Metrics logged to: ${LOG_DIR}/metrics_$(date +%Y%m%d_%H%M%S).json"

# 9. Send alerts if needed
if [ "$ALERT_TRIGGERED" = true ]; then
    echo ""
    echo -e "${RED}⚠ ALERT: System issues detected!${NC}"
    echo ""
    echo -e "$ALERT_MESSAGE"

    # Send email alert (if mail is configured)
    if command -v mail &> /dev/null; then
        echo -e "$ALERT_MESSAGE\n\nTimestamp: $TIMESTAMP" | mail -s "Documentiulia System Alert" "$ALERT_EMAIL"
        echo "Alert email sent to: $ALERT_EMAIL"
    fi

    # Send webhook alert (if configured)
    if [ ! -z "$ALERT_WEBHOOK" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"Documentiulia System Alert:\n${ALERT_MESSAGE}\"}" \
            2>/dev/null
        echo "Alert sent to webhook"
    fi

    exit 1
else
    echo ""
    echo -e "${GREEN}✓ All systems operational${NC}"
    exit 0
fi
