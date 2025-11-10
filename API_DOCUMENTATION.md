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

**API Version:** 1.0
**Last Updated:** 2025-11-10
**Status:** Active Development - 50% Complete
