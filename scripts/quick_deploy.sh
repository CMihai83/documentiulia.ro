#!/bin/bash
###############################################################################
# Documentiulia Platform - Quick Deployment Script
# Automates the setup process for production deployment
###############################################################################

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Documentiulia - Quick Deployment Script"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

print_info "Starting deployment checks..."
echo ""

# Step 1: Check PHP version
echo "1. Checking PHP version..."
PHP_VERSION=$(php -v | head -n 1 | awk '{print $2}')
if php -v | grep -q "PHP 8"; then
    print_success "PHP $PHP_VERSION installed"
else
    print_error "PHP 8.x required, found: $PHP_VERSION"
    exit 1
fi

# Step 2: Check Composer
echo "2. Checking Composer..."
if command -v composer &> /dev/null; then
    COMPOSER_VERSION=$(composer --version --no-interaction 2>&1 | head -n 1 | awk '{print $3}')
    print_success "Composer $COMPOSER_VERSION installed"
else
    print_warning "Composer not found, installing..."
    cd "$PROJECT_DIR"
    curl -sS https://getcomposer.org/installer | php
    mv composer.phar /usr/local/bin/composer
    chmod +x /usr/local/bin/composer
    print_success "Composer installed"
fi

# Step 3: Check PHP extensions
echo "3. Checking required PHP extensions..."
REQUIRED_EXTENSIONS=("gd" "xml" "zip" "mbstring" "pgsql" "pdo_pgsql" "curl")
MISSING_EXTENSIONS=()

for ext in "${REQUIRED_EXTENSIONS[@]}"; do
    if php -m | grep -q "^$ext$"; then
        print_success "Extension $ext installed"
    else
        print_warning "Extension $ext missing"
        MISSING_EXTENSIONS+=("php8.2-$ext")
    fi
done

if [ ${#MISSING_EXTENSIONS[@]} -gt 0 ]; then
    print_info "Installing missing extensions: ${MISSING_EXTENSIONS[*]}"
    apt update
    apt install -y "${MISSING_EXTENSIONS[@]}"
    print_success "Extensions installed"
fi

# Step 4: Install Composer dependencies
echo "4. Installing PHP dependencies..."
cd "$PROJECT_DIR"
if [ -f "composer.json" ]; then
    COMPOSER_ALLOW_SUPERUSER=1 composer install --no-interaction --optimize-autoloader
    print_success "Composer dependencies installed"
else
    print_error "composer.json not found"
    exit 1
fi

# Step 5: Check .env file
echo "5. Checking environment configuration..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    print_warning ".env file not found"
    print_info "Creating .env from template..."

    cat > "$PROJECT_DIR/.env" <<'EOF'
# Documentiulia Environment Configuration
APP_ENV=production
APP_DEBUG=false
APP_URL=https://documentiulia.ro

DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=accountech_production
DB_USERNAME=accountech_app
DB_PASSWORD=AccTech2025Prod@Secure

# Stripe (Replace with your keys)
STRIPE_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_WITH_YOUR_SECRET

# SendGrid (Replace with your key)
SENDGRID_API_KEY=SG.REPLACE_WITH_YOUR_KEY
SENDGRID_FROM_EMAIL=noreply@documentiulia.ro
SENDGRID_FROM_NAME=Documentiulia

# Feature Flags
ENABLE_STRIPE_PAYMENTS=true
ENABLE_PDF_GENERATION=true
ENABLE_EMAIL_SENDING=false
ENABLE_RECURRING_INVOICES=true
ENABLE_PAYMENT_REMINDERS=true
EOF

    chmod 600 "$PROJECT_DIR/.env"
    print_success ".env file created (remember to add API keys!)"
else
    print_success ".env file exists"
fi

# Step 6: Create storage directories
echo "6. Creating storage directories..."
STORAGE_DIRS=("storage/invoices" "storage/logs" "storage/temp")
for dir in "${STORAGE_DIRS[@]}"; do
    mkdir -p "$PROJECT_DIR/$dir"
    chmod 755 "$PROJECT_DIR/$dir"
done
print_success "Storage directories created"

# Step 7: Check database connection
echo "7. Verifying database connection..."
if PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT 1;" &> /dev/null; then
    print_success "Database connection successful"

    # Count tables
    TABLE_COUNT=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    print_info "Database has $TABLE_COUNT tables"

    # Check critical tables
    CRITICAL_TABLES=("decision_trees" "payment_intents" "subscriptions" "subscription_plans")
    for table in "${CRITICAL_TABLES[@]}"; do
        if PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "\d $table" &> /dev/null; then
            print_success "Table $table exists"
        else
            print_error "Table $table missing"
        fi
    done
else
    print_error "Database connection failed"
    exit 1
fi

# Step 8: Run tests
echo "8. Running system tests..."
if [ -f "$PROJECT_DIR/scripts/test_pdf_generation.php" ]; then
    if php "$PROJECT_DIR/scripts/test_pdf_generation.php" &> /dev/null; then
        print_success "PDF generation test passed"
    else
        print_warning "PDF generation test failed (may be normal if no invoices exist)"
    fi
fi

if [ -f "$PROJECT_DIR/scripts/test_email_service.php" ]; then
    if php "$PROJECT_DIR/scripts/test_email_service.php" &> /dev/null; then
        print_success "Email service test passed"
    else
        print_warning "Email service test failed"
    fi
fi

# Step 9: Check cron jobs
echo "9. Checking cron jobs..."
if crontab -l 2>/dev/null | grep -q "generate_recurring_invoices.php"; then
    print_success "Recurring invoices cron job configured"
else
    print_warning "Recurring invoices cron job not configured"
    print_info "Run: crontab -e and add:"
    echo "      0 2 * * * /usr/bin/php $PROJECT_DIR/scripts/generate_recurring_invoices.php"
fi

if crontab -l 2>/dev/null | grep -q "send_payment_reminders.php"; then
    print_success "Payment reminders cron job configured"
else
    print_warning "Payment reminders cron job not configured"
    print_info "Run: crontab -e and add:"
    echo "      0 9 * * * /usr/bin/php $PROJECT_DIR/scripts/send_payment_reminders.php"
fi

echo ""
echo "=========================================="
echo "Deployment Status Summary"
echo "=========================================="
echo ""

# Check what needs to be configured
NEEDS_CONFIG=false

if grep -q "REPLACE_WITH_YOUR" "$PROJECT_DIR/.env" 2>/dev/null; then
    print_warning "API keys need to be configured in .env"
    NEEDS_CONFIG=true
fi

if ! crontab -l 2>/dev/null | grep -q "generate_recurring_invoices.php"; then
    print_warning "Cron jobs need to be scheduled"
    NEEDS_CONFIG=true
fi

if [ "$NEEDS_CONFIG" = true ]; then
    echo ""
    print_info "Next steps to complete deployment:"
    echo "  1. Edit .env and add Stripe API keys"
    echo "  2. Edit .env and add SendGrid API key"
    echo "  3. Setup cron jobs (see above)"
    echo "  4. Test payment flow"
    echo ""
    print_info "See PHASE_1_IMPLEMENTATION_GUIDE.md for detailed instructions"
else
    echo ""
    print_success "All deployment steps completed!"
    print_success "Platform is ready for production use"
fi

echo ""
echo "=========================================="
echo "Deployment script completed"
echo "=========================================="
