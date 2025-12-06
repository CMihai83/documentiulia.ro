#!/bin/bash

# DocumentIulia Deployment Script
# Usage: ./deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
APP_DIR="/var/www/documentiulia.ro/apps"
API_DIR="$APP_DIR/apps/api"
LOG_DIR="/var/log/documentiulia"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Check environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Invalid environment. Use 'staging' or 'production'"
fi

log "Starting deployment to $ENVIRONMENT..."

# Create log directory
mkdir -p $LOG_DIR

# 1. Pull latest code
log "Pulling latest code..."
cd $APP_DIR
git pull origin $(git branch --show-current)

# 2. Install dependencies
log "Installing dependencies..."
npm ci --production=false

# 3. Generate Prisma client
log "Generating Prisma client..."
cd packages/database
npx prisma generate

# 4. Run database migrations (production only with confirmation)
if [[ "$ENVIRONMENT" == "production" ]]; then
    warn "About to run database migrations on PRODUCTION"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Running database migrations..."
        npx prisma migrate deploy
    else
        warn "Skipping migrations"
    fi
else
    log "Running database migrations..."
    npx prisma db push
fi

# 5. Build API
log "Building API..."
cd $API_DIR
npm run build

# 6. Run tests (staging only)
if [[ "$ENVIRONMENT" == "staging" ]]; then
    log "Running E2E tests..."
    npm run test:e2e:all || warn "Some tests failed, continuing..."
fi

# 7. Stop existing API process
log "Stopping existing API process..."
pkill -f "node dist/main.js" || true
sleep 2

# 8. Start API with PM2 or systemd
log "Starting API..."

if command -v pm2 &> /dev/null; then
    # Using PM2
    pm2 delete documentiulia-api 2>/dev/null || true
    pm2 start dist/main.js --name documentiulia-api \
        --log $LOG_DIR/api.log \
        --time \
        --env $ENVIRONMENT
    pm2 save
else
    # Using nohup as fallback
    if [[ "$ENVIRONMENT" == "production" ]]; then
        NODE_ENV=production \
        DATABASE_URL="$DATABASE_URL" \
        CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
        nohup node dist/main.js > $LOG_DIR/api.log 2>&1 &
    else
        NODE_ENV=development \
        DATABASE_URL="postgresql://accountech_app:AccTech2025Prod%40Secure@127.0.0.1:5432/documentiulia_v2" \
        CLERK_SECRET_KEY="test_secret" \
        nohup node dist/main.js > $LOG_DIR/api.log 2>&1 &
    fi
fi

# 9. Wait and verify
log "Waiting for API to start..."
sleep 5

# 10. Health check
log "Running health check..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/v1/companies -H "Authorization: Bearer dev_test_token")

if [[ "$API_STATUS" == "200" ]]; then
    log "API is healthy and responding"
else
    error "API health check failed (status: $API_STATUS). Check logs at $LOG_DIR/api.log"
fi

# 11. Reload nginx (if needed)
if [[ "$ENVIRONMENT" == "production" ]]; then
    log "Reloading nginx..."
    sudo nginx -t && sudo systemctl reload nginx
fi

log "Deployment to $ENVIRONMENT completed successfully!"
log ""
log "API Status:"
log "  - URL: http://127.0.0.1:3001"
log "  - Swagger: http://127.0.0.1:3001/api/docs"
log "  - Logs: $LOG_DIR/api.log"
