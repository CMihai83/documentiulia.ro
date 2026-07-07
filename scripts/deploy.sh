#!/bin/bash
# DocumentIulia.ro Production Deployment Script
# Usage: ./deploy.sh [backend|frontend|all]

set -euo pipefail

PROJECT_DIR="/root/documentiulia.ro"
LOG_FILE="/var/log/documentiulia/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        INFO)  echo -e "${GREEN}[INFO]${NC} $message" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" ;;
    esac

    mkdir -p "$(dirname "$LOG_FILE")"
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

check_prereqs() {
    log INFO "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log ERROR "Node.js is not installed"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log ERROR "npm is not installed"
        exit 1
    fi

    log INFO "Prerequisites OK"
}

backup_current() {
    log INFO "Creating backup of current state..."

    if [ -f "$PROJECT_DIR/scripts/backup-state.sh" ]; then
        bash "$PROJECT_DIR/scripts/backup-state.sh"
    fi

    if [ -f "$PROJECT_DIR/scripts/backup-db.sh" ]; then
        bash "$PROJECT_DIR/scripts/backup-db.sh"
    fi

    log INFO "Backup completed"
}

deploy_backend() {
    log INFO "Deploying backend..."

    cd "$PROJECT_DIR/backend"

    # Install dependencies
    log INFO "Installing backend dependencies..."
    npm ci --production=false

    # Generate Prisma client
    log INFO "Generating Prisma client..."
    npx prisma generate

    # Run migrations
    log INFO "Running database migrations..."
    npx prisma migrate deploy

    # Build
    log INFO "Building backend..."
    npm run build

    # Restart service
    log INFO "Restarting backend service..."
    fuser -k 3001/tcp 2>/dev/null || true
    sleep 2
    nohup npm run start:prod > /tmp/backend.log 2>&1 &

    # Wait for health check
    log INFO "Waiting for backend to be healthy..."
    sleep 10

    local retries=0
    while [ $retries -lt 30 ]; do
        if curl -s http://localhost:3001/api/v1/health | grep -q "ok"; then
            log INFO "Backend is healthy!"
            break
        fi
        retries=$((retries + 1))
        sleep 2
    done

    if [ $retries -eq 30 ]; then
        log ERROR "Backend failed to start"
        tail -50 /tmp/backend.log
        exit 1
    fi

    log INFO "Backend deployment completed"
}

deploy_frontend() {
    log INFO "Deploying frontend..."

    cd "$PROJECT_DIR/frontend"

    # Install dependencies
    log INFO "Installing frontend dependencies..."
    npm ci

    # Build
    log INFO "Building frontend..."
    npm run build

    # Restart service
    log INFO "Restarting frontend service..."
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 2
    nohup npm run start > /tmp/frontend.log 2>&1 &

    # Wait for health check
    log INFO "Waiting for frontend to be ready..."
    sleep 8

    local retries=0
    while [ $retries -lt 30 ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
            log INFO "Frontend is ready!"
            break
        fi
        retries=$((retries + 1))
        sleep 2
    done

    if [ $retries -eq 30 ]; then
        log WARN "Frontend health check failed, but may still be starting"
        tail -20 /tmp/frontend.log
    fi

    log INFO "Frontend deployment completed"
}

reload_nginx() {
    log INFO "Reloading nginx..."

    if nginx -t; then
        systemctl reload nginx
        log INFO "Nginx reloaded successfully"
    else
        log ERROR "Nginx configuration test failed"
        exit 1
    fi
}

run_tests() {
    log INFO "Running tests..."

    cd "$PROJECT_DIR/backend"
    npm test -- --silent

    log INFO "Tests passed"
}

show_status() {
    echo ""
    echo "========================================="
    echo "        Deployment Status"
    echo "========================================="
    echo ""

    # Backend status
    if curl -s http://localhost:3001/api/v1/health | grep -q "ok"; then
        echo -e "Backend:  ${GREEN}RUNNING${NC}"
    else
        echo -e "Backend:  ${RED}DOWN${NC}"
    fi

    # Frontend status
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo -e "Frontend: ${GREEN}RUNNING${NC}"
    else
        echo -e "Frontend: ${YELLOW}STARTING${NC}"
    fi

    # Nginx status
    if systemctl is-active --quiet nginx; then
        echo -e "Nginx:    ${GREEN}RUNNING${NC}"
    else
        echo -e "Nginx:    ${RED}DOWN${NC}"
    fi

    # Database status
    if curl -s http://localhost:3001/api/v1/dependencies 2>/dev/null | grep -q '"database":"healthy"'; then
        echo -e "Database: ${GREEN}HEALTHY${NC}"
    else
        echo -e "Database: ${RED}UNHEALTHY${NC}"
    fi

    echo ""
    echo "========================================="
}

# Main script
main() {
    local target="${1:-all}"

    log INFO "Starting deployment: $target"

    check_prereqs

    case $target in
        backend)
            backup_current
            run_tests
            deploy_backend
            ;;
        frontend)
            deploy_frontend
            ;;
        all)
            backup_current
            run_tests
            deploy_backend
            deploy_frontend
            reload_nginx
            ;;
        status)
            show_status
            exit 0
            ;;
        *)
            echo "Usage: $0 [backend|frontend|all|status]"
            exit 1
            ;;
    esac

    show_status
    log INFO "Deployment completed successfully!"
}

main "$@"
