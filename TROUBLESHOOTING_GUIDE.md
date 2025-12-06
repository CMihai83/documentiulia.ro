# Documentiulia Platform - Troubleshooting Guide

**Quick Reference for Common Issues and Solutions**

---

## Table of Contents

1. [Quick Diagnostic Commands](#quick-diagnostic-commands)
2. [Common Issues](#common-issues)
3. [Database Problems](#database-problems)
4. [Payment Integration Issues](#payment-integration-issues)
5. [PDF Generation Problems](#pdf-generation-problems)
6. [Email Sending Issues](#email-sending-issues)
7. [Performance Issues](#performance-issues)
8. [Security Concerns](#security-concerns)

---

## Quick Diagnostic Commands

### Run All Checks
```bash
# Automated deployment verification
sudo bash /var/www/documentiulia.ro/scripts/quick_deploy.sh

# System health check
php /var/www/documentiulia.ro/scripts/health_check.php

# Database integrity verification
php /var/www/documentiulia.ro/scripts/verify_database.php
```

### Quick Status Check
```bash
# Check PHP version and extensions
php -v
php -m | grep -E "(pgsql|mbstring|curl|gd|xml|zip)"

# Check Composer installation
composer --version

# Check database connection
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT COUNT(*) FROM decision_trees;"

# Check disk space
df -h

# Check memory usage
free -h
```

---

## Common Issues

### Issue 1: "Composer not found" or "composer: command not found"

**Symptoms:**
- Error when running `composer install`
- Deployment script fails at dependency installation

**Diagnosis:**
```bash
which composer
# If returns nothing, Composer is not installed
```

**Solution:**
```bash
# Install Composer
cd /var/www/documentiulia.ro
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Verify installation
composer --version

# Install dependencies
COMPOSER_ALLOW_SUPERUSER=1 composer install
```

---

### Issue 2: "Class 'Mpdf\Mpdf' not found"

**Symptoms:**
- PDF generation fails
- Error: `Fatal error: Uncaught Error: Class 'Mpdf\Mpdf' not found`

**Diagnosis:**
```bash
# Check if mPDF is installed
ls -la /var/www/documentiulia.ro/vendor/mpdf/mpdf/
```

**Solution:**
```bash
cd /var/www/documentiulia.ro
COMPOSER_ALLOW_SUPERUSER=1 composer require mpdf/mpdf

# Test PDF generation
php scripts/test_pdf_generation.php
```

---

### Issue 3: ".env file not found"

**Symptoms:**
- Application errors about missing configuration
- Database connection failures
- Stripe/SendGrid errors

**Diagnosis:**
```bash
ls -la /var/www/documentiulia.ro/.env
# If file doesn't exist, needs to be created
```

**Solution:**
```bash
cd /var/www/documentiulia.ro

# Create .env from template
cat > .env <<'EOF'
# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://documentiulia.ro

# Database
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

# Secure the file
chmod 600 .env
chown www-data:www-data .env
```

---

## Database Problems

### Issue 4: "Database connection refused"

**Symptoms:**
- `SQLSTATE[08006] [7] could not connect to server`
- Application unable to connect to PostgreSQL

**Diagnosis:**
```bash
# Check if PostgreSQL is running
systemctl status postgresql

# Check if database exists
sudo -u postgres psql -l | grep accountech_production

# Test connection
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT version();"
```

**Solution:**
```bash
# Start PostgreSQL if not running
sudo systemctl start postgresql
sudo systemctl enable postgresql

# If database doesn't exist
sudo -u postgres createdb accountech_production

# If user doesn't exist or password is wrong
sudo -u postgres psql <<EOF
CREATE USER accountech_app WITH PASSWORD 'AccTech2025Prod@Secure';
GRANT ALL PRIVILEGES ON DATABASE accountech_production TO accountech_app;
EOF

# Test connection again
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT 1;"
```

---

### Issue 5: "Table does not exist"

**Symptoms:**
- `ERROR: relation "decision_trees" does not exist`
- Application errors about missing tables

**Diagnosis:**
```bash
# Check table count
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "\dt" | wc -l

# List all tables
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "\dt"
```

**Solution:**
```bash
cd /var/www/documentiulia.ro

# Run all migrations in order
for migration in database/migrations/*.sql; do
    echo "Running $migration..."
    PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f "$migration"
done

# Verify tables created
php scripts/verify_database.php
```

---

### Issue 6: "Decision trees missing or count is wrong"

**Symptoms:**
- Expected 30 trees, found fewer
- Decision tree navigation not working

**Diagnosis:**
```bash
# Count decision trees
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT COUNT(*) as tree_count FROM decision_trees WHERE is_active = true;"

# List all trees by category
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT category, COUNT(*) FROM decision_trees WHERE is_active = true GROUP BY category;"
```

**Solution:**
```bash
# Re-run decision tree migrations (017-021)
cd /var/www/documentiulia.ro

PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f database/migrations/017_funding_trees.sql
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f database/migrations/018_growth_scaling_trees.sql
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f database/migrations/019_operational_trees.sql
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f database/migrations/020_industry_specific_trees.sql
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f database/migrations/021_crisis_management_trees.sql

# Verify count
php scripts/verify_database.php
```

---

## Payment Integration Issues

### Issue 7: "Stripe payments not working"

**Symptoms:**
- Checkout sessions fail to create
- Payment webhooks not received
- Errors about Stripe API keys

**Diagnosis:**
```bash
# Check if Stripe SDK is installed
ls -la /var/www/documentiulia.ro/vendor/stripe/stripe-php/

# Check .env configuration
grep STRIPE /var/www/documentiulia.ro/.env

# Test PHP can load Stripe
php -r "require 'vendor/autoload.php'; echo class_exists('Stripe\\Stripe') ? 'OK' : 'FAIL';"
```

**Solution:**
```bash
cd /var/www/documentiulia.ro

# Install Stripe SDK if missing
COMPOSER_ALLOW_SUPERUSER=1 composer require stripe/stripe-php

# Update .env with actual keys
nano .env
# Replace:
# STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_TEST_KEY
# STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_TEST_KEY
# STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET

# Verify configuration
php -r "
require 'api/config/env.php';
echo 'Secret Key: ' . (Env::get('STRIPE_SECRET_KEY') ? 'Configured' : 'Missing') . PHP_EOL;
echo 'Publishable Key: ' . (Env::get('STRIPE_PUBLISHABLE_KEY') ? 'Configured' : 'Missing') . PHP_EOL;
"
```

**To get Stripe API keys:**
1. Go to https://stripe.com → Sign up/Login
2. Navigate to: Developers → API keys
3. Copy "Secret key" (starts with `sk_test_`) and "Publishable key" (starts with `pk_test_`)
4. Update `.env` file

**To get Stripe webhook secret:**
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://documentiulia.ro/api/v1/payments/stripe-webhook.php`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook signing secret (starts with `whsec_`)
5. Update `.env` file

---

### Issue 8: "Subscription plans not showing"

**Symptoms:**
- Empty subscription plan list
- API returns no plans

**Diagnosis:**
```bash
# Check subscription plans
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT plan_key, plan_name, price_monthly FROM subscription_plans WHERE is_active = true;"
```

**Solution:**
```bash
# Re-run payment infrastructure migration
cd /var/www/documentiulia.ro
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f database/migrations/022_payment_infrastructure.sql

# Verify plans created
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "SELECT COUNT(*) FROM subscription_plans;"
# Should return 4
```

---

## PDF Generation Problems

### Issue 9: "PDF generation fails with memory error"

**Symptoms:**
- `Fatal error: Allowed memory size exhausted`
- PDF generation crashes

**Diagnosis:**
```bash
# Check PHP memory limit
php -i | grep memory_limit

# Check current PHP configuration
php --ini
```

**Solution:**
```bash
# Increase PHP memory limit
sudo nano /etc/php/8.2/fpm/php.ini
# Find: memory_limit = 128M
# Change to: memory_limit = 512M

# Or for CLI
sudo nano /etc/php/8.2/cli/php.ini
# memory_limit = 512M

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm

# Test PDF generation
php scripts/test_pdf_generation.php
```

---

### Issue 10: "PDF contains broken characters (Romanian)"

**Symptoms:**
- Romanian characters (ă, â, î, ș, ț) display as � or boxes
- PDF looks corrupted

**Diagnosis:**
```bash
# Check if mbstring extension is loaded
php -m | grep mbstring
```

**Solution:**
```bash
# Install mbstring if missing
sudo apt update
sudo apt install php8.2-mbstring

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm

# Test PDF with Romanian content
php scripts/test_pdf_generation.php
```

---

## Email Sending Issues

### Issue 11: "Emails not being sent"

**Symptoms:**
- No emails received
- SendGrid errors in logs

**Diagnosis:**
```bash
# Check SendGrid configuration
grep SENDGRID /var/www/documentiulia.ro/.env

# Check if SendGrid SDK is installed
ls -la /var/www/documentiulia.ro/vendor/sendgrid/sendgrid/

# Test email service
php /var/www/documentiulia.ro/scripts/test_email_service.php

# Check PHP error logs
sudo tail -f /var/log/php8.2-fpm.log | grep EMAIL
```

**Solution:**

**Option 1: Configure SendGrid API key**
```bash
nano /var/www/documentiulia.ro/.env
# Update:
# SENDGRID_API_KEY=SG.YOUR_ACTUAL_API_KEY
# ENABLE_EMAIL_SENDING=true
```

**To get SendGrid API key:**
1. Go to https://sendgrid.com → Sign up (free tier: 100 emails/day)
2. Settings → Sender Authentication → Verify email address
3. Settings → API Keys → Create API Key
4. Copy key (starts with `SG.`)
5. Update `.env` file

**Option 2: Use graceful fallback (development)**
```bash
nano /var/www/documentiulia.ro/.env
# Set:
# ENABLE_EMAIL_SENDING=false

# Emails will be logged instead of sent
sudo tail -f /var/log/php8.2-fpm.log | grep "EMAIL QUEUED"
```

---

## Performance Issues

### Issue 12: "Slow database queries"

**Symptoms:**
- API endpoints take >2 seconds to respond
- Decision tree navigation is slow

**Diagnosis:**
```bash
# Check for missing indexes
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"

# Check slow queries
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

**Solution:**
```bash
# Add missing indexes
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production <<EOF
CREATE INDEX IF NOT EXISTS idx_decision_nodes_tree_id ON decision_nodes(tree_id);
CREATE INDEX IF NOT EXISTS idx_decision_paths_node_id ON decision_paths(node_id);
CREATE INDEX IF NOT EXISTS idx_decision_answers_path_id ON decision_answers(path_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
EOF

# Analyze tables for query optimizer
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "ANALYZE;"
```

---

## Security Concerns

### Issue 13: ".env file is publicly readable"

**Symptoms:**
- Security audit flags exposed credentials
- File permissions too open

**Diagnosis:**
```bash
ls -la /var/www/documentiulia.ro/.env
# Should show: -rw------- (600)
```

**Solution:**
```bash
# Secure .env file
chmod 600 /var/www/documentiulia.ro/.env
chown www-data:www-data /var/www/documentiulia.ro/.env

# Verify
ls -la /var/www/documentiulia.ro/.env
```

---

### Issue 14: ".env committed to Git"

**Symptoms:**
- Credentials exposed in Git history
- Security breach

**Diagnosis:**
```bash
cd /var/www/documentiulia.ro
git ls-files | grep .env
# Should return nothing
```

**Solution:**
```bash
# If .env is tracked, remove it
cd /var/www/documentiulia.ro

# Remove from Git but keep local file
git rm --cached .env

# Ensure .gitignore has .env
echo ".env" >> .gitignore

# Commit the change
git add .gitignore
git commit -m "Remove .env from version control"

# If already pushed to remote, rotate all secrets immediately:
# 1. Change database password
# 2. Regenerate Stripe API keys
# 3. Regenerate SendGrid API key
# 4. Update .env with new secrets
```

---

## Emergency Recovery

### Full System Reset

**Use only if system is completely broken:**

```bash
cd /var/www/documentiulia.ro

# 1. Backup current state
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz api/ database/ scripts/ .env

# 2. Reinstall dependencies
rm -rf vendor/
COMPOSER_ALLOW_SUPERUSER=1 composer install

# 3. Re-run all migrations
for migration in database/migrations/*.sql; do
    PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f "$migration"
done

# 4. Run full verification
php scripts/health_check.php
php scripts/verify_database.php
```

---

## Getting Help

If none of these solutions work:

1. **Check logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/php8.2-fpm.log
   ```

2. **Run diagnostic scripts:**
   ```bash
   php /var/www/documentiulia.ro/scripts/health_check.php
   php /var/www/documentiulia.ro/scripts/verify_database.php
   ```

3. **Review documentation:**
   - `PHASE_1_IMPLEMENTATION_GUIDE.md` - Setup instructions
   - `PRODUCTION_READY_STATUS.md` - System status
   - `FINAL_SESSION_SUMMARY.md` - Complete overview

4. **Contact support:** Include output from diagnostic scripts

---

**Last Updated:** 2025-11-16
**Platform Version:** 1.0 - Production Ready
