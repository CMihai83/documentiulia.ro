# DocumentIulia API v2 - Testing Guide

## Overview

This guide covers the comprehensive E2E test suite for the DocumentIulia API v2, testing all 18 modules for Romanian accounting platform compliance.

## Test Coverage

### Modules Tested (18 total)

1. **Health** - API health checks
2. **Auth** - Clerk authentication, JWT verification
3. **Users** - User profile, companies association
4. **Companies** - Romanian company management (CUI, CAEN, etc.)
5. **Clients** - Client management (PF, PJ, foreign)
6. **Products** - Products/services with Romanian VAT rates
7. **Invoices** - Invoice lifecycle, Romanian fiscal compliance
8. **Expenses** - Expense tracking, categories, VAT deduction
9. **Receipts** - OCR processing, expense linking
10. **Reports** - Financial reports, dashboard analytics
11. **Bank Accounts** - Romanian bank integration (BT, BCR, BRD, ING)
12. **e-Factura** - ANAF e-Factura UBL 2.1 compliance
13. **SAF-T** - SAF-T D406 Romanian declaration
14. **Tax Codes** - Romanian VAT rates (19%, 9%, 5%, 0%)
15. **Documents** - Document storage and management
16. **Projects** - Project tracking
17. **Notifications** - Alert system
18. **Activity** - Audit logging

## Running Tests

### Quick Start

```bash
cd /var/www/documentiulia.ro/apps/apps/api

# Run all E2E tests
npm run test:e2e

# Run comprehensive module test
npm run test:e2e:all

# Run specific module tests
npm run test:e2e:auth
npm run test:e2e:companies
npm run test:e2e:invoices
npm run test:e2e:efactura
npm run test:e2e:saft
```

### Using Test Runner Script

```bash
chmod +x test/run-all-tests.sh
./test/run-all-tests.sh
```

## Test Files

| File | Description |
|------|-------------|
| `test-utils.ts` | Test utilities, Romanian data generators |
| `setup.ts` | Test environment setup |
| `auth.e2e-spec.ts` | Authentication tests |
| `companies.e2e-spec.ts` | Company CRUD tests |
| `clients.e2e-spec.ts` | Client management tests |
| `products.e2e-spec.ts` | Products/services tests |
| `invoices.e2e-spec.ts` | Invoice lifecycle tests |
| `expenses.e2e-spec.ts` | Expense tracking tests |
| `reports.e2e-spec.ts` | Financial reports tests |
| `efactura.e2e-spec.ts` | e-Factura compliance tests |
| `saft.e2e-spec.ts` | SAF-T D406 tests |
| `receipts.e2e-spec.ts` | Receipt OCR tests |
| `bank-accounts.e2e-spec.ts` | Banking integration tests |
| `all-modules.e2e-spec.ts` | Comprehensive module test |

## Test Credentials

For development testing:

```
Authorization: Bearer dev_test_token
x-company-id: cmima19rd0001i0gv51qpgvfo
```

## Romanian Compliance Testing

### e-Factura (ANAF)
- UBL 2.1 XML generation
- Mandatory Romanian fields
- CUI/CIF validation
- IBAN validation

### SAF-T D406
- Monthly/quarterly declaration
- Standard Audit File for Tax
- ANAF format compliance

### VAT Rates
- 19% standard
- 9% reduced (food, hotels)
- 5% reduced (books, housing)
- 0% exempt

### Bank Codes Supported
- BTRL (Banca Transilvania)
- RNCB (BCR)
- BRDE (BRD)
- INGB (ING Bank)
- RZBB (Raiffeisen)
- BACX (UniCredit)

## Coverage Reports

After running tests, view coverage at:
```
coverage-e2e/lcov-report/index.html
```

## Environment Variables

```env
NODE_ENV=test
DATABASE_URL=postgresql://accountech_app:AccTech2025Prod%40Secure@127.0.0.1:5432/documentiulia_v2
CLERK_SECRET_KEY=test_secret
PORT=3001
```

## Troubleshooting

### API Not Responding
```bash
# Check if API is running
curl http://127.0.0.1:3001/api/v1/companies -H "Authorization: Bearer dev_test_token"

# Restart API
cd /var/www/documentiulia.ro/apps/apps/api
NODE_ENV=development DATABASE_URL="postgresql://accountech_app:AccTech2025Prod%40Secure@127.0.0.1:5432/documentiulia_v2" CLERK_SECRET_KEY="test_secret" nohup node dist/main.js > /var/log/documentiulia-api.log 2>&1 &
```

### Database Issues
```bash
# Verify connection
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d documentiulia_v2 -c "\dt"
```

## Adding New Tests

1. Create test file in `test/` directory
2. Follow naming convention: `{module}.e2e-spec.ts`
3. Import utilities from `test-utils.ts`
4. Add npm script in `package.json`
5. Update this guide

## Romanian Test Data

Sample data generators available in `test-utils.ts`:
- `romanianTestData.company` - Romanian SRL company
- `romanianTestData.client` - Romanian client
- `romanianTestData.product` - Product with VAT
- `romanianTestData.expense` - Expense with categories
- `romanianTestData.invoice` - Invoice with items

## Contact

For issues with tests, check API logs:
```bash
tail -f /var/log/documentiulia-api.log
```
