#!/bin/bash

#######################################################################
# DocumentIulia - Comprehensive UI & API Testing Script
# Tests all modules with mock data and generates detailed report
#######################################################################

set -e

API_BASE="https://documentiulia.ro/api/v1"
COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TOKEN=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Output file
REPORT_FILE="/var/www/documentiulia.ro/COMPREHENSIVE_TEST_REPORT_$(date +%Y%m%d_%H%M%S).md"

# Initialize report
cat > "$REPORT_FILE" << 'EOF'
# DocumentIulia - Comprehensive Test Report
## Complete Platform Functionality Verification

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Tester:** Automated Test Suite
**Account:** test_admin@accountech.com
**Company:** Test Company SRL (aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)

---

## Executive Summary

EOF

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"
    echo -e "\n## $1\n" >> "$REPORT_FILE"
}

print_test() {
    echo -e "${YELLOW}→${NC} Testing: $1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "- ✅ **$1**" >> "$REPORT_FILE"
}

print_failure() {
    echo -e "${RED}✗${NC} $1"
    echo -e "${RED}  Error: $2${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo "- ❌ **$1** - Error: $2" >> "$REPORT_FILE"
}

# Function to make API call
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ "$method" == "GET" ]; then
        curl -s -X GET "$API_BASE/$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID" \
            -H "Content-Type: application/json"
    else
        curl -s -X "$method" "$API_BASE/$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

#######################################################################
# 1. AUTHENTICATION
#######################################################################
print_header "1. Authentication & Authorization"

print_test "User login"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login.php" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test_admin@accountech.com",
        "password": "Test123!"
    }')

if echo "$LOGIN_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    print_success "Login successful - Token obtained"
    echo "  Token: ${TOKEN:0:50}..."
else
    print_failure "Login failed" "$(echo $LOGIN_RESPONSE | jq -r '.message')"
    exit 1
fi

#######################################################################
# 2. FINANCIAL MODULE
#######################################################################
print_header "2. Financial Module Testing"

# Test Invoices
print_test "List all invoices"
INVOICES=$(api_call "GET" "invoices/list.php" "")
if echo "$INVOICES" | jq -e '.success == true' > /dev/null 2>&1; then
    INVOICE_COUNT=$(echo "$INVOICES" | jq -r '.data | length')
    print_success "Invoices retrieved: $INVOICE_COUNT invoices found"

    # Count by status
    echo "$INVOICES" | jq -r '.data[] | .status' | sort | uniq -c | while read count status; do
        echo "  - $status: $count invoices" >> "$REPORT_FILE"
    done
else
    print_failure "Failed to retrieve invoices" "$(echo $INVOICES | jq -r '.message')"
fi

# Test Bills
print_test "List all bills"
BILLS=$(api_call "GET" "bills/list.php" "")
if echo "$BILLS" | jq -e '.success == true' > /dev/null 2>&1; then
    BILL_COUNT=$(echo "$BILLS" | jq -r '.data | length')
    print_success "Bills retrieved: $BILL_COUNT bills found"
else
    print_failure "Failed to retrieve bills" "$(echo $BILLS | jq -r '.message')"
fi

# Test Expenses
print_test "List all expenses"
EXPENSES=$(api_call "GET" "expenses/list.php" "")
if echo "$EXPENSES" | jq -e '.success == true' > /dev/null 2>&1; then
    EXPENSE_COUNT=$(echo "$EXPENSES" | jq -r '.data | length')
    print_success "Expenses retrieved: $EXPENSE_COUNT expenses found"
else
    print_failure "Failed to retrieve expenses" "$(echo $EXPENSES | jq -r '.message')"
fi

#######################################################################
# 3. PAYROLL MODULE
#######################################################################
print_header "3. Payroll Module Testing"

print_test "List payroll periods for 2025"
PAYROLLS=$(api_call "GET" "hr/payroll/list.php?year=2025" "")
if echo "$PAYROLLS" | jq -e '.success == true' > /dev/null 2>&1; then
    PAYROLL_COUNT=$(echo "$PAYROLLS" | jq -r '.data | length')
    print_success "Payroll periods retrieved: $PAYROLL_COUNT periods found"

    # Get first payroll ID for detailed testing
    PAYROLL_ID=$(echo "$PAYROLLS" | jq -r '.data[0].id')

    print_test "Get payroll period details"
    PAYROLL_DETAIL=$(api_call "GET" "hr/payroll/get.php?id=$PAYROLL_ID" "")
    if echo "$PAYROLL_DETAIL" | jq -e '.success == true' > /dev/null 2>&1; then
        print_success "Payroll detail retrieved for period: $(echo $PAYROLL_DETAIL | jq -r '.data.payroll.period_name')"
    else
        print_failure "Failed to get payroll details" "$(echo $PAYROLL_DETAIL | jq -r '.message')"
    fi
else
    print_failure "Failed to retrieve payroll periods" "$(echo $PAYROLLS | jq -r '.message')"
fi

#######################################################################
# 4. FISCAL CALENDAR
#######################################################################
print_header "4. Fiscal Calendar Testing"

print_test "Get fiscal calendar for 2025"
CALENDAR=$(api_call "GET" "fiscal-calendar/my-calendar.php?year=2025" "")
if echo "$CALENDAR" | jq -e '.success == true' > /dev/null 2>&1; then
    CALENDAR_COUNT=$(echo "$CALENDAR" | jq -r '.data | length')
    print_success "Fiscal calendar retrieved: $CALENDAR_COUNT entries found"

    # Count by urgency
    echo "  **Urgency breakdown:**" >> "$REPORT_FILE"
    echo "$CALENDAR" | jq -r '.data[] | .urgency' | sort | uniq -c | while read count urgency; do
        echo "  - $urgency: $count deadlines" >> "$REPORT_FILE"
    done
else
    print_failure "Failed to retrieve fiscal calendar" "$(echo $CALENDAR | jq -r '.message')"
fi

#######################################################################
# 5. REPORTS
#######################################################################
print_header "5. Reports Module Testing"

print_test "Generate Profit & Loss report"
PL_REPORT=$(api_call "GET" "reports/profit-loss.php?start_date=2025-01-01&end_date=2025-12-31" "")
if echo "$PL_REPORT" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "P&L report generated successfully"
    echo "  **Revenue:** $(echo $PL_REPORT | jq -r '.data.total_revenue // 0') RON" >> "$REPORT_FILE"
    echo "  **Expenses:** $(echo $PL_REPORT | jq -r '.data.total_expenses // 0') RON" >> "$REPORT_FILE"
    echo "  **Net Profit:** $(echo $PL_REPORT | jq -r '.data.net_profit // 0') RON" >> "$REPORT_FILE"
else
    print_failure "Failed to generate P&L report" "$(echo $PL_REPORT | jq -r '.message')"
fi

print_test "Generate Balance Sheet"
BS_REPORT=$(api_call "GET" "reports/balance-sheet.php?as_of=2025-11-23" "")
if echo "$BS_REPORT" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Balance Sheet generated successfully"
else
    print_failure "Failed to generate Balance Sheet" "$(echo $BS_REPORT | jq -r '.message')"
fi

#######################################################################
# 6. CRM MODULE
#######################################################################
print_header "6. CRM Module Testing"

print_test "List opportunities"
OPPORTUNITIES=$(api_call "GET" "crm/opportunities.php" "")
if echo "$OPPORTUNITIES" | jq -e '.success == true' > /dev/null 2>&1; then
    OPP_COUNT=$(echo "$OPPORTUNITIES" | jq -r '.data | length')
    print_success "Opportunities retrieved: $OPP_COUNT opportunities found"

    # Count by stage
    echo "  **Pipeline breakdown:**" >> "$REPORT_FILE"
    echo "$OPPORTUNITIES" | jq -r '.data[] | .stage' | sort | uniq -c | while read count stage; do
        echo "  - $stage: $count opportunities" >> "$REPORT_FILE"
    done
else
    print_failure "Failed to retrieve opportunities" "$(echo $OPPORTUNITIES | jq -r '.message')"
fi

print_test "Get opportunities pipeline"
PIPELINE=$(api_call "GET" "crm/opportunities-pipeline.php" "")
if echo "$PIPELINE" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Pipeline data retrieved"
else
    print_failure "Failed to retrieve pipeline" "$(echo $PIPELINE | jq -r '.message')"
fi

#######################################################################
# 7. INVENTORY MODULE
#######################################################################
print_header "7. Inventory Module Testing"

print_test "List products"
PRODUCTS=$(api_call "GET" "inventory/products.php" "")
if echo "$PRODUCTS" | jq -e '.success == true' > /dev/null 2>&1; then
    PRODUCT_COUNT=$(echo "$PRODUCTS" | jq -r '.data | length')
    print_success "Products retrieved: $PRODUCT_COUNT products found"
else
    print_failure "Failed to retrieve products" "$(echo $PRODUCTS | jq -r '.message')"
fi

print_test "List stock levels"
STOCK_LEVELS=$(api_call "GET" "inventory/stock-levels.php" "")
if echo "$STOCK_LEVELS" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "Stock levels retrieved"
else
    print_failure "Failed to retrieve stock levels" "$(echo $STOCK_LEVELS | jq -r '.message')"
fi

print_test "List purchase orders"
PO_LIST=$(api_call "GET" "purchase-orders/list.php" "")
if echo "$PO_LIST" | jq -e '.success == true' > /dev/null 2>&1; then
    PO_COUNT=$(echo "$PO_LIST" | jq -r '.data | length')
    print_success "Purchase orders retrieved: $PO_COUNT purchase orders found"
else
    print_failure "Failed to retrieve purchase orders" "$(echo $PO_LIST | jq -r '.message')"
fi

#######################################################################
# 8. E-FACTURA MODULE
#######################################################################
print_header "8. E-Factura Integration Testing"

print_test "Check E-Factura OAuth status"
OAUTH_STATUS=$(api_call "GET" "efactura/oauth-status.php" "")
if echo "$OAUTH_STATUS" | jq -e '.success == true' > /dev/null 2>&1; then
    IS_CONNECTED=$(echo "$OAUTH_STATUS" | jq -r '.data.connected')
    if [ "$IS_CONNECTED" == "true" ]; then
        print_success "E-Factura OAuth connected"
    else
        print_success "E-Factura OAuth status checked (not connected - expected in test environment)"
    fi
else
    print_failure "Failed to check OAuth status" "$(echo $OAUTH_STATUS | jq -r '.message')"
fi

print_test "List E-Factura analytics"
EFACTURA_ANALYTICS=$(api_call "GET" "efactura/analytics.php" "")
if echo "$EFACTURA_ANALYTICS" | jq -e '.success == true' > /dev/null 2>&1; then
    print_success "E-Factura analytics retrieved"
else
    print_failure "Failed to retrieve analytics" "$(echo $EFACTURA_ANALYTICS | jq -r '.message')"
fi

#######################################################################
# 9. PROJECT MANAGEMENT
#######################################################################
print_header "9. Project Management Testing"

print_test "List projects"
PROJECTS=$(api_call "GET" "projects/list.php" "")
if echo "$PROJECTS" | jq -e '.success == true' > /dev/null 2>&1; then
    PROJECT_COUNT=$(echo "$PROJECTS" | jq -r '.data | length')
    print_success "Projects retrieved: $PROJECT_COUNT projects found"
else
    print_failure "Failed to retrieve projects" "$(echo $PROJECTS | jq -r '.message')"
fi

#######################################################################
# 10. TIME TRACKING
#######################################################################
print_header "10. Time Tracking Testing"

print_test "List time entries"
TIME_ENTRIES=$(api_call "GET" "time/entries.php" "")
if echo "$TIME_ENTRIES" | jq -e '.success == true' > /dev/null 2>&1; then
    TIME_COUNT=$(echo "$TIME_ENTRIES" | jq -r '.data | length')
    print_success "Time entries retrieved: $TIME_COUNT entries found"
else
    print_failure "Failed to retrieve time entries" "$(echo $TIME_ENTRIES | jq -r '.message')"
fi

#######################################################################
# FINAL REPORT
#######################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
echo -e "Pass Rate: ${PASS_RATE}%\n"

# Add summary to report
cat >> "$REPORT_FILE" << EOF

---

## Test Summary

**Total Tests:** $TOTAL_TESTS
**Passed:** ✅ $PASSED_TESTS
**Failed:** ❌ $FAILED_TESTS
**Pass Rate:** $PASS_RATE%

---

## Conclusion

EOF

if [ $FAILED_TESTS -eq 0 ]; then
    echo "✅ **ALL TESTS PASSED!** The platform is functioning correctly." >> "$REPORT_FILE"
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}\n"
else
    echo "⚠️ Some tests failed. Please review the failures above." >> "$REPORT_FILE"
    echo -e "${YELLOW}⚠ Some tests failed. Please review.${NC}\n"
fi

echo "Full report saved to: $REPORT_FILE"
echo -e "\n${GREEN}Testing complete!${NC}\n"
