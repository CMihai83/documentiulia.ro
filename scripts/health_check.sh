#!/bin/bash
#
# Health Check & Monitoring Script for documentiulia.ro
# Run via cron: */5 * * * * /var/www/documentiulia.ro/scripts/health_check.sh
#

LOG_FILE="/var/log/documentiulia-health.log"
ALERT_EMAIL="admin@documentiulia.ro"
BASE_URL="http://127.0.0.1"

# Thresholds
MAX_RESPONSE_TIME=2000  # ms
MIN_DISK_SPACE=10       # GB
MAX_MEMORY_PERCENT=90
MAX_CPU_PERCENT=90

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

alert() {
    log "ALERT: $1"
    # Uncomment to enable email alerts:
    # echo "$1" | mail -s "documentiulia.ro Alert" "$ALERT_EMAIL"
}

# Check if services are running
check_services() {
    local status=0

    # Nginx
    if ! systemctl is-active --quiet nginx; then
        alert "Nginx is DOWN - attempting restart"
        systemctl restart nginx
        status=1
    fi

    # PHP-FPM
    if ! systemctl is-active --quiet php8.2-fpm; then
        alert "PHP-FPM is DOWN - attempting restart"
        systemctl restart php8.2-fpm
        status=1
    fi

    # PostgreSQL
    if ! systemctl is-active --quiet postgresql; then
        alert "PostgreSQL is DOWN - attempting restart"
        systemctl restart postgresql
        status=1
    fi

    return $status
}

# Check API health
check_api() {
    local endpoint=$1
    local start=$(date +%s%N)
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$endpoint" -H "Host: documentiulia.ro" 2>/dev/null)
    local end=$(date +%s%N)
    local time_ms=$(( (end - start) / 1000000 ))

    if [ "$response" != "200" ] && [ "$response" != "401" ]; then
        alert "API $endpoint returned HTTP $response"
        return 1
    fi

    if [ $time_ms -gt $MAX_RESPONSE_TIME ]; then
        alert "API $endpoint slow response: ${time_ms}ms"
        return 1
    fi

    return 0
}

# Check disk space
check_disk() {
    local available=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')
    if [ "$available" -lt "$MIN_DISK_SPACE" ]; then
        alert "Low disk space: ${available}GB remaining"
        return 1
    fi
    return 0
}

# Check memory
check_memory() {
    local used_percent=$(free | awk 'NR==2 {printf "%.0f", $3*100/$2}')
    if [ "$used_percent" -gt "$MAX_MEMORY_PERCENT" ]; then
        alert "High memory usage: ${used_percent}%"
        return 1
    fi
    return 0
}

# Check CPU
check_cpu() {
    local load=$(cat /proc/loadavg | awk '{print $1}')
    local cores=$(nproc)
    local load_int=${load%.*}
    if [ "${load_int:-0}" -gt "$cores" ]; then
        alert "High CPU load: $load (cores: $cores)"
        return 1
    fi
    return 0
}

# Main health check
main() {
    local status=0

    log "Starting health check..."

    check_services || status=1
    check_api "/api/v1/auth/me.php" || status=1
    check_disk || status=1
    check_memory || status=1
    check_cpu || status=1

    if [ $status -eq 0 ]; then
        log "Health check PASSED"
    else
        log "Health check FAILED"
    fi

    # Output for cron/monitoring
    echo "{\"timestamp\":\"$(date -Iseconds)\",\"status\":\"$([ $status -eq 0 ] && echo 'healthy' || echo 'unhealthy')\"}"

    return $status
}

main
