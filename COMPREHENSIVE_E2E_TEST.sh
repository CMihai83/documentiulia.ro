#!/bin/bash
#
# DocumentIulia Comprehensive E2E Test Suite
# Tests all API endpoints and tracks which work / fail
# Created: 2025-11-25
#

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://127.0.0.1"
HOST="documentiulia.ro"
REPORT_FILE="/var/www/documentiulia.ro/E2E_TEST_REPORT_$(date +%Y%m%d_%H%M%S).md"

# Stats
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Get fresh token
echo "=== Authenticating ==="
LOGIN_RESPONSE=$(cat << 'EOFLOGIN' | curl -s -X POST "$BASE_URL/api/v1/auth/login.php" -H "Host: $HOST" -H "Content-Type: application/json" -d @-
{"email":"test_admin@accountech.com","password":"Test123!"}
EOFLOGIN
)

TOKEN=$(echo "$LOGIN_RESPONSE" | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->token ?? "";')
COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

if [ -z "$TOKEN" ]; then
    echo -e "${RED}FATAL: Could not authenticate${NC}"
    echo "Login response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}Authenticated successfully${NC}"
echo "Token: ${TOKEN:0:50}..."

# Function to test an endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local description="$3"
    local payload="$4"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$method" == "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" \
            -H "Host: $HOST" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID")
    else
        if [ -n "$payload" ]; then
            RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Host: $HOST" \
                -H "Authorization: Bearer $TOKEN" \
                -H "X-Company-ID: $COMPANY_ID" \
                -H "Content-Type: application/json" \
                -d "$payload")
        else
            RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                -H "Host: $HOST" \
                -H "Authorization: Bearer $TOKEN" \
                -H "X-Company-ID: $COMPANY_ID")
        fi
    fi

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    SUCCESS=$(echo "$BODY" | php -r 'echo json_decode(file_get_contents("php://stdin"))->success ? "true" : "false";' 2>/dev/null)

    if [ "$SUCCESS" == "true" ] && [ "$HTTP_CODE" -lt "400" ]; then
        echo -e "${GREEN}[PASS]${NC} $method $endpoint - $description"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "| $method | $endpoint | $description | PASS | $HTTP_CODE |" >> "$REPORT_FILE"
    else
        echo -e "${RED}[FAIL]${NC} $method $endpoint - $description (HTTP: $HTTP_CODE)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        ERROR_MSG=$(echo "$BODY" | php -r 'echo json_decode(file_get_contents("php://stdin"))->message ?? "Unknown error";' 2>/dev/null)
        echo "| $method | $endpoint | $description | FAIL | $HTTP_CODE - $ERROR_MSG |" >> "$REPORT_FILE"
    fi
}

# Start Report
cat << EOF > "$REPORT_FILE"
# DocumentIulia E2E Test Report
**Date:** $(date)
**Environment:** Production
**Base URL:** $BASE_URL
**Host:** $HOST

## Test Results

| Method | Endpoint | Description | Status | Details |
|--------|----------|-------------|--------|---------|
EOF

echo ""
echo "=== Testing Authentication Module ==="
test_endpoint "GET" "/api/v1/auth/me.php" "Get current user info"

echo ""
echo "=== Testing Contacts Module ==="
test_endpoint "GET" "/api/v1/contacts/list.php" "List contacts"
test_endpoint "GET" "/api/v1/contacts/list.php?type=customer" "List customers"
test_endpoint "GET" "/api/v1/contacts/list.php?type=vendor" "List vendors"
test_endpoint "GET" "/api/v1/contacts/list.php?type=employee" "List employees"

echo ""
echo "=== Testing Invoices Module ==="
test_endpoint "GET" "/api/v1/invoices/list.php" "List invoices"
test_endpoint "GET" "/api/v1/invoices/list.php?status=paid" "List paid invoices"
test_endpoint "GET" "/api/v1/invoices/list.php?status=pending" "List pending invoices"

echo ""
echo "=== Testing Expenses Module ==="
test_endpoint "GET" "/api/v1/expenses/list.php" "List expenses"
test_endpoint "GET" "/api/v1/settings/categories.php" "List expense categories"

echo ""
echo "=== Testing Bills Module ==="
test_endpoint "GET" "/api/v1/bills/list.php" "List bills"

echo ""
echo "=== Testing Payments Module ==="
test_endpoint "GET" "/api/v1/payments/list.php" "List payments"

echo ""
echo "=== Testing Inventory Module ==="
test_endpoint "GET" "/api/v1/inventory/products.php" "List products"
test_endpoint "GET" "/api/v1/inventory/warehouses.php" "List warehouses"
test_endpoint "GET" "/api/v1/inventory/stock-levels.php" "List stock levels"
test_endpoint "GET" "/api/v1/inventory/stock-movements.php" "List stock movements"
test_endpoint "GET" "/api/v1/inventory/low-stock-alerts.php" "List low stock alerts"
test_endpoint "GET" "/api/v1/inventory/stock-adjustment.php" "List adjustments"
test_endpoint "GET" "/api/v1/inventory/stock-transfer.php" "List transfers"

echo ""
echo "=== Testing Purchase Orders Module ==="
test_endpoint "GET" "/api/v1/purchase-orders/list.php" "List purchase orders"

echo ""
echo "=== Testing CRM Module ==="
test_endpoint "GET" "/api/v1/crm/contacts.php" "CRM Contacts"
test_endpoint "GET" "/api/v1/crm/opportunities.php" "CRM Opportunities"
test_endpoint "GET" "/api/v1/crm/quotations.php" "CRM Quotations"
test_endpoint "GET" "/api/v1/crm/opportunities-pipeline.php" "CRM Pipeline"

echo ""
echo "=== Testing Accounting Module ==="
test_endpoint "GET" "/api/v1/accounting/chart-of-accounts.php" "Chart of Accounts"
test_endpoint "GET" "/api/v1/accounting/general-ledger.php" "General Ledger"
test_endpoint "GET" "/api/v1/accounting/journal-entries.php" "Journal Entries"
test_endpoint "GET" "/api/v1/accounting/trial-balance.php" "Trial Balance"
test_endpoint "GET" "/api/v1/accounting/balance-sheet.php" "Balance Sheet"
test_endpoint "GET" "/api/v1/accounting/income-statement.php" "Income Statement"
test_endpoint "GET" "/api/v1/accounting/fixed-assets.php" "Fixed Assets"
test_endpoint "GET" "/api/v1/accounting/tax-codes.php" "Tax Codes"

echo ""
echo "=== Testing Reports Module ==="
test_endpoint "GET" "/api/v1/reports/profit-loss.php" "Profit & Loss Report"
test_endpoint "GET" "/api/v1/reports/cash-flow.php" "Cash Flow Report"
test_endpoint "GET" "/api/v1/reports/budget-vs-actual.php" "Budget vs Actual"

echo ""
echo "=== Testing Time Tracking Module ==="
test_endpoint "GET" "/api/v1/time/entries.php" "Time Entries"
test_endpoint "GET" "/api/v1/time/timesheets.php" "Timesheets"

echo ""
echo "=== Testing Projects Module ==="
test_endpoint "GET" "/api/v1/projects/list.php" "List Projects"
test_endpoint "GET" "/api/v1/tasks/board.php?project_id=a9d6bda9-3a23-40d3-98fa-a3c4293a0bca" "List Tasks"

echo ""
echo "=== Testing Sprint Module ==="
test_endpoint "GET" "/api/v1/sprints/list.php?project_id=a9d6bda9-3a23-40d3-98fa-a3c4293a0bca" "List Sprints"
test_endpoint "GET" "/api/v1/epics/list.php?project_id=a9d6bda9-3a23-40d3-98fa-a3c4293a0bca" "List Epics"

echo ""
echo "=== Testing HR Module ==="
test_endpoint "GET" "/api/v1/hr/employees.php" "List Employees"
test_endpoint "GET" "/api/v1/hr/payroll/list.php" "List Payroll"

echo ""
echo "=== Testing Bank Module ==="
test_endpoint "GET" "/api/v1/bank/list.php" "Bank Accounts"
test_endpoint "GET" "/api/v1/bank/transactions-list.php" "Bank Transactions"

echo ""
echo "=== Testing Analytics Module ==="
test_endpoint "GET" "/api/v1/analytics/kpis.php" "Business KPIs"
test_endpoint "GET" "/api/v1/analytics/revenue-trend.php" "Revenue Trend"

echo ""
echo "=== Testing Fiscal Module ==="
test_endpoint "GET" "/api/v1/fiscal/ai-consultant.php" "Fiscal AI Consultant"
test_endpoint "GET" "/api/v1/fiscal-calendar/my-calendar.php?year=2025" "Fiscal Calendar"

echo ""
echo "=== Testing e-Factura Module ==="
test_endpoint "GET" "/api/v1/efactura/status.php" "e-Factura Status"
test_endpoint "GET" "/api/v1/efactura/received-invoices.php" "Received e-Invoices"
test_endpoint "GET" "/api/v1/efactura/analytics.php" "e-Factura Analytics"

echo ""
echo "=== Testing Courses Module ==="
test_endpoint "GET" "/api/v1/courses/list.php" "Course Catalog"
test_endpoint "GET" "/api/v1/courses/my-enrollments.php" "My Courses"

echo ""
echo "=== Testing Forum Module ==="
test_endpoint "GET" "/api/v1/forum/categories.php" "Forum Categories"
test_endpoint "GET" "/api/v1/forum/threads.php?category_id=1" "Forum Threads"

echo ""
echo "=== Testing Subscription Module ==="
test_endpoint "GET" "/api/v1/subscriptions/current.php" "Current Subscription"
test_endpoint "GET" "/api/v1/subscriptions/plans.php" "Subscription Plans"

echo ""
echo "=== Testing Receipts Module ==="
test_endpoint "GET" "/api/v1/receipts/list.php" "List Receipts"
test_endpoint "GET" "/api/v1/receipts/templates.php" "Receipt Templates"

echo ""
echo "=== Testing Recurring Invoices Module ==="
test_endpoint "GET" "/api/v1/recurring-invoices/list.php" "List Recurring Invoices"

echo ""
echo "=== Testing Settings Module ==="
test_endpoint "GET" "/api/v1/settings/categories.php" "Expense Categories Settings"
test_endpoint "GET" "/api/v1/settings/tax-codes.php" "Tax Codes Settings"
test_endpoint "GET" "/api/v1/companies/get.php" "Company Details"

# Summary
cat << EOF >> "$REPORT_FILE"

## Summary

- **Total Tests:** $TOTAL_TESTS
- **Passed:** $PASSED_TESTS
- **Failed:** $FAILED_TESTS
- **Pass Rate:** $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%

## Notes

This report was generated automatically by the E2E test suite.
Tests that fail may need:
1. API endpoint creation (if 404)
2. Authorization fix (if 401)
3. Service implementation (if 500)
4. Data seeding (if returns empty/error)

EOF

echo ""
echo "=== TEST SUMMARY ==="
echo -e "Total: $TOTAL_TESTS | ${GREEN}Passed: $PASSED_TESTS${NC} | ${RED}Failed: $FAILED_TESTS${NC}"
echo "Pass Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo ""
echo "Report saved to: $REPORT_FILE"
