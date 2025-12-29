#!/bin/bash

# DocumentIulia.ro Load Test Runner
# This script runs various load test scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
TEST_TYPE="${1:-smoke}"
OUTPUT_DIR="./load-test-results"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DocumentIulia.ro Load Test Runner${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Target URL: ${YELLOW}${BASE_URL}${NC}"
echo -e "Test Type: ${YELLOW}${TEST_TYPE}${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check which tool is available
if command -v k6 &> /dev/null; then
    TOOL="k6"
elif command -v artillery &> /dev/null; then
    TOOL="artillery"
else
    echo -e "${RED}Error: Neither k6 nor artillery is installed.${NC}"
    echo ""
    echo "Install k6:"
    echo "  brew install k6  # macOS"
    echo "  sudo apt install k6  # Ubuntu/Debian"
    echo "  docker pull grafana/k6  # Docker"
    echo ""
    echo "Or install Artillery:"
    echo "  npm install -g artillery"
    exit 1
fi

echo -e "Using tool: ${YELLOW}${TOOL}${NC}"
echo ""

run_k6_test() {
    local test_type=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local output_file="${OUTPUT_DIR}/k6_${test_type}_${timestamp}.json"

    case $test_type in
        smoke)
            echo -e "${GREEN}Running smoke test (10 VUs, 1 minute)...${NC}"
            k6 run \
                --env BASE_URL="$BASE_URL" \
                --out json="$output_file" \
                --tag testid="${test_type}_${timestamp}" \
                -e K6_SCENARIO=smoke \
                k6-load-test.js
            ;;
        load)
            echo -e "${GREEN}Running load test (100 VUs, 5 minutes)...${NC}"
            k6 run \
                --env BASE_URL="$BASE_URL" \
                --out json="$output_file" \
                --tag testid="${test_type}_${timestamp}" \
                -e K6_SCENARIO=load \
                k6-load-test.js
            ;;
        stress)
            echo -e "${GREEN}Running stress test (500 VUs, 10 minutes)...${NC}"
            k6 run \
                --env BASE_URL="$BASE_URL" \
                --out json="$output_file" \
                --tag testid="${test_type}_${timestamp}" \
                -e K6_SCENARIO=stress \
                k6-load-test.js
            ;;
        spike)
            echo -e "${GREEN}Running spike test (1000 VUs spike)...${NC}"
            k6 run \
                --env BASE_URL="$BASE_URL" \
                --out json="$output_file" \
                --tag testid="${test_type}_${timestamp}" \
                -e K6_SCENARIO=spike \
                k6-load-test.js
            ;;
        full)
            echo -e "${GREEN}Running full test suite...${NC}"
            k6 run \
                --env BASE_URL="$BASE_URL" \
                --out json="$output_file" \
                --tag testid="full_${timestamp}" \
                k6-load-test.js
            ;;
        *)
            echo -e "${RED}Unknown test type: $test_type${NC}"
            echo "Available types: smoke, load, stress, spike, full"
            exit 1
            ;;
    esac

    echo ""
    echo -e "${GREEN}Results saved to: ${output_file}${NC}"
}

run_artillery_test() {
    local test_type=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local output_file="${OUTPUT_DIR}/artillery_${test_type}_${timestamp}.json"

    echo -e "${GREEN}Running Artillery load test...${NC}"

    case $test_type in
        smoke)
            artillery run \
                --target "$BASE_URL" \
                --output "$output_file" \
                --config artillery-config.yml \
                --overrides '{"config":{"phases":[{"duration":60,"arrivalRate":5}]}}'
            ;;
        load)
            artillery run \
                --target "$BASE_URL" \
                --output "$output_file" \
                artillery-config.yml
            ;;
        stress)
            artillery run \
                --target "$BASE_URL" \
                --output "$output_file" \
                --config artillery-config.yml \
                --overrides '{"config":{"phases":[{"duration":120,"arrivalRate":100},{"duration":300,"arrivalRate":200}]}}'
            ;;
        *)
            artillery run \
                --target "$BASE_URL" \
                --output "$output_file" \
                artillery-config.yml
            ;;
    esac

    # Generate HTML report
    artillery report "$output_file"

    echo ""
    echo -e "${GREEN}Results saved to: ${output_file}${NC}"
}

# Run the appropriate test
if [ "$TOOL" == "k6" ]; then
    run_k6_test "$TEST_TYPE"
else
    run_artillery_test "$TEST_TYPE"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Load Test Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Print summary of thresholds
echo "Performance Thresholds:"
echo "  - API p95 latency: < 200ms"
echo "  - API p99 latency: < 500ms"
echo "  - Error rate: < 1%"
echo "  - Dashboard p95: < 300ms"
echo ""

# Check if there are any reports to summarize
if ls "${OUTPUT_DIR}"/*.json 1> /dev/null 2>&1; then
    echo -e "View detailed reports in: ${YELLOW}${OUTPUT_DIR}/${NC}"
fi
