# AccounTech AI - API Documentation

## Base URL
`https://documentiulia.ro/api/v1`

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Multi-Company Support
Protected endpoints require a company context via header:
```
X-Company-ID: <company_uuid>
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

---

### Login
**POST** `/auth/login`

Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user"
    },
    "companies": [
      {
        "id": "uuid",
        "name": "My Company",
        "role": "owner"
      }
    ]
  }
}
```

---

## Company Management

### Create Company
**POST** `/companies/create`

Create a new company with default chart of accounts.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "company_name": "My Business Ltd",
  "industry": "Technology",
  "currency": "USD"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Company created successfully",
  "data": {
    "company_id": "uuid",
    "name": "My Business Ltd"
  }
}
```

**Note:** Automatically creates 15 default accounts:
- Assets (Cash, Accounts Receivable, Inventory)
- Liabilities (Accounts Payable, Credit Cards)
- Equity (Owner Equity)
- Revenue (Sales, Service Revenue)
- Expenses (COGS, Operating, Salaries, Rent, Utilities, Marketing, Supplies)

---

## Invoice Management

### Create Invoice
**POST** `/invoices/create`

Create a new invoice with line items.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Request Body:**
```json
{
  "customer_id": "uuid",
  "invoice_number": "INV-000001",
  "invoice_date": "2025-11-10",
  "due_date": "2025-12-10",
  "payment_terms": 30,
  "currency": "USD",
  "tax_amount": 50.00,
  "discount_amount": 0,
  "notes": "Thank you for your business",
  "line_items": [
    {
      "description": "Web Development Services",
      "quantity": 40,
      "unit_price": 100.00
    },
    {
      "description": "Hosting (1 year)",
      "quantity": 1,
      "unit_price": 500.00
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Invoice created successfully",
  "data": {
    "id": "uuid",
    "invoice_number": "INV-000001",
    "customer_name": "Customer Name",
    "customer_email": "customer@example.com",
    "invoice_date": "2025-11-10",
    "due_date": "2025-12-10",
    "status": "draft",
    "subtotal": 4500.00,
    "tax_amount": 50.00,
    "discount_amount": 0,
    "total_amount": 4550.00,
    "amount_paid": 0,
    "amount_due": 4550.00,
    "line_items": [
      {
        "line_number": 1,
        "description": "Web Development Services",
        "quantity": 40,
        "unit_price": 100.00,
        "amount": 4000.00
      },
      {
        "line_number": 2,
        "description": "Hosting (1 year)",
        "quantity": 1,
        "unit_price": 500.00,
        "amount": 500.00
      }
    ]
  }
}
```

---

### List Invoices
**GET** `/invoices/list`

Get list of invoices with filtering and statistics.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `status` - Filter by status (draft, sent, partial, paid, overdue)
- `customer_id` - Filter by customer
- `from_date` - Filter from date (YYYY-MM-DD)
- `to_date` - Filter to date (YYYY-MM-DD)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

**Example:**
```
GET /invoices/list?status=sent&limit=10&offset=0
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "invoice_number": "INV-000001",
      "customer_name": "Customer Name",
      "invoice_date": "2025-11-10",
      "due_date": "2025-12-10",
      "status": "sent",
      "total_amount": 4550.00,
      "amount_paid": 0,
      "amount_due": 4550.00
    }
  ],
  "stats": {
    "total_invoices": 45,
    "draft_count": 5,
    "sent_count": 15,
    "partial_count": 8,
    "paid_count": 17,
    "overdue_count": 0,
    "total_billed": 125000.00,
    "total_paid": 95000.00,
    "total_outstanding": 30000.00
  },
  "filters": {
    "status": "sent",
    "limit": 10,
    "offset": 0
  }
}
```

---

## Contact Management

### Create Contact
**POST** `/contacts/create`

Create a customer, vendor, employee, or contractor.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Request Body:**
```json
{
  "contact_type": "customer",
  "display_name": "Acme Corporation",
  "email": "billing@acme.com",
  "phone": "+1-555-0123",
  "payment_terms": 30,
  "currency": "USD"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "contact_type": "customer",
    "display_name": "Acme Corporation",
    "email": "billing@acme.com",
    "phone": "+1-555-0123",
    "payment_terms": 30,
    "currency": "USD",
    "is_active": true
  }
}
```

---

### List Contacts
**GET** `/contacts/list`

Get list of contacts with filtering.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `contact_type` - Filter by type (customer, vendor, employee, contractor)
- `is_active` - Filter by active status (true/false)
- `search` - Search by name or email
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)

**Example:**
```
GET /contacts/list?contact_type=customer&search=acme
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "contact_type": "customer",
      "display_name": "Acme Corporation",
      "email": "billing@acme.com",
      "is_active": true
    }
  ]
}
```

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Error description"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authorization required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## AI Insights & Decision Support

### List Insights
**GET** `/insights/list`

Get active AI-generated insights for your business.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `limit` - Number of results (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "id": "uuid",
        "insight_type": "warning",
        "category": "cash_flow",
        "priority": "critical",
        "title": "Critical Cash Runway",
        "message": "You have only 3.5 months of cash runway at current burn rate. Immediate action needed to reduce expenses or increase revenue.",
        "action_label": "Create Action Plan",
        "action_url": "/dashboard/cash-flow",
        "is_dismissed": false,
        "created_at": "2025-11-10T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

**Insight Types:**
- `warning` - Critical business issues
- `success` - Positive trends and achievements
- `info` - Informational insights

**Categories:**
- `cash_flow` - Cash runway and burn rate
- `invoice` - Receivables and collections
- `bill` - Payables and vendor payments
- `revenue` - Revenue trends
- `expense` - Expense patterns

---

### Generate Insights
**POST** `/insights/generate`

Regenerate all AI insights based on current financial data.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "insights": [...],
    "total_generated": 5,
    "generated_at": "2025-11-10 10:30:00"
  },
  "message": "5 insights generated successfully"
}
```

---

### Dismiss Insight
**POST** `/insights/dismiss`

Dismiss an insight (won't show again for 7 days).

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Request Body:**
```json
{
  "insight_id": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Insight dismissed successfully"
}
```

---

## AI Cash Flow Forecasting

### Get Cash Flow Forecast
**GET** `/forecasting/cash-flow`

Get stored cash flow forecast.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `from_date` - Start date (YYYY-MM-DD, optional)
- `to_date` - End date (YYYY-MM-DD, optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "forecast": [
      {
        "forecast_date": "2025-12-01",
        "period": "2025-12",
        "forecasted_inflow": 15000.00,
        "forecasted_outflow": 12000.00,
        "forecasted_net": 3000.00,
        "forecasted_balance": 28000.00,
        "confidence_level": 95
      },
      {
        "forecast_date": "2026-01-01",
        "period": "2026-01",
        "forecasted_inflow": 15450.00,
        "forecasted_outflow": 12300.00,
        "forecasted_net": 3150.00,
        "forecasted_balance": 31150.00,
        "confidence_level": 92
      }
    ],
    "total_periods": 12,
    "date_range": {
      "from": null,
      "to": null
    }
  }
}
```

---

### Generate Cash Flow Forecast
**POST** `/forecasting/generate`

Generate a new AI-powered cash flow forecast.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Request Body:**
```json
{
  "periods": 12,
  "period_type": "monthly"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "forecast": [...],
    "periods": 12,
    "period_type": "monthly",
    "generated_at": "2025-11-10 10:30:00"
  },
  "message": "Forecast generated successfully"
}
```

**Algorithm:**
- Uses 12 months of historical data
- Linear regression for trend analysis
- Seasonality detection for patterns
- Confidence scoring (95% → 50% over 12 months)

---

### Get Cash Runway
**GET** `/forecasting/runway`

Calculate months of runway at current burn rate.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "runway_months": 14.5,
    "current_balance": 25000.00,
    "monthly_burn": 1724.14,
    "avg_monthly_inflow": 15000.00,
    "avg_monthly_outflow": 16724.14,
    "status": "healthy",
    "message": "Healthy: 14.5 months of runway. Cash position is strong."
  }
}
```

**Status Levels:**
- `positive` - Profitable, infinite runway
- `healthy` - 12+ months runway
- `warning` - 6-12 months runway
- `critical` - <6 months runway

---

## AI Decision Support

### Create Decision Scenario
**POST** `/decisions/create`

Generate AI-powered decision analysis.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Request Body:**
```json
{
  "scenario_type": "hiring",
  "context": {
    "salary": 5000
  }
}
```

**Scenario Types:**
- `hiring` - Should you hire? (full-time vs contractor vs wait)
- `pricing` - Pricing strategy analysis (coming soon)
- `expansion` - Business expansion analysis (coming soon)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "scenario_type": "hiring",
    "title": "Should you hire a new team member?",
    "context": "Current runway: 14.5 months, Monthly revenue: $15,000.00",
    "options": [
      {
        "title": "Hire Full-Time",
        "pros": [
          "Long-term capacity increase",
          "Better team cohesion",
          "Knowledge retention"
        ],
        "cons": [
          "Fixed cost increase: $5,000.00/month",
          "Longer hiring process",
          "Commitment risk"
        ],
        "impact": "Reduces runway from 14.5 to 11.2 months",
        "recommendation": "Recommended if revenue trend continues"
      },
      {
        "title": "Hire Contractor",
        "pros": [
          "Flexible commitment",
          "Quick start",
          "Lower fixed costs"
        ],
        "cons": [
          "Higher hourly rate",
          "Less integration",
          "Knowledge transfer risk"
        ],
        "impact": "Variable cost, minimal runway impact",
        "recommendation": "Safe option for testing demand"
      },
      {
        "title": "Wait 2-3 Months",
        "pros": [
          "More data on revenue trend",
          "Better cash position",
          "Reduced risk"
        ],
        "cons": [
          "Potential opportunity cost",
          "Team burnout risk",
          "Market timing risk"
        ],
        "impact": "Extends runway, preserves capital",
        "recommendation": "Conservative approach"
      }
    ],
    "ai_recommendation": "Based on your financials, hiring is viable. Recommend starting with a contractor to validate need."
  },
  "message": "Decision scenario generated successfully"
}
```

---

### List Decision Scenarios
**GET** `/decisions/list`

Get previously generated decision scenarios.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `scenario_type` - Filter by type (optional)
- `limit` - Number of results (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "scenarios": [
      {
        "id": "uuid",
        "scenario_type": "hiring",
        "title": "Should you hire a new team member?",
        "context": "Current runway: 14.5 months, Monthly revenue: $15,000.00",
        "options": [...],
        "ai_recommendation": "...",
        "created_at": "2025-11-10T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

---

## Coming Soon

### Bills & Payables
- ✅ Create/list/update bills (COMPLETED)
- ✅ Record vendor payments (COMPLETED)
- ✅ Aged payables report (COMPLETED)

### Payments
- ✅ Record invoice payments (COMPLETED)
- ✅ Payment allocation (COMPLETED)
- Payment methods integration

### Expenses
- ✅ Create expenses with receipt upload (COMPLETED)
- OCR for receipt data extraction
- ✅ Expense categorization (AI-powered) (COMPLETED)
- Billable expenses

### Reports
- ✅ Profit & Loss (COMPLETED)
- ✅ Balance Sheet (COMPLETED)
- ✅ Cash Flow Statement (COMPLETED)
- ✅ Aged Receivables/Payables (COMPLETED)
- Custom report builder

### Bank Reconciliation
- Bank account connections (Plaid integration)
- Transaction import
- Auto-matching
- Reconciliation reports

### Payment Integrations
- Stripe integration
- PayPal integration
- Direct bank transfers

### React Frontend
- Dashboard with charts
- Invoice management UI
- Expense management UI
- Financial reports UI
- AI insights interface

---

## HR & Payroll Module

### List Employees
**GET** `/hr/employees/list`

Get list of employees with filtering.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `status` - Filter by status (active, inactive, terminated)
- `department` - Filter by department
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@company.com",
      "department": "Engineering",
      "position": "Software Developer",
      "hire_date": "2024-01-15",
      "salary": 5000.00,
      "status": "active"
    }
  ]
}
```

---

### List Payroll Periods
**GET** `/hr/payroll/list`

Get payroll periods with payment status.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `year` - Filter by year (default: current year)
- `status` - Filter by status (pending, processed, paid)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "period_start": "2025-11-01",
      "period_end": "2025-11-30",
      "status": "pending",
      "total_gross": 25000.00,
      "total_deductions": 5000.00,
      "total_net": 20000.00
    }
  ]
}
```

---

## Inventory Module

### List Products
**GET** `/inventory/products`

Get list of products/items.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `type` - Filter by type (product, service)
- `is_active` - Filter by active status
- `search` - Search by name or SKU
- `category_id` - Filter by category

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Widget Pro",
      "sku": "WID-001",
      "type": "product",
      "unit_price": 29.99,
      "cost_price": 15.00,
      "quantity_on_hand": 150,
      "reorder_point": 20,
      "is_active": true
    }
  ]
}
```

---

### List Warehouses
**GET** `/inventory/warehouses`

Get list of warehouse locations.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Main Warehouse",
      "address": "123 Industrial Ave",
      "is_default": true,
      "is_active": true
    }
  ]
}
```

---

### List Stock Movements
**GET** `/inventory/stock-movements`

Get stock movement history.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `product_id` - Filter by product
- `warehouse_id` - Filter by warehouse
- `movement_type` - Filter by type (in, out, transfer, adjustment)
- `from_date` - Start date filter
- `to_date` - End date filter

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "Widget Pro",
      "warehouse_id": "uuid",
      "movement_type": "in",
      "quantity": 100,
      "reference": "PO-001",
      "created_at": "2025-11-15T10:00:00Z"
    }
  ]
}
```

---

## CRM Module

### List CRM Contacts
**GET** `/crm/contacts`

Get all CRM contacts with relationship data.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "display_name": "Acme Corp",
      "email": "contact@acme.com",
      "phone": "+1-555-0123",
      "contact_type": "customer",
      "total_revenue": 15000.00,
      "last_interaction": "2025-11-10"
    }
  ]
}
```

---

### List Leads
**GET** `/crm/leads`

Get sales leads with status tracking.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `status` - Filter by status (new, contacted, qualified, converted, lost)
- `source` - Filter by source
- `assigned_to` - Filter by assigned user

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "company_name": "Potential Client Inc",
      "contact_name": "Jane Smith",
      "email": "jane@potential.com",
      "status": "qualified",
      "source": "website",
      "estimated_value": 50000.00,
      "created_at": "2025-11-01"
    }
  ]
}
```

---

### Opportunities CRUD
**GET/POST/PUT/DELETE** `/crm/opportunities`

Full CRUD operations for sales opportunities.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Create Request Body (POST):**
```json
{
  "name": "Enterprise Deal",
  "contact_id": "uuid",
  "stage": "proposal",
  "amount": 100000.00,
  "probability": 60,
  "expected_close_date": "2025-12-31",
  "notes": "Large enterprise opportunity"
}
```

**Stages:** new, qualification, proposal, negotiation, closed_won, closed_lost

**Response (200/201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Enterprise Deal",
    "stage": "proposal",
    "amount": 100000.00,
    "probability": 60,
    "weighted_value": 60000.00,
    "expected_close_date": "2025-12-31"
  }
}
```

---

## Accounting Module

### Chart of Accounts
**GET** `/accounting/chart-of-accounts`

Get full chart of accounts.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "account_code": "1000",
      "account_name": "Cash",
      "account_type": "asset",
      "parent_id": null,
      "is_active": true,
      "balance": 25000.00
    }
  ]
}
```

---

### Journal Entries
**GET** `/accounting/journal-entries/list`

Get journal entry list.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `from_date` - Start date
- `to_date` - End date
- `status` - Filter by status (draft, posted)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "entry_number": "JE-0001",
      "entry_date": "2025-11-15",
      "description": "Monthly depreciation",
      "status": "posted",
      "lines": [
        {"account": "Depreciation Expense", "debit": 500.00, "credit": 0},
        {"account": "Accumulated Depreciation", "debit": 0, "credit": 500.00}
      ]
    }
  ]
}
```

---

### Accounting Reports
**GET** `/accounting/reports`

Get accounting reports.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `type` - Report type: `trial_balance`, `balance_sheet`, `income_statement`
- `from_date` - Start date
- `to_date` - End date

**Response (200) - Trial Balance:**
```json
{
  "success": true,
  "data": {
    "report_type": "trial_balance",
    "as_of_date": "2025-11-30",
    "accounts": [
      {"account": "Cash", "debit": 25000.00, "credit": 0},
      {"account": "Accounts Receivable", "debit": 15000.00, "credit": 0},
      {"account": "Accounts Payable", "debit": 0, "credit": 8000.00}
    ],
    "totals": {"debit": 95000.00, "credit": 95000.00}
  }
}
```

---

## Banking Module

### Bank Accounts
**GET** `/bank/accounts`

Get linked bank accounts.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "account_name": "Business Checking",
      "account_number_last4": "1234",
      "bank_name": "First National Bank",
      "current_balance": 45000.00,
      "currency": "USD",
      "is_active": true
    }
  ]
}
```

---

### Bank Transactions
**GET** `/bank/transactions`

Get bank transactions for reconciliation.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `account_id` - Filter by bank account
- `status` - Filter by status (pending, matched, reconciled)
- `from_date` - Start date
- `to_date` - End date

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "transaction_date": "2025-11-15",
      "description": "Payment from Client ABC",
      "amount": 5000.00,
      "type": "credit",
      "status": "pending",
      "matched_invoice_id": null
    }
  ]
}
```

---

## Project Management Module

### Projects
**GET** `/projects/list`

Get list of projects.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `status` - Filter by status (active, completed, on_hold, cancelled)
- `client_id` - Filter by client

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Website Redesign",
      "client_id": "uuid",
      "client_name": "Acme Corp",
      "status": "active",
      "start_date": "2025-11-01",
      "end_date": "2025-12-31",
      "budget": 25000.00,
      "progress": 45
    }
  ]
}
```

---

### Tasks
**GET/POST/PUT/DELETE** `/tasks/*`

Full CRUD for project tasks.

**Endpoints:**
- `GET /tasks/list` - List tasks
- `POST /tasks/create` - Create task
- `PUT /tasks/update` - Update task
- `DELETE /tasks/delete` - Delete task

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Create Request Body:**
```json
{
  "title": "Design homepage mockup",
  "project_id": "uuid",
  "assignee_id": "uuid",
  "status": "todo",
  "priority": "high",
  "due_date": "2025-11-20",
  "estimated_hours": 8,
  "description": "Create initial mockup for client review"
}
```

**Status Values:** todo, in_progress, review, done
**Priority Values:** low, medium, high, urgent

**Response (200/201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Design homepage mockup",
    "status": "todo",
    "priority": "high",
    "due_date": "2025-11-20"
  }
}
```

---

### Sprints
**GET** `/sprints/list`

Get sprints for agile project management.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `project_id` - Filter by project
- `status` - Filter by status (planned, active, completed)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Sprint 1",
      "project_id": "uuid",
      "start_date": "2025-11-01",
      "end_date": "2025-11-14",
      "status": "active",
      "goal": "Complete homepage design",
      "total_points": 21,
      "completed_points": 13
    }
  ]
}
```

---

### Epics
**GET** `/epics/list`

Get epics for large feature tracking.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "User Authentication System",
      "project_id": "uuid",
      "status": "in_progress",
      "total_tasks": 15,
      "completed_tasks": 8,
      "progress": 53
    }
  ]
}
```

---

## Time Tracking Module

### Time Entries
**GET/POST** `/time/entries`

Track time spent on tasks and projects.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Create Request Body (POST):**
```json
{
  "task_id": "uuid",
  "project_id": "uuid",
  "date": "2025-11-15",
  "hours": 4.5,
  "description": "Worked on homepage design",
  "is_billable": true
}
```

**Response (200/201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "task_id": "uuid",
    "project_id": "uuid",
    "date": "2025-11-15",
    "hours": 4.5,
    "is_billable": true,
    "billable_amount": 450.00
  }
}
```

---

### Time Reports
**GET** `/time/reports`

Get time tracking reports.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `from_date` - Start date
- `to_date` - End date
- `project_id` - Filter by project
- `user_id` - Filter by user
- `group_by` - Group by (project, user, task, date)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_hours": 160,
    "billable_hours": 120,
    "non_billable_hours": 40,
    "total_billable_amount": 12000.00,
    "breakdown": [
      {"project": "Website Redesign", "hours": 80, "amount": 8000.00},
      {"project": "Mobile App", "hours": 40, "amount": 4000.00}
    ]
  }
}
```

---

## Expenses Module (Extended)

### Smart Suggestions
**GET** `/expenses/smart-suggestions`

Get AI-powered expense category suggestions based on vendor history.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `vendor_id` - Vendor UUID (required)
- `vendor_name` - Alternative: vendor name search
- `amount` - Transaction amount for better matching

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vendor": {
      "id": "uuid",
      "name": "Office Depot",
      "email": "orders@officedepot.com"
    },
    "top_suggestion": {
      "category": "Office Supplies",
      "expense_type": "operating",
      "confidence": 87.5,
      "usage_count": 12,
      "avg_amount": 145.50,
      "reason": "Used 12 times previously, Recently used"
    },
    "all_suggestions": [...],
    "available_categories": ["Office Supplies", "Equipment", "Marketing"],
    "total_historical_transactions": 15
  }
}
```

---

### Custom Categories
**GET** `/expenses/custom-categories`

Get custom expense categories for the company.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Software Subscriptions",
      "parent_category": "Operating Expenses",
      "is_active": true
    }
  ]
}
```

---

## Fiscal Calendar Module

### Deadlines
**GET** `/fiscal-calendar/deadlines`

Get upcoming fiscal deadlines and tax dates.

**Headers:**
```
Authorization: Bearer <token>
X-Company-ID: <company_uuid>
```

**Query Parameters:**
- `year` - Filter by year
- `type` - Filter by type (tax, report, filing)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Q4 VAT Return",
      "deadline_date": "2026-01-25",
      "type": "tax",
      "status": "upcoming",
      "days_remaining": 60,
      "notes": "Submit quarterly VAT declaration"
    }
  ]
}
```

---

## Courses Module

### List Courses
**GET** `/courses/list`

Get available training courses.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Financial Basics for SMBs",
      "description": "Learn essential financial management",
      "duration_hours": 4,
      "is_free": true,
      "enrollment_count": 150
    }
  ]
}
```

---

## Security Notes

### Input Validation
- All text inputs are sanitized using `htmlspecialchars()` to prevent XSS
- Email inputs are validated with `filter_var(FILTER_SANITIZE_EMAIL)`
- UUID parameters are validated with regex before database queries
- SQL queries use prepared statements to prevent injection

### Authentication
- JWT tokens expire after 30 days
- Tokens are validated on every request
- Invalid tokens return 401 Unauthorized
- Multi-tenant isolation enforced via company_id

### Rate Limiting
- API endpoints are rate-limited to prevent abuse
- Default: 100 requests per minute per user
- Exceeding limits returns 429 Too Many Requests

---

**API Version:** 1.0
**Last Updated:** 2025-11-29
**Status:** Active Development - 96% Complete
**Health Score:** 96% (48 pass, 2 warnings)
