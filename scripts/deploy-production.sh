#!/bin/bash
# DocumentIulia.ro - Production Deployment Script
# Usage: ./scripts/deploy-production.sh [--build] [--migrate] [--restart]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
COMPOSE_PROD_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="/var/backups/documentiulia"
LOG_DIR="/var/log/documentiulia"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    command -v docker >/dev/null 2>&1 || log_error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || log_error "Docker Compose is not installed"

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found. Copy from .env.production.example"
    fi

    log_success "Prerequisites check passed"
}

# Create necessary directories
setup_directories() {
    log_info "Setting up directories..."

    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p nginx/ssl

    log_success "Directories created"
}

# Backup database before deployment
backup_database() {
    log_info "Creating database backup..."

    BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"

    if docker-compose ps postgres | grep -q "Up"; then
        docker-compose exec -T postgres pg_dump -U documentiulia documentiulia > "$BACKUP_FILE"
        gzip "$BACKUP_FILE"
        log_success "Database backup created: ${BACKUP_FILE}.gz"
    else
        log_warning "Database container not running, skipping backup"
    fi
}

# Pull latest code
pull_latest() {
    log_info "Pulling latest code from repository..."

    git fetch --all
    git reset --hard origin/main

    log_success "Code updated to latest version"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."

    docker-compose -f "$COMPOSE_FILE" build --no-cache

    log_success "Docker images built successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    docker-compose exec -T backend npx prisma migrate deploy

    log_success "Database migrations completed"
}

# Start/restart services
start_services() {
    log_info "Starting services..."

    docker-compose -f "$COMPOSE_FILE" up -d

    # Wait for services to be healthy
    log_info "Waiting for services to become healthy..."
    sleep 10

    # Check health
    check_health

    log_success "Services started successfully"
}

# Check service health
check_health() {
    log_info "Checking service health..."

    # Check backend health
    BACKEND_HEALTH=$(docker-compose exec -T backend wget -qO- http://localhost:3001/api/v1/health 2>/dev/null || echo "unhealthy")
    if [[ "$BACKEND_HEALTH" == *"healthy"* ]] || [[ "$BACKEND_HEALTH" == *"ok"* ]]; then
        log_success "Backend is healthy"
    else
        log_warning "Backend health check failed"
    fi

    # Check frontend
    FRONTEND_HEALTH=$(docker-compose exec -T frontend wget -qO- http://localhost:3000 2>/dev/null | head -c 100)
    if [ -n "$FRONTEND_HEALTH" ]; then
        log_success "Frontend is responding"
    else
        log_warning "Frontend health check failed"
    fi

    # Check database
    DB_HEALTH=$(docker-compose exec -T postgres pg_isready -U documentiulia 2>/dev/null)
    if [[ "$DB_HEALTH" == *"accepting connections"* ]]; then
        log_success "Database is healthy"
    else
        log_warning "Database health check failed"
    fi

    # Check Redis
    REDIS_HEALTH=$(docker-compose exec -T redis redis-cli ping 2>/dev/null)
    if [[ "$REDIS_HEALTH" == "PONG" ]]; then
        log_success "Redis is healthy"
    else
        log_warning "Redis health check failed"
    fi
}

# Rollback to previous version
rollback() {
    log_warning "Rolling back to previous version..."

    git reset --hard HEAD~1
    docker-compose -f "$COMPOSE_FILE" up -d --build

    log_success "Rollback completed"
}

# Clean up old images and containers
cleanup() {
    log_info "Cleaning up old Docker resources..."

    docker system prune -f --volumes

    # Keep only last 5 backups
    ls -t "$BACKUP_DIR"/*.gz 2>/dev/null | tail -n +6 | xargs -r rm

    log_success "Cleanup completed"
}

# Show deployment status
show_status() {
    echo ""
    echo "========================================"
    echo "  DocumentIulia.ro Deployment Status"
    echo "========================================"
    echo ""
    docker-compose ps
    echo ""
    echo "Service URLs:"
    echo "  - Frontend: https://documentiulia.ro"
    echo "  - API: https://documentiulia.ro/api"
    echo "  - Health: https://documentiulia.ro/health"
    echo ""
}

# Main deployment process
main() {
    echo ""
    echo "========================================"
    echo "  DocumentIulia.ro Production Deploy"
    echo "========================================"
    echo ""

    # Parse arguments
    BUILD=false
    MIGRATE=false
    RESTART=false

    for arg in "$@"; do
        case $arg in
            --build)
                BUILD=true
                ;;
            --migrate)
                MIGRATE=true
                ;;
            --restart)
                RESTART=true
                ;;
            --rollback)
                rollback
                exit 0
                ;;
            --status)
                show_status
                exit 0
                ;;
            --health)
                check_health
                exit 0
                ;;
            --cleanup)
                cleanup
                exit 0
                ;;
            *)
                echo "Unknown argument: $arg"
                echo "Usage: $0 [--build] [--migrate] [--restart] [--rollback] [--status] [--health] [--cleanup]"
                exit 1
                ;;
        esac
    done

    # Default: full deployment
    if [ "$BUILD" = false ] && [ "$MIGRATE" = false ] && [ "$RESTART" = false ]; then
        BUILD=true
        MIGRATE=true
        RESTART=true
    fi

    check_prerequisites
    setup_directories
    backup_database

    if [ "$BUILD" = true ]; then
        build_images
    fi

    if [ "$RESTART" = true ]; then
        start_services
    fi

    if [ "$MIGRATE" = true ]; then
        run_migrations
    fi

    cleanup
    show_status

    log_success "Deployment completed successfully!"
}

# Run main function
main "$@"
