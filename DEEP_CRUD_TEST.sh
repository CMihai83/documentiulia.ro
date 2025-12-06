#!/bin/bash
#
# DocumentIulia Deep CRUD Testing Suite
# Tests Create, Read, Update, Delete for all major modules
# Created: 2025-11-25
#

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BASE_URL="http://127.0.0.1"
HOST="documentiulia.ro"
REPORT_FILE="/var/www/documentiulia.ro/DEEP_CRUD_REPORT_$(date +%Y%m%d_%H%M%S).md"

# Counters
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_TESTS=0

# Initialize report
cat << 'EOF' > "$REPORT_FILE"
# DocumentIulia Deep CRUD Test Report
**Generated:** $(date)
**Test Type:** End-to-End CRUD Operations

---

EOF

echo "============================================="
echo "  DocumentIulia Deep CRUD Testing Suite"
echo "============================================="
echo ""

# Get authentication token
echo -e "${BLUE}Authenticating...${NC}"
echo '{"email":"test_admin@accountech.com","password":"Test123!"}' > /tmp/login_test.json
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login.php" -H "Host: $HOST" -H "Content-Type: application/json" -d @/tmp/login_test.json)
TOKEN=$(echo "$LOGIN_RESPONSE" | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->token ?? "";')
COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

if [ -z "$TOKEN" ]; then
    echo -e "${RED}FATAL: Could not authenticate${NC}"
    exit 1
fi

echo -e "${GREEN}Authenticated successfully${NC}"
echo ""

# Helper function for API calls
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"

    if [ "$method" == "GET" ]; then
        curl -s "$BASE_URL$endpoint" \
            -H "Host: $HOST" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID"
    elif [ "$method" == "DELETE" ]; then
        curl -s -X DELETE "$BASE_URL$endpoint" \
            -H "Host: $HOST" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Host: $HOST" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

# Test helper function
test_crud() {
    local module="$1"
    local operation="$2"
    local result="$3"
    local details="$4"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Check if result indicates success
    local success=$(echo "$result" | php -r 'echo json_decode(file_get_contents("php://stdin"))->success ? "true" : "false";' 2>/dev/null)

    if [ "$success" == "true" ]; then
        echo -e "${GREEN}[PASS]${NC} [$module] $operation"
        TOTAL_PASS=$((TOTAL_PASS + 1))
        echo "| $module | $operation | PASS | $details |" >> "$REPORT_FILE"
    else
        local error=$(echo "$result" | php -r 'echo json_decode(file_get_contents("php://stdin"))->error ?? "Unknown error";' 2>/dev/null)
        echo -e "${RED}[FAIL]${NC} [$module] $operation - $error"
        TOTAL_FAIL=$((TOTAL_FAIL + 1))
        echo "| $module | $operation | FAIL | $error |" >> "$REPORT_FILE"
    fi
}

# ==========================================
# SECTION 1: CONTACTS CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 1: CONTACTS CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 1. Contacts CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# CREATE Contact
CONTACT_DATA='{"display_name":"Test Contact CRUD","contact_type":"customer","email":"test.crud@example.com","phone":"+40722123456"}'
CREATE_RESULT=$(api_call "POST" "/api/v1/crm/contacts.php" "$CONTACT_DATA")
test_crud "Contacts" "CREATE" "$CREATE_RESULT" "Created test contact"
CONTACT_ID=$(echo "$CREATE_RESULT" | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->id ?? "";')

# READ Contact
READ_RESULT=$(api_call "GET" "/api/v1/crm/contacts.php?id=$CONTACT_ID" "")
test_crud "Contacts" "READ" "$READ_RESULT" "Read contact $CONTACT_ID"

# UPDATE Contact
UPDATE_DATA="{\"id\":\"$CONTACT_ID\",\"display_name\":\"Updated Contact CRUD\",\"contact_type\":\"customer\",\"email\":\"updated.crud@example.com\"}"
UPDATE_RESULT=$(api_call "PUT" "/api/v1/crm/contacts.php" "$UPDATE_DATA")
test_crud "Contacts" "UPDATE" "$UPDATE_RESULT" "Updated contact name"

# DELETE Contact
DELETE_DATA="{\"id\":\"$CONTACT_ID\"}"
DELETE_RESULT=$(api_call "DELETE" "/api/v1/crm/contacts.php" "$DELETE_DATA")
test_crud "Contacts" "DELETE" "$DELETE_RESULT" "Deleted contact"

# LIST Contacts
LIST_RESULT=$(api_call "GET" "/api/v1/crm/contacts.php" "")
test_crud "Contacts" "LIST" "$LIST_RESULT" "Listed all contacts"

# ==========================================
# SECTION 2: INVOICES CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 2: INVOICES CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 2. Invoices CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Invoices
LIST_RESULT=$(api_call "GET" "/api/v1/invoices/list.php" "")
test_crud "Invoices" "LIST" "$LIST_RESULT" "Listed all invoices"

# CREATE Invoice (requires customer_id - get first customer)
CUSTOMER_ID=$(api_call "GET" "/api/v1/crm/contacts.php?type=customer" "" | php -r '$d=json_decode(file_get_contents("php://stdin")); echo $d->data[0]->id ?? "";')
if [ -n "$CUSTOMER_ID" ]; then
    INVOICE_DATA="{\"customer_id\":\"$CUSTOMER_ID\",\"invoice_date\":\"2025-01-15\",\"due_date\":\"2025-02-15\",\"line_items\":[{\"description\":\"Test Service\",\"quantity\":1,\"unit_price\":100}]}"
    CREATE_RESULT=$(api_call "POST" "/api/v1/invoices/create.php" "$INVOICE_DATA")
    test_crud "Invoices" "CREATE" "$CREATE_RESULT" "Created test invoice"
    INVOICE_ID=$(echo "$CREATE_RESULT" | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->id ?? "";')

    if [ -n "$INVOICE_ID" ]; then
        # READ Invoice
        READ_RESULT=$(api_call "GET" "/api/v1/invoices/get.php?id=$INVOICE_ID" "")
        test_crud "Invoices" "READ" "$READ_RESULT" "Read invoice $INVOICE_ID"
    fi
else
    echo -e "${YELLOW}[SKIP]${NC} Invoice CREATE - No customer available"
fi

# ==========================================
# SECTION 3: EXPENSES CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 3: EXPENSES CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 3. Expenses CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Expenses
LIST_RESULT=$(api_call "GET" "/api/v1/expenses/list.php" "")
test_crud "Expenses" "LIST" "$LIST_RESULT" "Listed all expenses"

# CREATE Expense
EXPENSE_DATA='{"description":"Test Expense CRUD","amount":50.00,"category":"office_supplies","expense_date":"2025-01-15"}'
CREATE_RESULT=$(api_call "POST" "/api/v1/expenses/create.php" "$EXPENSE_DATA")
test_crud "Expenses" "CREATE" "$CREATE_RESULT" "Created test expense"

# ==========================================
# SECTION 4: INVENTORY PRODUCTS CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 4: INVENTORY PRODUCTS CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 4. Inventory Products CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Products
LIST_RESULT=$(api_call "GET" "/api/v1/inventory/products.php" "")
test_crud "Products" "LIST" "$LIST_RESULT" "Listed all products"

# CREATE Product
PRODUCT_DATA='{"name":"Test Product CRUD","sku":"TEST-CRUD-001","category":"Electronics","unit_price":99.99,"quantity":10}'
CREATE_RESULT=$(api_call "POST" "/api/v1/inventory/products.php" "$PRODUCT_DATA")
test_crud "Products" "CREATE" "$CREATE_RESULT" "Created test product"
PRODUCT_ID=$(echo "$CREATE_RESULT" | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->id ?? "";')

if [ -n "$PRODUCT_ID" ]; then
    # READ Product
    READ_RESULT=$(api_call "GET" "/api/v1/inventory/products.php?id=$PRODUCT_ID" "")
    test_crud "Products" "READ" "$READ_RESULT" "Read product $PRODUCT_ID"

    # UPDATE Product
    UPDATE_DATA="{\"id\":\"$PRODUCT_ID\",\"name\":\"Updated Product CRUD\",\"unit_price\":149.99}"
    UPDATE_RESULT=$(api_call "PUT" "/api/v1/inventory/products.php" "$UPDATE_DATA")
    test_crud "Products" "UPDATE" "$UPDATE_RESULT" "Updated product"

    # DELETE Product
    DELETE_DATA="{\"id\":\"$PRODUCT_ID\"}"
    DELETE_RESULT=$(api_call "DELETE" "/api/v1/inventory/products.php" "$DELETE_DATA")
    test_crud "Products" "DELETE" "$DELETE_RESULT" "Deleted product"
fi

# ==========================================
# SECTION 5: WAREHOUSES CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 5: WAREHOUSES CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 5. Warehouses CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Warehouses
LIST_RESULT=$(api_call "GET" "/api/v1/inventory/warehouses.php" "")
test_crud "Warehouses" "LIST" "$LIST_RESULT" "Listed all warehouses"

# CREATE Warehouse
WAREHOUSE_DATA='{"name":"Test Warehouse CRUD","location":"Test Location","capacity":1000}'
CREATE_RESULT=$(api_call "POST" "/api/v1/inventory/warehouses.php" "$WAREHOUSE_DATA")
test_crud "Warehouses" "CREATE" "$CREATE_RESULT" "Created test warehouse"

# ==========================================
# SECTION 6: PROJECTS CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 6: PROJECTS CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 6. Projects CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Projects
LIST_RESULT=$(api_call "GET" "/api/v1/projects/list.php" "")
test_crud "Projects" "LIST" "$LIST_RESULT" "Listed all projects"

# CREATE Project
PROJECT_DATA='{"name":"Test Project CRUD","description":"Test project for CRUD testing","status":"active","start_date":"2025-01-15"}'
CREATE_RESULT=$(api_call "POST" "/api/v1/projects/projects.php" "$PROJECT_DATA")
test_crud "Projects" "CREATE" "$CREATE_RESULT" "Created test project"
PROJECT_ID=$(echo "$CREATE_RESULT" | php -r 'echo json_decode(file_get_contents("php://stdin"))->data->id ?? "";')

if [ -n "$PROJECT_ID" ]; then
    # READ Project
    READ_RESULT=$(api_call "GET" "/api/v1/projects/projects.php?id=$PROJECT_ID" "")
    test_crud "Projects" "READ" "$READ_RESULT" "Read project $PROJECT_ID"
fi

# ==========================================
# SECTION 7: SPRINTS CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 7: SPRINTS CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 7. Sprints CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# Get a project ID first
EXISTING_PROJECT_ID=$(api_call "GET" "/api/v1/projects/list.php" "" | php -r '$d=json_decode(file_get_contents("php://stdin")); echo $d->data[0]->id ?? "";')

if [ -n "$EXISTING_PROJECT_ID" ]; then
    # LIST Sprints
    LIST_RESULT=$(api_call "GET" "/api/v1/sprints/list.php?project_id=$EXISTING_PROJECT_ID" "")
    test_crud "Sprints" "LIST" "$LIST_RESULT" "Listed sprints for project"

    # CREATE Sprint
    SPRINT_DATA="{\"project_id\":\"$EXISTING_PROJECT_ID\",\"name\":\"Test Sprint CRUD\",\"start_date\":\"2025-01-15\",\"end_date\":\"2025-01-29\",\"goal\":\"Test sprint goal\"}"
    CREATE_RESULT=$(api_call "POST" "/api/v1/sprints/sprints.php" "$SPRINT_DATA")
    test_crud "Sprints" "CREATE" "$CREATE_RESULT" "Created test sprint"
else
    echo -e "${YELLOW}[SKIP]${NC} Sprint CRUD - No project available"
fi

# ==========================================
# SECTION 8: TIME ENTRIES CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 8: TIME ENTRIES CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 8. Time Entries CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Time Entries
LIST_RESULT=$(api_call "GET" "/api/v1/time/entries.php" "")
test_crud "Time Entries" "LIST" "$LIST_RESULT" "Listed all time entries"

# CREATE Time Entry
if [ -n "$EXISTING_PROJECT_ID" ]; then
    TIME_DATA="{\"project_id\":\"$EXISTING_PROJECT_ID\",\"hours\":2.5,\"description\":\"Test time entry CRUD\",\"date\":\"2025-01-15\"}"
    CREATE_RESULT=$(api_call "POST" "/api/v1/time/entries.php" "$TIME_DATA")
    test_crud "Time Entries" "CREATE" "$CREATE_RESULT" "Created test time entry"
fi

# ==========================================
# SECTION 9: HR EMPLOYEES CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 9: HR EMPLOYEES CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 9. HR Employees CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Employees
LIST_RESULT=$(api_call "GET" "/api/v1/hr/employees.php" "")
test_crud "Employees" "LIST" "$LIST_RESULT" "Listed all employees"

# CREATE Employee
EMPLOYEE_DATA='{"first_name":"Test","last_name":"Employee CRUD","email":"test.employee@example.com","position":"Developer","department":"IT"}'
CREATE_RESULT=$(api_call "POST" "/api/v1/hr/employees.php" "$EMPLOYEE_DATA")
test_crud "Employees" "CREATE" "$CREATE_RESULT" "Created test employee"

# ==========================================
# SECTION 10: CRM OPPORTUNITIES CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 10: CRM OPPORTUNITIES CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 10. CRM Opportunities CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Opportunities
LIST_RESULT=$(api_call "GET" "/api/v1/crm/opportunities.php" "")
test_crud "Opportunities" "LIST" "$LIST_RESULT" "Listed all opportunities"

# CREATE Opportunity
if [ -n "$CUSTOMER_ID" ]; then
    OPP_DATA="{\"contact_id\":\"$CUSTOMER_ID\",\"title\":\"Test Opportunity CRUD\",\"value\":5000,\"stage\":\"prospecting\"}"
    CREATE_RESULT=$(api_call "POST" "/api/v1/crm/opportunities.php" "$OPP_DATA")
    test_crud "Opportunities" "CREATE" "$CREATE_RESULT" "Created test opportunity"
fi

# ==========================================
# SECTION 11: CRM QUOTATIONS CRUD
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 11: CRM QUOTATIONS CRUD ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 11. CRM Quotations CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Quotations
LIST_RESULT=$(api_call "GET" "/api/v1/crm/quotations.php" "")
test_crud "Quotations" "LIST" "$LIST_RESULT" "Listed all quotations"

# ==========================================
# SECTION 12: ACCOUNTING CHART OF ACCOUNTS
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 12: ACCOUNTING CHART OF ACCOUNTS ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 12. Chart of Accounts CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Chart of Accounts
LIST_RESULT=$(api_call "GET" "/api/v1/accounting/chart-of-accounts.php" "")
test_crud "Chart of Accounts" "LIST" "$LIST_RESULT" "Listed all accounts"

# LIST Journal Entries
LIST_RESULT=$(api_call "GET" "/api/v1/accounting/journal-entries.php" "")
test_crud "Journal Entries" "LIST" "$LIST_RESULT" "Listed all journal entries"

# LIST Tax Codes
LIST_RESULT=$(api_call "GET" "/api/v1/accounting/tax-codes.php" "")
test_crud "Tax Codes" "LIST" "$LIST_RESULT" "Listed all tax codes"

# ==========================================
# SECTION 13: BANKING
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 13: BANKING ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 13. Banking CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Bank Accounts
LIST_RESULT=$(api_call "GET" "/api/v1/bank/list.php" "")
test_crud "Bank Accounts" "LIST" "$LIST_RESULT" "Listed all bank accounts"

# LIST Bank Transactions
LIST_RESULT=$(api_call "GET" "/api/v1/bank/transactions-list.php" "")
test_crud "Bank Transactions" "LIST" "$LIST_RESULT" "Listed all transactions"

# ==========================================
# SECTION 14: FORUM
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 14: FORUM ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 14. Forum CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Forum Categories
LIST_RESULT=$(api_call "GET" "/api/v1/forum/categories.php" "")
test_crud "Forum Categories" "LIST" "$LIST_RESULT" "Listed all forum categories"

# LIST Forum Threads
LIST_RESULT=$(api_call "GET" "/api/v1/forum/threads.php?category_id=1" "")
test_crud "Forum Threads" "LIST" "$LIST_RESULT" "Listed forum threads"

# ==========================================
# SECTION 15: COURSES
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 15: COURSES ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 15. Courses CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Courses
LIST_RESULT=$(api_call "GET" "/api/v1/courses/list.php" "")
test_crud "Courses" "LIST" "$LIST_RESULT" "Listed all courses"

# ==========================================
# SECTION 16: SUBSCRIPTION
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 16: SUBSCRIPTION ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 16. Subscription CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# GET Current Subscription
LIST_RESULT=$(api_call "GET" "/api/v1/subscriptions/current.php" "")
test_crud "Subscription" "CURRENT" "$LIST_RESULT" "Got current subscription"

# LIST Subscription Plans
LIST_RESULT=$(api_call "GET" "/api/v1/subscriptions/plans.php" "")
test_crud "Subscription" "PLANS" "$LIST_RESULT" "Listed subscription plans"

# ==========================================
# SECTION 17: RECEIPTS OCR
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 17: RECEIPTS OCR ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 17. Receipts CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Receipts
LIST_RESULT=$(api_call "GET" "/api/v1/receipts/list.php" "")
test_crud "Receipts" "LIST" "$LIST_RESULT" "Listed all receipts"

# LIST Receipt Templates
LIST_RESULT=$(api_call "GET" "/api/v1/receipts/templates.php" "")
test_crud "Receipt Templates" "LIST" "$LIST_RESULT" "Listed receipt templates"

# ==========================================
# SECTION 18: SETTINGS
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 18: SETTINGS ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 18. Settings CRUD" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# LIST Expense Categories
LIST_RESULT=$(api_call "GET" "/api/v1/settings/categories.php" "")
test_crud "Settings Categories" "LIST" "$LIST_RESULT" "Listed expense categories"

# LIST Tax Codes
LIST_RESULT=$(api_call "GET" "/api/v1/settings/tax-codes.php" "")
test_crud "Settings Tax Codes" "LIST" "$LIST_RESULT" "Listed tax codes"

# ==========================================
# SECTION 19: REPORTS
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 19: FINANCIAL REPORTS ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 19. Financial Reports" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# Profit & Loss Report
LIST_RESULT=$(api_call "GET" "/api/v1/reports/profit-loss.php?start_date=2025-01-01&end_date=2025-12-31" "")
test_crud "Reports" "PROFIT_LOSS" "$LIST_RESULT" "Generated P&L report"

# Cash Flow Report
LIST_RESULT=$(api_call "GET" "/api/v1/reports/cash-flow.php?start_date=2025-01-01&end_date=2025-12-31" "")
test_crud "Reports" "CASH_FLOW" "$LIST_RESULT" "Generated cash flow report"

# Budget vs Actual Report
LIST_RESULT=$(api_call "GET" "/api/v1/reports/budget-vs-actual.php" "")
test_crud "Reports" "BUDGET_VS_ACTUAL" "$LIST_RESULT" "Generated budget report"

# ==========================================
# SECTION 20: ANALYTICS
# ==========================================
echo ""
echo -e "${CYAN}=== SECTION 20: ANALYTICS ===${NC}"
echo "" >> "$REPORT_FILE"
echo "## 20. Analytics" >> "$REPORT_FILE"
echo "| Module | Operation | Status | Details |" >> "$REPORT_FILE"
echo "|--------|-----------|--------|---------|" >> "$REPORT_FILE"

# KPIs
LIST_RESULT=$(api_call "GET" "/api/v1/analytics/kpis.php" "")
test_crud "Analytics" "KPIS" "$LIST_RESULT" "Got analytics KPIs"

# ==========================================
# FINAL SUMMARY
# ==========================================
echo ""
echo "============================================="
echo "       DEEP CRUD TEST SUMMARY"
echo "============================================="

PASS_RATE=$(echo "scale=1; $TOTAL_PASS * 100 / $TOTAL_TESTS" | bc)

echo ""
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TOTAL_PASS${NC}"
echo -e "${RED}Failed: $TOTAL_FAIL${NC}"
echo -e "Pass Rate: ${PASS_RATE}%"
echo ""

cat << EOF >> "$REPORT_FILE"

---

## Final Summary

| Metric | Value |
|--------|-------|
| Total Tests | $TOTAL_TESTS |
| Passed | $TOTAL_PASS |
| Failed | $TOTAL_FAIL |
| **Pass Rate** | **${PASS_RATE}%** |

---

## Test Categories Covered

1. **Contacts** - Full CRUD (Create, Read, Update, Delete, List)
2. **Invoices** - Create, Read, List
3. **Expenses** - Create, List
4. **Inventory Products** - Full CRUD
5. **Warehouses** - Create, List
6. **Projects** - Create, Read, List
7. **Sprints** - Create, List
8. **Time Entries** - Create, List
9. **HR Employees** - Create, List
10. **CRM Opportunities** - Create, List
11. **CRM Quotations** - List
12. **Chart of Accounts** - List
13. **Journal Entries** - List
14. **Tax Codes** - List
15. **Banking** - List accounts and transactions
16. **Forum** - List categories and threads
17. **Courses** - List
18. **Subscription** - Current and Plans
19. **Receipts OCR** - List and Templates
20. **Settings** - Categories and Tax Codes
21. **Financial Reports** - P&L, Cash Flow, Budget
22. **Analytics** - KPIs

---

*Report generated by DocumentIulia Deep CRUD Test Suite*
EOF

echo "Report saved to: $REPORT_FILE"
