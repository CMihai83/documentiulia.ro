# Mock Data Summary for test_admin Account

**Date:** November 22, 2025
**Company ID:** aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
**User:** test_admin@accountech.com
**Password:** Test123!

---

## 📊 Data Overview

| Module | Count | Status Details |
|--------|-------|----------------|
| **Contacts** | 33 | Customer, Employee, Vendor |
| **Employees** | 5 | All active |
| **Invoices** | 24 | Draft, Sent, Paid, Overdue, Pending |
| **Bills** | 3 | Open, Paid, Pending |
| **Expenses** | 24 | Approved, Paid, Pending |
| **Expense Categories** | 12 | All active |
| **Opportunities** | 27 | Lead, Qualified, Proposal, Negotiation, Won |
| **Products** | 9 | All active (mix of services & goods) |
| **Projects** | 8 | Active, Planning, On Hold |
| **Time Entries** | 20 | All billable |

---

## 🧾 Financial Module Data

### Invoices (24)
- Various statuses: Draft, Sent, Paid, Overdue, Pending
- Date range: Last 90 days
- Amounts: 1,000 RON - 50,000 RON
- All linked to customer contacts

### Bills (3)
- From supplier contacts
- Statuses: Open, Paid, Pending
- Amounts: 1,000 RON - 20,000 RON
- Due dates within last 90 days

### Expenses (24)
- Categorized across 12 expense categories
- Statuses: Pending, Approved, Paid
- Amounts: 100 RON - 5,000 RON
- Linked to vendor contacts

### Expense Categories (12)
1. Office Rent
2. Utilities
3. Office Supplies
4. Travel & Transportation
5. Meals & Entertainment
6. Software Subscriptions
7. Marketing & Advertising
8. Professional Services
9. Insurance
10. Equipment & Maintenance
11. *(2 more from previous data)*

---

## 👥 CRM Module Data

### Contacts (33)
- **Customers:** ~15 contacts
- **Suppliers/Vendors:** ~13 contacts
- **Employees:** 5 contacts (linked to employee records)

### Opportunities (27)
- Stages: Lead, Qualified, Proposal, Negotiation, Closed Won
- Amounts: 10,000 RON - 100,000 RON
- Expected close dates: Next 90 days
- Sources: Website, Referral, Cold Call, Email, Social Media
- All assigned to test_admin user

---

## 📦 Inventory Module Data

### Products (9)
Mix of services and physical goods:

**Services:**
1. Professional Consulting - Hourly (350 RON/hour)
2. Software Development Package (8,500 RON)
3. Website Hosting Annual (600 RON/year)
4. Office Supplies Bundle (350 RON/month)
5. Cloud Storage 1TB (250 RON/year)
6. Video Conferencing License (300 RON/year)
7. Training Session - Full Day (2,800 RON)

**Physical Goods:**
8. Office Desk - Executive (2,100 RON) - *Inventory tracked*
9. Ergonomic Office Chair (1,400 RON) - *Inventory tracked*

All products have:
- SKU codes (PROD-001 to PROD-009)
- Purchase and selling prices
- 19% VAT rate
- Proper unit of measure (ora, proiect, an, buc, luna, zi)

---

## 📋 Project Management Data

### Projects (8)
- Linked to customer contacts
- Statuses: Active, Planning, On Hold
- Budget range: 20,000 RON - 80,000 RON
- All billable projects
- Default hourly rate: 350 RON
- Date ranges: Started in last 30 days, ending in next 120 days

### Time Entries (20)
- Across 5 employees and multiple projects
- All billable entries
- Hours: 1-8 hours per entry
- Hourly rates: 150-350 RON
- Date range: Last 30 days

---

## 👨‍💼 HR Module Data

### Employees (5)
All employees are linked to contact records:
- All have active status
- Salary amounts configured
- Employee numbers assigned
- Contact information available

### Payroll
*(Existing payroll periods and items from previous data)*

---

## ✅ Testing Coverage

This mock data enables testing of:

### Financial Reports
- ✅ Profit & Loss Statement (with revenue and expenses)
- ✅ Balance Sheet exports
- ✅ Invoice aging reports
- ✅ Expense analysis by category

### CRM Features
- ✅ Contact management (customers, vendors, employees)
- ✅ Opportunity pipeline visualization
- ✅ Sales forecasting (based on probability)
- ✅ Lead conversion tracking

### Inventory Features
- ✅ Product catalog
- ✅ Inventory tracking (for physical goods)
- ✅ Pricing management
- ✅ SKU and barcode tracking

### Project Management
- ✅ Project dashboard
- ✅ Time tracking and billing
- ✅ Project profitability analysis
- ✅ Resource allocation

### HR & Payroll
- ✅ Employee management
- ✅ Payroll processing (with PayrollProcessor service)
- ✅ Payslip PDF generation
- ✅ Time entry approval

---

## 🔧 Files Modified/Created

### Bug Fixes
1. `/api/v1/hr/payroll/download-payslip.php` - Fixed employee field mappings
2. `/api/v1/hr/payroll/get.php` - Fixed employee field mappings
3. `/api/v1/reports/export-profit-loss.php` - Fixed CUI field mapping
4. `/api/v1/reports/export-balance-sheet.php` - Fixed CUI field mapping
5. `/services/payroll/PayrollProcessor.php` - **CREATED** - Complete payroll processing service

### Documentation
6. `/var/www/documentiulia.ro/BUG_FIXES_REPORT.md` - Complete bug documentation
7. `/var/www/documentiulia.ro/MOCK_DATA_SUMMARY.md` - This file

### Scripts
8. `/var/www/documentiulia.ro/scripts/add_complete_mock_data_corrected.sql` - Comprehensive mock data
9. `/var/www/documentiulia.ro/test_payslip_generation.php` - PDF testing script

---

## 🧪 Next Steps: Web Testing

Test all functionality through the web interface at **https://documentiulia.ro**

### Login Credentials
- **Email:** test_admin@accountech.com
- **Password:** Test123!

### Pages to Test

1. **Dashboard** - `/dashboard`
   - Overview widgets
   - Recent activity
   - Quick stats

2. **Invoices** - `/dashboard/invoices`
   - List view (should show 24 invoices)
   - Create new invoice
   - PDF export/download
   - Status updates

3. **Bills** - `/dashboard/bills`
   - List view (should show 3 bills)
   - Create new bill
   - Payment tracking

4. **Expenses** - `/dashboard/expenses`
   - List view (should show 24 expenses)
   - Filter by category
   - Expense approval workflow

5. **CRM** - `/dashboard/crm`
   - Contacts list (33 contacts)
   - Opportunities pipeline (27 opportunities)
   - Lead conversion

6. **Products** - `/dashboard/products` or `/dashboard/inventory`
   - Product catalog (9 products)
   - Inventory levels
   - Price management

7. **Projects** - `/dashboard/projects`
   - Project list (8 projects)
   - Time entries (20 entries)
   - Project profitability

8. **Payroll** - `/dashboard/payroll`
   - Payroll periods
   - **Process Payroll** (NOW WORKING!)
   - **Download Payslip PDFs** (NOW WORKING!)
   - Employee list

9. **Reports** - `/dashboard/reports`
   - Profit & Loss export (Excel/CSV)
   - Balance Sheet export
   - Custom reports

10. **Fiscal Calendar** - `/dashboard/fiscal-calendar`
    - View declarations
    - Download declaration PDFs

---

## ✅ Verified Functionality

### PDF Generation ✅
- **Payslip PDFs:** Working (25KB files generated successfully)
- **Declaration PDFs:** Template-based system ready
- **Report Exports:** Excel/CSV generation ready

### Payroll Processing ✅
- **PayrollProcessor service:** Fully implemented
- **Romanian tax calculations:** CAS 25%, CASS 10%, Tax 10%
- **Personal deductions:** 510 RON/month
- **Automatic calculations:** Gross to net salary

### Database Schema ✅
- All table structures verified
- Foreign key relationships intact
- Proper UUID usage throughout
- Timestamp tracking enabled

---

**Status:** Platform ready for comprehensive web testing! 🚀
