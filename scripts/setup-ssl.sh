#!/bin/bash
# DocumentIulia.ro - SSL Certificate Setup with Let's Encrypt
# Usage: ./scripts/setup-ssl.sh [--staging] [--renew]

set -e

# Configuration
DOMAIN="documentiulia.ro"
WWW_DOMAIN="www.documentiulia.ro"
API_DOMAIN="api.documentiulia.ro"
EMAIL="admin@documentiulia.ro"
SSL_DIR="/root/documentiulia.ro/nginx/ssl"
CERTBOT_DIR="/etc/letsencrypt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Parse arguments
STAGING=""
RENEW=false

for arg in "$@"; do
    case $arg in
        --staging)
            STAGING="--staging"
            log_warn "Using Let's Encrypt staging environment"
            ;;
        --renew)
            RENEW=true
            ;;
    esac
done

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    log_info "Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Create SSL directory
mkdir -p "$SSL_DIR"

if [ "$RENEW" = true ]; then
    log_info "Renewing certificates..."
    certbot renew --quiet
else
    log_info "Obtaining SSL certificates for $DOMAIN, $WWW_DOMAIN, $API_DOMAIN..."

    # Stop nginx temporarily if running
    if systemctl is-active --quiet nginx; then
        systemctl stop nginx
    fi

    # Obtain certificate using standalone mode
    certbot certonly \
        $STAGING \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        -d "$WWW_DOMAIN" \
        -d "$API_DOMAIN" \
        --preferred-challenges http

    # Copy certificates to nginx ssl directory
    log_info "Copying certificates to nginx directory..."
    cp "$CERTBOT_DIR/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
    cp "$CERTBOT_DIR/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
    chmod 600 "$SSL_DIR/privkey.pem"
    chmod 644 "$SSL_DIR/fullchain.pem"

    # Restart nginx if it was running
    if [ -f /var/run/nginx.pid ] || systemctl is-enabled --quiet nginx 2>/dev/null; then
        systemctl start nginx
    fi
fi

# Setup auto-renewal cron job
log_info "Setting up auto-renewal..."
CRON_JOB="0 0 1 * * certbot renew --quiet --post-hook 'systemctl reload nginx'"
(crontab -l 2>/dev/null | grep -v certbot; echo "$CRON_JOB") | crontab -

# Verify certificate
log_info "Verifying certificate..."
if openssl x509 -in "$SSL_DIR/fullchain.pem" -noout -dates 2>/dev/null; then
    EXPIRY=$(openssl x509 -in "$SSL_DIR/fullchain.pem" -noout -enddate | cut -d= -f2)
    log_info "Certificate valid until: $EXPIRY"
else
    log_warn "Could not verify certificate"
fi

log_info "SSL setup complete!"
echo ""
echo "Certificate files:"
echo "  - $SSL_DIR/fullchain.pem"
echo "  - $SSL_DIR/privkey.pem"
echo ""
echo "Auto-renewal cron job installed (1st of each month)"
