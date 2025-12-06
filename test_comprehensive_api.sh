#!/bin/bash

# DocumentIulia - Comprehensive API Testing Script
# Date: 2025-11-21
# Tests all endpoints with proper authentication and company context

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://127.0.0.1"
HOST="documentiulia.ro"
TEST_EMAIL="test_admin@accountech.com"
TEST_PASSWORD="Test123!"
COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

# Statistics
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     DocumentIulia - Comprehensive API Testing Suite         ║${NC}"
echo -e "${BLUE}║                   Date: $(date +%Y-%m-%d)                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to log test results
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✅ PASS${NC} - $test_name"
        [ -n "$details" ] && echo -e "   ${details}"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}❌ FAIL${NC} - $test_name"
        [ -n "$details" ] && echo -e "   ${RED}$details${NC}"
    fi
}

# Function to test endpoint
test_endpoint() {
    local endpoint="$1"
    local test_name="$2"
    local method="${3:-GET}"
    local data="$4"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint" \
            -H "Host: $HOST" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Host: $HOST" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        success=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "false")
        if [ "$success" = "True" ]; then
            log_test "$test_name" "PASS" "HTTP $http_code"
        else
            error_msg=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', 'Unknown error'))" 2>/dev/null || echo "Parse error")
            log_test "$test_name" "FAIL" "HTTP $http_code - API returned success=false: $error_msg"
        fi
    else
        error_msg=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', 'Unknown error'))" 2>/dev/null || echo "$body")
        log_test "$test_name" "FAIL" "HTTP $http_code - $error_msg"
    fi
}

# Step 1: Login and Get Token
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 1: Authentication${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

LOGIN_RESPONSE=$(curl -s "$API_BASE/api/v1/auth/login.php" \
    -H "Host: $HOST" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
    log_test "Authentication (Login)" "PASS" "Token: ${TOKEN:0:20}..."
else
    log_test "Authentication (Login)" "FAIL" "Could not retrieve token"
    echo -e "\n${RED}CRITICAL ERROR: Cannot proceed without authentication token${NC}"
    exit 1
fi

# Step 2: Accounting Module Tests
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 2: Contabilitate (Accounting Module)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "/api/v1/invoices/list.php" "Invoices - List"
test_endpoint "/api/v1/bills/list.php" "Bills - List"
test_endpoint "/api/v1/expenses/list.php" "Expenses - List"
test_endpoint "/api/v1/reports/profit-loss.php" "Reports - Profit & Loss"
test_endpoint "/api/v1/reports/balance-sheet.php" "Reports - Balance Sheet"
test_endpoint "/api/v1/reports/cash-flow.php" "Reports - Cash Flow"

# Step 3: Inventory Module Tests
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 3: Inventory Management${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "/api/v1/inventory/products.php" "Inventory - Products"
test_endpoint "/api/v1/inventory/stock-levels.php" "Inventory - Stock Levels"
test_endpoint "/api/v1/inventory/warehouses.php" "Inventory - Warehouses"
test_endpoint "/api/v1/inventory/low-stock-alerts.php" "Inventory - Low Stock Alerts"
test_endpoint "/api/v1/inventory/stock-movements.php" "Inventory - Stock Movements"

# Step 4: CRM Module Tests
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 4: CRM & Sales${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "/api/v1/crm/opportunities.php" "CRM - Opportunities"
test_endpoint "/api/v1/crm/opportunities-pipeline.php" "CRM - Pipeline"
test_endpoint "/api/v1/contacts/list.php" "CRM - Contacts"
test_endpoint "/api/v1/crm/quotations.php" "CRM - Quotations"

# Step 5: Purchase Orders Tests
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 5: Purchase Orders${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "/api/v1/purchase-orders/list.php" "Purchase Orders - List"
test_endpoint "/api/v1/purchase-orders/purchase-orders.php" "Purchase Orders - Main Endpoint"

# Step 6: Project Management Tests
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 6: Project Management${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "/api/v1/projects/projects.php" "Projects - List"
test_endpoint "/api/v1/projects/milestones.php" "Projects - Milestones"
test_endpoint "/api/v1/projects/kanban.php" "Projects - Kanban"

# Step 7: Time Tracking Tests
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 7: Time Tracking${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "/api/v1/time/entries.php" "Time Tracking - Entries (Auto Employee Detection)"

# Step 8: Analytics Tests
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 8: Analytics & BI${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "/api/v1/analytics/dashboards.php" "Analytics - Dashboards (Correct Endpoint)"
test_endpoint "/api/v1/analytics/kpis.php" "Analytics - KPIs"
test_endpoint "/api/v1/analytics/metrics.php" "Analytics - Metrics"
test_endpoint "/api/v1/insights/list.php" "AI Insights - List"

# Step 9: Customization Features Tests
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 9: Smart Customization Features${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "/api/v1/expenses/smart-suggestions.php?vendor_name=Test%20Vendor" "Smart Expense Suggestions (ML)"
test_endpoint "/api/v1/expenses/custom-categories.php" "Custom Expense Categories (Hierarchical)"
test_endpoint "/api/v1/accounting/custom-accounts.php" "Custom Chart of Accounts"

# Step 10: AI Features Tests
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 10: AI Features${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "/api/v1/fiscal/decision-trees" "Decision Trees - List"
test_endpoint "/api/v1/fiscal/decision-trees?tree_key=tva_registration" "Decision Trees - TVA Registration"

# Fiscal AI (POST method)
echo -e "\n${BLUE}Testing Fiscal AI Consultant (POST method)...${NC}"
FISCAL_DATA='{"question":"Care este pragul de TVA?"}'
test_endpoint "/api/v1/fiscal/ai-consultant.php" "Fiscal AI Consultant" "POST" "$FISCAL_DATA"

# Business Consultant (POST method - may timeout)
echo -e "\n${BLUE}Testing Business Consultant (POST method - may timeout)...${NC}"
BUSINESS_DATA='{"question":"Cum imi cresc veniturile?","context":"tech startup"}'
test_endpoint "/api/v1/business/consultant.php" "Business Consultant (MBA)" "POST" "$BUSINESS_DATA"

# Step 11: Advanced Accounting Tests
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 11: Advanced Accounting${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_endpoint "/api/v1/accounting/chart-of-accounts.php" "Chart of Accounts - Main"
test_endpoint "/api/v1/accounting/journal-entries.php" "Journal Entries"

# Final Summary
echo -e "\n${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}\n"

PASS_RATE=0
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
fi

echo -e "Total Tests Run:     ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:              ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:              ${RED}$FAILED_TESTS${NC}"
echo -e "Pass Rate:           ${YELLOW}$PASS_RATE%${NC}"

if [ $PASS_RATE -ge 95 ]; then
    echo -e "\n${GREEN}🎉 EXCELLENT! System is in great shape!${NC}"
elif [ $PASS_RATE -ge 80 ]; then
    echo -e "\n${YELLOW}⚠️  GOOD! Some issues need attention.${NC}"
else
    echo -e "\n${RED}❌ WARNING! Multiple critical issues found.${NC}"
fi

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Test completed at: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Save results to file
RESULTS_FILE="/var/www/documentiulia.ro/test_results_$(date +%Y%m%d_%H%M%S).log"
{
    echo "DocumentIulia API Test Results"
    echo "Date: $(date)"
    echo "=========================="
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Pass Rate: $PASS_RATE%"
} > "$RESULTS_FILE"

echo -e "${BLUE}Results saved to: $RESULTS_FILE${NC}\n"

exit 0
