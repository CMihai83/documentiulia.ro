# DocumentIulia Frontend Testing Checklist
**Date**: 2025-11-20
**Status**: In Progress

## Test Credentials
- **Test Admin**: test_admin@accountech.com / (password to be tested)
- **Test Manager**: test_manager@accountech.com / (password to be tested)
- **Test User**: test_user@accountech.com / (password to be tested)

## Testing Methodology
1. Access https://documentiulia.ro/
2. Test each page systematically
3. Test all buttons and forms
4. Verify data loads correctly
5. Check for console errors
6. Test responsiveness

---

## 1. PUBLIC PAGES

### Landing Page (/)
- [ ] Page loads correctly
- [ ] "Începe Gratuit" button works
- [ ] "Autentificare" button redirects to /login
- [ ] Hero section displays correctly
- [ ] Features section visible
- [ ] Pricing section visible
- [ ] Footer navigation works

### Login Page (/login)
- [ ] Page loads correctly
- [ ] Email input works
- [ ] Password input works
- [ ] "Autentificare" button submits form
- [ ] Error messages display for invalid credentials
- [ ] Success redirects to /dashboard
- [ ] "Înregistrare" link works

### Register Page (/register)
- [ ] Page loads correctly
- [ ] All form fields present (name, email, password, company)
- [ ] "Înregistrare" button submits form
- [ ] Validation works
- [ ] Success creates account and redirects
- [ ] "Autentificare" link works

---

## 2. DASHBOARD & NAVIGATION

### Dashboard (/dashboard)
- [ ] Page loads with authentication
- [ ] Statistics cards display (4 cards)
- [ ] Recent invoices table loads
- [ ] Recent expenses table loads
- [ ] Charts render correctly
- [ ] All data is company-specific
- [ ] Sidebar navigation visible
- [ ] Top bar with user info visible

### Sidebar Navigation
- [ ] Logo links to dashboard
- [ ] Panou Control link works
- [ ] Contabilitate dropdown expands
  - [ ] Facturi link works
  - [ ] Chitanțe link works
  - [ ] Cheltuieli link works
  - [ ] Rapoarte link works
- [ ] Operațiuni dropdown expands
  - [ ] Inventar link works
  - [ ] Comenzi Achiziție link works
- [ ] Vânzări & Clienți dropdown expands
  - [ ] CRM link works
  - [ ] Contacte link works
- [ ] Management dropdown expands
  - [ ] Proiecte link works
  - [ ] Pontaj Timp link works
- [ ] Analize dropdown expands
  - [ ] Analize & BI link works
  - [ ] Analize AI link works
- [ ] Asistență AI dropdown expands
  - [ ] Consultant Business link works
  - [ ] Legislație Fiscală link works
  - [ ] Arbori de Decizie link works
- [ ] **NEW: Setări dropdown expands**
  - [ ] **Setări Generale link works**
  - [ ] **Categorii Cheltuieli link works (/settings/categories)**
- [ ] Tutoriale & Ghiduri link works
- [ ] Context Personal link works
- [ ] Settings button in user section works
- [ ] Logout button works

---

## 3. ACCOUNTING MODULES

### Invoices (/invoices)
- [ ] Page loads
- [ ] Invoice list displays
- [ ] "Factură Nouă" button works
- [ ] Search/filter works
- [ ] Pagination works
- [ ] View invoice button works
- [ ] Edit invoice button works
- [ ] Delete invoice button works (with confirmation)
- [ ] Export button works

### Invoice Form (/invoices/new)
- [ ] Page loads
- [ ] All form fields present
- [ ] Client dropdown works
- [ ] Product line items can be added
- [ ] Product line items can be removed
- [ ] Calculations update automatically
- [ ] Tax calculation correct
- [ ] "Salvare" button creates invoice
- [ ] "Anulare" button returns to list

### Bills (/bills)
- [ ] Page loads
- [ ] Bills list displays
- [ ] "Chitanță Nouă" button works
- [ ] Search/filter works
- [ ] All CRUD operations work

### Expenses (/expenses)
- [ ] Page loads
- [ ] Expenses list displays
- [ ] "Cheltuială Nouă" button opens modal
- [ ] **NEW: Smart Category Suggestions appear when vendor selected**
- [ ] **NEW: Suggestions show confidence scores**
- [ ] **NEW: Can click suggestion to auto-fill category**
- [ ] Category dropdown works
- [ ] Vendor dropdown works
- [ ] Amount calculation correct
- [ ] File upload works
- [ ] Save creates expense
- [ ] Edit expense works
- [ ] Delete expense works

### Reports (/reports)
- [ ] Page loads
- [ ] Income Statement tab works
- [ ] Balance Sheet tab works
- [ ] Cash Flow tab works
- [ ] Profit & Loss tab works
- [ ] Date range filter works
- [ ] Export PDF button works
- [ ] Export Excel button works
- [ ] Charts render correctly

---

## 4. INVENTORY MODULES

### Inventory Dashboard (/inventory)
- [ ] Page loads
- [ ] Overview cards display (4 stats)
- [ ] Low stock alerts table displays
- [ ] Recent movements table displays
- [ ] Quick action buttons work

### Products (/inventory/products)
- [ ] Page loads
- [ ] Products list displays
- [ ] "Produs Nou" button works
- [ ] Product form has all fields
- [ ] SKU field works
- [ ] Category dropdown works
- [ ] Unit price field works (note: field compatibility fixed)
- [ ] Stock quantity field works
- [ ] Save creates product
- [ ] Edit product works
- [ ] Delete product works

### Stock Levels (/inventory/stock-levels)
- [ ] Page loads (with company context fix)
- [ ] Stock levels table displays
- [ ] Warehouse filter works
- [ ] Product search works
- [ ] Adjust stock button works
- [ ] Bulk operations work

### Warehouses (/inventory/warehouses)
- [ ] Page loads (with company context fix)
- [ ] Warehouses list displays
- [ ] "Depozit Nou" button works
- [ ] Warehouse form works
- [ ] Edit warehouse works
- [ ] Delete warehouse works (with validation)

### Low Stock Alerts (/inventory/low-stock)
- [ ] Page loads
- [ ] Alerts list displays with correct threshold warnings
- [ ] Reorder button works
- [ ] Clear alert button works

### Stock Movements (/inventory/movements)
- [ ] Page loads
- [ ] Movements history displays
- [ ] Date range filter works
- [ ] Movement type filter works
- [ ] Warehouse filter works

### Stock Adjustments (/inventory/adjustments)
- [ ] Page loads
- [ ] Adjustments list displays
- [ ] "Ajustare Nouă" button works
- [ ] Adjustment form works
- [ ] Reason dropdown works
- [ ] Save creates adjustment

### Stock Transfers (/inventory/transfers)
- [ ] Page loads
- [ ] Transfers list displays
- [ ] "Transfer Nou" button works
- [ ] From/To warehouse dropdowns work
- [ ] Product selection works
- [ ] Quantity validation works
- [ ] Save creates transfer

---

## 5. CRM MODULES

### CRM Dashboard (/crm)
- [ ] Page loads
- [ ] Sales pipeline chart displays
- [ ] Recent opportunities table displays
- [ ] Conversion rate stats display
- [ ] Quick action buttons work

### Contacts (/contacts or /crm/contacts)
- [ ] Page loads
- [ ] Contacts list displays
- [ ] "Contact Nou" button works
- [ ] Contact form has all fields
- [ ] Save creates contact
- [ ] Edit contact works
- [ ] Delete contact works
- [ ] Import contacts button works

### Opportunities (/crm/opportunities)
- [ ] Page loads
- [ ] Opportunities list displays
- [ ] Kanban board view works
- [ ] "Oportunitate Nouă" button works
- [ ] Stage progression works
- [ ] Edit opportunity works
- [ ] Convert to quotation works

### Opportunity Detail (/crm/opportunities/:id)
- [ ] Page loads
- [ ] Opportunity details display
- [ ] Activity timeline displays
- [ ] Add note works
- [ ] Add task works
- [ ] Update stage works
- [ ] Generate quotation works

### Quotations (/crm/quotations)
- [ ] Page loads
- [ ] Quotations list displays
- [ ] "Ofertă Nouă" button works
- [ ] Quotation form works
- [ ] Product line items work
- [ ] Pricing calculation correct
- [ ] Save creates quotation
- [ ] Convert to invoice works
- [ ] Send email works

---

## 6. PURCHASE & TIME TRACKING

### Purchase Orders (/purchase-orders)
- [ ] Page loads (500 error FIXED)
- [ ] Purchase orders list displays
- [ ] "Comandă Nouă" button works
- [ ] PO form works
- [ ] Vendor selection works
- [ ] Product line items work
- [ ] Approval workflow works
- [ ] Receive goods button works

### Purchase Order Detail (/purchase-orders/:id)
- [ ] Page loads
- [ ] PO details display
- [ ] Status badge shows correctly
- [ ] Approve button works (if pending)
- [ ] Reject button works (if pending)
- [ ] Receive button works (if approved)
- [ ] Print button works

### Time Tracking Dashboard (/time-tracking)
- [ ] Page loads
- [ ] Overview cards display
- [ ] Time entries table displays
- [ ] Charts render correctly
- [ ] Quick timer works

### Time Entries (/time/entries)
- [ ] Page loads
- [ ] Time entries list displays
- [ ] "Intrare Nouă" button works
- [ ] **Employee auto-detected from JWT (FIXED)**
- [ ] Project dropdown works
- [ ] Task dropdown works
- [ ] Start/End time pickers work
- [ ] Duration calculates automatically
- [ ] Save creates entry
- [ ] Edit entry works
- [ ] Delete entry works

### Projects (/projects)
- [ ] Page loads
- [ ] **"New Project" button works (FIXED - no longer redirects to home)**
- [ ] **Project modal opens correctly**
- [ ] **Project form has all fields**
- [ ] Projects list displays
- [ ] Project cards show progress
- [ ] Edit project works
- [ ] Delete project works
- [ ] Project detail view works

---

## 7. ANALYTICS & BUSINESS INTELLIGENCE

### Analytics Dashboard (/analytics)
- [ ] Page loads
- [ ] KPI cards display (6-8 metrics)
- [ ] Revenue chart renders
- [ ] Expense breakdown chart renders
- [ ] Profit margin trend renders
- [ ] Top products/services table displays
- [ ] Date range selector works
- [ ] Export data button works

### AI Insights (/insights)
- [ ] Page loads
- [ ] AI-generated insights display
- [ ] Recommendations section displays
- [ ] Trend analysis charts render
- [ ] Anomaly detection alerts display
- [ ] Refresh insights button works

---

## 8. CUSTOMIZATION FEATURES (NEW)

### Custom Expense Categories (/settings/categories)
- [ ] **Page loads correctly**
- [ ] **3 stat cards display (Total, Custom, Top-level)**
- [ ] **Category tree view displays**
- [ ] **Expand/collapse icons work**
- [ ] **"Categorie Nouă" button opens modal**
- [ ] **Category form has all fields:**
  - [ ] Name field
  - [ ] Parent category dropdown
  - [ ] Tax deductible checkbox
  - [ ] Receipt required checkbox
- [ ] **Save creates category**
- [ ] **New category inherits parent properties**
- [ ] **Category appears in tree**
- [ ] **Edit category works**
- [ ] **Delete custom category works**
- [ ] **Cannot delete standard categories**
- [ ] **Usage statistics display correctly**
- [ ] **Visual indicator for custom vs standard categories**

### Custom Chart of Accounts (/accounting/chart-of-accounts)
- [ ] Page loads
- [ ] **"+ Custom Account" button opens modal**
- [ ] **Account form has all fields:**
  - [ ] Account name
  - [ ] Account code (with validation)
  - [ ] Category dropdown (Assets, Liabilities, Equity, Revenue, COGS, OpEx)
  - [ ] Subcategory dropdown (changes based on category)
  - [ ] Description field
- [ ] **Code range validation works (COGS: 5000-5999, OpEx: 6000-7999)**
- [ ] **Real-time aggregation preview displays**
- [ ] **GAAP compliance maintained**
- [ ] **Save creates custom account**
- [ ] **New account appears in chart**
- [ ] **Account assigned to correct financial statement**
- [ ] **Edit custom account works**
- [ ] **Cannot delete accounts with transactions**

### Smart Category Suggestions (in Expenses form)
- [ ] **Component displays when vendor selected**
- [ ] **Suggestions appear within 1-2 seconds**
- [ ] **Confidence badges color-coded:**
  - [ ] High (>70%) - Green
  - [ ] Medium (50-70%) - Blue
  - [ ] Low (30-50%) - Yellow
  - [ ] Very Low (<30%) - Gray
- [ ] **Shows top 3 suggestions by default**
- [ ] **"Show more" expands to show more suggestions**
- [ ] **Click suggestion auto-fills category**
- [ ] **Usage statistics display (X times, Last: date)**
- [ ] **Works with multiple vendors**
- [ ] **Handles no suggestions gracefully**

---

## 9. AI ASSISTANCE

### Business Consultant (/business-consultant)
- [ ] Page loads
- [ ] Chat interface displays
- [ ] Message input works
- [ ] Send button works
- [ ] AI response appears
- [ ] Conversation history maintained
- [ ] Export conversation works

### Fiscal Law (/fiscal-law)
- [ ] Page loads
- [ ] Search bar works
- [ ] Categories display
- [ ] Articles/laws display
- [ ] AI consultant integration works
- [ ] Ask question feature works

### Fiscal Law AI (Authenticated)
- [ ] Same as public page but with personalized context
- [ ] User's business context considered in answers

### Decision Trees (/decision-trees)
- [ ] Page loads
- [ ] Decision trees list displays
- [ ] Tree navigator works
- [ ] Question/answer flow works
- [ ] Result recommendations display
- [ ] Export result works

---

## 10. SETTINGS & ADMIN

### Settings (/settings)
- [ ] Page loads
- [ ] Profile section displays
- [ ] Company settings section displays
- [ ] Email field works
- [ ] Password change works
- [ ] Company name editable
- [ ] Tax settings configurable
- [ ] Save button works
- [ ] **Link to /settings/categories visible**

### Admin - Decision Tree Updates (/admin/decision-tree-updates)
- [ ] Page loads (admin only)
- [ ] Current trees list displays
- [ ] "Update Tree" button works
- [ ] Upload new tree works
- [ ] Edit tree structure works
- [ ] Delete tree works (with confirmation)
- [ ] Publish changes works

---

## 11. MOBILE RESPONSIVENESS

### Mobile View (< 768px)
- [ ] Sidebar collapses to hamburger menu
- [ ] Hamburger menu opens/closes
- [ ] All pages stack correctly
- [ ] Tables become scrollable
- [ ] Forms remain usable
- [ ] Buttons remain tappable
- [ ] Charts resize appropriately

### Tablet View (768px - 1024px)
- [ ] Layout adjusts appropriately
- [ ] Sidebar behavior correct
- [ ] All features accessible

---

## 12. PERFORMANCE & ERRORS

### Console Checks
- [ ] No JavaScript errors in console
- [ ] No 404 errors for assets
- [ ] No CORS errors
- [ ] API calls return expected status codes

### Loading States
- [ ] Loading spinners display during data fetch
- [ ] Skeleton screens display where appropriate
- [ ] No blank pages while loading

### Error Handling
- [ ] Network errors display user-friendly messages
- [ ] Form validation errors display clearly
- [ ] API errors display appropriate messages
- [ ] 404 page displays for invalid routes

---

## 13. DATA INTEGRITY

### Company Context
- [ ] All data filtered by company_id
- [ ] No cross-company data leakage
- [ ] User can only see their company's data

### User Permissions
- [ ] Admin role can access /admin routes
- [ ] Non-admin cannot access /admin routes
- [ ] User role restrictions enforced

---

## TEST RESULTS SUMMARY

**Date**: _______________
**Tester**: _______________
**Browser**: _______________
**Device**: _______________

**Total Tests**: _______
**Passed**: _______
**Failed**: _______
**Blocked**: _______

**Pass Rate**: _______%

---

## ISSUES FOUND

| # | Page | Issue | Severity | Status |
|---|------|-------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## NOTES

_Add any additional observations or recommendations here._

---

**Next Actions**:
1. Complete manual testing using this checklist
2. Document all failures with screenshots
3. Create GitHub issues for bugs
4. Prioritize fixes by severity
5. Retest after fixes deployed
