#!/bin/bash
#
# Load Testing Script for documentiulia.ro APIs
#

TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJhY2NvdW50ZWNoLmFpIiwiaWF0IjoxNzY0NDQwNzU0LCJleHAiOjE3NjcwMzI3NTQsInVzZXJfaWQiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJlbWFpbCI6InRlc3RfYWRtaW5AYWNjb3VudGVjaC5jb20iLCJyb2xlIjoiYWRtaW4ifQ.fRP4AjnqSgV8IyexWzA-30wktA_FW7t4hPjozAoG2ho"
COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
BASE_URL="http://127.0.0.1/api/v1"
CONCURRENCY=${1:-10}
REQUESTS=${2:-100}

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           LOAD TESTING - documentiulia.ro                   ║"
echo "║           Concurrency: $CONCURRENCY | Requests: $REQUESTS               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Test endpoints
ENDPOINTS=(
    "invoices/list.php"
    "contacts/list.php"
    "expenses/list.php"
    "tasks/list.php"
    "dashboard/stats.php"
    "hr/employees/list.php"
    "inventory/products.php"
    "crm/contacts.php"
)

test_endpoint() {
    local endpoint=$1
    local requests=$2
    local concurrency=$3

    echo -n "Testing $endpoint... "

    # Run concurrent requests and measure time
    START=$(date +%s%N)

    for i in $(seq 1 $requests); do
        curl -s "$BASE_URL/$endpoint" \
            -H "Host: documentiulia.ro" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-Company-ID: $COMPANY_ID" > /dev/null &

        # Limit concurrency
        if [ $((i % concurrency)) -eq 0 ]; then
            wait
        fi
    done
    wait

    END=$(date +%s%N)
    TOTAL_MS=$(( (END - START) / 1000000 ))
    AVG_MS=$((TOTAL_MS / requests))
    RPS=$((requests * 1000 / TOTAL_MS))

    echo "Total: ${TOTAL_MS}ms | Avg: ${AVG_MS}ms | RPS: $RPS"
}

echo "=== Sequential Tests (baseline) ==="
for endpoint in "${ENDPOINTS[@]}"; do
    # Single request baseline
    START=$(date +%s%N)
    result=$(curl -s -w "%{http_code}" "$BASE_URL/$endpoint" \
        -H "Host: documentiulia.ro" \
        -H "Authorization: Bearer $TOKEN" \
        -H "X-Company-ID: $COMPANY_ID" -o /dev/null)
    END=$(date +%s%N)
    TIME_MS=$(( (END - START) / 1000000 ))

    if [ "$result" = "200" ]; then
        echo "✅ $endpoint: ${TIME_MS}ms"
    else
        echo "❌ $endpoint: HTTP $result"
    fi
done

echo ""
echo "=== Concurrent Load Tests ==="
for endpoint in "${ENDPOINTS[@]:0:4}"; do
    test_endpoint "$endpoint" $REQUESTS $CONCURRENCY
done

echo ""
echo "=== Stress Test (high concurrency) ==="
test_endpoint "invoices/list.php" 200 50
test_endpoint "dashboard/stats.php" 200 50

echo ""
echo "=== Memory & CPU Check ==="
echo "PHP-FPM processes: $(pgrep -c php-fpm)"
echo "Nginx workers: $(pgrep -c nginx)"
echo "Memory usage: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "Load average: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  LOAD TEST COMPLETE                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
