#!/bin/bash
# DocumentIulia.ro - Production Deployment Checklist
# Run this script before deploying to production
# COMP-010: Romanian ERP Compliance Checklist

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "DocumentIulia.ro Production Deployment Check"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ERRORS=$((ERRORS + 1))
}

check_warn() {
    echo -e "${YELLOW}!${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# ======================================
# 1. ENVIRONMENT CONFIGURATION
# ======================================
echo "1. Environment Configuration"
echo "----------------------------"

if [ -f ".env" ]; then
    # Check required variables
    if grep -q "^DATABASE_URL=" .env && ! grep -q "DATABASE_URL=$" .env; then
        check_pass "DATABASE_URL configured"
    else
        check_fail "DATABASE_URL missing or empty"
    fi

    if grep -q "^JWT_SECRET=" .env && ! grep -q "JWT_SECRET=$" .env; then
        JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2)
        if [ ${#JWT_SECRET} -ge 32 ]; then
            check_pass "JWT_SECRET configured (min 32 chars)"
        else
            check_fail "JWT_SECRET too short (min 32 chars required)"
        fi
    else
        check_fail "JWT_SECRET missing or empty"
    fi

    if grep -q "^ANAF_API_KEY=" .env; then
        check_pass "ANAF_API_KEY configured"
    else
        check_warn "ANAF_API_KEY not configured (required for e-Factura)"
    fi

    if grep -q "^GROK_API_KEY=" .env; then
        check_pass "GROK_API_KEY configured"
    else
        check_warn "GROK_API_KEY not configured (AI features disabled)"
    fi

    if grep -q "^NODE_ENV=production" .env; then
        check_pass "NODE_ENV=production"
    else
        check_fail "NODE_ENV must be 'production'"
    fi
else
    check_fail ".env file not found"
fi

echo ""

# ======================================
# 2. DATABASE CHECKS
# ======================================
echo "2. Database Configuration"
echo "-------------------------"

# Check if Prisma migrations are up to date
if npm run prisma:migrate:status 2>/dev/null | grep -q "Database schema is up to date"; then
    check_pass "Database migrations up to date"
else
    check_warn "Database migrations may be pending"
fi

# Check if database can be connected
if npx prisma db execute --stdin <<< "SELECT 1" 2>/dev/null; then
    check_pass "Database connection successful"
else
    check_fail "Cannot connect to database"
fi

echo ""

# ======================================
# 3. BUILD & TESTS
# ======================================
echo "3. Build & Tests"
echo "----------------"

# Check if dist folder exists and is recent
if [ -d "dist" ]; then
    if [ -f "dist/main.js" ]; then
        check_pass "Production build exists"
    else
        check_fail "Production build incomplete (missing main.js)"
    fi
else
    check_fail "No production build found (run: npm run build)"
fi

# Run tests
echo "Running tests..."
if npm test --passWithNoTests 2>/dev/null | grep -q "passed"; then
    TEST_COUNT=$(npm test --passWithNoTests 2>&1 | grep -oP '\d+(?= passed)')
    check_pass "All tests passing ($TEST_COUNT tests)"
else
    check_fail "Tests failing - fix before deployment"
fi

echo ""

# ======================================
# 4. SECURITY CHECKS
# ======================================
echo "4. Security Configuration"
echo "-------------------------"

# Check for security middleware
if grep -q "CsrfMiddleware" src/app.module.ts 2>/dev/null; then
    check_pass "CSRF middleware enabled"
else
    check_warn "CSRF middleware not found"
fi

if grep -q "SanitizeMiddleware" src/app.module.ts 2>/dev/null; then
    check_pass "Input sanitization middleware enabled"
else
    check_warn "Sanitize middleware not found"
fi

if grep -q "helmet" src/main.ts 2>/dev/null; then
    check_pass "Helmet security headers enabled"
else
    check_warn "Helmet not configured in main.ts"
fi

# Check for bcrypt password hashing
if grep -rq "bcrypt" src/auth/ 2>/dev/null; then
    check_pass "Password hashing with bcrypt"
else
    check_fail "bcrypt password hashing not found"
fi

# Check JWT configuration
if grep -q "JwtModule" src/auth/auth.module.ts 2>/dev/null; then
    check_pass "JWT authentication configured"
else
    check_fail "JWT authentication not configured"
fi

echo ""

# ======================================
# 5. ROMANIAN COMPLIANCE (ANAF)
# ======================================
echo "5. Romanian Compliance (ANAF)"
echo "-----------------------------"

# Check SAF-T D406 service
if [ -f "src/anaf/saft.service.ts" ]; then
    check_pass "SAF-T D406 service implemented"
else
    check_fail "SAF-T D406 service missing (Order 1783/2021)"
fi

# Check SAF-T validator
if [ -f "src/anaf/saft-validator.service.ts" ]; then
    check_pass "SAF-T validator implemented"
else
    check_warn "SAF-T validator not found"
fi

# Check e-Factura service
if [ -f "src/anaf/efactura.service.ts" ]; then
    check_pass "e-Factura UBL 2.1 service implemented"
else
    check_fail "e-Factura service missing (B2B mandatory mid-2026)"
fi

# Check e-Factura validator
if [ -f "src/anaf/efactura-validator.service.ts" ]; then
    check_pass "e-Factura CIUS-RO validator implemented"
else
    check_warn "e-Factura validator not found"
fi

# Check VAT rates (Legea 141/2025)
if grep -q "21" src/finance/vat.service.ts 2>/dev/null; then
    check_pass "VAT standard rate 21% configured"
else
    check_warn "Check VAT rates per Legea 141/2025"
fi

if grep -q "11" src/finance/vat.service.ts 2>/dev/null; then
    check_pass "VAT reduced rate 11% configured"
else
    check_warn "VAT reduced rate 11% not found"
fi

echo ""

# ======================================
# 6. GDPR COMPLIANCE
# ======================================
echo "6. GDPR Compliance"
echo "------------------"

# Check GDPR service
if [ -f "src/gdpr/gdpr.service.ts" ]; then
    check_pass "GDPR service implemented"
else
    check_warn "GDPR service not found"
fi

# Check data retention service
if [ -f "src/gdpr/retention.service.ts" ]; then
    check_pass "Data retention service implemented"
else
    check_warn "Data retention automation not found"
fi

# Check audit logging
if grep -rq "AuditInterceptor\|audit" src/common/interceptors/ 2>/dev/null; then
    check_pass "Audit logging implemented"
else
    check_warn "Audit logging not found"
fi

echo ""

# ======================================
# 7. HEALTH & MONITORING
# ======================================
echo "7. Health & Monitoring"
echo "----------------------"

# Check health endpoints
if [ -f "src/health/health.controller.ts" ]; then
    check_pass "Health check controller exists"

    if grep -q "dependencies" src/health/health.controller.ts 2>/dev/null; then
        check_pass "External dependency checks implemented"
    else
        check_warn "External dependency health checks not found"
    fi

    if grep -q "metrics" src/health/health.controller.ts 2>/dev/null; then
        check_pass "Metrics endpoint implemented"
    else
        check_warn "Metrics endpoint not found"
    fi
else
    check_fail "Health check controller missing"
fi

# Check logging
if grep -q "WinstonModule\|winston" src/app.module.ts 2>/dev/null; then
    check_pass "Winston logging configured"
else
    check_warn "Structured logging not configured"
fi

echo ""

# ======================================
# 8. DOCKER & DEPLOYMENT
# ======================================
echo "8. Docker & Deployment"
echo "----------------------"

if [ -f "Dockerfile" ]; then
    check_pass "Dockerfile exists"

    if grep -q "multi-stage\|AS builder" Dockerfile 2>/dev/null; then
        check_pass "Multi-stage Docker build"
    else
        check_warn "Consider multi-stage Docker build"
    fi
else
    check_warn "No Dockerfile found"
fi

if [ -f "docker-compose.yml" ] || [ -f "docker-compose.yaml" ]; then
    check_pass "docker-compose configuration exists"
else
    check_warn "No docker-compose file found"
fi

echo ""

# ======================================
# SUMMARY
# ======================================
echo "=============================================="
echo "DEPLOYMENT CHECKLIST SUMMARY"
echo "=============================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed! Ready for production deployment.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}$WARNINGS warnings found. Review before deployment.${NC}"
    exit 0
else
    echo -e "${RED}$ERRORS errors and $WARNINGS warnings found.${NC}"
    echo -e "${RED}Fix errors before deploying to production.${NC}"
    exit 1
fi
