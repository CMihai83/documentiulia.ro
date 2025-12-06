#!/bin/bash

#######################################################################
# DocumentIulia - COMPREHENSIVE MODULE TESTING
# Tests ALL critical untested modules systematically
#######################################################################

# Don't exit on errors - we want to test everything
# set -e

API_BASE="https://documentiulia.ro/api/v1"
COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TOKEN=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}→${NC} Testing: $name"
    
    if [ "$method" == "GET" ]; then
        RESPONSE=$(curl -s -X GET "$API_BASE/$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID" \
            -H "Content-Type: application/json")
    else
        RESPONSE=$(curl -s -X "$method" "$API_BASE/$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name - Success"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "Parse error")
        echo -e "${RED}✗${NC} $name - Failed: $ERROR_MSG"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Get authentication token
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Authentication${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login.php" \
    -H "Content-Type: application/json" \
    -d '{"email": "test_admin@accountech.com", "password": "Test123!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}✗ Authentication failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Authentication successful${NC}"
echo ""

#######################################################################
# PRIORITY 1: CRITICAL MODULES
#######################################################################

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 1: E-FACTURA (Romanian Compliance)${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "List received invoices" "GET" "efactura/received-invoices.php" ""
test_endpoint "Get OAuth status" "GET" "efactura/oauth-status.php" ""
test_endpoint "Get E-Factura analytics" "GET" "efactura/analytics.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 1: ACCOUNTING MODULE${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "List chart of accounts" "GET" "accounting/chart-of-accounts.php" ""
test_endpoint "List journal entries" "GET" "accounting/journal-entries.php" ""
test_endpoint "Get balance sheet" "GET" "accounting/balance-sheet.php" ""
test_endpoint "Get general ledger" "GET" "accounting/general-ledger.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 1: ADMIN & USERS${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "Get user profile" "GET" "users/profile.php" ""
test_endpoint "Get company" "GET" "companies/get.php?id=$COMPANY_ID" ""
test_endpoint "Admin queue manager" "GET" "admin/queue-manager.php" ""
echo ""

#######################################################################
# PRIORITY 2: HIGH RISK MODULES
#######################################################################

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 2: BILLS MODULE${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "List bills" "GET" "bills/list.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 2: PAYMENTS MODULE${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "List payments" "GET" "payments/list.php" ""
test_endpoint "List payment methods" "GET" "payments/methods.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 2: PURCHASE ORDERS${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "List purchase orders" "GET" "purchase-orders/list.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 2: INVENTORY MODULE${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "List products" "GET" "inventory/products.php" ""
test_endpoint "Get stock levels" "GET" "inventory/stock-levels.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 2: BANK INTEGRATION${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "List bank connections" "GET" "bank/connections.php" ""
test_endpoint "List bank transactions" "GET" "bank/transactions.php" ""
test_endpoint "Get bank balance" "GET" "bank/balance.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 2: CRM MODULE${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "List opportunities" "GET" "crm/opportunities.php" ""
test_endpoint "Get opportunities pipeline" "GET" "crm/opportunities-pipeline.php" ""
test_endpoint "List quotations" "GET" "crm/quotations.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 2: FISCAL MODULES${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "Get fiscal calendar" "GET" "fiscal-calendar/my-calendar.php?year=2025" ""
test_endpoint "List fiscal deadlines" "GET" "fiscal/deadlines.php" ""
echo ""

#######################################################################
# PRIORITY 3: MEDIUM RISK MODULES
#######################################################################

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 3: RECEIPTS MODULE${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "List receipts" "GET" "receipts/list.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 3: RECURRING INVOICES${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "List recurring invoices" "GET" "recurring-invoices/list.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 3: TASKS & SPRINTS${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "Get tasks backlog" "GET" "tasks/backlog.php" ""
test_endpoint "Get tasks board" "GET" "tasks/board.php" ""
test_endpoint "List sprints" "GET" "sprints/sprints.php" ""
test_endpoint "Get active sprint" "GET" "sprints/active.php" ""
test_endpoint "List epics" "GET" "epics/epics.php" ""
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  PRIORITY 3: ANALYTICS & INSIGHTS${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

test_endpoint "Get analytics dashboards" "GET" "analytics/dashboards.php" ""
test_endpoint "Get analytics reports" "GET" "analytics/reports.php" ""
test_endpoint "List insights" "GET" "insights/list.php" ""
echo ""

#######################################################################
# SUMMARY
#######################################################################

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  COMPREHENSIVE TEST SUMMARY${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")

echo ""
echo -e "📊 Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
echo -e "📈 Pass Rate: ${GREEN}${PASS_RATE}%${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed - review errors above${NC}"
fi

