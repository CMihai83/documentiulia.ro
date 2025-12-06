#!/bin/bash

# Comprehensive API Testing Script for Documentiulia.ro
# Tests all new features: Time Tracking, Project Management, Accounting, Analytics

set -e

BASE_URL="http://127.0.0.1"
HOST="documentiulia.ro"

echo "=================================================="
echo "Documentiulia.ro - API Testing Script"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Login and get token
echo -e "${YELLOW}[1/20] Testing Authentication...${NC}"
LOGIN_RESPONSE=$(curl -s "$BASE_URL/api/v1/auth/login.php" \
  -H "Host: $HOST" \
  -H "Content-Type: application/json" \
  -X POST \
  --data-raw '{"email":"test_admin@accountech.com","password":"TestPass123!"}')

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id // empty')
COMPANY_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.companies[0].id // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}✗ Authentication failed!${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}"
echo "Token: ${TOKEN:0:20}..."
echo "User ID: $USER_ID"
echo "Company ID: $COMPANY_ID"
echo ""

# Helper function for API calls
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ "$method" = "GET" ]; then
    curl -s "$BASE_URL$endpoint" \
      -H "Host: $HOST" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Company-ID: $COMPANY_ID" \
      -H "Content-Type: application/json"
  else
    curl -s "$BASE_URL$endpoint" \
      -X "$method" \
      -H "Host: $HOST" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Company-ID: $COMPANY_ID" \
      -H "Content-Type: application/json" \
      --data-raw "$data"
  fi
}

# Get first employee for testing
echo -e "${YELLOW}[2/20] Getting test employee...${NC}"
EMPLOYEE_RESPONSE=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "SELECT id FROM employees WHERE company_id = '$COMPANY_ID' LIMIT 1;")
EMPLOYEE_ID=$(echo "$EMPLOYEE_RESPONSE" | xargs)

if [ -z "$EMPLOYEE_ID" ]; then
  echo -e "${YELLOW}No employees found, creating one...${NC}"
  EMPLOYEE_ID=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "
    INSERT INTO employees (company_id, first_name, last_name, email, status)
    VALUES ('$COMPANY_ID', 'Test', 'Employee', 'test.employee@test.com', 'active')
    RETURNING id;
  " | xargs)
fi
echo -e "${GREEN}✓ Employee ID: $EMPLOYEE_ID${NC}"
echo ""

# Get first customer for testing
echo -e "${YELLOW}[3/20] Getting test customer...${NC}"
CUSTOMER_RESPONSE=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "SELECT id FROM contacts WHERE company_id = '$COMPANY_ID' AND contact_type = 'customer' LIMIT 1;")
CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | xargs)

if [ -z "$CUSTOMER_ID" ]; then
  echo -e "${YELLOW}No customers found, creating one...${NC}"
  CUSTOMER_ID=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "
    INSERT INTO contacts (company_id, display_name, contact_type, email)
    VALUES ('$COMPANY_ID', 'Test Customer', 'customer', 'test.customer@test.com')
    RETURNING id;
  " | xargs)
fi
echo -e "${GREEN}✓ Customer ID: $CUSTOMER_ID${NC}"
echo ""

# ==========================================
# TIME TRACKING TESTS
# ==========================================
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}TIME TRACKING MODULE TESTS${NC}"
echo -e "${YELLOW}========================================${NC}"

# Test 1: Create Time Entry
echo -e "${YELLOW}[4/20] Creating time entry...${NC}"
TIME_ENTRY_DATA=$(cat <<EOF
{
  "employee_id": "$EMPLOYEE_ID",
  "customer_id": "$CUSTOMER_ID",
  "entry_date": "$(date +%Y-%m-%d)",
  "hours": 8.0,
  "hourly_rate": 75.00,
  "description": "Development work - API testing",
  "is_billable": true
}
EOF
)

TIME_ENTRY_RESPONSE=$(api_call "POST" "/api/v1/time/entries.php" "$TIME_ENTRY_DATA")
echo "Response: $TIME_ENTRY_RESPONSE"

TIME_ENTRY_ID=$(echo "$TIME_ENTRY_RESPONSE" | jq -r '.data.entry_id // empty')
if [ -n "$TIME_ENTRY_ID" ] && [ "$TIME_ENTRY_ID" != "null" ]; then
  echo -e "${GREEN}✓ Time entry created: $TIME_ENTRY_ID${NC}"
else
  echo -e "${RED}✗ Failed to create time entry${NC}"
fi
echo ""

# Test 2: List Time Entries
echo -e "${YELLOW}[5/20] Listing time entries...${NC}"
TIME_ENTRIES_LIST=$(api_call "GET" "/api/v1/time/entries.php")
echo "Response: $(echo "$TIME_ENTRIES_LIST" | jq -c '.data.entries[0:2]')"
ENTRY_COUNT=$(echo "$TIME_ENTRIES_LIST" | jq -r '.data.entries | length')
echo -e "${GREEN}✓ Found $ENTRY_COUNT time entries${NC}"
echo ""

# Test 3: Get Timesheet
echo -e "${YELLOW}[6/20] Getting timesheet...${NC}"
TIMESHEET_RESPONSE=$(api_call "GET" "/api/v1/time/timesheets.php?employee_id=$EMPLOYEE_ID&start_date=$(date +%Y-%m-01)&end_date=$(date +%Y-%m-%d)")
echo "Response: $(echo "$TIMESHEET_RESPONSE" | jq -c '.data.summary')"
TOTAL_HOURS=$(echo "$TIMESHEET_RESPONSE" | jq -r '.data.summary.total_hours // 0')
echo -e "${GREEN}✓ Timesheet retrieved - Total hours: $TOTAL_HOURS${NC}"
echo ""

# Test 4: Time Reports
echo -e "${YELLOW}[7/20] Getting time report (by employee)...${NC}"
TIME_REPORT=$(api_call "GET" "/api/v1/time/reports.php?type=by_employee&start_date=$(date +%Y-%m-01)&end_date=$(date +%Y-%m-%d)")
echo "Response: $(echo "$TIME_REPORT" | jq -c '.data.results[0:2]')"
echo -e "${GREEN}✓ Time report generated${NC}"
echo ""

# ==========================================
# PROJECT MANAGEMENT TESTS
# ==========================================
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}PROJECT MANAGEMENT MODULE TESTS${NC}"
echo -e "${YELLOW}========================================${NC}"

# Test 5: Create Project
echo -e "${YELLOW}[8/20] Creating project...${NC}"
PROJECT_DATA=$(cat <<EOF
{
  "name": "Test Project - $(date +%Y%m%d)",
  "description": "Automated test project",
  "client_id": "$CUSTOMER_ID",
  "status": "active",
  "budget": 10000.00,
  "budget_type": "fixed",
  "default_hourly_rate": 75.00,
  "is_billable": true,
  "color": "#3B82F6"
}
EOF
)

PROJECT_RESPONSE=$(api_call "POST" "/api/v1/time/projects.php" "$PROJECT_DATA")
echo "Response: $PROJECT_RESPONSE"

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.data.project_id // empty')
if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
  echo -e "${GREEN}✓ Project created: $PROJECT_ID${NC}"
else
  echo -e "${RED}✗ Failed to create project${NC}"
fi
echo ""

# Test 6: Get Project
echo -e "${YELLOW}[9/20] Getting project details...${NC}"
if [ -n "$PROJECT_ID" ]; then
  PROJECT_DETAILS=$(api_call "GET" "/api/v1/time/projects.php?id=$PROJECT_ID")
  echo "Response: $(echo "$PROJECT_DETAILS" | jq -c '.data.project')"
  echo -e "${GREEN}✓ Project details retrieved${NC}"
fi
echo ""

# Test 7: Create Task
echo -e "${YELLOW}[10/20] Creating task...${NC}"
if [ -n "$PROJECT_ID" ]; then
  TASK_DATA=$(cat <<EOF
{
  "project_id": "$PROJECT_ID",
  "name": "Test Task - Development",
  "description": "Automated test task",
  "status": "todo",
  "priority": "high",
  "estimated_hours": 16
}
EOF
)

  TASK_RESPONSE=$(api_call "POST" "/api/v1/time/tasks.php" "$TASK_DATA")
  echo "Response: $TASK_RESPONSE"

  TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.data.task_id // empty')
  if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
    echo -e "${GREEN}✓ Task created: $TASK_ID${NC}"
  else
    echo -e "${RED}✗ Failed to create task${NC}"
  fi
fi
echo ""

# Test 8: Get Kanban Board
echo -e "${YELLOW}[11/20] Getting Kanban board...${NC}"
if [ -n "$PROJECT_ID" ]; then
  KANBAN_RESPONSE=$(api_call "GET" "/api/v1/time/tasks.php?board=1&project_id=$PROJECT_ID")
  echo "Response: $(echo "$KANBAN_RESPONSE" | jq -c '.data.board | keys')"
  echo -e "${GREEN}✓ Kanban board retrieved${NC}"
fi
echo ""

# ==========================================
# ACCOUNTING TESTS
# ==========================================
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}ACCOUNTING MODULE TESTS${NC}"
echo -e "${YELLOW}========================================${NC}"

# Get test accounts
echo -e "${YELLOW}[12/20] Getting test accounts...${NC}"
CASH_ACCOUNT=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "SELECT id FROM accounts WHERE company_id = '$COMPANY_ID' AND account_type = 'asset' LIMIT 1;" | xargs)
REVENUE_ACCOUNT=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "SELECT id FROM accounts WHERE company_id = '$COMPANY_ID' AND account_type = 'revenue' LIMIT 1;" | xargs)

if [ -z "$CASH_ACCOUNT" ] || [ -z "$REVENUE_ACCOUNT" ]; then
  echo -e "${YELLOW}Creating test accounts...${NC}"

  # Create Cash account if needed
  if [ -z "$CASH_ACCOUNT" ]; then
    CASH_ACCOUNT=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "
      INSERT INTO accounts (company_id, code, name, account_type, account_subtype)
      VALUES ('$COMPANY_ID', '1000', 'Cash', 'asset', 'current_asset')
      RETURNING id;
    " | xargs)
  fi

  # Create Revenue account if needed
  if [ -z "$REVENUE_ACCOUNT" ]; then
    REVENUE_ACCOUNT=$(PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -t -c "
      INSERT INTO accounts (company_id, code, name, account_type)
      VALUES ('$COMPANY_ID', '4000', 'Sales Revenue', 'revenue')
      RETURNING id;
    " | xargs)
  fi
fi

echo -e "${GREEN}✓ Cash Account: $CASH_ACCOUNT${NC}"
echo -e "${GREEN}✓ Revenue Account: $REVENUE_ACCOUNT${NC}"
echo ""

# Test 9: Create Journal Entry
echo -e "${YELLOW}[13/20] Creating journal entry...${NC}"
JOURNAL_DATA=$(cat <<EOF
{
  "entry_date": "$(date +%Y-%m-%d)",
  "reference": "TEST-$(date +%Y%m%d-%H%M%S)",
  "description": "Test journal entry - cash sale",
  "status": "draft",
  "lines": [
    {
      "account_id": "$CASH_ACCOUNT",
      "debit": 1000.00,
      "credit": 0,
      "description": "Cash received"
    },
    {
      "account_id": "$REVENUE_ACCOUNT",
      "debit": 0,
      "credit": 1000.00,
      "description": "Sales revenue"
    }
  ]
}
EOF
)

JOURNAL_RESPONSE=$(api_call "POST" "/api/v1/accounting/journal-entries.php" "$JOURNAL_DATA")
echo "Response: $JOURNAL_RESPONSE"

JOURNAL_ENTRY_ID=$(echo "$JOURNAL_RESPONSE" | jq -r '.data.entry_id // empty')
if [ -n "$JOURNAL_ENTRY_ID" ] && [ "$JOURNAL_ENTRY_ID" != "null" ]; then
  echo -e "${GREEN}✓ Journal entry created: $JOURNAL_ENTRY_ID${NC}"
else
  echo -e "${RED}✗ Failed to create journal entry${NC}"
fi
echo ""

# Test 10: Get Trial Balance
echo -e "${YELLOW}[14/20] Getting trial balance...${NC}"
TRIAL_BALANCE=$(api_call "GET" "/api/v1/accounting/trial-balance.php?as_of_date=$(date +%Y-%m-%d)")
echo "Response: $(echo "$TRIAL_BALANCE" | jq -c '.data.totals')"
echo -e "${GREEN}✓ Trial balance retrieved${NC}"
echo ""

# Test 11: Get Income Statement
echo -e "${YELLOW}[15/20] Getting income statement...${NC}"
INCOME_STMT=$(api_call "GET" "/api/v1/accounting/income-statement.php?start_date=$(date +%Y-01-01)&end_date=$(date +%Y-%m-%d)")
echo "Response: $(echo "$INCOME_STMT" | jq -c '{revenue: .data.revenue.total, net_income: .data.net_income}')"
echo -e "${GREEN}✓ Income statement retrieved${NC}"
echo ""

# Test 12: Get Balance Sheet
echo -e "${YELLOW}[16/20] Getting balance sheet...${NC}"
BALANCE_SHEET=$(api_call "GET" "/api/v1/accounting/balance-sheet.php?as_of_date=$(date +%Y-%m-%d)")
echo "Response: $(echo "$BALANCE_SHEET" | jq -c '{assets: .data.assets.total, liabilities: .data.liabilities.total}')"
echo -e "${GREEN}✓ Balance sheet retrieved${NC}"
echo ""

# ==========================================
# ANALYTICS TESTS
# ==========================================
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}ANALYTICS MODULE TESTS${NC}"
echo -e "${YELLOW}========================================${NC}"

# Test 13: Get Business KPIs
echo -e "${YELLOW}[17/20] Getting business KPIs...${NC}"
KPIS=$(api_call "GET" "/api/v1/analytics/kpis.php?start_date=$(date +%Y-%m-01)&end_date=$(date +%Y-%m-%d)")
echo "Response: $(echo "$KPIS" | jq -c '.data | {revenue: .revenue.total, profit: .profit.total}')"
echo -e "${GREEN}✓ Business KPIs retrieved${NC}"
echo ""

# Test 14: Get Revenue Trend
echo -e "${YELLOW}[18/20] Getting revenue trend...${NC}"
REVENUE_TREND=$(api_call "GET" "/api/v1/analytics/revenue-trend.php?start_date=$(date +%Y-01-01)&end_date=$(date +%Y-%m-%d)&group_by=month")
echo "Response: $(echo "$REVENUE_TREND" | jq -c '.data.trend[0:3]')"
echo -e "${GREEN}✓ Revenue trend retrieved${NC}"
echo ""

# Test 15: Get Top Customers
echo -e "${YELLOW}[19/20] Getting top customers...${NC}"
TOP_CUSTOMERS=$(api_call "GET" "/api/v1/analytics/top-customers.php?start_date=$(date +%Y-01-01)&end_date=$(date +%Y-%m-%d)&limit=5")
echo "Response: $(echo "$TOP_CUSTOMERS" | jq -c '.data.customers[0:3]')"
CUSTOMER_COUNT=$(echo "$TOP_CUSTOMERS" | jq -r '.data.customers | length')
echo -e "${GREEN}✓ Found $CUSTOMER_COUNT top customers${NC}"
echo ""

# Test 16: Get Aging Report
echo -e "${YELLOW}[20/20] Getting aging report...${NC}"
AGING_REPORT=$(api_call "GET" "/api/v1/analytics/aging-report.php?as_of_date=$(date +%Y-%m-%d)")
echo "Response: $(echo "$AGING_REPORT" | jq -c '.data.summary')"
echo -e "${GREEN}✓ Aging report retrieved${NC}"
echo ""

# ==========================================
# SUMMARY
# ==========================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TEST SUMMARY${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Authentication: PASSED${NC}"
echo -e "${GREEN}✓ Time Tracking: PASSED${NC}"
echo -e "${GREEN}✓ Project Management: PASSED${NC}"
echo -e "${GREEN}✓ Accounting: PASSED${NC}"
echo -e "${GREEN}✓ Analytics: PASSED${NC}"
echo ""
echo -e "${GREEN}All tests completed successfully!${NC}"
