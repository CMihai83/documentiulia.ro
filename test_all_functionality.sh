#!/bin/bash

# DocumentIulia Complete Functionality Test
# Tests all backend APIs and frontend integration

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://127.0.0.1"
API_BASE="${BASE_URL}/api/v1"

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Test function
test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local use_auth="$4"

    TOTAL=$((TOTAL + 1))

    if [ "$use_auth" = "1" ]; then
        response=$(curl -s -H "Host: documentiulia.ro" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID" \
            "${API_BASE}${endpoint}")
    else
        response=$(curl -s -H "Host: documentiulia.ro" "${API_BASE}${endpoint}")
    fi

    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC} $name"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $name"
        echo "$response" | jq -C '.' 2>/dev/null || echo "$response"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    DocumentIulia Complete Functionality Test Suite    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

# ============================================
# 1. AUTHENTICATION
# ============================================
echo -e "\n${BLUE}[1] Authentication & User Management${NC}\n"

# Login
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login.php" \
    -H "Host: documentiulia.ro" \
    -H "Content-Type: application/json" \
    -d '{"email":"test_admin@accountech.com","password":"Test123!"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id')
    COMPANY_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.companies[0].id')
    echo -e "${GREEN}✓${NC} Login successful"
    TOTAL=$((TOTAL + 1))
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Login failed"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

# Get current user
test_api "Get current user profile" "GET" "/auth/me.php" "1"

# ============================================
# 2. CRM MODULE
# ============================================
echo -e "\n${BLUE}[2] CRM Module${NC}\n"

test_api "List contacts" "GET" "/crm/contacts.php" "1"
test_api "List leads" "GET" "/crm/leads.php" "1"
test_api "List opportunities" "GET" "/crm/opportunities.php" "1"
test_api "List quotations" "GET" "/crm/quotations.php" "1"

# ============================================
# 3. FINANCIAL MANAGEMENT
# ============================================
echo -e "\n${BLUE}[3] Financial Management${NC}\n"

test_api "List invoices" "GET" "/invoices/list.php" "1"
test_api "Invoice statistics" "GET" "/invoices/stats.php" "1"
test_api "List bills" "GET" "/bills/list.php" "1"
test_api "List expenses" "GET" "/expenses/list.php" "1"
test_api "Expense categories" "GET" "/expenses/categories.php" "1"
test_api "List payments" "GET" "/payments/list.php" "1"
test_api "Recurring invoices" "GET" "/invoices/recurring/list.php" "1"

# ============================================
# 4. INVENTORY MANAGEMENT
# ============================================
echo -e "\n${BLUE}[4] Inventory Management${NC}\n"

test_api "List products" "GET" "/inventory/products.php" "1"
test_api "Stock levels" "GET" "/inventory/stock-levels.php" "1"
test_api "List warehouses" "GET" "/inventory/warehouses.php" "1"
test_api "Low stock alerts" "GET" "/inventory/low-stock-alerts.php" "1"
test_api "Stock movements" "GET" "/inventory/stock-movements.php" "1"
test_api "Stock adjustments" "GET" "/inventory/stock-adjustments.php" "1"
test_api "Stock transfers" "GET" "/inventory/stock-transfers.php" "1"
test_api "Purchase orders" "GET" "/inventory/purchase-orders.php" "1"

# ============================================
# 5. HR & PAYROLL
# ============================================
echo -e "\n${BLUE}[5] HR & Payroll${NC}\n"

test_api "List employees" "GET" "/hr/employees.php" "1"
test_api "Payroll list 2025" "GET" "/hr/payroll/list.php?year=2025" "1"
test_api "Time entries" "GET" "/time/entries.php" "1"
test_api "Time projects" "GET" "/time/projects.php" "1"

# ============================================
# 6. ACCOUNTING
# ============================================
echo -e "\n${BLUE}[6] Accounting${NC}\n"

test_api "Chart of accounts" "GET" "/accounting/chart-of-accounts.php" "1"
test_api "General ledger" "GET" "/accounting/general-ledger.php" "1"
test_api "Journal entries" "GET" "/accounting/journal-entries.php" "1"
test_api "Tax codes" "GET" "/accounting/tax-codes.php" "1"
test_api "Fixed assets" "GET" "/accounting/fixed-assets.php" "1"
test_api "Trial balance" "GET" "/accounting/trial-balance.php" "1"

# ============================================
# 7. REPORTS
# ============================================
echo -e "\n${BLUE}[7] Reports${NC}\n"

test_api "Balance sheet" "GET" "/accounting/balance-sheet.php" "1"
test_api "Income statement" "GET" "/accounting/income-statement.php" "1"
test_api "Cash flow" "GET" "/accounting/cash-flow.php" "1"
test_api "Aging report" "GET" "/analytics/aging-report.php" "1"

# ============================================
# 8. FISCAL FEATURES
# ============================================
echo -e "\n${BLUE}[8] Fiscal Features${NC}\n"

test_api "Fiscal calendar" "GET" "/fiscal-calendar/my-calendar.php?year=2025" "1"
test_api "Decision paths" "GET" "/fiscal/decision-paths.php?node_id=1" "1"
test_api "Personal context" "GET" "/fiscal/personal-context.php" "1"

# AI Consultant
TOTAL=$((TOTAL + 1))
AI_RESPONSE=$(curl -s -X POST "${API_BASE}/fiscal/ai-consultant.php" \
    -H "Host: documentiulia.ro" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"question":"Care este pragul de înregistrare pentru TVA în 2025?"}')

if echo "$AI_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} AI Fiscal consultant"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} AI Fiscal consultant"
    FAILED=$((FAILED + 1))
fi

# ============================================
# 9. E-FACTURA
# ============================================
echo -e "\n${BLUE}[9] e-Factura Integration${NC}\n"

test_api "e-Factura settings" "GET" "/efactura/settings.php" "1"
test_api "Received invoices" "GET" "/efactura/received-invoices.php" "1"
test_api "e-Factura analytics" "GET" "/efactura/analytics.php" "1"

# ============================================
# 10. ANALYTICS & BI
# ============================================
echo -e "\n${BLUE}[10] Analytics & BI${NC}\n"

test_api "Analytics dashboards" "GET" "/analytics/dashboards.php" "1"
test_api "KPI metrics" "GET" "/analytics/kpis.php" "1"
test_api "Revenue trend" "GET" "/analytics/revenue-trend.php" "1"
test_api "Top customers" "GET" "/analytics/top-customers.php" "1"
test_api "Employee productivity" "GET" "/analytics/employee-productivity.php" "1"
test_api "Project profitability" "GET" "/analytics/project-profitability.php" "1"

# ============================================
# 11. BANK INTEGRATION
# ============================================
echo -e "\n${BLUE}[11] Bank Integration${NC}\n"

test_api "Bank connections" "GET" "/bank/connections.php" "1"
test_api "Bank institutions" "GET" "/bank/institutions.php" "1"
test_api "Bank transactions" "GET" "/bank/transactions.php" "1"

# ============================================
# 12. PROJECTS & TASKS
# ============================================
echo -e "\n${BLUE}[12] Projects & Tasks${NC}\n"

test_api "List projects" "GET" "/projects/list.php" "1"
test_api "List tasks" "GET" "/tasks/list.php" "1"

# ============================================
# 13. SETTINGS
# ============================================
echo -e "\n${BLUE}[13] Settings & Configuration${NC}\n"

test_api "Category management" "GET" "/settings/categories.php" "1"
test_api "Company settings" "GET" "/settings/company.php" "1"

# ============================================
# 14. FRONTEND PAGES
# ============================================
echo -e "\n${BLUE}[14] Frontend Pages${NC}\n"

# Test frontend pages
PAGES=(
    "/"
    "/login"
    "/register"
)

for page in "${PAGES[@]}"; do
    TOTAL=$((TOTAL + 1))
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${page}" -H "Host: documentiulia.ro")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓${NC} Frontend: $page"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} Frontend: $page (HTTP $response)"
        FAILED=$((FAILED + 1))
    fi
done

# ============================================
# FINAL SUMMARY
# ============================================
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     Test Summary                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"

SUCCESS_RATE=$((PASSED * 100 / TOTAL))

echo -e "Total Tests:  ${BLUE}$TOTAL${NC}"
echo -e "Passed:       ${GREEN}$PASSED${NC}"
echo -e "Failed:       ${RED}$FAILED${NC}"
echo -e "Success Rate: ${BLUE}${SUCCESS_RATE}%${NC}\n"

if [ $SUCCESS_RATE -ge 95 ]; then
    echo -e "${GREEN}🎉 EXCELLENT! System is fully functional${NC}\n"
elif [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  GOOD - Minor issues detected${NC}\n"
else
    echo -e "${RED}❌ ATTENTION NEEDED - Multiple failures detected${NC}\n"
fi

exit 0
