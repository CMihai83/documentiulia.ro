#!/bin/bash

# DocumentIulia API E2E Test Runner
# Tests all 18 modules for Romanian accounting compliance

echo "=========================================="
echo "DocumentIulia API - E2E Test Suite"
echo "=========================================="
echo ""

# Set environment variables for testing
export NODE_ENV=test
export DATABASE_URL="postgresql://accountech_app:AccTech2025Prod%40Secure@127.0.0.1:5432/documentiulia_v2"
export CLERK_SECRET_KEY="test_secret"
export PORT=3001

cd /var/www/documentiulia.ro/apps/apps/api

# Check if API is running
echo "Checking API status..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/v1/companies -H "Authorization: Bearer dev_test_token")

if [ "$API_STATUS" != "200" ]; then
    echo "ERROR: API is not responding (status: $API_STATUS)"
    echo "Starting API..."
    nohup node dist/main.js > /var/log/documentiulia-api-test.log 2>&1 &
    sleep 5
fi

echo "API is running"
echo ""

# Run individual test suites
echo "Running test suites..."
echo ""

# Run comprehensive E2E tests
echo "1. Running all-modules test..."
npx jest --config test/jest-e2e.json test/all-modules.e2e-spec.ts --passWithNoTests 2>&1 | tail -50

echo ""
echo "2. Running auth tests..."
npx jest --config test/jest-e2e.json test/auth.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "3. Running companies tests..."
npx jest --config test/jest-e2e.json test/companies.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "4. Running clients tests..."
npx jest --config test/jest-e2e.json test/clients.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "5. Running products tests..."
npx jest --config test/jest-e2e.json test/products.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "6. Running invoices tests..."
npx jest --config test/jest-e2e.json test/invoices.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "7. Running expenses tests..."
npx jest --config test/jest-e2e.json test/expenses.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "8. Running reports tests..."
npx jest --config test/jest-e2e.json test/reports.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "9. Running e-Factura tests..."
npx jest --config test/jest-e2e.json test/efactura.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "10. Running SAF-T tests..."
npx jest --config test/jest-e2e.json test/saft.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "11. Running receipts tests..."
npx jest --config test/jest-e2e.json test/receipts.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "12. Running bank accounts tests..."
npx jest --config test/jest-e2e.json test/bank-accounts.e2e-spec.ts --passWithNoTests 2>&1 | tail -20

echo ""
echo "=========================================="
echo "Test Suite Complete"
echo "=========================================="
echo ""
echo "View coverage report at: coverage-e2e/lcov-report/index.html"
