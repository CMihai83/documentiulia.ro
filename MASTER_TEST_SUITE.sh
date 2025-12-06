#!/bin/bash
BASE_URL="http://127.0.0.1"
HOST_HEADER="Host: documentiulia.ro"
COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
TOTAL=0

echo -e "${BLUE}=== Authentication ===${NC}"
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login.php" -H "$HOST_HEADER" -H "Content-Type: application/json" -d '{"email":"test_admin@accountech.com","password":"Test123!"}' | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->token ?? "";')
[ -z "$TOKEN" ] && echo -e "${RED}Auth failed!${NC}" && exit 1
echo -e "${GREEN}Authenticated${NC}"

test_endpoint() {
    local M="$1" N="$2" METHOD="$3" E="$4" D="$5"
    ((TOTAL++))
    if [ "$METHOD" == "GET" ]; then
        R=$(curl -s "$BASE_URL$E" -H "$HOST_HEADER" -H "Authorization: Bearer $TOKEN" -H "X-Company-ID: $COMPANY_ID")
    else
        R=$(curl -s -X "$METHOD" "$BASE_URL$E" -H "$HOST_HEADER" -H "Authorization: Bearer $TOKEN" -H "X-Company-ID: $COMPANY_ID" -H "Content-Type: application/json" -d "$D")
    fi
    S=$(echo "$R" | php -r 'echo json_decode(file_get_contents("php://stdin"))->success ?? "false";')
    if [ "$S" == "1" ] || [ "$S" == "true" ]; then
        echo -e "${GREEN}[PASS]${NC} [$M] $N"; ((PASSED++))
    else
        ERR=$(echo "$R" | php -r '$d=json_decode(file_get_contents("php://stdin")); echo $d->error ?? $d->message ?? "Unknown";' | head -c 40)
        echo -e "${RED}[FAIL]${NC} [$M] $N - $ERR"; ((FAILED++))
    fi
}

echo -e "\n${YELLOW}=== CORE ACCOUNTING ===${NC}"
test_endpoint "Dashboard" "Stats" "GET" "/api/v1/dashboard/stats.php"
test_endpoint "Invoices" "List" "GET" "/api/v1/invoices/list.php"
test_endpoint "Bills" "List" "GET" "/api/v1/bills/list.php"
test_endpoint "Expenses" "List" "GET" "/api/v1/expenses/list.php"
test_endpoint "Payments" "List" "GET" "/api/v1/payments/list.php"

echo -e "\n${YELLOW}=== ADVANCED ACCOUNTING ===${NC}"
test_endpoint "Chart of Accounts" "List" "GET" "/api/v1/accounting/chart-of-accounts.php"
test_endpoint "Journal Entries" "List" "GET" "/api/v1/accounting/journal-entries.php"
test_endpoint "Fixed Assets" "List" "GET" "/api/v1/accounting/fixed-assets.php"
test_endpoint "Tax Codes" "List" "GET" "/api/v1/settings/tax-codes.php"
test_endpoint "Categories" "List" "GET" "/api/v1/settings/categories.php"

echo -e "\n${YELLOW}=== FINANCIAL REPORTS ===${NC}"
test_endpoint "Reports" "Profit Loss" "GET" "/api/v1/reports/profit-loss.php"
test_endpoint "Reports" "Cash Flow" "GET" "/api/v1/reports/cash-flow.php"
test_endpoint "Reports" "Budget vs Actual" "GET" "/api/v1/reports/budget-vs-actual.php"

echo -e "\n${YELLOW}=== INVENTORY ===${NC}"
test_endpoint "Products" "List" "GET" "/api/v1/inventory/products.php"
test_endpoint "Warehouses" "List" "GET" "/api/v1/inventory/warehouses.php"
test_endpoint "Stock Levels" "List" "GET" "/api/v1/inventory/stock-levels.php"
test_endpoint "Stock Movements" "List" "GET" "/api/v1/inventory/stock-movements.php"
test_endpoint "Low Stock" "List" "GET" "/api/v1/inventory/low-stock.php"
test_endpoint "Purchase Orders" "List" "GET" "/api/v1/purchase-orders/list.php"

echo -e "\n${YELLOW}=== CRM ===${NC}"
test_endpoint "Contacts" "List" "GET" "/api/v1/contacts/list.php"
test_endpoint "Opportunities" "List" "GET" "/api/v1/crm/opportunities.php"
test_endpoint "Quotations" "List" "GET" "/api/v1/crm/quotations.php"

echo -e "\n${YELLOW}=== PROJECT MANAGEMENT ===${NC}"
PROJECT_ID=$(curl -s "$BASE_URL/api/v1/projects/list.php" -H "$HOST_HEADER" -H "Authorization: Bearer $TOKEN" -H "X-Company-ID: $COMPANY_ID" | php -r '$d=json_decode(file_get_contents("php://stdin")); echo $d->data[0]->id ?? "";')
test_endpoint "Projects" "List" "GET" "/api/v1/projects/list.php"
test_endpoint "Sprints" "List" "GET" "/api/v1/sprints/sprints.php?project_id=$PROJECT_ID"

echo -e "\n${YELLOW}=== TIME TRACKING ===${NC}"
test_endpoint "Time Entries" "List" "GET" "/api/v1/time/entries.php"

echo -e "\n${YELLOW}=== HR ===${NC}"
test_endpoint "Employees" "List" "GET" "/api/v1/hr/employees/list.php"
test_endpoint "Payroll" "List" "GET" "/api/v1/hr/payroll/list.php?year=2025"
test_endpoint "Fiscal Calendar" "Events" "GET" "/api/v1/fiscal-calendar/my-calendar.php?year=2025"

echo -e "\n${YELLOW}=== BANKING ===${NC}"
test_endpoint "Bank Accounts" "List" "GET" "/api/v1/bank/connections.php"
test_endpoint "Bank Transactions" "List" "GET" "/api/v1/bank/transactions.php"

echo -e "\n${YELLOW}=== RECEIPTS OCR ===${NC}"
test_endpoint "Receipts" "List" "GET" "/api/v1/receipts/list.php"
test_endpoint "Receipt Templates" "List" "GET" "/api/v1/receipts/templates.php"

echo -e "\n${YELLOW}=== ANALYTICS & AI ===${NC}"
test_endpoint "Analytics" "KPIs" "GET" "/api/v1/analytics/kpis.php"
test_endpoint "Insights" "List" "GET" "/api/v1/insights/list.php"

echo -e "\n${YELLOW}=== EDUCATION ===${NC}"
test_endpoint "Courses" "List" "GET" "/api/v1/courses/list.php"
test_endpoint "Forum Categories" "List" "GET" "/api/v1/forum/categories.php"

echo -e "\n${YELLOW}=== SUBSCRIPTION ===${NC}"
test_endpoint "Subscription" "Current" "GET" "/api/v1/subscriptions/current.php"
test_endpoint "Subscription" "Plans" "GET" "/api/v1/subscriptions/plans.php"

echo ""
echo "============================================="
echo "       MASTER TEST SUITE SUMMARY"
echo "============================================="
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
PASS_RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)
echo "Pass Rate: ${PASS_RATE}%"
