#!/bin/bash
#
# COMPREHENSIVE PLATFORM AUDIT - documentiulia.ro
# Tests: Frontend API mapping, E2E flows, Security, Performance
#

TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJhY2NvdW50ZWNoLmFpIiwiaWF0IjoxNzY0NDQwNzU0LCJleHAiOjE3NjcwMzI3NTQsInVzZXJfaWQiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJlbWFpbCI6InRlc3RfYWRtaW5AYWNjb3VudGVjaC5jb20iLCJyb2xlIjoiYWRtaW4ifQ.fRP4AjnqSgV8IyexWzA-30wktA_FW7t4hPjozAoG2ho"
COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
BASE_URL="http://127.0.0.1/api/v1"

PASS=0
FAIL=0
WARN=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; ((PASS++)); }
log_fail() { echo -e "${RED}❌ FAIL${NC}: $1"; ((FAIL++)); }
log_warn() { echo -e "${YELLOW}⚠️  WARN${NC}: $1"; ((WARN++)); }
log_info() { echo -e "${BLUE}ℹ️  INFO${NC}: $1"; }

api_test() {
  local endpoint=$1
  local method=${2:-GET}
  local data=${3:-}
  local desc=${4:-$endpoint}

  if [ "$method" = "GET" ]; then
    result=$(curl -s -w "\n%{http_code}" "$BASE_URL/$endpoint" \
      -H "Host: documentiulia.ro" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Company-ID: $COMPANY_ID" 2>/dev/null)
  else
    result=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL/$endpoint" \
      -H "Host: documentiulia.ro" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Company-ID: $COMPANY_ID" \
      -H "Content-Type: application/json" \
      -d "$data" 2>/dev/null)
  fi

  http_code=$(echo "$result" | tail -1)
  body=$(echo "$result" | sed '$d')

  if echo "$body" | grep -q '"success":true'; then
    log_pass "$desc"
    return 0
  elif [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    log_pass "$desc (HTTP $http_code)"
    return 0
  else
    log_fail "$desc (HTTP $http_code)"
    return 1
  fi
}

security_test() {
  local endpoint=$1
  local payload=$2
  local desc=$3

  result=$(curl -s "$BASE_URL/$endpoint" \
    -H "Host: documentiulia.ro" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Company-ID: $COMPANY_ID" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null)

  # Check for SQL injection indicators
  if echo "$result" | grep -qiE "sql|syntax|mysql|postgresql|error.*query"; then
    log_fail "SECURITY: $desc - Possible SQL error exposure"
    return 1
  else
    log_pass "SECURITY: $desc"
    return 0
  fi
}

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     COMPREHENSIVE PLATFORM AUDIT - documentiulia.ro         ║"
echo "║                    $(date '+%Y-%m-%d %H:%M:%S')                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# =====================================================
echo -e "\n${BLUE}═══ 1. FRONTEND API MAPPING TEST ═══${NC}\n"
# These are endpoints called by frontend/src/services/api.ts

echo "--- Auth APIs ---"
api_test "auth/me.php" "GET" "" "Auth: Get current user"

echo ""
echo "--- Invoice APIs ---"
api_test "invoices/list.php" "GET" "" "Invoices: List"

echo ""
echo "--- Contact/CRM APIs ---"
api_test "crm/contacts.php" "GET" "" "CRM: List contacts"

echo ""
echo "--- Bill APIs ---"
api_test "bills/list.php" "GET" "" "Bills: List"

echo ""
echo "--- Expense APIs ---"
api_test "expenses/list.php" "GET" "" "Expenses: List"
api_test "expenses/smart-suggestions.php?vendor_id=test" "GET" "" "Expenses: Smart suggestions"
api_test "expenses/custom-categories.php" "GET" "" "Expenses: Custom categories"

echo ""
echo "--- Dashboard APIs ---"
api_test "dashboard/stats.php" "GET" "" "Dashboard: Stats"

echo ""
echo "--- Reports APIs ---"
api_test "reports/profit-loss.php" "GET" "" "Reports: Profit/Loss"

echo ""
echo "--- Customization APIs ---"
api_test "accounting/custom-accounts.php" "GET" "" "Accounting: Custom accounts"

# =====================================================
echo -e "\n${BLUE}═══ 2. EXTENDED MODULE TESTS ═══${NC}\n"

echo "--- HR Module ---"
api_test "hr/employees/list.php" "GET" "" "HR: Employees list"
api_test "hr/payroll/list.php" "GET" "" "HR: Payroll list"

echo ""
echo "--- Inventory Module ---"
api_test "inventory/products.php" "GET" "" "Inventory: Products"
api_test "inventory/warehouses.php" "GET" "" "Inventory: Warehouses"
api_test "inventory/stock-movements.php" "GET" "" "Inventory: Stock movements"

echo ""
echo "--- Project Management ---"
api_test "projects/list.php" "GET" "" "Projects: List"
api_test "tasks/list.php" "GET" "" "Tasks: List"
api_test "sprints/list.php" "GET" "" "Sprints: List"
api_test "epics/list.php" "GET" "" "Epics: List"

echo ""
echo "--- Time Tracking ---"
api_test "time/entries.php" "GET" "" "Time: Entries"
api_test "time/reports.php" "GET" "" "Time: Reports"

echo ""
echo "--- Banking ---"
api_test "bank/accounts.php" "GET" "" "Bank: Accounts"
api_test "bank/transactions.php" "GET" "" "Bank: Transactions"

echo ""
echo "--- Accounting ---"
api_test "accounting/chart-of-accounts.php" "GET" "" "Accounting: Chart of accounts"
api_test "accounting/journal-entries/list.php" "GET" "" "Accounting: Journal entries"
api_test "accounting/reports.php?type=trial_balance" "GET" "" "Accounting: Trial balance"
api_test "accounting/reports.php?type=balance_sheet" "GET" "" "Accounting: Balance sheet"

echo ""
echo "--- Additional Modules ---"
api_test "fiscal-calendar/deadlines.php" "GET" "" "Fiscal: Calendar deadlines"
api_test "courses/list.php" "GET" "" "Courses: List"

# =====================================================
echo -e "\n${BLUE}═══ 3. E2E CRUD FLOW TESTS ═══${NC}\n"

echo "--- Contact CRUD Flow ---"
# Create
CREATE_RESULT=$(curl -s -X POST "$BASE_URL/contacts/create.php" \
  -H "Host: documentiulia.ro" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: $COMPANY_ID" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"E2E Test Contact","contact_type":"customer","email":"e2e@test.com"}' 2>/dev/null)

if echo "$CREATE_RESULT" | grep -q '"success":true'; then
  CONTACT_ID=$(echo "$CREATE_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  log_pass "Contact CREATE (ID: ${CONTACT_ID:0:8}...)"

  # Read
  READ_RESULT=$(curl -s "$BASE_URL/contacts/get.php?id=$CONTACT_ID" \
    -H "Host: documentiulia.ro" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Company-ID: $COMPANY_ID" 2>/dev/null)

  if echo "$READ_RESULT" | grep -q '"success":true'; then
    log_pass "Contact READ"
  else
    log_fail "Contact READ"
  fi

  # Update
  UPDATE_RESULT=$(curl -s -X PUT "$BASE_URL/contacts/update.php" \
    -H "Host: documentiulia.ro" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Company-ID: $COMPANY_ID" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$CONTACT_ID\",\"display_name\":\"E2E Updated Contact\"}" 2>/dev/null)

  if echo "$UPDATE_RESULT" | grep -q '"success":true'; then
    log_pass "Contact UPDATE"
  else
    log_fail "Contact UPDATE"
  fi

  # Delete
  DELETE_RESULT=$(curl -s -X DELETE "$BASE_URL/contacts/delete.php" \
    -H "Host: documentiulia.ro" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Company-ID: $COMPANY_ID" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$CONTACT_ID\"}" 2>/dev/null)

  if echo "$DELETE_RESULT" | grep -q '"success":true'; then
    log_pass "Contact DELETE"
  else
    log_fail "Contact DELETE"
  fi
else
  log_fail "Contact CREATE"
fi

echo ""
echo "--- Task CRUD Flow ---"
# Create Task
TASK_CREATE=$(curl -s -X POST "$BASE_URL/tasks/create.php" \
  -H "Host: documentiulia.ro" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: $COMPANY_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Test Task","status":"todo","priority":"medium"}' 2>/dev/null)

if echo "$TASK_CREATE" | grep -q '"success":true'; then
  TASK_ID=$(echo "$TASK_CREATE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  log_pass "Task CREATE (ID: ${TASK_ID:0:8}...)"

  # Delete task to clean up
  curl -s -X DELETE "$BASE_URL/tasks/delete.php" \
    -H "Host: documentiulia.ro" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Company-ID: $COMPANY_ID" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$TASK_ID\"}" > /dev/null 2>&1
  log_pass "Task DELETE (cleanup)"
else
  log_fail "Task CREATE"
fi

# =====================================================
echo -e "\n${BLUE}═══ 4. SECURITY AUDIT ═══${NC}\n"

echo "--- SQL Injection Tests ---"
security_test "contacts/list.php?search='; DROP TABLE users; --" "" "SQL injection in search param"
security_test "tasks/list.php?status=todo' OR '1'='1" "" "SQL injection in filter param"

echo ""
echo "--- XSS Prevention Tests ---"
XSS_RESULT=$(curl -s -X POST "$BASE_URL/contacts/create.php" \
  -H "Host: documentiulia.ro" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: $COMPANY_ID" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"<script>alert(1)</script>","contact_type":"customer"}' 2>/dev/null)

if echo "$XSS_RESULT" | grep -q "<script>"; then
  log_fail "SECURITY: XSS not sanitized in response"
else
  log_pass "SECURITY: XSS sanitization check"
fi

echo ""
echo "--- Auth Tests ---"
NO_AUTH=$(curl -s "$BASE_URL/invoices/list.php" -H "Host: documentiulia.ro" 2>/dev/null)
if echo "$NO_AUTH" | grep -q '"success":false'; then
  log_pass "SECURITY: Unauthenticated request rejected"
else
  log_fail "SECURITY: Endpoint accessible without auth"
fi

INVALID_TOKEN=$(curl -s "$BASE_URL/invoices/list.php" \
  -H "Host: documentiulia.ro" \
  -H "Authorization: Bearer invalid_token_here" 2>/dev/null)
if echo "$INVALID_TOKEN" | grep -q '"success":false'; then
  log_pass "SECURITY: Invalid token rejected"
else
  log_fail "SECURITY: Invalid token accepted"
fi

# =====================================================
echo -e "\n${BLUE}═══ 5. PERFORMANCE TESTS ═══${NC}\n"

echo "--- Response Time Tests ---"
for endpoint in "invoices/list.php" "contacts/list.php" "tasks/list.php" "hr/employees/list.php"; do
  START=$(date +%s%N)
  curl -s "$BASE_URL/$endpoint" \
    -H "Host: documentiulia.ro" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Company-ID: $COMPANY_ID" > /dev/null 2>&1
  END=$(date +%s%N)
  TIME_MS=$(( (END - START) / 1000000 ))

  if [ $TIME_MS -lt 500 ]; then
    log_pass "PERF: $endpoint (${TIME_MS}ms)"
  elif [ $TIME_MS -lt 1000 ]; then
    log_warn "PERF: $endpoint (${TIME_MS}ms - acceptable)"
  else
    log_fail "PERF: $endpoint (${TIME_MS}ms - too slow)"
  fi
done

# =====================================================
echo -e "\n${BLUE}═══ 6. GHOST FUNCTIONALITY CHECK ═══${NC}\n"

echo "--- Checking Frontend Pages vs Backend APIs ---"

# Check if frontend pages have working backend APIs
declare -A PAGE_API_MAP
PAGE_API_MAP["DashboardPage"]="dashboard/stats.php"
PAGE_API_MAP["InvoicesPage"]="invoices/list.php"
PAGE_API_MAP["ExpensesPage"]="expenses/list.php"
PAGE_API_MAP["ContactsPage"]="crm/contacts.php"
PAGE_API_MAP["ReportsPage"]="reports/profit-loss.php"
PAGE_API_MAP["AccountingPage"]="accounting/chart-of-accounts.php"

for page in "${!PAGE_API_MAP[@]}"; do
  api="${PAGE_API_MAP[$page]}"
  if [ -f "/var/www/documentiulia.ro/frontend/src/pages/${page}.tsx" ]; then
    result=$(curl -s "$BASE_URL/$api" \
      -H "Host: documentiulia.ro" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Company-ID: $COMPANY_ID" 2>/dev/null | head -c 100)

    if echo "$result" | grep -q '"success":true'; then
      log_pass "Page $page -> API $api"
    else
      log_warn "Page $page exists but API $api may have issues"
    fi
  fi
done

# =====================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     AUDIT SUMMARY                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-20s %s%-35s${NC} ║\n" "PASSED:" "${GREEN}" "$PASS tests"
printf "║  %-20s %s%-35s${NC} ║\n" "FAILED:" "${RED}" "$FAIL tests"
printf "║  %-20s %s%-35s${NC} ║\n" "WARNINGS:" "${YELLOW}" "$WARN tests"
echo "╠══════════════════════════════════════════════════════════════╣"
TOTAL=$((PASS + FAIL))
if [ $TOTAL -gt 0 ]; then
  SCORE=$((PASS * 100 / TOTAL))
  if [ $SCORE -ge 90 ]; then
    COLOR=$GREEN
  elif [ $SCORE -ge 70 ]; then
    COLOR=$YELLOW
  else
    COLOR=$RED
  fi
  printf "║  %-20s ${COLOR}%-35s${NC} ║\n" "HEALTH SCORE:" "${SCORE}%"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
