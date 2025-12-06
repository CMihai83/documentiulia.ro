# Advanced Accounting Module - Documentation

## Overview

The Advanced Accounting Module is a comprehensive double-entry bookkeeping system built for the DocumentiUlia Enterprise Suite. It provides complete accounting functionality including chart of accounts management, journal entries, fixed asset tracking, tax management, and financial reporting.

## Table of Contents

1. [Features](#features)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Usage Examples](#usage-examples)
5. [Business Logic](#business-logic)
6. [Financial Reports](#financial-reports)
7. [Integration Guide](#integration-guide)

---

## Features

### Core Accounting Features

- **Double-Entry Bookkeeping**: Automatic validation ensuring debits equal credits
- **Hierarchical Chart of Accounts**: Unlimited depth parent-child account structure
- **Journal Entries**: Manual, automatic, recurring, adjustment, closing, and opening entries
- **Multi-Currency Support**: Base currency with historical exchange rates
- **Fixed Assets Management**: Asset tracking with multiple depreciation methods
- **Tax Management**: VAT, sales tax, withholding tax, and custom tax codes
- **Financial Periods**: Period closing and locking mechanisms
- **Bank Reconciliation**: Match transactions with bank statements
- **Financial Reporting**: Trial Balance, Balance Sheet, Income Statement, Cash Flow

### Advanced Features

- **Materialized Views**: High-performance account balance calculations
- **Automated Triggers**: Balance validation, depreciation calculation, risk scoring
- **Account Hierarchies**: Visual tree structure with parent-child relationships
- **Posting/Draft System**: Review entries before making permanent
- **Audit Trail**: Complete history of all accounting transactions
- **Multi-Tenant**: Full company isolation and data security

---

## Database Schema

### Core Tables

#### 1. Chart of Accounts (`chart_of_accounts`)

Hierarchical account structure with parent-child relationships.

```sql
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,  -- asset, liability, equity, revenue, expense
    normal_balance VARCHAR(10),          -- debit or credit
    parent_account_id UUID,              -- For hierarchical structure
    level INTEGER DEFAULT 1,             -- Depth in hierarchy
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    UNIQUE(company_id, code)
);
```

**Account Types:**
- **Asset**: Cash, accounts receivable, inventory, fixed assets
- **Liability**: Accounts payable, loans, accrued expenses
- **Equity**: Capital, retained earnings, dividends
- **Revenue**: Sales, service income, interest income
- **Expense**: Salaries, rent, utilities, depreciation

#### 2. Journal Entries (`journal_entries`)

Header table for double-entry journal entries.

```sql
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    entry_number VARCHAR(50) UNIQUE,
    entry_date DATE NOT NULL,
    entry_type VARCHAR(50) DEFAULT 'manual',
    status VARCHAR(20) DEFAULT 'draft',  -- draft, posted, voided, reversed
    description TEXT,
    reference_number VARCHAR(100),
    created_by UUID,
    posted_by UUID,
    posted_at TIMESTAMP
);
```

**Entry Types:**
- `manual`: User-created entries
- `automatic`: System-generated (e.g., from invoices)
- `recurring`: Repeating entries (e.g., monthly rent)
- `adjustment`: Period-end adjustments
- `closing`: Year-end closing entries
- `opening`: Opening balances

#### 3. Journal Entry Lines (`journal_entry_lines`)

Detail lines for each journal entry (debits and credits).

```sql
CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY,
    journal_entry_id UUID NOT NULL,
    account_id UUID NOT NULL,
    line_type VARCHAR(10) NOT NULL,      -- debit or credit
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);
```

#### 4. Fixed Assets (`fixed_assets`)

Asset tracking with depreciation management.

```sql
CREATE TABLE fixed_assets (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    asset_number VARCHAR(50) UNIQUE,
    category VARCHAR(100),
    acquisition_date DATE NOT NULL,
    acquisition_cost DECIMAL(15,2) NOT NULL,
    salvage_value DECIMAL(15,2) DEFAULT 0,
    useful_life_years INTEGER NOT NULL,
    depreciation_method VARCHAR(50) DEFAULT 'straight_line',
    current_book_value DECIMAL(15,2),
    total_depreciation DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active'
);
```

**Depreciation Methods:**
- `straight_line`: (Cost - Salvage) / Useful Life
- `declining_balance`: Book Value × Depreciation Rate
- `double_declining`: Book Value × (2 / Useful Life)
- `units_of_production`: (Cost - Salvage) × (Units Produced / Total Units)
- `sum_of_years_digits`: (Cost - Salvage) × (Remaining Life / Sum of Years)

#### 5. Tax Codes (`tax_codes`)

Tax rate management for VAT, sales tax, etc.

```sql
CREATE TABLE tax_codes (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    tax_type VARCHAR(50) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    is_included_in_price BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(company_id, code)
);
```

### Materialized Views

#### Account Balances View

Pre-calculated account balances for high-performance reporting.

```sql
CREATE MATERIALIZED VIEW account_balances AS
SELECT
    c.id as company_id,
    a.id as account_id,
    a.code as account_code,
    a.name as account_name,
    a.account_type,
    COALESCE(SUM(CASE
        WHEN jel.line_type = 'debit' THEN jel.amount
        ELSE -jel.amount
    END), 0) as balance,
    COUNT(jel.id) as transaction_count
FROM companies c
CROSS JOIN chart_of_accounts a
LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
    AND je.status = 'posted'
WHERE a.company_id = c.id
GROUP BY c.id, a.id, a.code, a.name, a.account_type;

-- Refresh with: REFRESH MATERIALIZED VIEW account_balances;
```

---

## API Endpoints

All endpoints require:
- **Authentication**: Bearer token in `Authorization` header
- **Company Context**: `X-Company-ID` header

### 1. Chart of Accounts API

**Base URL**: `/api/v1/accounting/chart-of-accounts.php`

#### List Accounts (GET)

```bash
GET /api/v1/accounting/chart-of-accounts.php
Headers:
  Authorization: Bearer {token}
  X-Company-ID: {company_id}
Query Parameters:
  - account_type: Filter by type (asset, liability, equity, revenue, expense)
  - is_active: Filter by status (true/false)
  - search: Search in code or name

Response:
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "uuid",
        "code": "1010",
        "name": "Cash and Cash Equivalents",
        "account_type": "asset",
        "normal_balance": "debit",
        "parent_account_id": null,
        "level": 1,
        "children": [
          {
            "id": "uuid",
            "code": "1011",
            "name": "Petty Cash",
            "level": 2,
            "children": []
          }
        ]
      }
    ],
    "count": 15
  }
}
```

#### Create Account (POST)

```bash
POST /api/v1/accounting/chart-of-accounts.php
Headers:
  Authorization: Bearer {token}
  X-Company-ID: {company_id}
  Content-Type: application/json

Body:
{
  "code": "1010",
  "name": "Cash and Cash Equivalents",
  "account_type": "asset",
  "normal_balance": "debit",
  "parent_account_id": null,  // Optional - for sub-accounts
  "is_active": true,
  "description": "Main cash account"
}

Response:
{
  "success": true,
  "data": {
    "account_id": "uuid",
    "account": { /* account object */ }
  },
  "message": "Account created successfully"
}
```

### 2. Journal Entries API

**Base URL**: `/api/v1/accounting/journal-entries.php`

#### Create Journal Entry (POST)

```bash
POST /api/v1/accounting/journal-entries.php
Headers:
  Authorization: Bearer {token}
  X-Company-ID: {company_id}
  Content-Type: application/json

Body:
{
  "entry_date": "2025-11-19",
  "description": "Initial cash investment",
  "entry_type": "manual",
  "reference_number": "INV-001",
  "lines": [
    {
      "account_id": "cash-account-uuid",
      "line_type": "debit",
      "amount": 10000.00,
      "description": "Cash received"
    },
    {
      "account_id": "equity-account-uuid",
      "line_type": "credit",
      "amount": 10000.00,
      "description": "Owner's capital"
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "entry_id": "uuid",
    "entry": { /* full entry with lines */ }
  },
  "message": "Journal entry created successfully"
}
```

**Important**: Journal entries must balance (total debits = total credits) or they will be rejected.

#### Post Journal Entry (POST)

Make a draft entry permanent (posted status).

```bash
POST /api/v1/accounting/journal-entries.php?action=post
Headers:
  Authorization: Bearer {token}
  X-Company-ID: {company_id}
  Content-Type: application/json

Body:
{
  "entry_id": "uuid"
}

Response:
{
  "success": true,
  "message": "Journal entry posted successfully"
}
```

### 3. Fixed Assets API

**Base URL**: `/api/v1/accounting/fixed-assets.php`

#### Create Fixed Asset (POST)

```bash
POST /api/v1/accounting/fixed-assets.php
Headers:
  Authorization: Bearer {token}
  X-Company-ID: {company_id}
  Content-Type: application/json

Body:
{
  "asset_name": "Dell Laptop",
  "asset_number": "COMP-001",
  "category": "computer_equipment",
  "acquisition_date": "2025-01-01",
  "acquisition_cost": 5000.00,
  "salvage_value": 500.00,
  "useful_life_years": 5,
  "depreciation_method": "straight_line",
  "status": "active"
}

Response:
{
  "success": true,
  "data": {
    "asset_id": "uuid"
  },
  "message": "Fixed asset created successfully"
}
```

#### Calculate Depreciation (POST)

```bash
POST /api/v1/accounting/fixed-assets.php?action=depreciate
Headers:
  Authorization: Bearer {token}
  X-Company-ID: {company_id}
  Content-Type: application/json

Body:
{
  "asset_id": "uuid",
  "period_date": "2025-01-31"
}

Response:
{
  "success": true,
  "data": {
    "depreciation": {
      "depreciation_amount": 75.00,
      "accumulated_depreciation": 75.00,
      "ending_book_value": 4925.00
    }
  }
}
```

### 4. Tax Codes API

**Base URL**: `/api/v1/accounting/tax-codes.php`

#### Create Tax Code (POST)

```bash
POST /api/v1/accounting/tax-codes.php
Headers:
  Authorization: Bearer {token}
  X-Company-ID: {company_id}
  Content-Type: application/json

Body:
{
  "code": "VAT_19",
  "name": "Standard VAT Rate",
  "tax_type": "vat",
  "rate": 19.00,
  "is_included_in_price": false,
  "is_active": true,
  "description": "Standard VAT rate for Romania"
}

Response:
{
  "success": true,
  "data": {
    "tax_code_id": "uuid"
  },
  "message": "Tax code created successfully"
}
```

### 5. Financial Reports API

**Base URL**: `/api/v1/accounting/reports.php`

#### Trial Balance (GET)

```bash
GET /api/v1/accounting/reports.php?type=trial_balance&as_of_date=2025-11-19
Headers:
  Authorization: Bearer {token}
  X-Company-ID: {company_id}

Response:
{
  "success": true,
  "data": {
    "report_type": "trial_balance",
    "report_data": [
      {
        "account_code": "1010",
        "account_name": "Cash",
        "debit_balance": 10000.00,
        "credit_balance": 0.00
      }
    ],
    "parameters": {
      "as_of_date": "2025-11-19"
    }
  }
}
```

#### Balance Sheet (GET)

```bash
GET /api/v1/accounting/reports.php?type=balance_sheet&as_of_date=2025-11-19
Headers:
  Authorization: Bearer {token}
  X-Company-ID: {company_id}

Response:
{
  "success": true,
  "data": {
    "report_type": "balance_sheet",
    "report_data": {
      "assets": 50000.00,
      "liabilities": 20000.00,
      "equity": 30000.00,
      "total_liabilities_and_equity": 50000.00
    }
  }
}
```

#### Income Statement (GET)

```bash
GET /api/v1/accounting/reports.php?type=income_statement&start_date=2025-01-01&end_date=2025-11-19
Headers:
  Authorization: Bearer {token}
  X-Company-ID: {company_id}

Response:
{
  "success": true,
  "data": {
    "report_type": "income_statement",
    "report_data": {
      "revenue": 100000.00,
      "expenses": 70000.00,
      "net_income": 30000.00
    },
    "parameters": {
      "start_date": "2025-01-01",
      "end_date": "2025-11-19"
    }
  }
}
```

---

## Usage Examples

### Example 1: Recording a Sale

```javascript
// Step 1: Create accounts (if not exists)
const cashAccount = await createAccount({
  code: "1010",
  name: "Cash",
  account_type: "asset",
  normal_balance: "debit"
});

const revenueAccount = await createAccount({
  code: "4010",
  name: "Service Revenue",
  account_type: "revenue",
  normal_balance: "credit"
});

// Step 2: Record the sale
const saleEntry = await createJournalEntry({
  entry_date: "2025-11-19",
  description: "Sale of services",
  reference_number: "INV-001",
  lines: [
    {
      account_id: cashAccount.id,
      line_type: "debit",
      amount: 1000.00,
      description: "Cash received"
    },
    {
      account_id: revenueAccount.id,
      line_type: "credit",
      amount: 1000.00,
      description: "Service revenue earned"
    }
  ]
});

// Step 3: Post the entry
await postJournalEntry(saleEntry.entry_id);
```

### Example 2: Recording Fixed Asset Purchase with Depreciation

```javascript
// Step 1: Create the fixed asset
const laptop = await createFixedAsset({
  asset_name: "MacBook Pro",
  asset_number: "COMP-001",
  category: "computer_equipment",
  acquisition_date: "2025-01-01",
  acquisition_cost: 3000.00,
  salvage_value: 300.00,
  useful_life_years: 3,
  depreciation_method: "straight_line"
});

// Step 2: Record the purchase
await createJournalEntry({
  entry_date: "2025-01-01",
  description: "Purchase of MacBook Pro",
  lines: [
    {
      account_id: fixedAssetAccountId,
      line_type: "debit",
      amount: 3000.00,
      description: "Computer equipment"
    },
    {
      account_id: cashAccountId,
      line_type: "credit",
      amount: 3000.00,
      description: "Cash paid"
    }
  ]
});

// Step 3: Calculate monthly depreciation
const depreciation = await calculateDepreciation({
  asset_id: laptop.asset_id,
  period_date: "2025-01-31"
});

// Step 4: Record depreciation expense
await createJournalEntry({
  entry_date: "2025-01-31",
  description: "Monthly depreciation - MacBook Pro",
  entry_type: "automatic",
  lines: [
    {
      account_id: depreciationExpenseAccountId,
      line_type: "debit",
      amount: depreciation.depreciation_amount,
      description: "Depreciation expense"
    },
    {
      account_id: accumulatedDepreciationAccountId,
      line_type: "credit",
      amount: depreciation.depreciation_amount,
      description: "Accumulated depreciation"
    }
  ]
});
```

### Example 3: Period-End Closing

```javascript
// Step 1: Generate financial reports
const trialBalance = await getTrialBalance("2025-12-31");
const balanceSheet = await getBalanceSheet("2025-12-31");
const incomeStatement = await getIncomeStatement("2025-01-01", "2025-12-31");

// Step 2: Close revenue accounts to income summary
const totalRevenue = calculateTotalRevenue(incomeStatement);
await createJournalEntry({
  entry_date: "2025-12-31",
  description: "Close revenue accounts",
  entry_type: "closing",
  lines: [
    {
      account_id: serviceRevenueAccountId,
      line_type: "debit",
      amount: totalRevenue,
      description: "Close revenue"
    },
    {
      account_id: incomeSummaryAccountId,
      line_type: "credit",
      amount: totalRevenue,
      description: "Transfer to income summary"
    }
  ]
});

// Step 3: Close expense accounts to income summary
const totalExpenses = calculateTotalExpenses(incomeStatement);
await createJournalEntry({
  entry_date: "2025-12-31",
  description: "Close expense accounts",
  entry_type: "closing",
  lines: [
    {
      account_id: incomeSummaryAccountId,
      line_type: "debit",
      amount: totalExpenses,
      description: "Transfer to income summary"
    },
    {
      account_id: expenseAccountsId,
      line_type: "credit",
      amount: totalExpenses,
      description: "Close expenses"
    }
  ]
});

// Step 4: Close income summary to retained earnings
const netIncome = totalRevenue - totalExpenses;
await createJournalEntry({
  entry_date: "2025-12-31",
  description: "Close income summary to retained earnings",
  entry_type: "closing",
  lines: [
    {
      account_id: incomeSummaryAccountId,
      line_type: "debit",
      amount: netIncome,
      description: "Close income summary"
    },
    {
      account_id: retainedEarningsAccountId,
      line_type: "credit",
      amount: netIncome,
      description: "Transfer to retained earnings"
    }
  ]
});
```

---

## Business Logic

### Double-Entry Validation

All journal entries MUST balance (debits = credits). The system validates this at two levels:

1. **Application Level** (AccountingService.php):
```php
$debitTotal = 0;
$creditTotal = 0;

foreach ($data['lines'] as $line) {
    if ($line['line_type'] === 'debit') {
        $debitTotal += $line['amount'];
    } else {
        $creditTotal += $line['amount'];
    }
}

if (abs($debitTotal - $creditTotal) > 0.01) {
    throw new Exception('Journal entry is not balanced');
}
```

2. **Database Level** (Trigger):
```sql
CREATE TRIGGER validate_journal_entry_balance
AFTER INSERT OR UPDATE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION validate_journal_entry_balance();
```

### Depreciation Calculation

#### Straight-Line Method

```
Annual Depreciation = (Cost - Salvage Value) / Useful Life
Monthly Depreciation = Annual Depreciation / 12
```

Example:
- Cost: $5,000
- Salvage: $500
- Life: 5 years
- Annual: ($5,000 - $500) / 5 = $900
- Monthly: $900 / 12 = $75

#### Double-Declining Balance Method

```
Annual Rate = (2 / Useful Life) × 100%
Annual Depreciation = Book Value × Annual Rate
Monthly Depreciation = Annual Depreciation / 12
```

Example:
- Cost: $10,000
- Life: 5 years
- Rate: (2 / 5) = 40%
- Year 1: $10,000 × 40% = $4,000
- Year 2: ($10,000 - $4,000) × 40% = $2,400

### Account Balance Calculation

Account balances are calculated based on the normal balance of the account type:

```
For Debit Normal Balance (Assets, Expenses):
  Balance = Total Debits - Total Credits

For Credit Normal Balance (Liabilities, Equity, Revenue):
  Balance = Total Credits - Total Debits
```

---

## Financial Reports

### Trial Balance

Lists all accounts with their debit and credit balances. Used to verify that total debits equal total credits.

**Formula:**
```
For each account:
  Debit Balance = SUM(debit entries) - SUM(credit entries) [if positive]
  Credit Balance = SUM(credit entries) - SUM(debit entries) [if positive]

Total Debits must equal Total Credits
```

### Balance Sheet

Shows financial position at a specific date.

**Formula:**
```
Assets = Liabilities + Equity

Assets:
  - Current Assets (Cash, Receivables, Inventory)
  - Fixed Assets (Property, Equipment)
  - Other Assets

Liabilities:
  - Current Liabilities (Payables, Short-term loans)
  - Long-term Liabilities (Mortgages, Bonds)

Equity:
  - Capital
  - Retained Earnings
  - Current Year Profit/Loss
```

### Income Statement (P&L)

Shows profitability over a period.

**Formula:**
```
Net Income = Total Revenue - Total Expenses

Revenue:
  - Sales Revenue
  - Service Revenue
  - Other Income

Expenses:
  - Cost of Goods Sold
  - Operating Expenses
  - Depreciation
  - Interest
  - Taxes
```

### Cash Flow Statement

Shows cash movements categorized by activity.

**Formula:**
```
Net Cash Flow = Operating + Investing + Financing

Operating Activities:
  - Cash from customers
  - Cash paid to suppliers
  - Cash paid for expenses

Investing Activities:
  - Purchase/sale of fixed assets
  - Investment purchases/sales

Financing Activities:
  - Loans received/repaid
  - Capital contributions
  - Dividends paid
```

---

## Integration Guide

### Frontend Integration

```javascript
// Example React component
import { useState, useEffect } from 'react';

function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/v1/accounting/chart-of-accounts.php', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId
        }
      });
      const data = await response.json();
      setAccounts(data.data.accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (accountData) => {
    const response = await fetch('/api/v1/accounting/chart-of-accounts.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Company-ID': companyId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(accountData)
    });

    if (response.ok) {
      fetchAccounts(); // Refresh list
    }
  };

  return (
    <div>
      <h1>Chart of Accounts</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <AccountTree accounts={accounts} />
      )}
    </div>
  );
}
```

### Backend Integration

```php
// Example: Automatically create journal entry when invoice is paid
class InvoiceService {
    private $accountingService;

    public function recordPayment($invoiceId, $paymentAmount) {
        $invoice = $this->getInvoice($invoiceId);

        // Create journal entry
        $journalEntry = [
            'entry_date' => date('Y-m-d'),
            'description' => "Payment for invoice #{$invoice['number']}",
            'entry_type' => 'automatic',
            'reference_number' => $invoice['number'],
            'lines' => [
                [
                    'account_id' => $this->getCashAccountId(),
                    'line_type' => 'debit',
                    'amount' => $paymentAmount,
                    'description' => 'Cash received'
                ],
                [
                    'account_id' => $this->getAccountsReceivableId(),
                    'line_type' => 'credit',
                    'amount' => $paymentAmount,
                    'description' => 'Accounts receivable'
                ]
            ]
        ];

        $entryId = $this->accountingService->createJournalEntry(
            $invoice['company_id'],
            $invoice['user_id'],
            $journalEntry
        );

        // Post immediately for automatic entries
        $this->accountingService->postJournalEntry(
            $entryId,
            $invoice['company_id'],
            $invoice['user_id']
        );

        return $entryId;
    }
}
```

---

## Best Practices

### 1. Account Numbering Convention

Use a consistent numbering system:

```
1000-1999: Assets
  1000-1099: Current Assets
  1100-1199: Fixed Assets
  1200-1299: Other Assets

2000-2999: Liabilities
  2000-2099: Current Liabilities
  2100-2199: Long-term Liabilities

3000-3999: Equity
  3000-3099: Owner's Equity
  3100-3199: Retained Earnings

4000-4999: Revenue
  4000-4099: Sales Revenue
  4100-4199: Service Revenue

5000-5999: Expenses
  5000-5099: Cost of Goods Sold
  5100-5199: Operating Expenses
  5200-5299: Administrative Expenses
```

### 2. Journal Entry Descriptions

Be descriptive and include reference numbers:

✅ Good: "Payment received for Invoice #INV-2025-001"
❌ Bad: "Payment"

### 3. Regular Reconciliation

- Reconcile bank accounts monthly
- Refresh materialized views after posting entries
- Review trial balance before closing periods

### 4. Period Closing Process

1. Generate preliminary reports
2. Record adjusting entries
3. Review trial balance
4. Close temporary accounts
5. Lock the period
6. Generate final reports

---

## Troubleshooting

### Common Issues

#### 1. Journal Entry Won't Balance

**Error**: "Journal entry is not balanced: debits=1000.00, credits=900.00"

**Solution**: Ensure total debits equal total credits within $0.01 tolerance.

#### 2. Cannot Post Entry

**Error**: "Entry is already posted"

**Solution**: Entries can only be posted once. Create a reversing entry if needed.

#### 3. Depreciation Calculation Error

**Error**: "Book value cannot be negative"

**Solution**: Ensure salvage value is less than acquisition cost and depreciation hasn't exceeded depreciable amount.

### Performance Optimization

1. **Refresh Materialized Views**:
```sql
REFRESH MATERIALIZED VIEW account_balances;
```

2. **Index Optimization**: Ensure indexes exist on frequently queried columns
3. **Batch Operations**: Group multiple journal entries in transactions

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Company-level access control enforced
3. **Audit Trail**: All entries track creator and modification timestamp
4. **Data Isolation**: Multi-tenant design prevents cross-company data access
5. **Input Validation**: All monetary values validated and sanitized

---

## Support

For technical support or questions:
- Documentation: `/docs/ADVANCED_ACCOUNTING_MODULE.md`
- API Reference: This document
- Database Schema: `/database/migrations/003_advanced_accounting_module.sql`
- Service Code: `/api/services/AccountingService.php`

---

**Version**: 1.0.0
**Last Updated**: 2025-11-19
**Module Status**: Production Ready (Pending Test Suite Fix)
