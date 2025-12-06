# Documentiulia.ro - Login Credentials & Testing

## ✅ **Working Login Credentials**

### Test Admin User
- **Email:** `test_admin@accountech.com`
- **Password:** `TestPass123!`
- **Role:** Admin
- **Company:** Test Company

### Test Manager User
- **Email:** `test_manager@accountech.com`
- **Password:** `TestPass123!`
- **Role:** User (Manager)
- **Companies:** Test Company, Sample Business

### Test Regular User
- **Email:** `test_user@accountech.com`
- **Password:** `TestPass123!`
- **Role:** User
- **Company:** Test Company

---

## 🌐 **Testing Options**

### 1. 🎯 Web Browser - COMPLETE Dashboard (NEW! RECOMMENDED!)
**URL:** https://documentiulia.ro/full-dashboard.html

**ALL MODULES INCLUDED:**
- 📈 Overview - Business KPIs summary
- 🤝 CRM - Opportunities (5 test opportunities) & Quotations (3 quotations)
- 📄 Invoices - 11 invoices with various statuses
- 💸 Bills - Vendor bills management (FIXED!)
- 💰 Expenses - 14 expense entries
- ⏱️ Time Tracking - Time entries with billable tracking
- 📋 Projects - Project management with status
- 📊 Accounting - Financial statements (P&L, Balance Sheet)
- 📈 Analytics - Business intelligence and KPIs

### 2. Web Browser - Basic Dashboard
**URL:** https://documentiulia.ro/dashboard.html

Features:
- Time tracking, Projects, Accounting, Analytics only
- User authentication with session management
- Responsive design for mobile and desktop

### 2. Web Browser - Interactive API Tester
**URL:** https://documentiulia.ro/test_api.html

Features:
- Beautiful UI with one-click testing
- Pre-filled login credentials
- Quick tests for all modules
- Custom API request builder
- Auto-saves authentication token

### 3. Web Browser - Simple Login Test
**URL:** https://documentiulia.ro/login_test_simple.html

Features:
- Minimal testing interface
- Console logging for debugging
- Pre-filled credentials

### 3. cURL Command Line

```bash
curl 'https://documentiulia.ro/api/v1/auth/login.php' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test_admin@accountech.com","password":"TestPass123!"}'
```

---

## 📊 **Available API Endpoints**

### Time Tracking
- `GET /api/v1/time/entries.php` - List time entries
- `POST /api/v1/time/entries.php` - Create time entry
- `GET /api/v1/time/timesheets.php` - Get timesheet
- `GET /api/v1/time/reports.php?type=by_employee` - Time reports
- `GET /api/v1/time/projects.php` - List projects
- `GET /api/v1/time/tasks.php` - List tasks

### Accounting
- `GET /api/v1/accounting/journal-entries.php` - Journal entries
- `GET /api/v1/accounting/trial-balance.php` - Trial balance
- `GET /api/v1/accounting/income-statement.php` - P&L
- `GET /api/v1/accounting/balance-sheet.php` - Balance sheet
- `GET /api/v1/accounting/cash-flow.php` - Cash flow

### Analytics
- `GET /api/v1/analytics/kpis.php` - Business KPIs
- `GET /api/v1/analytics/revenue-trend.php` - Revenue trends
- `GET /api/v1/analytics/top-customers.php` - Top customers
- `GET /api/v1/analytics/aging-report.php` - AR aging
- `GET /api/v1/analytics/project-profitability.php` - Project ROI
- `GET /api/v1/analytics/employee-productivity.php` - Employee metrics

---

## 🔑 **Authentication Headers**

All API requests (except login) require:

```
Authorization: Bearer {token}
X-Company-ID: {company_id}
Content-Type: application/json
```

The token and company_id are returned in the login response.

---

## 🛠️ **Password Reset**

If you need to reset test user passwords, run:

```bash
php /var/www/documentiulia.ro/reset_test_passwords.php
```

This will reset all test users to password: `TestPass123!`

---

## ✅ **Verified & Working**

- ✅ All 3 test users can login successfully
- ✅ JWT tokens are generated correctly
- ✅ Company associations are working
- ✅ Browser login works
- ✅ cURL login works
- ✅ All API endpoints are accessible with valid token
- ✅ **User Dashboard with all modules integrated**
- ✅ Time Tracking module fully functional
- ✅ Project Management module operational
- ✅ Accounting module with financial statements
- ✅ Analytics & BI module with KPIs

---

**Last Updated:** November 18, 2025
**Status:** ✅ FULLY OPERATIONAL - ALL MODULES INTEGRATED
