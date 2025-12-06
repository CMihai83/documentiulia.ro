# Documentiulia.ro - Comprehensive End-to-End Testing Plan

**Document Version:** 1.0
**Created:** November 28, 2025
**Platform:** Documentiulia.ro - Romanian Accounting & Business Management Platform
**Base URL:** https://documentiulia.ro

---

## Platform Overview

Documentiulia.ro is a comprehensive Romanian accounting and business management SaaS platform featuring:

| Module | Description |
|--------|-------------|
| **Accounting** | Invoices, Bills, Expenses, Payments, Chart of Accounts, Journal Entries |
| **CRM** | Contacts, Leads, Opportunities, Quotations, Sales Pipeline |
| **Inventory** | Products, Warehouses, Stock Management, Purchase Orders |
| **HR & Payroll** | Employees, Time Tracking, Payroll Processing |
| **Projects** | Project Management, Tasks, Sprints, Kanban Boards |
| **E-Factura** | ANAF Integration, XML Generation, SPV Connection |
| **Fiscal** | Fiscal Calendar, Declarations, Tax Management |
| **Education** | Courses (LMS), MBA Frameworks, Decision Trees |
| **Bank** | Bank Connections (Open Banking), Reconciliation |
| **AI Consulting** | Fiscal AI, Business Consulting, Context-Aware Advice |

---

## Key User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Guest** | Unauthenticated visitor | Landing page, Login, Register, Public pages only |
| **User** | Regular authenticated user | Own data, assigned projects, limited settings |
| **Manager** | Department/Team manager | Team data, approval workflows, reports |
| **Admin** | System administrator | Full access, company settings, user management |

### Test Credentials
```
Admin:   test_admin@accountech.com   / TestPass123!
Manager: test_manager@accountech.com / TestPass123!
User:    test_user@accountech.com    / TestPass123!
```

---

# PART 1: Testing Strategy & Scope

## 1.1 E2E Testing Approach

This testing plan integrates **Frontend UI Actions** with **Backend Validations** to ensure:

1. **User Interface Testing**: Simulating real user interactions (clicks, form entries, navigation)
2. **API Validation**: Verifying correct HTTP responses, status codes, and data integrity
3. **Database Verification**: Confirming data persistence and state changes
4. **Session Management**: Testing authentication flows and token handling
5. **Cross-Module Integration**: Ensuring data flows correctly between modules

### Testing Methodology

```
┌─────────────────────────────────────────────────────────────────┐
│                    E2E TEST EXECUTION FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. FRONTEND ACTION                                              │
│     └─→ Navigate to page                                         │
│     └─→ Fill forms                                               │
│     └─→ Click buttons                                            │
│     └─→ Wait for UI response                                     │
│                                                                  │
│  2. UI VALIDATION                                                │
│     └─→ Check visual elements                                    │
│     └─→ Verify redirects                                         │
│     └─→ Confirm success/error messages                           │
│     └─→ Validate form state                                      │
│                                                                  │
│  3. API VALIDATION                                               │
│     └─→ Capture network requests                                 │
│     └─→ Verify HTTP status codes (200, 201, 400, 401, etc.)      │
│     └─→ Validate response payload structure                      │
│     └─→ Check headers (Content-Type, Authorization)              │
│                                                                  │
│  4. DATABASE VALIDATION                                          │
│     └─→ Query database for expected records                      │
│     └─→ Verify data integrity                                    │
│     └─→ Check timestamps and audit fields                        │
│     └─→ Validate relationships/foreign keys                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 1.2 Major Application Flows to Test

### Critical User Journeys

| Priority | Flow Name | Description |
|----------|-----------|-------------|
| P0 | User Registration → First Login | New user signs up, verifies email, logs in |
| P0 | Guest → Invoice Creation → Payment | Complete sales cycle |
| P0 | Receipt Upload → Expense → Report | Expense management flow |
| P0 | Login → Dashboard Access | Authentication and session management |
| P1 | Lead → Opportunity → Quotation → Invoice | Full CRM sales pipeline |
| P1 | Product Create → Stock In → Sale → Stock Out | Inventory lifecycle |
| P1 | Employee Onboard → Time Track → Payslip | HR complete flow |
| P1 | Invoice → E-Factura → ANAF Submission | E-invoicing compliance |
| P2 | Project Create → Sprint → Task → Complete | Project management |
| P2 | Course Enroll → Lessons → Quiz → Certificate | LMS flow |
| P2 | Bank Connect → Transactions → Reconcile | Banking integration |

---

# PART 2: Detailed Test Scenarios & Steps

---

## CATEGORY A: User Authentication & Authorization

### A1: Successful User Login

**Scenario:** A registered user logs in with valid credentials

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to `https://documentiulia.ro/login` | Login page loads with email/password fields |
| 2 | Enter email: `test_admin@accountech.com` | Email field populated, no validation errors |
| 3 | Enter password: `TestPass123!` | Password field masked with dots |
| 4 | Click "Autentificare" (Login) button | Button shows loading state |
| 5 | Wait for response | Redirect to `/dashboard` |

**Backend Validation:**
```bash
# API Request
POST /api/v1/auth/login.php
Content-Type: application/json
{"email":"test_admin@accountech.com","password":"TestPass123!"}

# Expected Response (200 OK)
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "test_admin@accountech.com",
    "role": "admin"
  },
  "companies": [...]
}

# Database Check
SELECT id, email, last_login FROM users WHERE email = 'test_admin@accountech.com';
-- Verify last_login is updated to current timestamp
```

---

### A2: Failed Login - Invalid Credentials

**Scenario:** User attempts login with wrong password

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to login page | Page loads correctly |
| 2 | Enter email: `test_admin@accountech.com` | Email field populated |
| 3 | Enter password: `WrongPassword123!` | Password field populated |
| 4 | Click "Autentificare" button | Button shows loading state |
| 5 | Wait for response | Error message: "Credențiale invalide" |

**Backend Validation:**
```bash
# API Response (401 Unauthorized)
{
  "success": false,
  "error": "Invalid email or password"
}

# Database Check
SELECT failed_login_attempts FROM users WHERE email = 'test_admin@accountech.com';
-- failed_login_attempts should increment
```

---

### A3: User Registration Flow

**Scenario:** New user creates an account

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to `/register` | Registration form displayed |
| 2 | Enter first name: "Ion" | Field validated |
| 3 | Enter last name: "Popescu" | Field validated |
| 4 | Enter email: `ion.popescu.test@example.com` | Email format validated |
| 5 | Enter password: `SecurePass123!` | Password strength indicator shown |
| 6 | Confirm password: `SecurePass123!` | Passwords match validation passes |
| 7 | Accept terms checkbox | Checkbox checked |
| 8 | Click "Înregistrare" button | Success message displayed |

**Backend Validation:**
```bash
# API Request
POST /api/v1/auth/register.php
{
  "first_name": "Ion",
  "last_name": "Popescu",
  "email": "ion.popescu.test@example.com",
  "password": "SecurePass123!"
}

# Expected Response (201 Created)
{
  "success": true,
  "message": "Account created successfully",
  "user_id": "uuid"
}

# Database Check
SELECT id, first_name, last_name, status, password_hash
FROM users WHERE email = 'ion.popescu.test@example.com';
-- Verify password_hash is bcrypt hashed (starts with $2y$)
-- Verify status is 'pending' or 'active'
```

---

### A4: Token-Based Authorization

**Scenario:** Verify protected routes require valid JWT

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Clear browser localStorage/sessionStorage | Storage cleared |
| 2 | Navigate directly to `/dashboard` | Redirect to `/login` |
| 3 | Check for auth error message | "Please log in to continue" shown |

**Backend Validation:**
```bash
# API Request without token
GET /api/v1/invoices/list.php
# No Authorization header

# Expected Response (401 Unauthorized)
{
  "success": false,
  "error": "Unauthorized - No token provided"
}
```

---

### A5: Role-Based Access Control

**Scenario:** Regular user cannot access admin-only features

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Login as `test_user@accountech.com` | Dashboard loads |
| 2 | Navigate to `/admin/users` | Access denied message or redirect |
| 3 | Check admin menu items | Admin options not visible in menu |

**Backend Validation:**
```bash
# API Request as regular user
GET /api/v1/admin/users.php
Authorization: Bearer {user_token}

# Expected Response (403 Forbidden)
{
  "success": false,
  "error": "Insufficient permissions"
}
```

---

## CATEGORY B: Core User Journeys

### B1: Complete Invoice Creation Flow

**Scenario:** User creates and sends an invoice

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Login as admin | Dashboard displayed |
| 2 | Click "Facturi" in sidebar menu | Invoices list page loads |
| 3 | Click "Factură Nouă" button | Invoice form opens |
| 4 | Select customer from dropdown | Customer details auto-populated |
| 5 | Add line item: "Servicii Consultanță" | Line added to table |
| 6 | Enter quantity: 10 | Quantity field updated |
| 7 | Enter unit price: 500 RON | Price field updated |
| 8 | Select TVA: 19% | TVA auto-calculated (950 RON) |
| 9 | Verify total: 5,950 RON | Total displayed correctly |
| 10 | Click "Salvează" button | Invoice saved, redirect to list |
| 11 | Verify invoice in list | New invoice visible with draft status |

**Backend Validation:**
```bash
# API Request
POST /api/v1/invoices/create.php
Authorization: Bearer {token}
X-Company-ID: {company_id}
{
  "customer_id": "uuid",
  "issue_date": "2025-11-28",
  "due_date": "2025-12-28",
  "items": [{
    "description": "Servicii Consultanță",
    "quantity": 10,
    "unit_price": 500,
    "tax_rate": 19
  }]
}

# Expected Response (201 Created)
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoice_number": "FACT-2025-0001",
    "subtotal": 5000,
    "tax_amount": 950,
    "total": 5950,
    "status": "draft"
  }
}

# Database Checks
SELECT * FROM invoices WHERE id = '{invoice_id}';
SELECT * FROM invoice_line_items WHERE invoice_id = '{invoice_id}';
-- Verify all fields match request data
```

---

### B2: Receipt to Expense Flow

**Scenario:** User uploads receipt, creates expense, links to bill

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to "Bonuri" (Receipts) | Receipts page loads |
| 2 | Click "Încarcă Bon" button | Upload dialog opens |
| 3 | Select image file (receipt photo) | Preview displayed |
| 4 | Click "Procesează OCR" | Loading spinner, then extracted data shown |
| 5 | Verify extracted: vendor, amount, date | Fields pre-filled from OCR |
| 6 | Click "Salvează și Creează Cheltuială" | Receipt saved, expense created |
| 7 | Navigate to "Cheltuieli" (Expenses) | Expenses list with new entry |
| 8 | Click on expense to view | Linked receipt visible |

**Backend Validation:**
```bash
# API Request - Upload
POST /api/v1/receipts/upload.php
Content-Type: multipart/form-data
{file: receipt.jpg}

# Expected Response
{
  "success": true,
  "receipt": {
    "id": "uuid",
    "ocr_status": "completed",
    "extracted_data": {
      "vendor": "Kaufland",
      "total": 125.50,
      "date": "2025-11-28"
    }
  }
}

# API Request - Create Expense
POST /api/v1/expenses/create.php
{
  "receipt_id": "uuid",
  "category": "office_supplies",
  "amount": 125.50,
  "date": "2025-11-28"
}

# Database Check
SELECT e.*, r.id as receipt_id
FROM expenses e
JOIN receipts r ON r.expense_id = e.id
WHERE e.id = '{expense_id}';
```

---

### B3: CRM Pipeline Flow (Lead to Invoice)

**Scenario:** Convert lead through opportunity to invoice

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to "CRM" → "Lead-uri" | Leads list displayed |
| 2 | Click "Lead Nou" | Lead creation form |
| 3 | Enter company: "ABC Solutions SRL" | Field populated |
| 4 | Enter contact: "Mihai Ionescu" | Field populated |
| 5 | Enter value estimate: 15,000 RON | Field populated |
| 6 | Click "Salvează" | Lead created, visible in list |
| 7 | Click "Convertește în Oportunitate" | Opportunity form pre-filled |
| 8 | Set stage to "Propunere" | Stage updated |
| 9 | Click "Creează Ofertă" | Quotation form opens |
| 10 | Add services, prices | Quotation complete |
| 11 | Click "Trimite Ofertă" | Quotation sent (email) |
| 12 | Click "Convertește în Factură" | Invoice created from quotation |

**Backend Validation:**
```bash
# Lead → Opportunity conversion
POST /api/v1/crm/opportunities.php
{
  "lead_id": "uuid",
  "stage": "proposal",
  "expected_value": 15000
}

# Quotation creation
POST /api/v1/crm/quotations/create.php
{
  "opportunity_id": "uuid",
  "items": [...]
}

# Quotation → Invoice conversion
POST /api/v1/invoices/create-from-quotation.php
{
  "quotation_id": "uuid"
}

# Database Chain Verification
SELECT l.id as lead_id, o.id as opp_id, q.id as quote_id, i.id as invoice_id
FROM leads l
JOIN opportunities o ON o.lead_id = l.id
JOIN quotations q ON q.opportunity_id = o.id
JOIN invoices i ON i.quotation_id = q.id
WHERE l.company_name = 'ABC Solutions SRL';
```

---

### B4: Time Tracking to Payroll Flow

**Scenario:** Employee tracks time, generates timesheet, processes payroll

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Login as employee | Dashboard loads |
| 2 | Navigate to "Pontaj" | Time tracking page |
| 3 | Click "Start Timer" | Timer starts, clock visible |
| 4 | Select project from dropdown | Project linked |
| 5 | Work for test period, then "Stop Timer" | Entry saved with duration |
| 6 | (Admin) Navigate to "HR" → "Pontaje" | All timesheets visible |
| 7 | Select employee, date range | Filtered view |
| 8 | Click "Aprobă" | Timesheet approved |
| 9 | Navigate to "Salarii" | Payroll page |
| 10 | Click "Generează Fluturași" | Payslips generated |

**Backend Validation:**
```bash
# Create time entry
POST /api/v1/time/entries.php
{
  "project_id": "uuid",
  "start_time": "2025-11-28T09:00:00",
  "end_time": "2025-11-28T17:00:00",
  "description": "Development work"
}

# Timesheet approval
PUT /api/v1/time/timesheets.php
{
  "employee_id": "uuid",
  "period": "2025-11",
  "status": "approved"
}

# Payroll generation
POST /api/v1/hr/payroll/generate.php
{
  "month": 11,
  "year": 2025
}

# Database Verification
SELECT te.hours, te.billable_amount, p.gross_salary, p.net_salary
FROM time_entries te
JOIN payroll_periods p ON p.employee_id = te.user_id
WHERE MONTH(te.start_time) = 11;
```

---

### B5: Inventory Stock Movement Flow

**Scenario:** Create product, receive stock, make sale, verify levels

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to "Inventar" → "Produse" | Products list |
| 2 | Click "Produs Nou" | Product form |
| 3 | Enter: name, SKU, price | Fields populated |
| 4 | Set initial stock: 0 | Stock level shown |
| 5 | Save product | Product created |
| 6 | Navigate to "Stocuri" → "Intrări" | Stock entries page |
| 7 | Select product, enter qty: 100 | Stock entry form filled |
| 8 | Click "Recepție" | Stock increased |
| 9 | Verify stock level: 100 | Dashboard shows 100 units |
| 10 | Create invoice with this product (qty: 25) | Invoice created |
| 11 | Verify stock level: 75 | Stock automatically decreased |

**Backend Validation:**
```bash
# Create product
POST /api/v1/inventory/products.php
{
  "name": "Widget Pro",
  "sku": "WGT-001",
  "unit_price": 150,
  "initial_stock": 0
}

# Stock receipt
POST /api/v1/inventory/stock-movements.php
{
  "product_id": "uuid",
  "type": "in",
  "quantity": 100,
  "reason": "purchase_receipt"
}

# After invoice creation
GET /api/v1/inventory/products/{id}
# Verify: current_stock = 75

# Stock movement audit
SELECT * FROM stock_movements WHERE product_id = '{id}' ORDER BY created_at;
-- Should show: +100 (receipt), -25 (sale)
```

---

## CATEGORY C: Data Integrity & CRUD Operations

### C1: Create Contact with Validation

**Scenario:** Create new contact with all required validations

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to "Contacte" | Contacts list |
| 2 | Click "Contact Nou" | Form opens |
| 3 | Leave required fields empty, click Save | Validation errors shown |
| 4 | Enter name: "Maria Georgescu" | Field validated |
| 5 | Enter invalid email: "invalid-email" | Email validation error |
| 6 | Enter valid email: `maria@example.com` | Validation passes |
| 7 | Enter phone: "+40721234567" | Phone validated |
| 8 | Select type: "Client" | Type selected |
| 9 | Click "Salvează" | Contact created, success message |

**Backend Validation:**
```bash
# Invalid request (missing required fields)
POST /api/v1/contacts/create.php
{"name": ""}
# Response: 400 Bad Request
{"success": false, "errors": {"name": "Name is required"}}

# Valid request
POST /api/v1/contacts/create.php
{
  "name": "Maria Georgescu",
  "email": "maria@example.com",
  "phone": "+40721234567",
  "type": "customer"
}
# Response: 201 Created
{"success": true, "contact": {...}}

# Database
SELECT * FROM contacts WHERE email = 'maria@example.com';
-- Verify all fields stored correctly
```

---

### C2: Update Invoice Status Workflow

**Scenario:** Move invoice through status lifecycle

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Open invoice in draft status | Invoice detail view |
| 2 | Click "Trimite" (Send) | Status changes to "sent" |
| 3 | Confirm send action | Email notification sent indicator |
| 4 | Simulate payment received | Payment form opens |
| 5 | Enter payment amount (partial) | Partial payment recorded |
| 6 | Verify status: "partial" | Status updated |
| 7 | Enter remaining payment | Full payment recorded |
| 8 | Verify status: "paid" | Status shows "Plătită" |

**Backend Validation:**
```bash
# Status transition: draft → sent
PUT /api/v1/invoices/update.php
{"id": "uuid", "status": "sent"}
# Verify email sent (check email log table)

# Record payment
POST /api/v1/payments/create.php
{
  "invoice_id": "uuid",
  "amount": 2975,
  "method": "bank_transfer"
}

# Check invoice status
GET /api/v1/invoices/get.php?id={uuid}
# After partial payment: status = "partial"
# After full payment: status = "paid"

# Database audit
SELECT status, paid_amount, remaining_amount, updated_at
FROM invoices WHERE id = '{uuid}';
```

---

### C3: Delete with Cascade Protection

**Scenario:** Attempt to delete contact with linked invoices

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to contact with invoices | Contact detail page |
| 2 | Click "Șterge" (Delete) | Confirmation dialog |
| 3 | Confirm deletion | Error: "Cannot delete - has linked invoices" |
| 4 | See linked invoices list | List of blocking records shown |
| 5 | Option to archive instead | "Arhivează" button available |

**Backend Validation:**
```bash
# Delete attempt
DELETE /api/v1/contacts/delete.php?id={uuid}

# Expected Response (409 Conflict)
{
  "success": false,
  "error": "Cannot delete contact with linked records",
  "linked_records": {
    "invoices": 5,
    "opportunities": 2
  }
}

# Database integrity check
SELECT COUNT(*) FROM invoices WHERE customer_id = '{contact_id}';
-- Should be > 0, preventing deletion
```

---

### C4: Bulk Operations Testing

**Scenario:** Perform bulk actions on multiple records

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to expenses list | List view |
| 2 | Select checkbox for 5 expenses | 5 items selected |
| 3 | Click "Acțiuni în masă" dropdown | Options shown |
| 4 | Select "Marchează ca rambursate" | Confirmation dialog |
| 5 | Confirm action | All 5 updated, success message |
| 6 | Verify each expense status | All show "reimbursed" status |

**Backend Validation:**
```bash
# Bulk update
PUT /api/v1/expenses/bulk-update.php
{
  "ids": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"],
  "action": "mark_reimbursed"
}

# Response
{
  "success": true,
  "updated": 5,
  "failed": 0
}

# Database verification
SELECT id, status FROM expenses WHERE id IN ('uuid1', 'uuid2', ...);
-- All should show status = 'reimbursed'
```

---

### C5: Audit Trail Verification

**Scenario:** Verify all changes are logged for compliance

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Create new invoice | Invoice created |
| 2 | Update invoice amount | Invoice updated |
| 3 | Navigate to "Istoric" (Audit Log) | Audit trail visible |
| 4 | Filter by invoice ID | All changes for invoice shown |
| 5 | Verify entries: CREATE, UPDATE | Both events logged |
| 6 | Check user, timestamp, old/new values | All details visible |

**Backend Validation:**
```bash
# Get audit log
GET /api/v1/audit/log.php?entity_type=invoice&entity_id={uuid}

# Expected Response
{
  "success": true,
  "logs": [
    {
      "action": "create",
      "user_id": "uuid",
      "user_name": "Admin User",
      "timestamp": "2025-11-28T10:00:00Z",
      "changes": null
    },
    {
      "action": "update",
      "user_id": "uuid",
      "timestamp": "2025-11-28T10:15:00Z",
      "changes": {
        "total": {"old": 5950, "new": 6500}
      }
    }
  ]
}
```

---

## CATEGORY D: UI/UX & Functional Interactions

### D1: Table Filtering and Sorting

**Scenario:** Filter and sort invoice list

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to invoices list | All invoices shown |
| 2 | Click "Status" filter | Dropdown appears |
| 3 | Select "Plătite" | Only paid invoices shown |
| 4 | Click column header "Dată" | Sorted by date ascending |
| 5 | Click again | Sorted descending |
| 6 | Enter search: "ABC Company" | Filtered by customer name |
| 7 | Click "Resetează filtre" | All filters cleared |

**Backend Validation:**
```bash
# Filtered and sorted request
GET /api/v1/invoices/list.php?status=paid&sort=issue_date&order=desc&search=ABC

# Response should have:
# - Only invoices with status = 'paid'
# - Sorted by issue_date descending
# - Customer name containing 'ABC'
```

---

### D2: Form Validation and Error Display

**Scenario:** Test comprehensive form validation

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Open invoice creation form | Empty form |
| 2 | Click "Salvează" without data | All required field errors shown |
| 3 | Enter negative quantity: -5 | "Quantity must be positive" error |
| 4 | Enter future issue date (wrong) | Date validation error |
| 5 | Enter due date before issue date | "Due date must be after issue date" |
| 6 | Fix all errors | All validation errors cleared |
| 7 | Submit valid form | Success |

**Backend Validation:**
```bash
# Request with validation errors
POST /api/v1/invoices/create.php
{
  "customer_id": "",
  "issue_date": "2030-01-01",
  "items": [{"quantity": -5}]
}

# Response (400 Bad Request)
{
  "success": false,
  "errors": {
    "customer_id": "Customer is required",
    "issue_date": "Issue date cannot be in the future",
    "items.0.quantity": "Quantity must be greater than 0"
  }
}
```

---

### D3: Pagination Testing

**Scenario:** Test pagination on large data sets

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to page with 100+ records | First 25 shown (default) |
| 2 | Check pagination controls | Page numbers visible: 1, 2, 3, 4 |
| 3 | Click page 2 | Records 26-50 shown |
| 4 | Change "Items per page" to 50 | 50 items shown |
| 5 | Click "Last page" | Final records shown |
| 6 | Click "First page" | Back to beginning |

**Backend Validation:**
```bash
# Pagination request
GET /api/v1/invoices/list.php?page=2&per_page=25

# Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 2,
    "per_page": 25,
    "total_records": 103,
    "total_pages": 5
  }
}
```

---

### D4: Responsive Design Testing

**Scenario:** Test mobile responsiveness

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Open site on desktop (1920px) | Full sidebar visible |
| 2 | Resize to tablet (768px) | Sidebar collapsed to icons |
| 3 | Resize to mobile (375px) | Hamburger menu, sidebar hidden |
| 4 | Click hamburger menu | Sidebar slides in as overlay |
| 5 | Navigate to form page | Form fields stack vertically |
| 6 | Check table on mobile | Horizontal scroll or card view |
| 7 | Test touch interactions | All buttons/links tappable |

**Validation:**
```
CSS Media Query Breakpoints:
- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px

Elements to verify:
- Navigation menu behavior
- Table column visibility
- Form layout
- Button sizes (min 44px tap target)
- Font readability
```

---

### D5: Modal and Dialog Testing

**Scenario:** Test modal dialogs and confirmations

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Click "Șterge" on an invoice | Confirmation modal appears |
| 2 | Verify modal title: "Confirmare ștergere" | Title visible |
| 3 | Verify message with invoice number | Details shown |
| 4 | Click outside modal | Modal stays open (no accidental close) |
| 5 | Click "Anulează" | Modal closes, no action |
| 6 | Re-open, click "Șterge definitiv" | Action performed, modal closes |
| 7 | Verify toast notification | "Factură ștearsă cu succes" shown |

**Validation:**
```
Modal Requirements:
- Backdrop overlay prevents interaction with background
- ESC key closes modal (optional)
- Focus trapped inside modal
- Accessible (aria-modal, aria-labelledby)
- Confirmation modals require explicit action
```

---

## CATEGORY E: Edge Cases & Error Handling

### E1: Network Failure Handling

**Scenario:** Test behavior during network issues

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Open DevTools, set "Offline" mode | Network disconnected |
| 2 | Attempt to submit form | Error: "Nu există conexiune la internet" |
| 3 | Verify form data preserved | All entered data still in fields |
| 4 | Re-enable network | Connection restored |
| 5 | Retry submission | Submission succeeds |
| 6 | Verify retry button available | "Încearcă din nou" button shown |

**Validation:**
```javascript
// Expected error handling code pattern
try {
  await api.createInvoice(data);
} catch (error) {
  if (!navigator.onLine) {
    showError("No internet connection. Please check your network.");
  } else {
    showError("Server error. Please try again later.");
  }
}
```

---

### E2: Session Timeout Handling

**Scenario:** Test expired session behavior

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Login successfully | Dashboard shown |
| 2 | Wait for token expiry (or manipulate) | Session expires |
| 3 | Attempt API action | 401 response received |
| 4 | UI shows session expired modal | "Sesiunea a expirat" message |
| 5 | Click "Reautentificare" | Redirect to login page |
| 6 | Login again | Return to previous page |

**Backend Validation:**
```bash
# Request with expired token
GET /api/v1/invoices/list.php
Authorization: Bearer {expired_token}

# Response (401)
{
  "success": false,
  "error": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```

---

### E3: Concurrent Edit Conflict

**Scenario:** Two users edit same record simultaneously

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | User A opens invoice for editing | Edit form loads |
| 2 | User B opens same invoice | Edit form loads |
| 3 | User A saves changes | Success |
| 4 | User B attempts to save | Conflict error shown |
| 5 | Message: "Record was modified by another user" | Options shown |
| 6 | Options: "Refresh" or "Force Save" | User B chooses action |

**Backend Validation:**
```bash
# Using optimistic locking with version field
PUT /api/v1/invoices/update.php
{
  "id": "uuid",
  "version": 1,  // Expected version
  "total": 6500
}

# If version mismatch (409 Conflict)
{
  "success": false,
  "error": "Record was modified by another user",
  "current_version": 2,
  "modified_by": "User A",
  "modified_at": "2025-11-28T10:30:00Z"
}
```

---

### E4: Invalid Input Sanitization

**Scenario:** Test XSS and SQL injection prevention

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | In contact name, enter: `<script>alert('xss')</script>` | Text accepted as-is |
| 2 | Save and reload page | Script NOT executed, shown as text |
| 3 | In search field, enter: `' OR 1=1 --` | Search executes safely |
| 4 | Results show no injection success | Normal search results |

**Backend Validation:**
```bash
# XSS Test
POST /api/v1/contacts/create.php
{"name": "<script>alert('xss')</script>"}

# Response - stored safely
GET /api/v1/contacts/get.php?id={uuid}
{
  "name": "&lt;script&gt;alert('xss')&lt;/script&gt;"
  // HTML entities escaped
}

# SQL Injection Test
GET /api/v1/contacts/list.php?search=' OR 1=1 --

# Should return empty results, not all records
# Check application logs for any SQL errors (should be none)
```

---

### E5: Large File Upload Handling

**Scenario:** Test file upload size limits

| Step | Frontend Action | Expected UI Result |
|------|-----------------|-------------------|
| 1 | Navigate to receipt upload | Upload form shown |
| 2 | Select file > 10MB | Error: "Fișierul depășește limita de 10MB" |
| 3 | Select valid file < 10MB | Upload starts |
| 4 | Watch progress bar | Progress indicated |
| 5 | Upload completes | Success message |
| 6 | Select unsupported format (.exe) | Error: "Format neacceptat" |

**Backend Validation:**
```bash
# Upload too large
POST /api/v1/receipts/upload.php
# File: 15MB

# Response (413 Payload Too Large)
{
  "success": false,
  "error": "File size exceeds maximum limit of 10MB"
}

# Invalid file type
# Response (415 Unsupported Media Type)
{
  "success": false,
  "error": "File type not allowed. Accepted: jpg, png, pdf"
}
```

---

# PART 3: Test Data & Environment Requirements

## 3.1 Test Data Requirements

### User Accounts
| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| `test_admin@accountech.com` | `TestPass123!` | Admin | Full access testing |
| `test_manager@accountech.com` | `TestPass123!` | Manager | Manager flow testing |
| `test_user@accountech.com` | `TestPass123!` | User | Limited access testing |
| `new_user_test@example.com` | `NewUser123!` | New | Registration testing (create during test) |

### Sample Business Data
```
Company: Test Company SRL
CUI: RO12345678
Address: Str. Test Nr. 1, București

Products: 10+ products with various stock levels
Contacts: 20+ contacts (mix of customers, suppliers)
Invoices: 50+ invoices (various statuses: draft, sent, paid, overdue)
Expenses: 30+ expenses (various categories)
Projects: 5+ projects with tasks
Employees: 10+ employee records
```

### Seed Data Script
```bash
# Run before testing to ensure consistent data
php /var/www/documentiulia.ro/scripts/seed_test_data.php

# Reset passwords
php /var/www/documentiulia.ro/reset_test_passwords.php
```

## 3.2 Environment Prerequisites

### Application URLs
| Environment | Base URL | Purpose |
|-------------|----------|---------|
| Production | https://documentiulia.ro | Live testing (careful!) |
| Staging | https://staging.documentiulia.ro | Pre-release testing |
| Local | http://localhost:8000 | Development testing |

### Required Access
```
✓ Web browser (Chrome 90+, Firefox 85+, Safari 14+)
✓ Database access (for validation queries)
✓ API access (cURL or Postman)
✓ Server SSH access (for log review)
```

### Database Connection
```bash
# PostgreSQL connection
Host: 127.0.0.1
Port: 5432
Database: accountech_production
User: accountech_app
Password: [from .env file]

# Test connection
PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production
```

### Log Files Location
```
Application logs: /var/log/php-fpm/www-error.log
Nginx access log: /var/log/nginx/documentiulia.ro.access.log
Nginx error log: /var/log/nginx/documentiulia.ro.error.log
```

---

# PART 4: Reporting Defects

## Bug Report Template

```markdown
# BUG REPORT

## Basic Information
**Defect ID:** BUG-YYYY-NNNN
**Title:** [Clear, concise description]
**Reporter:** [Name]
**Date Found:** [YYYY-MM-DD]
**Environment:** [Production/Staging/Local]

## Classification
**Severity:** [Critical/High/Medium/Low]
  - Critical: System crash, data loss, security vulnerability
  - High: Major feature broken, no workaround
  - Medium: Feature partially broken, workaround exists
  - Low: Minor issue, cosmetic, enhancement

**Priority:** [P0/P1/P2/P3]
  - P0: Fix immediately (production down)
  - P1: Fix within 24 hours
  - P2: Fix in current sprint
  - P3: Fix when convenient

**Category:** [UI/API/Database/Security/Performance]

## Steps to Reproduce
1. [First step - be specific with URLs, data entered]
2. [Second step]
3. [Continue until bug manifests]

## Expected Result
**Frontend:**
- [What the user should see on screen]

**Backend:**
- [What the API should return]
- [What should be in database]

## Actual Result
**Frontend:**
- [What the user actually sees]
- [Any error messages displayed]

**Backend:**
- [Actual API response]
- [HTTP status code]
- [Database state]

## Evidence
**Screenshots:**
- [Attach screenshot of UI error]

**API Response:**
```json
{
  "actual_response": "paste here"
}
```

**Database Query:**
```sql
SELECT * FROM table WHERE condition;
-- Result: [describe]
```

**Log Entries:**
```
[Relevant log lines]
```

## Additional Context
- Browser/OS: [Chrome 120 on Windows 11]
- User account used: [test_admin@accountech.com]
- Related bugs: [BUG-YYYY-NNNN if any]
- Regression: [Yes/No - did this work before?]
```

## Example Bug Report

```markdown
# BUG REPORT

## Basic Information
**Defect ID:** BUG-2025-0042
**Title:** Invoice creation fails when adding more than 10 line items
**Reporter:** QA Team
**Date Found:** 2025-11-28
**Environment:** Production

## Classification
**Severity:** High
**Priority:** P1
**Category:** API

## Steps to Reproduce
1. Login as test_admin@accountech.com
2. Navigate to Facturi → Factură Nouă
3. Select customer "ABC Company SRL"
4. Add 11 line items (each with valid description, qty, price)
5. Click "Salvează"

## Expected Result
**Frontend:**
- Invoice should be saved successfully
- Redirect to invoice list with new invoice visible

**Backend:**
- POST /api/v1/invoices/create.php returns 201
- Invoice record created in database with 11 line items

## Actual Result
**Frontend:**
- Loading spinner appears, then error message: "A apărut o eroare. Încercați din nou."
- Form remains open, data preserved

**Backend:**
- API returns 500 Internal Server Error
- Database: No invoice created

## Evidence
**Screenshot:**
[invoice_error_11_items.png]

**API Response:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

**Log Entry:**
```
[2025-11-28 10:45:32] PHP Fatal error: Maximum function nesting level of '256' reached
in /var/www/documentiulia.ro/api/v1/invoices/create.php on line 89
```

## Additional Context
- Works fine with 10 or fewer items
- Regression: No, first time testing with 11+ items
- Workaround: Split into multiple invoices
```

---

# PART 5: Final Checklist

## Pre-Test Checklist

- [ ] Test environment is accessible and stable
- [ ] Test data has been seeded/reset
- [ ] Test user credentials are working
- [ ] Database access is available for validation
- [ ] API documentation is available for reference
- [ ] Bug tracking system is accessible

## E2E Test Completion Checklist

### Authentication & Authorization
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials shows error
- [ ] Registration creates new account
- [ ] Password reset flow works
- [ ] Logout properly clears session
- [ ] Protected routes redirect to login
- [ ] Role-based access is enforced
- [ ] JWT token expiry handled correctly

### Core CRUD Operations
- [ ] Create operations work for all major entities
- [ ] Read operations return correct data
- [ ] Update operations modify data correctly
- [ ] Delete operations work (with cascade protection)
- [ ] Bulk operations work correctly
- [ ] Audit trail is recorded

### API Validation
- [ ] All endpoints return correct HTTP status codes
- [ ] Response payloads match documentation
- [ ] Error responses include meaningful messages
- [ ] Content-Type headers are correct
- [ ] CORS headers are properly set
- [ ] Rate limiting works (if implemented)

### UI/UX Validation
- [ ] All forms validate input correctly
- [ ] Error messages are user-friendly
- [ ] Success messages confirm actions
- [ ] Loading states are shown during operations
- [ ] Pagination works correctly
- [ ] Filtering and sorting work
- [ ] Search returns relevant results
- [ ] Responsive design works on all breakpoints
- [ ] Modals and dialogs function correctly
- [ ] Navigation works as expected

### Data Integrity
- [ ] Foreign key relationships are enforced
- [ ] Required fields cannot be null
- [ ] Numeric constraints are validated
- [ ] Date constraints are validated
- [ ] Duplicate prevention works
- [ ] Data types are correctly enforced

### Security
- [ ] XSS prevention works
- [ ] SQL injection prevention works
- [ ] CSRF protection is active
- [ ] Passwords are hashed (not plain text)
- [ ] Sensitive data is not exposed in responses
- [ ] File upload restrictions work

### Error Handling
- [ ] Network errors show appropriate message
- [ ] 404 pages are user-friendly
- [ ] 500 errors are caught and logged
- [ ] Session timeout is handled gracefully
- [ ] Concurrent edit conflicts are detected

### Cross-Module Integration
- [ ] Receipt → Expense flow works
- [ ] Lead → Opportunity → Invoice flow works
- [ ] Time Entry → Payroll flow works
- [ ] Product → Stock → Invoice flow works
- [ ] Invoice → E-Factura flow works

### Performance (Basic)
- [ ] Page load time < 3 seconds
- [ ] API response time < 1 second for lists
- [ ] No obvious memory leaks during session
- [ ] Large data sets don't crash the browser

## Post-Test Actions

- [ ] All test results documented
- [ ] All bugs logged in tracking system
- [ ] Test evidence (screenshots, logs) attached
- [ ] Summary report created
- [ ] Stakeholders notified of critical issues
- [ ] Retests scheduled for fixed bugs

---

# Appendix: Test Execution Scripts

## Quick API Health Check
```bash
#!/bin/bash
# save as: test_api_health.sh

BASE_URL="https://documentiulia.ro/api/v1"

# Login and get token
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login.php" \
  -H "Content-Type: application/json" \
  -d '{"email":"test_admin@accountech.com","password":"TestPass123!"}' \
  | jq -r '.token')

echo "Token: ${TOKEN:0:20}..."

# Test endpoints
endpoints=(
  "invoices/list.php"
  "contacts/list.php"
  "expenses/list.php"
  "projects/list.php"
)

for endpoint in "${endpoints[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE_URL/$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Company-ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
  echo "$endpoint: $status"
done
```

## Database Validation Queries
```sql
-- Check data integrity
SELECT
  (SELECT COUNT(*) FROM invoices) as total_invoices,
  (SELECT COUNT(*) FROM invoice_line_items) as total_line_items,
  (SELECT COUNT(*) FROM contacts) as total_contacts,
  (SELECT COUNT(*) FROM users) as total_users;

-- Check for orphaned records
SELECT COUNT(*) as orphaned_line_items
FROM invoice_line_items
WHERE invoice_id NOT IN (SELECT id FROM invoices);

-- Verify recent activity
SELECT table_name, action, created_at, user_id
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

---

**Document Prepared By:** QA Engineering Team
**Review Status:** Ready for Implementation
**Next Update:** After initial test cycle completion
