# Documentiulia.ro - Comprehensive End-to-End Testing Plan

**Document Version:** 1.0
**Created:** 2025-11-29
**Platform:** Documentiulia.ro (Accountech)
**Author:** QA Engineering Team

---

## Platform Overview

**Documentiulia.ro** is an enterprise-grade, cloud-based business management and accounting platform designed for Romanian businesses. It integrates:

- Accounting & Bookkeeping
- HR & Payroll Management
- CRM & Sales Pipeline
- Project Management (Scrum/Agile)
- Inventory & Stock Management
- Financial Reporting & Analytics
- E-Invoicing (e-Factura/ANAF integration)
- Bank Reconciliation
- Receipt OCR Processing
- Learning Management System
- Community Forum

**Technology Stack:**
- Backend: PHP 8.x with PostgreSQL
- Frontend: React 18+ with TypeScript (Vite)
- Database: PostgreSQL (193+ tables)
- APIs: RESTful (255+ endpoints)
- Authentication: JWT-based tokens

---

## Key User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Owner/Admin** | Full system access, user management | All modules |
| **Manager** | Business oversight, approvals | Accounting, HR, CRM |
| **Accountant** | Financial operations | Invoices, Bills, Expenses, Reports |
| **HR Officer** | Human resources management | Employees, Payroll, Time Tracking |
| **Sales** | Customer relations | CRM, Opportunities, Quotations |
| **Employee** | Basic user operations | Time tracking, Expenses, Projects |
| **Viewer** | Read-only access | Dashboard, Reports |
| **Guest** | Public access | Landing page, Registration |

---

# Part 1: Testing Strategy & Scope

## 1.1 E2E Testing Approach

Our testing strategy integrates **frontend UI actions** with **backend validations** to ensure complete system integrity:

```
┌─────────────────────────────────────────────────────────────────┐
│                    E2E TESTING FRAMEWORK                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │  UI ACTIONS  │───▶│  API CALLS   │───▶│  DB STATE    │     │
│   │              │    │              │    │              │      │
│   │ • Click      │    │ • Request    │    │ • Insert     │      │
│   │ • Type       │    │ • Response   │    │ • Update     │      │
│   │ • Navigate   │    │ • Status     │    │ • Delete     │      │
│   │ • Submit     │    │ • Payload    │    │ • Validate   │      │
│   └──────────────┘    └──────────────┘    └──────────────┘     │
│          │                   │                   │              │
│          └───────────────────┼───────────────────┘              │
│                              ▼                                   │
│                    ┌──────────────┐                             │
│                    │  ASSERTIONS  │                             │
│                    │              │                             │
│                    │ • UI State   │                             │
│                    │ • API Data   │                             │
│                    │ • DB Records │                             │
│                    └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### Testing Layers:

1. **UI Layer Testing**
   - User interaction simulation (clicks, typing, navigation)
   - Visual feedback verification
   - Form validation display
   - Error message presentation
   - Responsive design verification

2. **API Layer Testing**
   - HTTP status code validation
   - Response payload structure
   - JWT token handling
   - Error response format
   - Rate limiting behavior

3. **Database Layer Testing**
   - Data persistence verification
   - Referential integrity
   - Soft delete behavior
   - Timestamp accuracy
   - Multi-tenant isolation

4. **Integration Testing**
   - Cross-module workflows
   - External service interactions (ANAF, Banks)
   - File upload/download operations
   - Email dispatch verification

## 1.2 Major Application Flows to Cover

### Critical Path Workflows (Priority 1)

| Flow ID | Flow Name | Description |
|---------|-----------|-------------|
| CPW-001 | User Registration to First Invoice | Guest → Registration → Login → Create Company → Create Customer → Create Invoice |
| CPW-002 | Employee Onboarding to Payroll | Admin creates employee → Set salary → Process payroll → Generate payslip |
| CPW-003 | Sales Pipeline to Payment | Lead creation → Opportunity → Quotation → Invoice → Payment recording |
| CPW-004 | Receipt to Expense Report | Upload receipt → OCR processing → Create expense → Approval → Report |
| CPW-005 | Purchase to Stock Update | Create PO → Approve → Receive goods → Stock update → Bill creation |

### Secondary Workflows (Priority 2)

| Flow ID | Flow Name | Description |
|---------|-----------|-------------|
| SWF-001 | Project Lifecycle | Create project → Add tasks → Time tracking → Sprint management → Completion |
| SWF-002 | Bank Reconciliation | Connect bank → Import transactions → Auto-match → Manual reconciliation |
| SWF-003 | E-Factura Integration | Create invoice → Generate XML → Send to ANAF → Receive confirmation |
| SWF-004 | Financial Reporting | Period selection → Generate P&L → Balance Sheet → Export to PDF/Excel |
| SWF-005 | Course Enrollment | Browse courses → Enroll → Complete lessons → Take quiz → Get certificate |

### Administrative Workflows (Priority 3)

| Flow ID | Flow Name | Description |
|---------|-----------|-------------|
| AWF-001 | Company Setup | Create company → Configure settings → Invite users → Assign roles |
| AWF-002 | Chart of Accounts | View COA → Add custom account → Configure hierarchy |
| AWF-003 | Fiscal Calendar | View deadlines → Set reminders → Track declarations |
| AWF-004 | User Management | Create user → Assign role → Set permissions → Audit activity |

---

# Part 2: Detailed Test Scenarios & Steps

## Category A: User Authentication & Authorization

### Scenario A1: Successful User Registration

**Test ID:** AUTH-REG-001
**Priority:** Critical
**Prerequisite:** None (Guest user)

#### Frontend Steps:
1. Navigate to `https://documentiulia.ro/register`
2. Verify registration page loads with form fields
3. Enter valid first name: "Test"
4. Enter valid last name: "User"
5. Enter valid email: `test_user_{timestamp}@example.com`
6. Enter valid password: "SecurePass123!"
7. Confirm password: "SecurePass123!"
8. Check "I agree to Terms of Service" checkbox
9. Click "Create Account" button
10. Wait for processing indicator

#### UI Validation:
- [ ] Registration form displays all required fields
- [ ] Password strength indicator shows "Strong"
- [ ] Form validation messages appear for invalid inputs
- [ ] Success message displays: "Account created successfully"
- [ ] Browser redirects to login page or dashboard
- [ ] Welcome email notification appears (if applicable)

#### Backend Validation:
```bash
# API Validation
curl -X POST "https://documentiulia.ro/api/v1/auth/register.php" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test_user@example.com",
    "password": "SecurePass123!"
  }'

# Expected Response:
# Status: 201 Created
# {
#   "success": true,
#   "message": "Registration successful",
#   "data": {
#     "user_id": "uuid-string",
#     "email": "test_user@example.com"
#   }
# }
```

#### Database Validation:
```sql
-- Verify user record created
SELECT id, email, first_name, last_name, role, status, created_at
FROM users
WHERE email = 'test_user@example.com';

-- Expected: 1 row with status='active', role='user'

-- Verify password is hashed (NOT plain text)
SELECT password_hash FROM users WHERE email = 'test_user@example.com';
-- Should return bcrypt hash starting with $2y$
```

---

### Scenario A2: Successful User Login

**Test ID:** AUTH-LOGIN-001
**Priority:** Critical
**Prerequisite:** Existing user account

#### Frontend Steps:
1. Navigate to `https://documentiulia.ro/login`
2. Verify login page loads correctly
3. Enter email: `test_admin@accountech.com`
4. Enter password: `Test123!`
5. Click "Login" button
6. Wait for authentication process

#### UI Validation:
- [ ] Login form displays email and password fields
- [ ] Password field is masked
- [ ] "Remember me" checkbox is available
- [ ] Loading spinner appears during authentication
- [ ] Browser redirects to `/dashboard` on success
- [ ] User's name appears in header/navigation
- [ ] User avatar/initials display correctly

#### Backend Validation:
```bash
# API Validation
curl -X POST "https://documentiulia.ro/api/v1/auth/login.php" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_admin@accountech.com",
    "password": "Test123!"
  }'

# Expected Response:
# Status: 200 OK
# {
#   "success": true,
#   "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
#   "user": {
#     "id": "uuid",
#     "email": "test_admin@accountech.com",
#     "first_name": "Test",
#     "last_name": "Admin",
#     "role": "admin"
#   }
# }
```

#### Database Validation:
```sql
-- Verify login timestamp updated
SELECT last_login_at FROM users WHERE email = 'test_admin@accountech.com';
-- Should be within last minute

-- Verify session/token exists (if using sessions table)
SELECT * FROM user_sessions WHERE user_id = 'uuid' ORDER BY created_at DESC LIMIT 1;
```

---

### Scenario A3: Failed Login - Invalid Credentials

**Test ID:** AUTH-LOGIN-002
**Priority:** High
**Prerequisite:** None

#### Frontend Steps:
1. Navigate to `https://documentiulia.ro/login`
2. Enter email: `test_admin@accountech.com`
3. Enter wrong password: `WrongPassword123!`
4. Click "Login" button

#### UI Validation:
- [ ] Error message displays: "Invalid email or password"
- [ ] Error message is styled in red/warning color
- [ ] User remains on login page
- [ ] Password field is cleared
- [ ] No redirect occurs
- [ ] Login attempt counter may increment (if rate limiting visible)

#### Backend Validation:
```bash
# API Validation
curl -X POST "https://documentiulia.ro/api/v1/auth/login.php" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_admin@accountech.com",
    "password": "WrongPassword123!"
  }'

# Expected Response:
# Status: 401 Unauthorized
# {
#   "success": false,
#   "error": "Invalid credentials"
# }
```

---

### Scenario A4: Role-Based Access Control (RBAC)

**Test ID:** AUTH-RBAC-001
**Priority:** High
**Prerequisite:** Users with different roles exist

#### Frontend Steps (As Employee Role):
1. Login as user with "employee" role
2. Navigate to `/admin` or `/settings/users`
3. Verify access denied

#### UI Validation:
- [ ] Access denied message or 403 page displays
- [ ] Navigation menu hides admin-only links
- [ ] Protected buttons/actions are disabled or hidden
- [ ] Redirect to authorized area occurs

#### Backend Validation:
```bash
# API Validation - Employee trying to access admin endpoint
curl -X GET "https://documentiulia.ro/api/v1/admin/users.php" \
  -H "Authorization: Bearer {employee_token}"

# Expected Response:
# Status: 403 Forbidden
# {
#   "success": false,
#   "error": "Access denied. Admin role required."
# }
```

---

### Scenario A5: Session Expiration & Token Refresh

**Test ID:** AUTH-SESSION-001
**Priority:** High
**Prerequisite:** Active user session

#### Frontend Steps:
1. Login successfully
2. Wait for token expiration (or manually expire token)
3. Attempt to access protected resource
4. Verify refresh flow or re-login prompt

#### UI Validation:
- [ ] Session expiration modal/message appears
- [ ] User is redirected to login if token cannot refresh
- [ ] Unsaved work warning appears (if applicable)
- [ ] After re-login, user returns to previous page

#### Backend Validation:
```bash
# API Validation - Expired token
curl -X GET "https://documentiulia.ro/api/v1/auth/me.php" \
  -H "Authorization: Bearer {expired_token}"

# Expected Response:
# Status: 401 Unauthorized
# {
#   "success": false,
#   "error": "Token expired"
# }
```

---

## Category B: Core User Journeys

### Scenario B1: Complete Invoice Creation Flow

**Test ID:** CORE-INV-001
**Priority:** Critical
**Prerequisite:** Logged in as Admin/Accountant, at least one contact exists

#### Frontend Steps:
1. Navigate to `/invoices`
2. Click "New Invoice" button
3. Select customer from dropdown (or create new)
4. Verify invoice number auto-generates
5. Set invoice date (default: today)
6. Set due date (e.g., +30 days)
7. Add line item:
   - Description: "Consulting Services"
   - Quantity: 10
   - Unit Price: 100.00
   - VAT Rate: 19%
8. Verify subtotal calculates: 1,000.00 RON
9. Verify VAT calculates: 190.00 RON
10. Verify total calculates: 1,190.00 RON
11. Add notes/terms (optional)
12. Click "Save Invoice" button
13. Verify success notification

#### UI Validation:
- [ ] Invoice form loads with all required fields
- [ ] Customer dropdown shows existing contacts
- [ ] Invoice number auto-generates in correct series format
- [ ] Line item calculator updates in real-time
- [ ] Multiple VAT rates available (19%, 9%, 5%, 0%)
- [ ] Subtotal, VAT, and Total update dynamically
- [ ] Save button enabled only when form is valid
- [ ] Success toast: "Invoice created successfully"
- [ ] Redirect to invoice list or detail page
- [ ] New invoice appears in list with correct status ("Draft")

#### Backend Validation:
```bash
# API Validation
curl -X POST "https://documentiulia.ro/api/v1/invoices/create.php" \
  -H "Authorization: Bearer {token}" \
  -H "X-Company-ID: {company_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "uuid",
    "invoice_date": "2025-11-29",
    "due_date": "2025-12-29",
    "line_items": [
      {
        "description": "Consulting Services",
        "quantity": 10,
        "unit_price": 100.00,
        "vat_rate": 19
      }
    ],
    "notes": "Thank you for your business"
  }'

# Expected Response:
# Status: 201 Created
# {
#   "success": true,
#   "data": {
#     "id": "uuid",
#     "invoice_number": "INV-2025-001",
#     "status": "draft",
#     "subtotal": 1000.00,
#     "vat_amount": 190.00,
#     "total": 1190.00
#   }
# }
```

#### Database Validation:
```sql
-- Verify invoice created
SELECT id, invoice_number, customer_id, status, subtotal, vat_amount, total_amount, created_at
FROM invoices
WHERE invoice_number = 'INV-2025-001';

-- Verify line items created
SELECT * FROM invoice_line_items WHERE invoice_id = 'uuid';
-- Should return 1 row with matching values

-- Verify company isolation
SELECT company_id FROM invoices WHERE id = 'uuid';
-- Should match authenticated user's company
```

---

### Scenario B2: Employee Time Entry to Payroll

**Test ID:** CORE-TIME-001
**Priority:** High
**Prerequisite:** Employee account, active project exists

#### Frontend Steps:
1. Login as employee
2. Navigate to `/time-tracking`
3. Click "New Time Entry"
4. Select project from dropdown
5. Select task (if applicable)
6. Enter hours: 8
7. Enter description: "Development work"
8. Select date: today
9. Mark as billable: Yes
10. Click "Save"
11. Verify entry appears in timesheet

#### UI Validation:
- [ ] Time entry form displays all required fields
- [ ] Project dropdown shows assigned projects
- [ ] Date picker defaults to today
- [ ] Hours field accepts decimal values (e.g., 8.5)
- [ ] Billable toggle is clearly visible
- [ ] Save confirmation appears
- [ ] Entry appears in daily/weekly timesheet view
- [ ] Total hours for day/week update

#### Backend Validation:
```bash
# API Validation
curl -X POST "https://documentiulia.ro/api/v1/time/entries.php" \
  -H "Authorization: Bearer {token}" \
  -H "X-Company-ID: {company_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "uuid",
    "task_id": "uuid",
    "hours": 8,
    "description": "Development work",
    "entry_date": "2025-11-29",
    "billable": true
  }'

# Expected Response:
# Status: 201 Created
# {
#   "success": true,
#   "data": {
#     "id": "uuid",
#     "hours": 8,
#     "billable": true
#   }
# }
```

#### Database Validation:
```sql
-- Verify time entry created
SELECT * FROM time_entries WHERE user_id = 'employee_uuid' AND entry_date = '2025-11-29';

-- Verify hours accumulate correctly
SELECT SUM(hours) as total_hours
FROM time_entries
WHERE user_id = 'employee_uuid'
AND entry_date BETWEEN '2025-11-01' AND '2025-11-30';
```

---

### Scenario B3: CRM Lead to Invoice Conversion

**Test ID:** CORE-CRM-001
**Priority:** High
**Prerequisite:** Admin/Sales role

#### Frontend Steps:
1. Navigate to `/crm/leads`
2. Click "New Lead"
3. Enter lead details:
   - Name: "ABC Company"
   - Contact: "John Smith"
   - Email: "john@abc.com"
   - Phone: "+40 721 123 456"
   - Source: "Website"
   - Value: 5000 RON
4. Save lead
5. Click "Convert to Opportunity"
6. Set opportunity stage: "Proposal"
7. Create quotation from opportunity
8. Add line items to quotation
9. Send quotation (email)
10. Mark quotation as "Accepted"
11. Click "Convert to Invoice"
12. Verify invoice created with quotation data

#### UI Validation:
- [ ] Lead form captures all relevant fields
- [ ] Lead appears in lead list/pipeline
- [ ] Conversion button available on lead detail
- [ ] Opportunity inherits lead data
- [ ] Pipeline visualization shows opportunity
- [ ] Quotation pre-fills from opportunity
- [ ] Email send confirmation appears
- [ ] Invoice pre-fills from accepted quotation
- [ ] Audit trail shows conversion history

#### Backend Validation:
```bash
# Create Lead
curl -X POST "https://documentiulia.ro/api/v1/crm/leads.php" ...

# Convert to Opportunity
curl -X POST "https://documentiulia.ro/api/v1/crm/leads.php?id={lead_id}&action=convert" ...

# Create Quotation
curl -X POST "https://documentiulia.ro/api/v1/crm/quotations.php" ...

# Convert Quotation to Invoice
curl -X POST "https://documentiulia.ro/api/v1/crm/quotations.php?id={quotation_id}&action=convert_to_invoice" ...
```

#### Database Validation:
```sql
-- Verify lead status changed
SELECT status FROM leads WHERE id = 'uuid';
-- Expected: 'converted'

-- Verify opportunity linked to lead
SELECT * FROM opportunities WHERE lead_id = 'uuid';

-- Verify quotation linked to opportunity
SELECT * FROM quotations WHERE opportunity_id = 'uuid';

-- Verify invoice linked to quotation
SELECT * FROM invoices WHERE quotation_id = 'uuid';
```

---

### Scenario B4: Purchase Order to Stock Update

**Test ID:** CORE-PO-001
**Priority:** High
**Prerequisite:** Products exist, supplier contact exists

#### Frontend Steps:
1. Navigate to `/purchase-orders`
2. Click "New Purchase Order"
3. Select supplier
4. Add products:
   - Product: "Widget A"
   - Quantity: 100
   - Unit Price: 10.00
5. Set expected delivery date
6. Save as draft
7. Submit for approval
8. Approve PO (as manager)
9. Record goods receipt
10. Verify stock levels updated
11. Verify bill auto-created

#### UI Validation:
- [ ] PO form shows supplier and product fields
- [ ] Product search works correctly
- [ ] Approval workflow visible
- [ ] Status changes through workflow
- [ ] Goods receipt form appears
- [ ] Stock levels update after receipt
- [ ] Bill creation notification appears

#### Backend Validation:
```bash
# Create PO
curl -X POST "https://documentiulia.ro/api/v1/purchase-orders/purchase-orders.php" ...

# Approve PO
curl -X PUT "https://documentiulia.ro/api/v1/purchase-orders/purchase-orders.php?id={po_id}" \
  -d '{"status": "approved"}'

# Record Goods Receipt
curl -X POST "https://documentiulia.ro/api/v1/purchase-orders/goods-receipt.php" ...
```

#### Database Validation:
```sql
-- Verify PO status progression
SELECT status, approved_by, approved_at FROM purchase_orders WHERE id = 'uuid';

-- Verify stock level increased
SELECT quantity FROM stock_levels WHERE product_id = 'uuid' AND warehouse_id = 'uuid';

-- Verify stock movement recorded
SELECT * FROM stock_movements WHERE reference_id = 'po_uuid' AND movement_type = 'receipt';

-- Verify bill created
SELECT * FROM bills WHERE purchase_order_id = 'uuid';
```

---

### Scenario B5: Monthly Payroll Processing

**Test ID:** CORE-PAY-001
**Priority:** Critical
**Prerequisite:** Employees with salary data exist

#### Frontend Steps:
1. Navigate to `/hr/payroll`
2. Click "New Payroll Period"
3. Select period: "November 2025"
4. System auto-loads employees
5. Review calculated values:
   - Gross salary
   - CAS (25%)
   - CASS (10%)
   - Income Tax (10%)
   - Net salary
6. Add any adjustments (bonuses, deductions)
7. Click "Calculate Payroll"
8. Review totals
9. Click "Approve Payroll"
10. Generate payslips (PDF)
11. Mark as paid

#### UI Validation:
- [ ] Payroll period selector works
- [ ] Employee list loads correctly
- [ ] Tax calculations auto-apply
- [ ] Adjustment fields available
- [ ] Totals calculate correctly
- [ ] Approval workflow functions
- [ ] Payslip PDFs generate
- [ ] Payment status updates

#### Backend Validation:
```bash
# Create Payroll Period
curl -X POST "https://documentiulia.ro/api/v1/hr/payroll/create.php" \
  -H "Authorization: Bearer {token}" \
  -d '{"period_month": 11, "period_year": 2025}'

# Calculate Payroll
curl -X POST "https://documentiulia.ro/api/v1/hr/payroll/calculate.php?id={period_id}"

# Generate Payslip
curl -X GET "https://documentiulia.ro/api/v1/hr/payroll/payslip.php?id={payroll_id}&format=pdf"
```

#### Database Validation:
```sql
-- Verify payroll period created
SELECT * FROM payroll_periods WHERE period_month = 11 AND period_year = 2025;

-- Verify employee payroll records
SELECT employee_id, gross_salary, cas_amount, cass_amount, income_tax, net_salary
FROM payroll_records WHERE period_id = 'uuid';

-- Verify tax calculations
-- CAS = gross * 0.25, CASS = gross * 0.10, Tax = (gross - CAS - CASS) * 0.10
```

---

## Category C: Data Integrity & CRUD Operations

### Scenario C1: Contact Management - Full CRUD

**Test ID:** CRUD-CONTACT-001
**Priority:** High
**Prerequisite:** Authenticated user

#### CREATE
**Frontend Steps:**
1. Navigate to `/contacts`
2. Click "New Contact"
3. Fill form:
   - Type: Customer
   - Name: "Test Company SRL"
   - Email: "contact@testcompany.ro"
   - Phone: "+40 721 000 000"
   - Address: "Str. Test Nr. 1, Bucuresti"
   - CUI: "RO12345678"
4. Click "Save"

**UI Validation:**
- [ ] Form validates required fields
- [ ] CUI validation for Romanian format
- [ ] Success notification appears
- [ ] Contact appears in list

**Backend Validation:**
```bash
curl -X POST "https://documentiulia.ro/api/v1/crm/contacts.php" \
  -H "Authorization: Bearer {token}" \
  -H "X-Company-ID: {company_id}" \
  -d '{
    "contact_type": "customer",
    "name": "Test Company SRL",
    "email": "contact@testcompany.ro",
    "phone": "+40 721 000 000",
    "cui": "RO12345678"
  }'
# Expected: 201 Created
```

#### READ
**Frontend Steps:**
1. Navigate to `/contacts`
2. Search for "Test Company"
3. Click on contact to view details

**UI Validation:**
- [ ] Contact list displays correctly
- [ ] Search filters results
- [ ] Detail page shows all fields
- [ ] Related data (invoices, opportunities) displayed

**Backend Validation:**
```bash
curl -X GET "https://documentiulia.ro/api/v1/crm/contacts.php?search=Test%20Company" \
  -H "Authorization: Bearer {token}"
# Expected: 200 OK with matching contacts
```

#### UPDATE
**Frontend Steps:**
1. Open contact detail page
2. Click "Edit"
3. Change phone to: "+40 722 000 000"
4. Click "Save"

**UI Validation:**
- [ ] Edit form pre-fills existing data
- [ ] Updated value displays after save
- [ ] Updated timestamp shows

**Backend Validation:**
```bash
curl -X PUT "https://documentiulia.ro/api/v1/crm/contacts.php" \
  -H "Authorization: Bearer {token}" \
  -d '{"id": "uuid", "phone": "+40 722 000 000"}'
# Expected: 200 OK
```

**Database Validation:**
```sql
SELECT phone, updated_at FROM contacts WHERE id = 'uuid';
-- Phone should be new value, updated_at should be recent
```

#### DELETE
**Frontend Steps:**
1. Open contact detail page
2. Click "Delete"
3. Confirm deletion in modal

**UI Validation:**
- [ ] Confirmation modal appears
- [ ] Warning about related data shown
- [ ] Contact removed from list
- [ ] Success notification appears

**Backend Validation:**
```bash
curl -X DELETE "https://documentiulia.ro/api/v1/crm/contacts.php?id={uuid}" \
  -H "Authorization: Bearer {token}"
# Expected: 200 OK (soft delete) or 204 No Content
```

**Database Validation:**
```sql
-- Verify soft delete (if implemented)
SELECT deleted_at FROM contacts WHERE id = 'uuid';
-- Should have timestamp, not null

-- Or verify hard delete
SELECT COUNT(*) FROM contacts WHERE id = 'uuid';
-- Should return 0
```

---

### Scenario C2: Product Inventory Management

**Test ID:** CRUD-PRODUCT-001
**Priority:** High
**Prerequisite:** Authenticated as Admin/Manager

#### Frontend Steps (CREATE):
1. Navigate to `/inventory/products`
2. Click "New Product"
3. Fill form:
   - Name: "Test Product"
   - SKU: "TEST-001"
   - Category: "Electronics"
   - Price: 99.99
   - Cost: 50.00
   - Initial Stock: 100
   - Reorder Level: 20
4. Upload product image
5. Click "Save"

**UI Validation:**
- [ ] All fields accept input
- [ ] SKU uniqueness validated
- [ ] Image preview displays
- [ ] Stock level shows after save
- [ ] Product appears in catalog

**Backend Validation:**
```bash
curl -X POST "https://documentiulia.ro/api/v1/inventory/products.php" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Test Product",
    "sku": "TEST-001",
    "category": "Electronics",
    "price": 99.99,
    "cost": 50.00,
    "initial_stock": 100,
    "reorder_level": 20
  }'
```

**Database Validation:**
```sql
-- Verify product created
SELECT * FROM products WHERE sku = 'TEST-001';

-- Verify initial stock level
SELECT quantity FROM stock_levels WHERE product_id = 'uuid';
-- Should be 100
```

---

### Scenario C3: Project Task Management

**Test ID:** CRUD-TASK-001
**Priority:** Medium
**Prerequisite:** Project exists

#### Frontend Steps:
1. Navigate to `/projects/{project_id}`
2. Go to "Tasks" tab
3. Click "New Task"
4. Fill form:
   - Title: "Implement Feature X"
   - Description: "Detailed requirements..."
   - Assignee: Select team member
   - Priority: High
   - Due Date: +7 days
   - Estimated Hours: 8
   - Story Points: 5
5. Click "Save"
6. Drag task to "In Progress" column (Kanban)
7. Add comment to task
8. Log time against task
9. Mark as complete

**UI Validation:**
- [ ] Task form loads correctly
- [ ] Assignee dropdown shows team members
- [ ] Kanban drag-drop works
- [ ] Comments appear in real-time
- [ ] Time entries link to task
- [ ] Status change updates board

**Backend Validation:**
```bash
# Create Task
curl -X POST "https://documentiulia.ro/api/v1/projects/tasks.php" \
  -d '{
    "project_id": "uuid",
    "title": "Implement Feature X",
    "assignee_id": "uuid",
    "priority": "high",
    "estimated_hours": 8,
    "story_points": 5
  }'

# Update Status
curl -X PUT "https://documentiulia.ro/api/v1/projects/tasks.php" \
  -d '{"id": "uuid", "status": "in_progress"}'

# Add Comment
curl -X POST "https://documentiulia.ro/api/v1/projects/tasks.php?id={task_id}&action=comment" \
  -d '{"content": "Started working on this"}'
```

---

### Scenario C4: Expense Claim Workflow

**Test ID:** CRUD-EXPENSE-001
**Priority:** High
**Prerequisite:** Employee account

#### Frontend Steps:
1. Navigate to `/expenses`
2. Click "New Expense"
3. Fill form:
   - Category: Travel
   - Amount: 150.00 RON
   - Date: Today
   - Description: "Client meeting travel"
   - Attach receipt (photo/PDF)
4. Submit for approval
5. (As Manager) Review and approve
6. Verify expense appears in reports

**UI Validation:**
- [ ] Category dropdown populated
- [ ] Receipt upload works (drag-drop or click)
- [ ] Receipt preview displays
- [ ] Approval workflow shows status
- [ ] Manager sees pending approvals
- [ ] Approved expense marked correctly

**Backend Validation:**
```bash
# Create Expense
curl -X POST "https://documentiulia.ro/api/v1/expenses/create.php" \
  -F "category=travel" \
  -F "amount=150.00" \
  -F "description=Client meeting travel" \
  -F "receipt=@/path/to/receipt.jpg"

# Approve Expense (as manager)
curl -X PUT "https://documentiulia.ro/api/v1/expenses/update.php?id={uuid}" \
  -d '{"status": "approved"}'
```

---

### Scenario C5: Journal Entry Management

**Test ID:** CRUD-JOURNAL-001
**Priority:** Medium
**Prerequisite:** Accountant role, Chart of Accounts exists

#### Frontend Steps:
1. Navigate to `/accounting/journal`
2. Click "New Entry"
3. Enter entry details:
   - Date: Today
   - Description: "Monthly rent payment"
   - Debit: Account 6121 (Rent Expense) - 1,000 RON
   - Credit: Account 5121 (Bank Account) - 1,000 RON
4. Verify debits = credits
5. Save entry
6. View in general ledger

**UI Validation:**
- [ ] Account search/dropdown works
- [ ] Debit/Credit columns clear
- [ ] Balance validation shows (must equal)
- [ ] Entry number auto-generates
- [ ] Entry appears in ledger
- [ ] Account balances update

**Backend Validation:**
```bash
curl -X POST "https://documentiulia.ro/api/v1/accounting/journal-entries/create.php" \
  -d '{
    "entry_date": "2025-11-29",
    "description": "Monthly rent payment",
    "lines": [
      {"account_code": "6121", "debit": 1000, "credit": 0},
      {"account_code": "5121", "debit": 0, "credit": 1000}
    ]
  }'
```

**Database Validation:**
```sql
-- Verify entry balanced
SELECT SUM(debit_amount) as total_debit, SUM(credit_amount) as total_credit
FROM journal_entry_lines WHERE journal_entry_id = 'uuid';
-- total_debit MUST equal total_credit
```

---

## Category D: UI/UX & Functional Interactions

### Scenario D1: Dashboard Filtering & Date Range

**Test ID:** UX-DASH-001
**Priority:** Medium
**Prerequisite:** Data exists in system

#### Frontend Steps:
1. Navigate to `/dashboard`
2. Locate date range selector
3. Select "This Month"
4. Verify metrics update
5. Select "Last Quarter"
6. Verify metrics update
7. Select custom range: Nov 1 - Nov 29
8. Verify metrics reflect custom range

**UI Validation:**
- [ ] Date range selector displays current selection
- [ ] Quick filters available (Today, Week, Month, Quarter, Year)
- [ ] Custom date picker functional
- [ ] All widgets update on filter change
- [ ] Loading indicators show during data fetch
- [ ] Charts re-render with filtered data
- [ ] Comparison data updates (vs previous period)

**Backend Validation:**
```bash
curl -X GET "https://documentiulia.ro/api/v1/dashboard/stats.php?start_date=2025-11-01&end_date=2025-11-29" \
  -H "Authorization: Bearer {token}"
# Response should reflect filtered date range
```

---

### Scenario D2: Invoice List Sorting & Pagination

**Test ID:** UX-LIST-001
**Priority:** Medium
**Prerequisite:** Multiple invoices exist (50+)

#### Frontend Steps:
1. Navigate to `/invoices`
2. Verify default sort (date descending)
3. Click "Amount" column header to sort
4. Verify ascending order
5. Click again for descending
6. Change page size to 25
7. Navigate to page 2
8. Use search to filter by customer name
9. Verify results update

**UI Validation:**
- [ ] Sort indicator shows on active column
- [ ] Sort toggles between asc/desc
- [ ] Page size selector works (10, 25, 50, 100)
- [ ] Pagination shows correct page count
- [ ] Current page highlighted
- [ ] Search filters results immediately
- [ ] "No results" message for empty search
- [ ] Clear filters resets view

**Backend Validation:**
```bash
# Sorted request
curl -X GET "https://documentiulia.ro/api/v1/invoices/list.php?sort=total_amount&order=desc&page=2&per_page=25" \
  -H "Authorization: Bearer {token}"

# Search request
curl -X GET "https://documentiulia.ro/api/v1/invoices/list.php?search=ABC%20Company" \
  -H "Authorization: Bearer {token}"
```

---

### Scenario D3: Form Validation Display

**Test ID:** UX-FORM-001
**Priority:** High
**Prerequisite:** None

#### Frontend Steps:
1. Navigate to `/invoices/new`
2. Click "Save" without filling required fields
3. Observe validation messages
4. Fill invalid email in customer field
5. Enter negative amount
6. Enter date in wrong format
7. Fix errors one by one
8. Verify validation clears

**UI Validation:**
- [ ] Required field indicators visible (asterisk)
- [ ] Error messages appear near invalid fields
- [ ] Error messages are descriptive
- [ ] Invalid fields highlighted (red border)
- [ ] Error summary at form top (optional)
- [ ] Real-time validation as user types
- [ ] Validation clears when corrected
- [ ] Submit disabled until form valid

---

### Scenario D4: Responsive Design Testing

**Test ID:** UX-RESP-001
**Priority:** Medium
**Prerequisite:** None

#### Frontend Steps:
1. Open application on desktop (1920x1080)
2. Verify layout displays correctly
3. Resize to tablet (768x1024)
4. Verify navigation collapses to hamburger
5. Verify tables convert to cards/scrollable
6. Resize to mobile (375x667)
7. Verify touch targets adequate
8. Test form input on mobile

**UI Validation:**
- [ ] Desktop: Full navigation sidebar visible
- [ ] Desktop: Multi-column layouts work
- [ ] Tablet: Navigation collapses
- [ ] Tablet: Tables remain usable (horizontal scroll)
- [ ] Mobile: Hamburger menu functions
- [ ] Mobile: Forms usable (no horizontal scroll)
- [ ] Mobile: Buttons/links have adequate tap targets (44px min)
- [ ] Mobile: Modals display correctly

---

### Scenario D5: Error Message Display

**Test ID:** UX-ERROR-001
**Priority:** High
**Prerequisite:** None

#### Frontend Steps:
1. Trigger network error (disconnect wifi)
2. Attempt to load data
3. Observe error message
4. Trigger server error (invalid request)
5. Observe error handling
6. Trigger validation error
7. Verify user-friendly messages

**UI Validation:**
- [ ] Network errors show retry option
- [ ] Server errors show generic message (no technical details)
- [ ] Validation errors are specific and actionable
- [ ] Error toasts/banners have dismiss option
- [ ] Error state doesn't break page layout
- [ ] Recovery path suggested where possible

---

## Category E: Edge Cases & Error Handling

### Scenario E1: Duplicate Entry Prevention

**Test ID:** EDGE-DUP-001
**Priority:** High
**Prerequisite:** Existing data

#### Frontend Steps:
1. Navigate to `/contacts`
2. Create contact with existing email
3. Observe duplicate warning
4. Try to create invoice with duplicate number
5. Observe error handling

**UI Validation:**
- [ ] Warning modal for potential duplicate
- [ ] Option to view existing record
- [ ] Option to proceed anyway (if allowed)
- [ ] Clear error message for hard duplicates
- [ ] No data corruption on duplicate attempt

**Backend Validation:**
```bash
curl -X POST "https://documentiulia.ro/api/v1/crm/contacts.php" \
  -d '{"email": "existing@email.com", ...}'
# Expected: 409 Conflict or warning in response
```

---

### Scenario E2: Invalid Input Handling

**Test ID:** EDGE-INPUT-001
**Priority:** High
**Prerequisite:** None

#### Frontend Steps:
1. Invoice amount: Enter "abc" (non-numeric)
2. Email field: Enter "invalid-email"
3. Phone field: Enter special characters
4. Date field: Enter "32/13/2025"
5. Quantity field: Enter -5
6. Percentage field: Enter 150

**UI Validation:**
- [ ] Non-numeric rejected for number fields
- [ ] Email validation catches invalid format
- [ ] Phone sanitizes or rejects invalid input
- [ ] Date picker prevents invalid dates
- [ ] Negative values rejected where inappropriate
- [ ] Percentage capped at valid range
- [ ] Clear error messages for each case

---

### Scenario E3: Permission Denied Scenarios

**Test ID:** EDGE-PERM-001
**Priority:** High
**Prerequisite:** Multiple user roles

#### Frontend Steps:
1. Login as Employee role
2. Try to access `/admin/users`
3. Try to delete another user's data
4. Try to approve own expense
5. Try to modify locked/finalized record

**UI Validation:**
- [ ] Access denied page displays cleanly
- [ ] Restricted buttons hidden or disabled
- [ ] Clear message: "You don't have permission"
- [ ] Redirect to authorized area
- [ ] No technical error details exposed

**Backend Validation:**
```bash
# All requests should return 403 Forbidden
curl -X DELETE "https://documentiulia.ro/api/v1/invoices/delete.php?id={other_user_invoice}" \
  -H "Authorization: Bearer {employee_token}"
# Expected: 403 Forbidden
```

---

### Scenario E4: Network Failure Recovery

**Test ID:** EDGE-NET-001
**Priority:** Medium
**Prerequisite:** None

#### Frontend Steps:
1. Start filling invoice form
2. Disconnect network
3. Click "Save"
4. Observe error handling
5. Reconnect network
6. Retry save
7. Verify data preserved

**UI Validation:**
- [ ] Offline indicator displays
- [ ] Save attempt shows network error
- [ ] Form data preserved (not cleared)
- [ ] Retry button available
- [ ] Auto-retry on reconnection (optional)
- [ ] Success after reconnection

---

### Scenario E5: 404 Page Handling

**Test ID:** EDGE-404-001
**Priority:** Low
**Prerequisite:** None

#### Frontend Steps:
1. Navigate to `/nonexistent-page`
2. Navigate to `/invoices/nonexistent-uuid`
3. Click broken link (if any)

**UI Validation:**
- [ ] Custom 404 page displays (not browser default)
- [ ] Navigation still works from 404 page
- [ ] Helpful message: "Page not found"
- [ ] Link to return home or dashboard
- [ ] Search suggestion (optional)

**Backend Validation:**
```bash
curl -X GET "https://documentiulia.ro/api/v1/invoices/get.php?id=nonexistent-uuid" \
  -H "Authorization: Bearer {token}"
# Expected: 404 Not Found
# {
#   "success": false,
#   "error": "Invoice not found"
# }
```

---

### Scenario E6: Concurrent Edit Conflict

**Test ID:** EDGE-CONC-001
**Priority:** Medium
**Prerequisite:** Two browser sessions

#### Frontend Steps:
1. User A opens invoice for edit
2. User B opens same invoice for edit
3. User A saves changes
4. User B tries to save (with outdated data)
5. Observe conflict handling

**UI Validation:**
- [ ] Conflict warning displayed
- [ ] User shown both versions
- [ ] Option to overwrite or refresh
- [ ] No silent data loss
- [ ] Merge option (if applicable)

**Backend Validation:**
```bash
# Request with outdated version
curl -X PUT "https://documentiulia.ro/api/v1/invoices/update.php" \
  -d '{"id": "uuid", "version": 1, ...}'
# Current version in DB is 2
# Expected: 409 Conflict
```

---

## Category F: Integration & External Services

### Scenario F1: E-Factura ANAF Integration

**Test ID:** INT-ANAF-001
**Priority:** High
**Prerequisite:** ANAF sandbox credentials configured

#### Frontend Steps:
1. Create valid invoice
2. Click "Send to E-Factura"
3. Confirm send dialog
4. Wait for ANAF response
5. Check invoice status
6. View ANAF response details

**UI Validation:**
- [ ] E-Factura button visible for eligible invoices
- [ ] Confirmation shows what will be sent
- [ ] Progress indicator during send
- [ ] Success/failure status displayed
- [ ] ANAF message ID shown
- [ ] Download XML option available
- [ ] Retry option for failed sends

**Backend Validation:**
```bash
# Send to ANAF
curl -X POST "https://documentiulia.ro/api/v1/efactura/send.php" \
  -d '{"invoice_id": "uuid"}'

# Check status
curl -X GET "https://documentiulia.ro/api/v1/efactura/status.php?invoice_id={uuid}"
```

---

### Scenario F2: Bank Connection & Sync

**Test ID:** INT-BANK-001
**Priority:** High
**Prerequisite:** Bank sandbox/test connection available

#### Frontend Steps:
1. Navigate to `/banking`
2. Click "Connect Bank"
3. Select bank from list
4. Complete OAuth flow (redirect)
5. Return to application
6. Verify accounts imported
7. Trigger transaction sync
8. View transactions

**UI Validation:**
- [ ] Bank selection list displays
- [ ] OAuth redirect works smoothly
- [ ] Return handles success/failure
- [ ] Connected banks shown
- [ ] Sync button available
- [ ] Transactions appear after sync
- [ ] Balance matches bank

---

### Scenario F3: Receipt OCR Processing

**Test ID:** INT-OCR-001
**Priority:** Medium
**Prerequisite:** OCR service configured

#### Frontend Steps:
1. Navigate to `/receipts`
2. Click "Upload Receipt"
3. Select/drag image file
4. Wait for OCR processing
5. Review extracted data
6. Correct any errors
7. Save receipt
8. Link to expense

**UI Validation:**
- [ ] Upload accepts image/PDF
- [ ] Processing indicator shows
- [ ] Extracted fields pre-filled
- [ ] Confidence indicators (optional)
- [ ] Edit capability for corrections
- [ ] Save creates receipt record
- [ ] Link to expense works

**Backend Validation:**
```bash
curl -X POST "https://documentiulia.ro/api/v1/receipts/upload.php" \
  -F "receipt=@/path/to/receipt.jpg"
# Response includes extracted data:
# {
#   "success": true,
#   "data": {
#     "vendor": "Extracted Name",
#     "amount": 150.00,
#     "date": "2025-11-29"
#   }
# }
```

---

# Part 3: Test Data & Environment Requirements

## 3.1 Test Data Requirements

### User Accounts

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| test_admin@accountech.com | Test123! | Admin | Full system testing |
| test_manager@accountech.com | Test123! | Manager | Approval workflows |
| test_accountant@accountech.com | Test123! | Accountant | Financial operations |
| test_hr@accountech.com | Test123! | HR Officer | HR/Payroll testing |
| test_sales@accountech.com | Test123! | Sales | CRM testing |
| test_employee@accountech.com | Test123! | Employee | Basic user testing |
| test_viewer@accountech.com | Test123! | Viewer | Read-only testing |

### Pre-existing Data

| Entity | Quantity | Notes |
|--------|----------|-------|
| Contacts (Customers) | 10+ | Various types (active, inactive) |
| Contacts (Vendors) | 5+ | For purchase orders |
| Invoices | 50+ | Various statuses (draft, sent, paid, overdue) |
| Bills | 20+ | Various payment states |
| Products | 25+ | Different categories, stock levels |
| Employees | 5+ | With salary data |
| Projects | 3+ | Different methodologies |
| Tasks | 20+ | Various statuses |
| Time Entries | 50+ | Across projects |
| Expenses | 20+ | Various categories, approval states |
| Bank Accounts | 2+ | With transactions |
| Leads/Opportunities | 10+ | Various pipeline stages |

### Test Files

| File Type | Purpose |
|-----------|---------|
| receipt_sample.jpg | OCR testing |
| receipt_sample.pdf | PDF receipt upload |
| invoice_template.pdf | PDF generation verification |
| profile_photo.png | User avatar upload |
| product_image.jpg | Product catalog image |
| large_file.zip (>10MB) | File size limit testing |
| malicious_script.svg | Security testing (XSS) |

---

## 3.2 Environment Requirements

### Application Environment

| Component | Requirement |
|-----------|-------------|
| Base URL | https://documentiulia.ro |
| API Base URL | https://documentiulia.ro/api/v1 |
| Database | PostgreSQL (accessible for validation) |
| Database Name | accountech_production (or accountech_test) |
| SSL | Required (HTTPS) |

### Database Access (For Validation)

```bash
# Connection details
Host: 127.0.0.1
Port: 5432
Database: accountech_production
Username: accountech_app
Password: [stored securely]

# Test connection
PGPASSWORD='...' psql -h 127.0.0.1 -U accountech_app -d accountech_production -c "\dt"
```

### Test Tools Required

| Tool | Purpose |
|------|---------|
| Browser (Chrome/Firefox) | UI testing |
| DevTools | Network inspection, console logs |
| Postman/curl | API testing |
| psql | Database validation |
| Playwright/Cypress | Automated E2E testing |
| jq | JSON parsing |

### Environment Variables

```bash
# Test Configuration
TEST_BASE_URL="https://documentiulia.ro"
TEST_API_URL="https://documentiulia.ro/api/v1"
TEST_ADMIN_EMAIL="test_admin@accountech.com"
TEST_ADMIN_PASSWORD="Test123!"
TEST_COMPANY_ID="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
```

---

# Part 4: Reporting Defects

## Defect Report Template

```markdown
## DEFECT REPORT

### Defect ID: [AUTO-GENERATED or DEF-YYYY-MM-DD-XXX]

### Title:
[Clear, concise summary of the issue]
Example: "Invoice total calculation incorrect when VAT rate changed"

---

### Severity: [Critical | High | Medium | Low]
- **Critical**: System crash, data loss, security breach, payment failures
- **High**: Major feature broken, no workaround
- **Medium**: Feature partially broken, workaround exists
- **Low**: Minor UI issue, cosmetic defect

### Priority: [P1 | P2 | P3 | P4]
- **P1**: Fix immediately (production blocker)
- **P2**: Fix in current sprint
- **P3**: Fix in next sprint
- **P4**: Backlog

---

### Environment:
- **URL**: https://documentiulia.ro
- **Browser**: Chrome 120.0.6099.109
- **OS**: Windows 11 / macOS 14.1 / Ubuntu 22.04
- **User Role**: Admin
- **Test Account**: test_admin@accountech.com

---

### Steps to Reproduce (Frontend):
1. Navigate to `/invoices/new`
2. Select customer "ABC Company"
3. Add line item: Description="Test", Qty=1, Price=100, VAT=19%
4. Verify total shows 119.00
5. Change VAT rate to 9%
6. **OBSERVE**: Total still shows 119.00 (should be 109.00)

---

### Expected Result:

**Frontend:**
- Invoice total should recalculate to 109.00 RON
- VAT amount should update to 9.00 RON
- UI should reflect changes immediately

**Backend:**
- API should return calculated total: 109.00
- VAT amount in response: 9.00

---

### Actual Result:

**Frontend:**
- Total remains at 119.00 RON
- VAT amount shows 19.00 (old value)
- No visual update occurs

**Backend:**
- API response shows correct values (109.00)
- UI is not updating from API response

---

### Evidence:

1. **Screenshot**: [Attach screenshot showing incorrect total]
2. **Video**: [Screen recording of reproduction steps]
3. **API Response Log**:
```json
{
  "subtotal": 100.00,
  "vat_rate": 9,
  "vat_amount": 9.00,
  "total": 109.00
}
```
4. **Console Error**:
```
TypeError: Cannot read property 'vatRate' of undefined
    at InvoiceForm.js:142
```
5. **Network Tab**: [Screenshot showing API call and response]

---

### Root Cause Analysis (Optional):
The React state for VAT rate is not triggering a recalculation when changed. The useEffect hook listening for vatRate changes is missing the dependency.

### Suggested Fix (Optional):
In `InvoiceForm.js` line 142, add `vatRate` to useEffect dependency array:
```javascript
useEffect(() => {
  recalculateTotal();
}, [lineItems, vatRate]); // Added vatRate
```

---

### Related Issues:
- DEF-2025-11-25-003 (similar calculation bug in bills)
- TASK-456 (VAT refactoring story)

---

### Attachments:
- [ ] screenshot_defect_001.png
- [ ] video_reproduction.mp4
- [ ] network_log.har
- [ ] console_errors.txt

---

### Reporter: [Name]
### Date Reported: 2025-11-29
### Assigned To: [Developer Name]
### Sprint: Sprint 5
### Resolution: [Open | In Progress | Fixed | Won't Fix | Duplicate]
```

---

# Part 5: Final Checklist

## E2E Test Completion Checklist

### User Authentication & Authorization
- [ ] User registration creates account successfully
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails gracefully
- [ ] Password reset flow works end-to-end
- [ ] Session timeout handled correctly
- [ ] Role-based access enforced on all routes
- [ ] JWT token refresh works
- [ ] Logout clears session completely

### Core Business Workflows
- [ ] Invoice creation flow complete (customer → line items → save → PDF)
- [ ] Invoice payment recording updates status
- [ ] Bill creation and payment tracking works
- [ ] Expense claim submission and approval workflow complete
- [ ] Employee time entry to payroll processing works
- [ ] CRM lead to invoice conversion successful
- [ ] Purchase order to stock update flow complete
- [ ] Project creation with tasks and time tracking works

### Data Operations (CRUD)
- [ ] Create operations persist data correctly
- [ ] Read operations return expected data
- [ ] Update operations modify only intended fields
- [ ] Delete operations (soft/hard) work correctly
- [ ] List operations support filtering, sorting, pagination
- [ ] Search functionality returns accurate results

### API Validation
- [ ] All endpoints return correct HTTP status codes
- [ ] Response payloads match expected schema
- [ ] Error responses include appropriate messages
- [ ] Authentication required endpoints reject unauthenticated requests
- [ ] Rate limiting works (if implemented)
- [ ] CORS headers present for cross-origin requests

### UI/UX Validation
- [ ] Forms validate input before submission
- [ ] Error messages are user-friendly and specific
- [ ] Success notifications appear for completed actions
- [ ] Loading indicators show during async operations
- [ ] Responsive design works on mobile, tablet, desktop
- [ ] Navigation is consistent and functional
- [ ] Modals/dialogs open and close correctly
- [ ] Date pickers, dropdowns, and other controls work

### Data Integrity
- [ ] Required fields enforced in database
- [ ] Foreign key relationships maintained
- [ ] Unique constraints prevent duplicates
- [ ] Soft deletes preserve data for audit
- [ ] Timestamps (created_at, updated_at) accurate
- [ ] Multi-tenant data isolation verified

### Security Validation
- [ ] Passwords stored as hashes (not plain text)
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] CSRF protection active (if applicable)
- [ ] Sensitive data not exposed in logs
- [ ] API keys/secrets not in frontend code

### Integration Points
- [ ] E-Factura ANAF integration works (sandbox)
- [ ] Bank connection and sync functional
- [ ] Receipt OCR processing accurate
- [ ] Email dispatch working
- [ ] PDF generation successful
- [ ] File upload/download working

### Edge Cases & Error Handling
- [ ] Invalid input handled gracefully
- [ ] Network failures show recovery options
- [ ] Concurrent edits detected and handled
- [ ] Large data sets don't crash UI
- [ ] Empty states display helpful messages
- [ ] 404 and error pages styled correctly

### Performance (Optional)
- [ ] Page load under 3 seconds
- [ ] API responses under 500ms (typical)
- [ ] List pagination prevents large data loads
- [ ] Images optimized for web

---

## Test Execution Summary Template

```markdown
## E2E TEST EXECUTION SUMMARY

### Test Run Information
- **Date**: 2025-11-29
- **Environment**: Production / Staging / UAT
- **Tester**: [Name]
- **Duration**: [X hours]

### Results Overview

| Category | Total | Passed | Failed | Blocked | Skip |
|----------|-------|--------|--------|---------|------|
| Authentication | 8 | 7 | 1 | 0 | 0 |
| Core Workflows | 15 | 14 | 1 | 0 | 0 |
| CRUD Operations | 25 | 23 | 2 | 0 | 0 |
| UI/UX | 12 | 11 | 1 | 0 | 0 |
| Edge Cases | 10 | 9 | 1 | 0 | 0 |
| Integration | 8 | 6 | 1 | 1 | 0 |
| **TOTAL** | **78** | **70** | **7** | **1** | **0** |

### Pass Rate: 89.7%

### Critical Defects Found: 2
1. DEF-001: Invoice VAT calculation bug
2. DEF-002: Payroll tax calculation error

### High Defects Found: 3
1. DEF-003: Bank sync fails on certain accounts
2. DEF-004: Receipt OCR timeout on large images
3. DEF-005: Project task drag-drop broken on mobile

### Recommendations
1. Fix critical defects before release
2. Re-test payment flows after fix
3. Consider additional mobile testing

### Sign-off
- [ ] QA Lead Approval
- [ ] Product Owner Approval
- [ ] Release Manager Approval
```

---

# Appendix A: API Endpoint Reference

## Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register.php | User registration |
| POST | /api/v1/auth/login.php | User login |
| GET | /api/v1/auth/me.php | Get current user |
| POST | /api/v1/auth/logout.php | User logout |
| POST | /api/v1/auth/password/reset.php | Password reset |

## Core Business Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/v1/invoices/*.php | Invoice operations |
| GET/POST | /api/v1/bills/*.php | Bill operations |
| GET/POST | /api/v1/expenses/*.php | Expense operations |
| GET/POST | /api/v1/crm/contacts.php | Contact management |
| GET/POST | /api/v1/hr/employees.php | Employee management |
| GET/POST | /api/v1/hr/payroll/*.php | Payroll operations |
| GET/POST | /api/v1/projects/*.php | Project management |
| GET/POST | /api/v1/inventory/*.php | Inventory operations |

## Full endpoint list available at: `/var/www/documentiulia.ro/api/v1/`

---

# Appendix B: Database Schema Reference

## Key Tables for Validation

```sql
-- Users and Authentication
users (id, email, password_hash, first_name, last_name, role, status, created_at)
company_users (id, company_id, user_id, role, permissions)

-- Financial
invoices (id, company_id, customer_id, invoice_number, status, subtotal, vat_amount, total_amount)
invoice_line_items (id, invoice_id, description, quantity, unit_price, vat_rate)
bills (id, company_id, vendor_id, bill_number, status, total_amount)
expenses (id, company_id, user_id, category, amount, status)

-- CRM
contacts (id, company_id, contact_type, name, email, phone, cui)
opportunities (id, company_id, contact_id, name, stage, value)
leads (id, company_id, name, status)

-- Inventory
products (id, company_id, name, sku, price, cost)
stock_levels (id, product_id, warehouse_id, quantity)
stock_movements (id, product_id, movement_type, quantity, reference_id)

-- HR
employees (id, company_id, user_id, first_name, last_name, position, salary)
payroll_periods (id, company_id, period_month, period_year, status)
payroll_records (id, period_id, employee_id, gross_salary, net_salary)

-- Projects
projects (id, company_id, name, status, methodology)
tasks (id, project_id, title, status, assignee_id)
time_entries (id, user_id, project_id, task_id, hours, entry_date)
```

---

**Document End**

*This E2E Testing Plan should be reviewed and updated as the platform evolves. All test scenarios should be automated where possible using tools like Playwright or Cypress.*
