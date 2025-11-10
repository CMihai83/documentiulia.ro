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

## Coming Soon

### Bills & Payables
- Create/list/update bills
- Record vendor payments
- Aged payables report

### Payments
- Record invoice payments
- Payment allocation
- Payment methods

### Expenses
- Create expenses with receipt upload
- OCR for receipt data extraction
- Expense categorization (AI-powered)
- Billable expenses

### Reports
- Profit & Loss
- Balance Sheet
- Cash Flow Statement
- Aged Receivables/Payables
- Custom report builder

### Bank Reconciliation
- Bank account connections
- Transaction import
- Auto-matching
- Reconciliation reports

### AI Features
- Cash flow forecasting
- Smart prompts
- Decision support
- Anomaly detection
- Predictive insights

---

**API Version:** 1.0
**Last Updated:** 2025-11-10
**Status:** Active Development
