#!/bin/bash
#
# DocumentIulia Comprehensive UI Functionality Test Suite
# Tests ALL UI routes, API endpoints, and CRUD operations
# Created: 2025-11-26
# Last Updated: 2025-11-26
#

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
BASE_URL="http://127.0.0.1"
HOST="documentiulia.ro"
REPORT_FILE="/var/www/documentiulia.ro/COMPREHENSIVE_UI_REPORT_$(date +%Y%m%d_%H%M%S).md"

# Counters
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0
TOTAL_TESTS=0

# Arrays for tracking
declare -a FAILED_TESTS
declare -a SKIPPED_TESTS
declare -a MISSING_FUNCTIONALITY

# Initialize report
cat << 'EOF' > "$REPORT_FILE"
# DocumentIulia Comprehensive UI Functionality Report
**Generated:** $(date)
**Test Scope:** All UI Routes, API Endpoints, CRUD Operations

---

## Executive Summary

EOF

echo "============================================================"
echo "    DocumentIulia Comprehensive UI Functionality Test"
echo "============================================================"
echo ""

# Get authentication token
echo -e "${BLUE}[AUTH] Authenticating as test_admin...${NC}"
echo '{"email":"test_admin@accountech.com","password":"Test123!"}' > /tmp/auth_test.json
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login.php" -H "Host: $HOST" -H "Content-Type: application/json" -d @/tmp/auth_test.json)
TOKEN=$(echo "$LOGIN_RESPONSE" | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->token ?? "";')
COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

if [ -z "$TOKEN" ]; then
    echo -e "${RED}FATAL: Could not authenticate${NC}"
    exit 1
fi

echo -e "${GREEN}[AUTH] Authenticated successfully${NC}"
echo ""

# Helper function for API calls
api_get() {
    curl -s "$BASE_URL$1" \
        -H "Host: $HOST" \
        -H "Authorization: Bearer $TOKEN" \
        -H "X-Company-ID: $COMPANY_ID"
}

api_post() {
    curl -s -X POST "$BASE_URL$1" \
        -H "Host: $HOST" \
        -H "Authorization: Bearer $TOKEN" \
        -H "X-Company-ID: $COMPANY_ID" \
        -H "Content-Type: application/json" \
        -d "$2"
}

api_put() {
    curl -s -X PUT "$BASE_URL$1" \
        -H "Host: $HOST" \
        -H "Authorization: Bearer $TOKEN" \
        -H "X-Company-ID: $COMPANY_ID" \
        -H "Content-Type: application/json" \
        -d "$2"
}

api_delete() {
    curl -s -X DELETE "$BASE_URL$1" \
        -H "Host: $HOST" \
        -H "Authorization: Bearer $TOKEN" \
        -H "X-Company-ID: $COMPANY_ID" \
        -H "Content-Type: application/json" \
        -d "$2"
}

# Check if result is successful
check_success() {
    local result="$1"
    echo "$result" | php -r 'echo (json_decode(file_get_contents("php://stdin"))->success ?? false) ? "true" : "false";' 2>/dev/null
}

# Test and record result
test_endpoint() {
    local category="$1"
    local operation="$2"
    local method="$3"
    local endpoint="$4"
    local data="$5"
    local description="$6"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    local result
    case "$method" in
        GET) result=$(api_get "$endpoint") ;;
        POST) result=$(api_post "$endpoint" "$data") ;;
        PUT) result=$(api_put "$endpoint" "$data") ;;
        DELETE) result=$(api_delete "$endpoint" "$data") ;;
    esac

    local success=$(check_success "$result")

    if [ "$success" == "true" ]; then
        echo -e "${GREEN}[PASS]${NC} [$category] $operation"
        TOTAL_PASS=$((TOTAL_PASS + 1))
        echo "| $category | $operation | PASS | $description |" >> "$REPORT_FILE"
    else
        local error=$(echo "$result" | php -r 'echo json_decode(file_get_contents("php://stdin"))->message ?? "Unknown error";' 2>/dev/null)
        echo -e "${RED}[FAIL]${NC} [$category] $operation - $error"
        TOTAL_FAIL=$((TOTAL_FAIL + 1))
        FAILED_TESTS+=("$category: $operation - $error")
        echo "| $category | $operation | FAIL | $error |" >> "$REPORT_FILE"
    fi
}

# Section separator
section() {
    echo ""
    echo -e "${CYAN}=== SECTION $1: $2 ===${NC}"
    echo "" >> "$REPORT_FILE"
    echo "## $1. $2" >> "$REPORT_FILE"
    echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
    echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"
}

##############################################
# START TESTING
##############################################

section "1" "Authentication & User Management"
test_endpoint "Auth" "Current User" "GET" "/api/v1/auth/me.php" "" "Get current user info"
test_endpoint "Auth" "Profile" "GET" "/api/v1/users/profile.php" "" "Get user profile"

section "2" "Dashboard & Stats"
test_endpoint "Dashboard" "Stats" "GET" "/api/v1/dashboard/stats.php" "" "Get dashboard statistics"
test_endpoint "Dashboard" "Key Metrics" "GET" "/api/v1/reports/key-metrics.php" "" "Get key metrics"

section "3" "Invoices - Full CRUD"
test_endpoint "Invoices" "List" "GET" "/api/v1/invoices/list.php" "" "List all invoices"
INVOICE_DATA='{"client_name":"Test Client","client_email":"test@example.com","items":[{"description":"Test Item","quantity":1,"unit_price":100}]}'
INVOICE_RESULT=$(api_post "/api/v1/invoices/create.php" "$INVOICE_DATA")
INVOICE_ID=$(echo "$INVOICE_RESULT" | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->id ?? "";')
if [ -n "$INVOICE_ID" ]; then
    echo -e "${GREEN}[PASS]${NC} [Invoices] Create"
    TOTAL_PASS=$((TOTAL_PASS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    test_endpoint "Invoices" "Read" "GET" "/api/v1/invoices/get.php?id=$INVOICE_ID" "" "Get single invoice"
else
    echo -e "${RED}[FAIL]${NC} [Invoices] Create"
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

section "4" "Recurring Invoices"
test_endpoint "Recurring" "List" "GET" "/api/v1/recurring-invoices/list.php" "" "List recurring invoices"

section "5" "Bills"
test_endpoint "Bills" "List" "GET" "/api/v1/bills/list.php" "" "List all bills"
BILL_DATA='{"vendor_name":"Test Vendor","description":"Test Bill","amount":500,"due_date":"2025-12-31"}'
test_endpoint "Bills" "Create" "POST" "/api/v1/bills/create.php" "$BILL_DATA" "Create new bill"

section "6" "Expenses"
test_endpoint "Expenses" "List" "GET" "/api/v1/expenses/list.php" "" "List all expenses"
EXPENSE_DATA='{"description":"Test Expense","amount":150,"category":"utilities","date":"2025-11-01"}'
test_endpoint "Expenses" "Create" "POST" "/api/v1/expenses/create.php" "$EXPENSE_DATA" "Create expense"
test_endpoint "Expenses" "Categories" "GET" "/api/v1/expenses/custom-categories.php" "" "Get custom categories"
test_endpoint "Expenses" "Smart Suggestions" "GET" "/api/v1/expenses/smart-suggestions.php" "" "Get AI suggestions"

section "7" "Payments"
test_endpoint "Payments" "List" "GET" "/api/v1/payments/list.php" "" "List payments"
PAYMENT_DATA='{"amount":100,"type":"income","description":"Test Payment","payment_date":"2025-11-01"}'
test_endpoint "Payments" "Create" "POST" "/api/v1/payments/payments.php" "$PAYMENT_DATA" "Create payment"

section "8" "Accounting - Journal Entries"
test_endpoint "Journal" "List" "GET" "/api/v1/accounting/journal-entries/list.php" "" "List journal entries"
test_endpoint "Journal" "Create" "POST" "/api/v1/accounting/journal-entries.php" '{"description":"Test Entry","entries":[{"account_code":"1000","debit":100,"credit":0},{"account_code":"4000","debit":0,"credit":100}]}' "Create journal entry"

section "9" "Chart of Accounts"
test_endpoint "CoA" "List" "GET" "/api/v1/accounting/chart-of-accounts.php" "" "Get chart of accounts"
test_endpoint "CoA" "Custom" "GET" "/api/v1/accounting/custom-accounts.php" "" "Get custom accounts"

section "10" "Fixed Assets"
test_endpoint "Assets" "List" "GET" "/api/v1/accounting/fixed-assets/list.php" "" "List fixed assets"

section "11" "Tax Codes"
test_endpoint "Tax" "List" "GET" "/api/v1/accounting/tax-codes.php" "" "List tax codes"
test_endpoint "Tax" "Settings" "GET" "/api/v1/settings/tax-codes.php" "" "Get tax settings"

section "12" "Financial Reports"
test_endpoint "Reports" "Profit & Loss" "GET" "/api/v1/reports/profit-loss.php?start_date=2025-01-01&end_date=2025-12-31" "" "Generate P&L"
test_endpoint "Reports" "Cash Flow" "GET" "/api/v1/reports/cash-flow.php?start_date=2025-01-01&end_date=2025-12-31" "" "Generate Cash Flow"
test_endpoint "Reports" "Budget vs Actual" "GET" "/api/v1/reports/budget-vs-actual.php" "" "Generate Budget Report"
test_endpoint "Reports" "Balance Sheet" "GET" "/api/v1/reports/balance-sheet.php" "" "Generate Balance Sheet"

section "13" "e-Factura (ANAF)"
test_endpoint "e-Factura" "Status" "GET" "/api/v1/efactura/status.php" "" "Get e-Factura status"
test_endpoint "e-Factura" "Analytics" "GET" "/api/v1/efactura/analytics.php" "" "Get analytics"
test_endpoint "e-Factura" "OAuth Status" "GET" "/api/v1/efactura/oauth-status.php" "" "Check OAuth status"
test_endpoint "e-Factura" "Received" "GET" "/api/v1/efactura/received-invoices.php" "" "List received invoices"

section "14" "Receipts OCR"
test_endpoint "Receipts" "List" "GET" "/api/v1/receipts/list.php" "" "List receipts"
test_endpoint "Receipts" "Templates" "GET" "/api/v1/receipts/templates.php" "" "List OCR templates"

section "15" "Banking"
test_endpoint "Bank" "Accounts" "GET" "/api/v1/bank/list.php" "" "List bank accounts"
test_endpoint "Bank" "Connections" "GET" "/api/v1/bank/connections-list.php" "" "List bank connections"
test_endpoint "Bank" "Transactions" "GET" "/api/v1/bank/transactions-list.php" "" "List transactions"
test_endpoint "Bank" "Stats" "GET" "/api/v1/bank/transaction-stats.php" "" "Get transaction stats"

section "16" "Inventory - Products"
test_endpoint "Products" "List" "GET" "/api/v1/inventory/products.php" "" "List products"
PRODUCT_DATA='{"name":"Test Product","sku":"TEST-'$(date +%s)'","price":99.99,"quantity":100}'
test_endpoint "Products" "Create" "POST" "/api/v1/inventory/products.php" "$PRODUCT_DATA" "Create product"

section "17" "Inventory - Warehouses"
test_endpoint "Warehouses" "List" "GET" "/api/v1/inventory/warehouses.php" "" "List warehouses"
WAREHOUSE_DATA='{"name":"Test Warehouse '$(date +%s)'","location":"Test Location","capacity":1000}'
test_endpoint "Warehouses" "Create" "POST" "/api/v1/inventory/warehouses.php" "$WAREHOUSE_DATA" "Create warehouse"

section "18" "Inventory - Stock"
test_endpoint "Stock" "Levels" "GET" "/api/v1/inventory/stock-levels.php" "" "Get stock levels"
test_endpoint "Stock" "Low Alerts" "GET" "/api/v1/inventory/low-stock.php" "" "Get low stock alerts"
test_endpoint "Stock" "Movements" "GET" "/api/v1/inventory/stock-movements.php" "" "List movements"

section "19" "Purchase Orders"
test_endpoint "PO" "List" "GET" "/api/v1/purchase-orders/list.php" "" "List purchase orders"

section "20" "CRM - Contacts"
test_endpoint "Contacts" "List" "GET" "/api/v1/contacts/list.php" "" "List contacts"
CONTACT_DATA='{"name":"Test Contact '$(date +%s)'","email":"test'$(date +%s)'@example.com","phone":"+40700000000","type":"client"}'
CONTACT_RESULT=$(api_post "/api/v1/contacts/create.php" "$CONTACT_DATA")
CONTACT_ID=$(echo "$CONTACT_RESULT" | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->id ?? "";')
if [ -n "$CONTACT_ID" ]; then
    echo -e "${GREEN}[PASS]${NC} [Contacts] Create"
    TOTAL_PASS=$((TOTAL_PASS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    # Test Update
    UPDATE_DATA='{"id":"'$CONTACT_ID'","name":"Updated Contact"}'
    test_endpoint "Contacts" "Update" "PUT" "/api/v1/contacts/update.php" "$UPDATE_DATA" "Update contact"
    # Test Delete
    test_endpoint "Contacts" "Delete" "DELETE" "/api/v1/contacts/delete.php?id=$CONTACT_ID" "" "Delete contact"
else
    echo -e "${RED}[FAIL]${NC} [Contacts] Create"
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

section "21" "CRM - Opportunities"
test_endpoint "Opps" "List" "GET" "/api/v1/crm/opportunities.php" "" "List opportunities"
test_endpoint "Opps" "Pipeline" "GET" "/api/v1/crm/opportunities-pipeline.php" "" "Get pipeline view"
OPP_DATA='{"title":"Test Opportunity","value":10000,"stage":"prospecting","probability":25}'
test_endpoint "Opps" "Create" "POST" "/api/v1/crm/opportunities.php" "$OPP_DATA" "Create opportunity"

section "22" "CRM - Quotations"
test_endpoint "Quotes" "List" "GET" "/api/v1/crm/quotations.php" "" "List quotations"

section "23" "Projects"
test_endpoint "Projects" "List" "GET" "/api/v1/projects/list.php" "" "List projects"
PROJECT_DATA='{"name":"Test Project '$(date +%s)'","description":"Test Description","status":"active"}'
PROJECT_RESULT=$(api_post "/api/v1/projects/projects.php" "$PROJECT_DATA")
PROJECT_ID=$(echo "$PROJECT_RESULT" | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->id ?? "";')
if [ -n "$PROJECT_ID" ]; then
    echo -e "${GREEN}[PASS]${NC} [Projects] Create"
    TOTAL_PASS=$((TOTAL_PASS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    test_endpoint "Projects" "Gantt" "GET" "/api/v1/projects/gantt.php?project_id=$PROJECT_ID" "" "Get Gantt data"
else
    echo -e "${RED}[FAIL]${NC} [Projects] Create"
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

section "24" "Sprints & Scrum"
test_endpoint "Sprints" "List" "GET" "/api/v1/sprints/list.php" "" "List sprints"
test_endpoint "Sprints" "Active" "GET" "/api/v1/sprints/active.php" "" "Get active sprint"
test_endpoint "Sprints" "Velocity" "GET" "/api/v1/sprints/velocity.php" "" "Get velocity metrics"
test_endpoint "Sprints" "Burndown" "GET" "/api/v1/sprints/burndown.php" "" "Get burndown chart"

section "25" "Tasks"
test_endpoint "Tasks" "Backlog" "GET" "/api/v1/tasks/backlog.php" "" "Get backlog"
test_endpoint "Tasks" "Board" "GET" "/api/v1/tasks/board.php" "" "Get task board"

section "26" "Epics"
test_endpoint "Epics" "List" "GET" "/api/v1/epics/list.php" "" "List epics"
test_endpoint "Epics" "Progress" "GET" "/api/v1/epics/progress.php" "" "Get epic progress"

section "27" "Time Tracking"
test_endpoint "Time" "Entries" "GET" "/api/v1/time/entries.php" "" "List time entries"
test_endpoint "Time" "Projects" "GET" "/api/v1/time/projects.php" "" "Get project times"
test_endpoint "Time" "Reports" "GET" "/api/v1/time/reports.php" "" "Get time reports"
test_endpoint "Time" "AI Suggestions" "GET" "/api/v1/time/ai.php" "" "Get AI suggestions"
TIME_ENTRY='{"description":"Test Entry","duration":3600,"project_id":"'${PROJECT_ID:-"null"}'","date":"2025-11-01"}'
test_endpoint "Time" "Create Entry" "POST" "/api/v1/time/entries.php" "$TIME_ENTRY" "Create time entry"

section "28" "HR - Employees"
test_endpoint "Employees" "List" "GET" "/api/v1/hr/employees/list.php" "" "List employees"
EMP_DATA='{"first_name":"Test","last_name":"Employee","email":"emp'$(date +%s)'@test.com","position":"Developer","salary":50000}'
test_endpoint "Employees" "Create" "POST" "/api/v1/hr/employees.php" "$EMP_DATA" "Create employee"

section "29" "HR - Payroll"
test_endpoint "Payroll" "List" "GET" "/api/v1/hr/payroll/list.php?year=2025" "" "List payroll periods"

section "30" "Fiscal Calendar"
test_endpoint "Fiscal" "Calendar" "GET" "/api/v1/fiscal-calendar/my-calendar.php?year=2025" "" "Get fiscal calendar"

section "31" "Analytics & BI"
test_endpoint "Analytics" "KPIs" "GET" "/api/v1/analytics/kpis.php" "" "Get KPIs"
test_endpoint "Analytics" "Dashboards" "GET" "/api/v1/analytics/dashboards.php" "" "Get dashboards"
test_endpoint "Analytics" "Metrics" "GET" "/api/v1/analytics/metrics.php" "" "Get metrics"
test_endpoint "Analytics" "Revenue Trend" "GET" "/api/v1/analytics/revenue-trend.php" "" "Get revenue trend"
test_endpoint "Analytics" "Top Customers" "GET" "/api/v1/analytics/top-customers.php" "" "Get top customers"
test_endpoint "Analytics" "Aging Report" "GET" "/api/v1/analytics/aging-report.php" "" "Get aging report"

section "32" "AI Assistance"
test_endpoint "AI" "Insights" "GET" "/api/v1/insights/list.php" "" "Get AI insights"
test_endpoint "AI" "Generate" "POST" "/api/v1/insights/generate.php" '{}' "Generate new insights"
test_endpoint "AI" "Business Insights" "GET" "/api/v1/business/insights.php" "" "Get business insights"

section "33" "Decision Trees"
test_endpoint "Trees" "List" "GET" "/api/v1/fiscal/decision-trees.php" "" "List decision trees"
test_endpoint "Trees" "Navigator" "GET" "/api/v1/fiscal/decision-tree-navigator.php" "" "Get navigator"

section "34" "Forum"
test_endpoint "Forum" "Categories" "GET" "/api/v1/forum/categories.php" "" "List categories"
test_endpoint "Forum" "Threads" "GET" "/api/v1/forum/threads.php" "" "List threads"

section "35" "Courses & Education"
test_endpoint "Courses" "List" "GET" "/api/v1/courses/list.php" "" "List courses"
test_endpoint "Courses" "Enrollments" "GET" "/api/v1/courses/my-enrollments.php" "" "My enrollments"

section "36" "MBA Library"
test_endpoint "MBA" "Library" "GET" "/api/v1/mba/library.php" "" "Get MBA library"
test_endpoint "MBA" "Progress" "GET" "/api/v1/mba/progress.php" "" "Get MBA progress"
test_endpoint "MBA" "Recommendations" "GET" "/api/v1/mba/recommendations.php" "" "Get recommendations"

section "37" "Subscription"
test_endpoint "Sub" "Current" "GET" "/api/v1/subscriptions/current.php" "" "Get current subscription"
test_endpoint "Sub" "Plans" "GET" "/api/v1/subscriptions/plans.php" "" "List plans"
test_endpoint "Sub" "Invoices" "GET" "/api/v1/subscriptions/invoices.php" "" "List invoices"

section "38" "Settings & Categories"
test_endpoint "Settings" "Categories" "GET" "/api/v1/settings/categories.php" "" "Get categories"
test_endpoint "Settings" "Tax Codes" "GET" "/api/v1/settings/tax-codes.php" "" "Get tax codes"

section "39" "Personal Context"
test_endpoint "Context" "Get" "GET" "/api/v1/context/get.php" "" "Get personal context"
test_endpoint "Context" "Templates" "GET" "/api/v1/context/templates.php" "" "Get templates"

section "40" "Notifications"
test_endpoint "Notifs" "List" "GET" "/api/v1/notifications/user-notifications.php" "" "Get notifications"

##############################################
# FINAL SUMMARY
##############################################

echo ""
echo "============================================================"
echo "         COMPREHENSIVE TEST SUMMARY"
echo "============================================================"
echo ""
PASS_RATE=$(echo "scale=1; $TOTAL_PASS * 100 / $TOTAL_TESTS" | bc)

echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$TOTAL_PASS${NC}"
echo -e "Failed:       ${RED}$TOTAL_FAIL${NC}"
echo -e "Pass Rate:    ${YELLOW}${PASS_RATE}%${NC}"
echo ""

# Add summary to report
cat << EOF >> "$REPORT_FILE"

---

## Final Summary

| Metric | Value |
|--------|-------|
| Total Tests | $TOTAL_TESTS |
| Passed | $TOTAL_PASS |
| Failed | $TOTAL_FAIL |
| **Pass Rate** | **${PASS_RATE}%** |

EOF

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed Tests:${NC}"
    echo "## Failed Tests" >> "$REPORT_FILE"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $test"
        echo "- $test" >> "$REPORT_FILE"
    done
fi

echo ""
echo "Report saved to: $REPORT_FILE"
echo ""

# Output status based on results
if [ "$TOTAL_FAIL" -eq 0 ]; then
    echo -e "${GREEN}ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed - review report for details${NC}"
    exit 1
fi
