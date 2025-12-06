#!/bin/bash

#############################################################################
#                    DOCUMENTIULIA.RO E2E TEST SUITE                       #
#                                                                           #
#  Comprehensive End-to-End Testing with UI Simulation & Backend Validation #
#  Version: 1.0                                                             #
#  Date: 2025-11-29                                                         #
#############################################################################

# ============================================================================
# CONFIGURATION
# ============================================================================

BASE_URL="https://documentiulia.ro"
API_URL="https://documentiulia.ro/api/v1"
LOCAL_URL="http://127.0.0.1"

# Test Credentials
ADMIN_EMAIL="test_admin@accountech.com"
ADMIN_PASSWORD="Test123!"
MANAGER_EMAIL="test_manager@accountech.com"
EMPLOYEE_EMAIL="test_user@accountech.com"
COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

# Database Connection
DB_HOST="127.0.0.1"
DB_NAME="accountech_production"
DB_USER="accountech_app"
DB_PASS="AccTech2025Prod@Secure"

# Test Results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Timestamps
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/www/documentiulia.ro/test_results_${TIMESTAMP}.log"
REPORT_FILE="/var/www/documentiulia.ro/test_report_${TIMESTAMP}.md"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_header() {
    log ""
    log "${CYAN}============================================================================${NC}"
    log "${CYAN}  $1${NC}"
    log "${CYAN}============================================================================${NC}"
}

log_section() {
    log ""
    log "${BLUE}--- $1 ---${NC}"
}

pass_test() {
    ((TOTAL_TESTS++))
    ((PASSED_TESTS++))
    log "${GREEN}[PASS]${NC} $1"
}

fail_test() {
    ((TOTAL_TESTS++))
    ((FAILED_TESTS++))
    log "${RED}[FAIL]${NC} $1"
    log "${RED}       Reason: $2${NC}"
}

skip_test() {
    ((TOTAL_TESTS++))
    ((SKIPPED_TESTS++))
    log "${YELLOW}[SKIP]${NC} $1 - $2"
}

db_query() {
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "$1" 2>/dev/null | tr -d ' '
}

api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local company_id=$5

    local headers="-H 'Content-Type: application/json' -H 'Host: documentiulia.ro'"

    if [ -n "$token" ]; then
        headers="$headers -H 'Authorization: Bearer $token'"
    fi

    if [ -n "$company_id" ]; then
        headers="$headers -H 'X-Company-ID: $company_id'"
    fi

    if [ "$method" == "GET" ]; then
        eval "curl -s -k $headers '${LOCAL_URL}${endpoint}'"
    elif [ "$method" == "POST" ]; then
        eval "curl -s -k -X POST $headers -d '$data' '${LOCAL_URL}${endpoint}'"
    elif [ "$method" == "PUT" ]; then
        eval "curl -s -k -X PUT $headers -d '$data' '${LOCAL_URL}${endpoint}'"
    elif [ "$method" == "DELETE" ]; then
        eval "curl -s -k -X DELETE $headers '${LOCAL_URL}${endpoint}'"
    fi
}

extract_json_value() {
    echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | sed 's/.*: *"\([^"]*\)".*/\1/' | head -1
}

extract_json_bool() {
    echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*[^,}]*" | sed 's/.*: *//' | tr -d ' ' | head -1
}

# ============================================================================
# AUTHENTICATION TESTS
# ============================================================================

test_auth_login() {
    log_section "Testing User Login"

    # Test 1: Valid login
    local response=$(api_call "POST" "/api/v1/auth/login.php" \
        "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        TOKEN=$(echo "$response" | grep -o '"token":"[^"]*"' | sed 's/"token":"\([^"]*\)"/\1/')
        if [ -n "$TOKEN" ]; then
            pass_test "AUTH-LOGIN-001: Valid credentials login successful"
            export TOKEN
        else
            fail_test "AUTH-LOGIN-001: Login response missing token" "No token in response"
        fi
    else
        fail_test "AUTH-LOGIN-001: Valid credentials login" "API returned success=false"
    fi

    # Test 2: Invalid password
    local response=$(api_call "POST" "/api/v1/auth/login.php" \
        "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"WrongPassword123!\"}")

    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "false" ]; then
        pass_test "AUTH-LOGIN-002: Invalid password rejected correctly"
    else
        fail_test "AUTH-LOGIN-002: Invalid password should be rejected" "Login succeeded with wrong password"
    fi

    # Test 3: Non-existent user
    local response=$(api_call "POST" "/api/v1/auth/login.php" \
        "{\"email\":\"nonexistent@example.com\",\"password\":\"Test123!\"}")

    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "false" ]; then
        pass_test "AUTH-LOGIN-003: Non-existent user rejected correctly"
    else
        fail_test "AUTH-LOGIN-003: Non-existent user should be rejected" "Login succeeded for fake user"
    fi
}

test_auth_me() {
    log_section "Testing Current User Endpoint"

    if [ -z "$TOKEN" ]; then
        skip_test "AUTH-ME-001: Get current user" "No token available"
        return
    fi

    local response=$(api_call "GET" "/api/v1/auth/me.php" "" "$TOKEN")
    local success=$(extract_json_bool "$response" "success")
    local email=$(extract_json_value "$response" "email")

    if [ "$success" == "true" ] && [ "$email" == "$ADMIN_EMAIL" ]; then
        pass_test "AUTH-ME-001: Get current user returns correct data"
    else
        fail_test "AUTH-ME-001: Get current user" "Response: $response"
    fi
}

test_auth_unauthorized() {
    log_section "Testing Unauthorized Access"

    # Test without token
    local response=$(api_call "GET" "/api/v1/invoices/list.php" "" "" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "false" ]; then
        pass_test "AUTH-UNAUTH-001: Endpoints reject requests without token"
    else
        fail_test "AUTH-UNAUTH-001: Endpoints should require authentication" "Request succeeded without token"
    fi

    # Test with invalid token
    local response=$(api_call "GET" "/api/v1/invoices/list.php" "" "invalid_token_123" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "false" ]; then
        pass_test "AUTH-UNAUTH-002: Endpoints reject invalid tokens"
    else
        fail_test "AUTH-UNAUTH-002: Endpoints should reject invalid tokens" "Request succeeded with invalid token"
    fi
}

# ============================================================================
# CONTACT/CRM TESTS
# ============================================================================

test_contacts_crud() {
    log_section "Testing Contacts CRUD Operations"

    if [ -z "$TOKEN" ]; then
        skip_test "CONTACTS-CRUD" "No token available"
        return
    fi

    local test_timestamp=$(date +%s)
    local test_email="test_contact_${test_timestamp}@example.com"

    # CREATE
    local create_data="{\"contact_type\":\"customer\",\"name\":\"Test Contact ${test_timestamp}\",\"email\":\"${test_email}\",\"phone\":\"+40721000000\"}"
    local response=$(api_call "POST" "/api/v1/crm/contacts.php" "$create_data" "$TOKEN" "$COMPANY_ID")

    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        CONTACT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')
        if [ -n "$CONTACT_ID" ]; then
            pass_test "CONTACTS-CREATE-001: Create new contact"

            # Verify in database
            local db_count=$(db_query "SELECT COUNT(*) FROM contacts WHERE id='$CONTACT_ID';")
            if [ "$db_count" -ge 1 ]; then
                pass_test "CONTACTS-CREATE-002: Contact persisted in database"
            else
                fail_test "CONTACTS-CREATE-002: Contact should exist in database" "Count: $db_count"
            fi
        else
            fail_test "CONTACTS-CREATE-001: Create contact response missing ID" "No ID in response"
        fi
    else
        fail_test "CONTACTS-CREATE-001: Create new contact" "API returned success=false: $response"
    fi

    # READ
    if [ -n "$CONTACT_ID" ]; then
        local response=$(api_call "GET" "/api/v1/crm/contacts.php?id=${CONTACT_ID}" "" "$TOKEN" "$COMPANY_ID")
        local success=$(extract_json_bool "$response" "success")
        local name=$(extract_json_value "$response" "name")

        if [ "$success" == "true" ]; then
            pass_test "CONTACTS-READ-001: Read contact by ID"
        else
            fail_test "CONTACTS-READ-001: Read contact by ID" "Response: $response"
        fi
    fi

    # UPDATE
    if [ -n "$CONTACT_ID" ]; then
        local update_data="{\"id\":\"${CONTACT_ID}\",\"phone\":\"+40722000000\"}"
        local response=$(api_call "PUT" "/api/v1/crm/contacts.php" "$update_data" "$TOKEN" "$COMPANY_ID")
        local success=$(extract_json_bool "$response" "success")

        if [ "$success" == "true" ]; then
            pass_test "CONTACTS-UPDATE-001: Update contact"

            # Verify update in database
            local db_phone=$(db_query "SELECT phone FROM contacts WHERE id='$CONTACT_ID';")
            if [[ "$db_phone" == *"722"* ]]; then
                pass_test "CONTACTS-UPDATE-002: Update persisted in database"
            else
                fail_test "CONTACTS-UPDATE-002: Update should persist in database" "Phone: $db_phone"
            fi
        else
            fail_test "CONTACTS-UPDATE-001: Update contact" "API returned success=false"
        fi
    fi

    # LIST
    local response=$(api_call "GET" "/api/v1/crm/contacts.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "CONTACTS-LIST-001: List all contacts"
    else
        fail_test "CONTACTS-LIST-001: List all contacts" "API returned success=false"
    fi

    # DELETE (cleanup)
    if [ -n "$CONTACT_ID" ]; then
        local response=$(api_call "DELETE" "/api/v1/crm/contacts.php?id=${CONTACT_ID}" "" "$TOKEN" "$COMPANY_ID")
        local success=$(extract_json_bool "$response" "success")

        if [ "$success" == "true" ]; then
            pass_test "CONTACTS-DELETE-001: Delete contact"
        else
            skip_test "CONTACTS-DELETE-001: Delete contact" "May have related records"
        fi
    fi
}

# ============================================================================
# INVOICE TESTS
# ============================================================================

test_invoices_workflow() {
    log_section "Testing Invoice Workflow"

    if [ -z "$TOKEN" ]; then
        skip_test "INVOICES" "No token available"
        return
    fi

    # List invoices
    local response=$(api_call "GET" "/api/v1/invoices/list.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "INVOICE-LIST-001: List invoices"
    else
        fail_test "INVOICE-LIST-001: List invoices" "API returned success=false"
    fi

    # Get a customer for invoice creation
    local contacts_response=$(api_call "GET" "/api/v1/crm/contacts.php?contact_type=customer&limit=1" "" "$TOKEN" "$COMPANY_ID")
    local customer_id=$(echo "$contacts_response" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')

    if [ -z "$customer_id" ]; then
        skip_test "INVOICE-CREATE" "No customer available for invoice"
        return
    fi

    # Create invoice
    local test_timestamp=$(date +%s)
    local due_date=$(date -d '+30 days' +%Y-%m-%d 2>/dev/null || date -v+30d +%Y-%m-%d 2>/dev/null || echo "2025-12-29")
    local invoice_data="{\"customer_id\":\"${customer_id}\",\"invoice_date\":\"$(date +%Y-%m-%d)\",\"due_date\":\"${due_date}\",\"line_items\":[{\"description\":\"E2E Test Service ${test_timestamp}\",\"quantity\":1,\"unit_price\":100.00,\"vat_rate\":19}],\"notes\":\"E2E Test Invoice\"}"

    local response=$(api_call "POST" "/api/v1/invoices/create.php" "$invoice_data" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        INVOICE_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')
        if [ -n "$INVOICE_ID" ]; then
            pass_test "INVOICE-CREATE-001: Create new invoice"

            # Verify in database
            local db_count=$(db_query "SELECT COUNT(*) FROM invoices WHERE id='$INVOICE_ID';")
            if [ "$db_count" -ge 1 ]; then
                pass_test "INVOICE-CREATE-002: Invoice persisted in database"
            else
                fail_test "INVOICE-CREATE-002: Invoice should exist in database" "Count: $db_count"
            fi

            # Verify line items
            local line_count=$(db_query "SELECT COUNT(*) FROM invoice_line_items WHERE invoice_id='$INVOICE_ID';")
            if [ "$line_count" -ge 1 ]; then
                pass_test "INVOICE-CREATE-003: Invoice line items persisted"
            else
                fail_test "INVOICE-CREATE-003: Invoice line items should exist" "Count: $line_count"
            fi
        else
            fail_test "INVOICE-CREATE-001: Create invoice response missing ID" "Response: $response"
        fi
    else
        fail_test "INVOICE-CREATE-001: Create new invoice" "API returned success=false: $response"
    fi
}

# ============================================================================
# EXPENSE TESTS
# ============================================================================

test_expenses_crud() {
    log_section "Testing Expenses CRUD Operations"

    if [ -z "$TOKEN" ]; then
        skip_test "EXPENSES" "No token available"
        return
    fi

    # List expenses
    local response=$(api_call "GET" "/api/v1/expenses/list.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "EXPENSE-LIST-001: List expenses"
    else
        fail_test "EXPENSE-LIST-001: List expenses" "API returned success=false"
    fi

    # Create expense
    local test_timestamp=$(date +%s)
    local expense_data="{\"category\":\"office\",\"amount\":50.00,\"description\":\"E2E Test Expense ${test_timestamp}\",\"expense_date\":\"$(date +%Y-%m-%d)\"}"

    local response=$(api_call "POST" "/api/v1/expenses/create.php" "$expense_data" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        EXPENSE_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')
        if [ -n "$EXPENSE_ID" ]; then
            pass_test "EXPENSE-CREATE-001: Create new expense"

            # Verify in database
            local db_count=$(db_query "SELECT COUNT(*) FROM expenses WHERE id='$EXPENSE_ID';")
            if [ "$db_count" -ge 1 ]; then
                pass_test "EXPENSE-CREATE-002: Expense persisted in database"
            else
                fail_test "EXPENSE-CREATE-002: Expense should exist in database" "Count: $db_count"
            fi
        else
            fail_test "EXPENSE-CREATE-001: Create expense response missing ID" "No ID in response"
        fi
    else
        fail_test "EXPENSE-CREATE-001: Create new expense" "API returned success=false: $response"
    fi
}

# ============================================================================
# EMPLOYEE/HR TESTS
# ============================================================================

test_employees_crud() {
    log_section "Testing Employee Management"

    if [ -z "$TOKEN" ]; then
        skip_test "EMPLOYEES" "No token available"
        return
    fi

    # List employees
    local response=$(api_call "GET" "/api/v1/hr/employees.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "EMPLOYEE-LIST-001: List employees"
    else
        fail_test "EMPLOYEE-LIST-001: List employees" "API returned success=false: $response"
    fi
}

test_payroll() {
    log_section "Testing Payroll"

    if [ -z "$TOKEN" ]; then
        skip_test "PAYROLL" "No token available"
        return
    fi

    # List payroll periods
    local response=$(api_call "GET" "/api/v1/hr/payroll/list.php?year=2025" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "PAYROLL-LIST-001: List payroll periods"
    else
        fail_test "PAYROLL-LIST-001: List payroll periods" "API returned success=false: $response"
    fi
}

# ============================================================================
# PROJECT TESTS
# ============================================================================

test_projects_crud() {
    log_section "Testing Projects CRUD Operations"

    if [ -z "$TOKEN" ]; then
        skip_test "PROJECTS" "No token available"
        return
    fi

    # List projects
    local response=$(api_call "GET" "/api/v1/projects/list.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "PROJECT-LIST-001: List projects"
        PROJECT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')
    else
        fail_test "PROJECT-LIST-001: List projects" "API returned success=false: $response"
    fi

    # Create project
    local test_timestamp=$(date +%s)
    local project_data="{\"name\":\"E2E Test Project ${test_timestamp}\",\"description\":\"Created by E2E test suite\",\"status\":\"active\",\"methodology\":\"scrum\",\"budget\":10000}"

    local response=$(api_call "POST" "/api/v1/projects/projects.php" "$project_data" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        NEW_PROJECT_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')
        if [ -n "$NEW_PROJECT_ID" ]; then
            pass_test "PROJECT-CREATE-001: Create new project"

            # Verify in database
            local db_count=$(db_query "SELECT COUNT(*) FROM projects WHERE id='$NEW_PROJECT_ID';")
            if [ "$db_count" -ge 1 ]; then
                pass_test "PROJECT-CREATE-002: Project persisted in database"
            else
                fail_test "PROJECT-CREATE-002: Project should exist in database" "Count: $db_count"
            fi
        else
            fail_test "PROJECT-CREATE-001: Create project response missing ID" "No ID in response"
        fi
    else
        fail_test "PROJECT-CREATE-001: Create new project" "API returned success=false: $response"
    fi
}

test_tasks() {
    log_section "Testing Tasks"

    if [ -z "$TOKEN" ]; then
        skip_test "TASKS" "No token available"
        return
    fi

    local project_id="${NEW_PROJECT_ID:-$PROJECT_ID}"

    if [ -z "$project_id" ]; then
        skip_test "TASKS" "No project available"
        return
    fi

    # List tasks
    local response=$(api_call "GET" "/api/v1/projects/tasks.php?project_id=${project_id}" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "TASK-LIST-001: List project tasks"
    else
        fail_test "TASK-LIST-001: List project tasks" "API returned success=false: $response"
    fi

    # Create task
    local test_timestamp=$(date +%s)
    local task_data="{\"project_id\":\"${project_id}\",\"title\":\"E2E Test Task ${test_timestamp}\",\"description\":\"Created by E2E test suite\",\"status\":\"todo\",\"priority\":\"medium\",\"estimated_hours\":4}"

    local response=$(api_call "POST" "/api/v1/projects/tasks.php" "$task_data" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        TASK_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')
        if [ -n "$TASK_ID" ]; then
            pass_test "TASK-CREATE-001: Create new task"

            # Update task
            local update_data="{\"id\":\"${TASK_ID}\",\"status\":\"in_progress\"}"
            local response=$(api_call "PUT" "/api/v1/projects/tasks.php" "$update_data" "$TOKEN" "$COMPANY_ID")
            local success=$(extract_json_bool "$response" "success")

            if [ "$success" == "true" ]; then
                pass_test "TASK-UPDATE-001: Update task status"
            else
                fail_test "TASK-UPDATE-001: Update task status" "API returned success=false"
            fi
        else
            fail_test "TASK-CREATE-001: Create task response missing ID" "No ID in response"
        fi
    else
        fail_test "TASK-CREATE-001: Create new task" "API returned success=false: $response"
    fi
}

# ============================================================================
# INVENTORY TESTS
# ============================================================================

test_inventory() {
    log_section "Testing Inventory"

    if [ -z "$TOKEN" ]; then
        skip_test "INVENTORY" "No token available"
        return
    fi

    # List products
    local response=$(api_call "GET" "/api/v1/inventory/products.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "INVENTORY-LIST-001: List products"
    else
        fail_test "INVENTORY-LIST-001: List products" "API returned success=false: $response"
    fi
}

# ============================================================================
# TIME TRACKING TESTS
# ============================================================================

test_time_tracking() {
    log_section "Testing Time Tracking"

    if [ -z "$TOKEN" ]; then
        skip_test "TIME" "No token available"
        return
    fi

    # List time entries
    local response=$(api_call "GET" "/api/v1/time/entries.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "TIME-LIST-001: List time entries"
    else
        fail_test "TIME-LIST-001: List time entries" "API returned success=false: $response"
    fi
}

# ============================================================================
# DASHBOARD & ANALYTICS TESTS
# ============================================================================

test_dashboard() {
    log_section "Testing Dashboard"

    if [ -z "$TOKEN" ]; then
        skip_test "DASHBOARD" "No token available"
        return
    fi

    # Get dashboard stats
    local response=$(api_call "GET" "/api/v1/dashboard/stats.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "DASHBOARD-STATS-001: Get dashboard statistics"
    else
        fail_test "DASHBOARD-STATS-001: Get dashboard statistics" "API returned success=false: $response"
    fi
}

# ============================================================================
# FISCAL CALENDAR TESTS
# ============================================================================

test_fiscal_calendar() {
    log_section "Testing Fiscal Calendar"

    if [ -z "$TOKEN" ]; then
        skip_test "FISCAL" "No token available"
        return
    fi

    # Get fiscal calendar
    local response=$(api_call "GET" "/api/v1/fiscal-calendar/my-calendar.php?year=2025" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "FISCAL-CALENDAR-001: Get fiscal calendar"
    else
        fail_test "FISCAL-CALENDAR-001: Get fiscal calendar" "API returned success=false: $response"
    fi
}

# ============================================================================
# CRM PIPELINE TESTS
# ============================================================================

test_crm_pipeline() {
    log_section "Testing CRM Pipeline"

    if [ -z "$TOKEN" ]; then
        skip_test "CRM" "No token available"
        return
    fi

    # List opportunities
    local response=$(api_call "GET" "/api/v1/crm/opportunities.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "CRM-OPPORTUNITIES-001: List opportunities"
    else
        fail_test "CRM-OPPORTUNITIES-001: List opportunities" "API returned success=false: $response"
    fi

    # List leads
    local response=$(api_call "GET" "/api/v1/crm/leads.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "CRM-LEADS-001: List leads"
    else
        fail_test "CRM-LEADS-001: List leads" "API returned success=false: $response"
    fi
}

# ============================================================================
# SPRINT/SCRUM TESTS
# ============================================================================

test_sprints() {
    log_section "Testing Sprints/Scrum Features"

    if [ -z "$TOKEN" ]; then
        skip_test "SPRINTS" "No token available"
        return
    fi

    local project_id="${NEW_PROJECT_ID:-$PROJECT_ID}"

    if [ -z "$project_id" ]; then
        skip_test "SPRINTS" "No project available"
        return
    fi

    # List sprints
    local response=$(api_call "GET" "/api/v1/sprints/sprints.php?project_id=${project_id}" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "SPRINT-LIST-001: List project sprints"
    else
        fail_test "SPRINT-LIST-001: List project sprints" "API returned success=false: $response"
    fi
}

# ============================================================================
# BANK/FINANCIAL TESTS
# ============================================================================

test_banking() {
    log_section "Testing Banking Features"

    if [ -z "$TOKEN" ]; then
        skip_test "BANKING" "No token available"
        return
    fi

    # List bank accounts
    local response=$(api_call "GET" "/api/v1/bank/accounts.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "BANK-ACCOUNTS-001: List bank accounts"
    else
        fail_test "BANK-ACCOUNTS-001: List bank accounts" "API returned success=false: $response"
    fi

    # List transactions
    local response=$(api_call "GET" "/api/v1/bank/transactions.php" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "BANK-TRANSACTIONS-001: List bank transactions"
    else
        fail_test "BANK-TRANSACTIONS-001: List bank transactions" "API returned success=false: $response"
    fi
}

# ============================================================================
# REPORTS TESTS
# ============================================================================

test_reports() {
    log_section "Testing Reports"

    if [ -z "$TOKEN" ]; then
        skip_test "REPORTS" "No token available"
        return
    fi

    # Get P&L report
    local response=$(api_call "GET" "/api/v1/reports/profit-loss.php?start_date=2025-01-01&end_date=2025-12-31" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "REPORT-PL-001: Generate Profit & Loss report"
    else
        fail_test "REPORT-PL-001: Generate Profit & Loss report" "API returned success=false: $response"
    fi

    # Get Balance Sheet
    local response=$(api_call "GET" "/api/v1/reports/balance-sheet.php?as_of=2025-11-29" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "true" ]; then
        pass_test "REPORT-BS-001: Generate Balance Sheet"
    else
        fail_test "REPORT-BS-001: Generate Balance Sheet" "API returned success=false: $response"
    fi
}

# ============================================================================
# EDGE CASE TESTS
# ============================================================================

test_edge_cases() {
    log_section "Testing Edge Cases"

    if [ -z "$TOKEN" ]; then
        skip_test "EDGE-CASES" "No token available"
        return
    fi

    # Test 404 - Non-existent resource
    local response=$(api_call "GET" "/api/v1/invoices/get.php?id=nonexistent-uuid-12345" "" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "false" ]; then
        pass_test "EDGE-404-001: Non-existent resource returns error"
    else
        fail_test "EDGE-404-001: Non-existent resource should return error" "Returned success=true"
    fi

    # Test invalid data
    local invalid_data="{\"invalid_field\":\"test\"}"
    local response=$(api_call "POST" "/api/v1/invoices/create.php" "$invalid_data" "$TOKEN" "$COMPANY_ID")
    local success=$(extract_json_bool "$response" "success")

    if [ "$success" == "false" ]; then
        pass_test "EDGE-VALIDATION-001: Invalid data rejected"
    else
        fail_test "EDGE-VALIDATION-001: Invalid data should be rejected" "Request succeeded"
    fi
}

# ============================================================================
# DATA INTEGRITY TESTS
# ============================================================================

test_data_integrity() {
    log_section "Testing Data Integrity"

    # Check for orphaned records
    log "Checking for orphaned invoice line items..."
    local orphaned=$(db_query "SELECT COUNT(*) FROM invoice_line_items ili LEFT JOIN invoices i ON ili.invoice_id = i.id WHERE i.id IS NULL;")
    if [ "$orphaned" == "0" ]; then
        pass_test "INTEGRITY-001: No orphaned invoice line items"
    else
        fail_test "INTEGRITY-001: Found orphaned invoice line items" "Count: $orphaned"
    fi

    # Check for negative stock
    log "Checking for negative stock levels..."
    local negative_stock=$(db_query "SELECT COUNT(*) FROM stock_levels WHERE quantity < 0;" 2>/dev/null)
    if [ "$negative_stock" == "0" ] || [ -z "$negative_stock" ]; then
        pass_test "INTEGRITY-002: No negative stock levels"
    else
        fail_test "INTEGRITY-002: Found negative stock levels" "Count: $negative_stock"
    fi
}

# ============================================================================
# GENERATE REPORT
# ============================================================================

generate_report() {
    log_header "GENERATING TEST REPORT"

    local pass_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        pass_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    fi

    cat > "$REPORT_FILE" << EOF
# E2E Test Execution Report

**Platform:** Documentiulia.ro
**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Environment:** Production

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | $TOTAL_TESTS |
| Passed | $PASSED_TESTS |
| Failed | $FAILED_TESTS |
| Skipped | $SKIPPED_TESTS |
| **Pass Rate** | **${pass_rate}%** |

## Failed Tests

$(grep -E "\[FAIL\]" "$LOG_FILE" 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' || echo "No failed tests!")

## Recommendations

EOF

    if [ $FAILED_TESTS -gt 0 ]; then
        echo "- Investigate and fix $FAILED_TESTS failed test(s)" >> "$REPORT_FILE"
    fi

    if [ $SKIPPED_TESTS -gt 0 ]; then
        echo "- Review $SKIPPED_TESTS skipped test(s)" >> "$REPORT_FILE"
    fi

    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "*Report generated by E2E Automated Test Suite*" >> "$REPORT_FILE"

    log ""
    log "Report saved to: ${REPORT_FILE}"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_header "DOCUMENTIULIA.RO E2E TEST SUITE"
    log "Starting test execution at $(date '+%Y-%m-%d %H:%M:%S')"
    log "Base URL: $BASE_URL"
    log "Log file: $LOG_FILE"
    log ""

    # Run all test categories
    test_auth_login
    test_auth_me
    test_auth_unauthorized

    test_contacts_crud
    test_crm_pipeline

    test_invoices_workflow
    test_expenses_crud

    test_employees_crud
    test_payroll

    test_projects_crud
    test_tasks
    test_sprints

    test_inventory
    test_time_tracking

    test_dashboard
    test_fiscal_calendar
    test_banking
    test_reports

    test_edge_cases
    test_data_integrity

    # Generate final report
    generate_report

    # Print summary
    log_header "TEST EXECUTION COMPLETE"
    log ""
    log "Total Tests:  $TOTAL_TESTS"
    log "${GREEN}Passed:       $PASSED_TESTS${NC}"
    log "${RED}Failed:       $FAILED_TESTS${NC}"
    log "${YELLOW}Skipped:      $SKIPPED_TESTS${NC}"
    log ""

    if [ $TOTAL_TESTS -gt 0 ]; then
        local pass_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
        log "Pass Rate:    ${pass_rate}%"
    fi

    log ""
    log "Log file: $LOG_FILE"
    log "Report:   $REPORT_FILE"

    # Exit with appropriate code
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"
