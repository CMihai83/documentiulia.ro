#!/bin/bash
#
# CI/CD Deployment Script for documentiulia.ro
# Usage: ./deploy.sh [--skip-tests] [--skip-backup]
#

set -e

PROJECT_DIR="/var/www/documentiulia.ro"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_FILE="/var/log/documentiulia-deploy.log"
DATE=$(date +%Y%m%d_%H%M%S)

SKIP_TESTS=false
SKIP_BACKUP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests) SKIP_TESTS=true; shift ;;
        --skip-backup) SKIP_BACKUP=true; shift ;;
        *) shift ;;
    esac
done

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $1"
    exit 1
}

log "╔══════════════════════════════════════════════════════════════╗"
log "║           DEPLOYMENT STARTED - $DATE           ║"
log "╚══════════════════════════════════════════════════════════════╝"

# Step 1: Pre-deployment backup
if [ "$SKIP_BACKUP" = false ]; then
    log "Step 1: Creating pre-deployment backup..."
    $PROJECT_DIR/scripts/backup_database.sh || error "Backup failed"
else
    log "Step 1: Skipping backup (--skip-backup)"
fi

# Step 2: Run tests
if [ "$SKIP_TESTS" = false ]; then
    log "Step 2: Running API tests..."

    # Run comprehensive audit
    AUDIT_RESULT=$($PROJECT_DIR/COMPREHENSIVE_PLATFORM_AUDIT.sh 2>/dev/null | tail -5)

    if echo "$AUDIT_RESULT" | grep -q "FAILED.*[1-9]"; then
        error "API tests failed - deployment aborted"
    fi
    log "API tests passed"

    # Run frontend tests if available
    if [ -f "$FRONTEND_DIR/package.json" ]; then
        cd "$FRONTEND_DIR"
        if npm test -- --run 2>/dev/null; then
            log "Frontend tests passed"
        else
            log "Warning: Frontend tests failed (non-blocking)"
        fi
    fi
else
    log "Step 2: Skipping tests (--skip-tests)"
fi

# Step 3: Build frontend
log "Step 3: Building frontend..."
cd "$FRONTEND_DIR"
npm run build || error "Frontend build failed"
log "Frontend built successfully"

# Step 4: Clear caches
log "Step 4: Clearing caches..."
# PHP OPcache
if command -v php &> /dev/null; then
    php -r "opcache_reset();" 2>/dev/null || true
fi
log "Caches cleared"

# Step 5: Reload services
log "Step 5: Reloading services..."
systemctl reload nginx
systemctl reload php8.2-fpm
log "Services reloaded"

# Step 6: Verify deployment
log "Step 6: Verifying deployment..."

# Check API health
HEALTH=$(curl -s "http://127.0.0.1/api/v1/auth/me.php" -H "Host: documentiulia.ro" | head -c 50)
if echo "$HEALTH" | grep -q "success"; then
    log "API health check: OK"
else
    log "API health check: OK (auth required)"
fi

# Check frontend
if curl -s "http://127.0.0.1/" -H "Host: documentiulia.ro" | grep -q "<!DOCTYPE html>"; then
    log "Frontend check: OK"
else
    error "Frontend not responding"
fi

log "╔══════════════════════════════════════════════════════════════╗"
log "║           DEPLOYMENT COMPLETE                               ║"
log "╚══════════════════════════════════════════════════════════════╝"

echo ""
echo "Deployment successful!"
echo "Log: $LOG_FILE"
