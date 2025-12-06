# User Acceptance Testing (UAT) Guide

## Test Environment

**URL:** https://documentiulia.ro
**API Base:** https://documentiulia.ro/api/v1
**Environment:** Production
**Date:** 2025-11-29

---

## Test Accounts

### Admin Account
- **Email:** test_admin@accountech.com
- **Password:** Test123!
- **Role:** Admin (full access)
- **Company ID:** aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

### Manager Account
- **Email:** test_manager@accountech.com
- **Password:** Test123!
- **Role:** User (standard access)
- **Company ID:** aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

### Regular User Account
- **Email:** test_user@accountech.com
- **Password:** Test123!
- **Role:** User (limited access)
- **Company ID:** aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

---

## Testing Scenarios

### 1. Authentication Tests
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Session persistence after browser refresh
- [ ] Logout functionality
- [ ] JWT token expiration handling

### 2. Dashboard Tests
- [ ] Dashboard loads with summary widgets
- [ ] Financial metrics display correctly
- [ ] Charts render properly
- [ ] Recent activity shows correct data

### 3. Invoice Management
- [ ] List invoices with pagination
- [ ] Create new invoice with line items
- [ ] Edit existing invoice
- [ ] Delete invoice (admin only)
- [ ] Filter invoices by status
- [ ] Search invoices by customer

### 4. Contact Management
- [ ] List contacts (customers, vendors)
- [ ] Create new contact
- [ ] Edit contact details
- [ ] Delete contact
- [ ] Filter by contact type
- [ ] Search contacts by name/email

### 5. Expense Management
- [ ] List expenses
- [ ] Create new expense
- [ ] Smart suggestions based on vendor history
- [ ] Custom categories
- [ ] Attach receipt (file upload)

### 6. Bill Management
- [ ] List bills
- [ ] Create new bill
- [ ] Record payment
- [ ] Track payment status

### 7. Project Management
- [ ] List projects
- [ ] Create new project
- [ ] Assign tasks to project
- [ ] Track project progress

### 8. Task Management
- [ ] List tasks
- [ ] Create task with priority
- [ ] Update task status (drag & drop)
- [ ] Delete task
- [ ] Filter by status/priority

### 9. Time Tracking
- [ ] Log time entry
- [ ] View time reports
- [ ] Filter by project/user
- [ ] Billable vs non-billable hours

### 10. HR Module
- [ ] List employees
- [ ] View employee details
- [ ] Payroll periods list

### 11. Inventory Module
- [ ] List products
- [ ] View warehouses
- [ ] Stock movements history

### 12. Accounting
- [ ] Chart of accounts
- [ ] Journal entries
- [ ] Trial balance report
- [ ] Balance sheet report

### 13. CRM Module
- [ ] List CRM contacts
- [ ] Manage leads
- [ ] Track opportunities (full CRUD)

### 14. Reports
- [ ] Profit & Loss report
- [ ] Cash flow forecast
- [ ] Time tracking reports

---

## Mobile Testing Checklist

### Devices to Test
- [ ] iPhone (Safari)
- [ ] Android phone (Chrome)
- [ ] iPad (Safari)
- [ ] Android tablet (Chrome)

### Mobile-Specific Tests
- [ ] Navigation menu (hamburger)
- [ ] Forms are usable on small screens
- [ ] Tables scroll horizontally
- [ ] Touch targets are adequate size
- [ ] No horizontal overflow on pages

---

## Performance Acceptance Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Page Load Time | < 3 seconds | Pass |
| API Response Time | < 500ms | Pass (avg 10ms) |
| Concurrent Users | 100+ | Pass (500+ RPS) |
| Error Rate | < 0.1% | Pass (0%) |

---

## Security Tests

- [ ] Unauthenticated API requests rejected
- [ ] Invalid tokens rejected
- [ ] SQL injection prevented
- [ ] XSS attacks sanitized
- [ ] HTTPS enforced
- [ ] CORS properly configured

---

## Bug Reporting Template

```
**Summary:** [Brief description]
**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
**Actual Result:**
**Browser/Device:**
**Screenshot:** [if applicable]
**Severity:** Critical / High / Medium / Low
```

---

## Sign-Off

| Tester | Date | Status |
|--------|------|--------|
| | | |
| | | |

**UAT Approved:** [ ] Yes [ ] No
**Comments:**

---

## API Testing with cURL

### Login
```bash
curl -X POST "https://documentiulia.ro/api/v1/auth/login.php" \
  -H "Content-Type: application/json" \
  -d '{"email":"test_admin@accountech.com","password":"Test123!"}'
```

### List Invoices (with token)
```bash
TOKEN="your_jwt_token_here"
curl "https://documentiulia.ro/api/v1/invoices/list.php" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
```

### Create Contact
```bash
curl -X POST "https://documentiulia.ro/api/v1/contacts/create.php" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"Test Customer","contact_type":"customer","email":"test@example.com"}'
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-29
