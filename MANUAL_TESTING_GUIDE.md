# DocumentIulia.ro - Comprehensive Manual Testing Guide
## One-Year Business Cycle Simulation

This guide simulates a real Romanian business user's workflow over a complete fiscal year, testing all platform functionality through the browser interface only.

---

## TEST ENVIRONMENT
- **URL**: https://documentiulia.ro
- **Browser**: Chrome/Firefox (latest)
- **Test Company**: SC TEST SOLUTIONS SRL
- **CUI**: RO12345678 (use valid format)
- **Test Period**: January 1 - December 31, 2025

---

# PHASE 1: INITIAL SETUP (Week 1)

## 1.1 Account Registration
1. Navigate to https://documentiulia.ro/register
2. Enter test email: `test.accountant@example.com`
3. Set password (min 8 chars, 1 uppercase, 1 number)
4. Verify email confirmation
5. Complete 2FA setup

**Validation Checkpoints:**
- [ ] Registration email received within 2 minutes
- [ ] Dashboard loads after first login
- [ ] Welcome onboarding wizard appears

## 1.2 Company Setup
Navigate to: **Settings > Company Profile**

Enter the following test data:
```
Company Name: SC TEST SOLUTIONS SRL
CUI: RO12345678
Reg. Number: J40/1234/2020
Address: Str. Victoriei 100, Sector 1, București
County: București
Postal Code: 010001
Email: contact@testsolutions.ro
Phone: +40 21 123 4567
Bank: BCR
IBAN: RO49RNCB0082044172810001
```

**Validation Checkpoints:**
- [ ] CUI validation shows green checkmark
- [ ] ANAF lookup auto-fills company data
- [ ] Company logo upload works (test with 500KB PNG)

## 1.3 VAT Configuration
Navigate to: **Settings > Tax Settings**

Configure:
```
VAT Registered: Yes
VAT Rate Standard: 21%
VAT Rate Reduced: 11% (for food/beverages per Legea 141/2025)
VAT Period: Monthly
e-Factura Enabled: Yes
SPV Certificate: Upload test certificate
```

**Validation Checkpoints:**
- [ ] VAT rates display correctly
- [ ] SPV certificate upload accepted
- [ ] ANAF connection test passes

## 1.4 Chart of Accounts Setup
Navigate to: **Finance > Chart of Accounts**

Verify default Romanian accounts:
```
411 - Clienți (Clients Receivable)
401 - Furnizori (Suppliers Payable)
5121 - Conturi la bănci în lei
4427 - TVA colectată (VAT Collected)
4426 - TVA deductibilă (VAT Deductible)
707 - Venituri din vânzarea mărfurilor
607 - Cheltuieli privind mărfurile
```

**Validation Checkpoints:**
- [ ] All standard Romanian accounts present
- [ ] Account numbers follow Romanian standards
- [ ] Can add custom accounts

## 1.5 Add First Employees
Navigate to: **HR > Employees > Add Employee**

**Employee 1 - Director:**
```
Name: Ion Popescu
CNP: 1850101400001
Position: Director General
Gross Salary: 15,000 RON
Start Date: 01-01-2025
Contract Type: Full-time indefinite
```

**Employee 2 - Accountant:**
```
Name: Maria Ionescu
CNP: 2900315400002
Position: Contabil
Gross Salary: 8,000 RON
Start Date: 01-01-2025
Contract Type: Full-time indefinite
```

**Employee 3 - Sales:**
```
Name: Andrei Dumitrescu
CNP: 1951020400003
Position: Agent Vânzări
Gross Salary: 6,000 RON + Commission
Start Date: 01-01-2025
Contract Type: Full-time indefinite
```

**Validation Checkpoints:**
- [ ] CNP validation (checksum correct)
- [ ] Automatic tax calculation preview
- [ ] Contract PDF generation

## 1.6 Add Clients
Navigate to: **CRM > Clients > Add Client**

**Client 1 - Corporate:**
```
Name: SC ALPHA TRADE SRL
CUI: RO87654321
Address: Str. Industriei 50, Cluj-Napoca
Contact: Alexandru Marin
Email: contact@alphatrade.ro
Payment Terms: 30 days
Credit Limit: 50,000 RON
```

**Client 2 - SMB:**
```
Name: SC BETA SERVICES SRL
CUI: RO11223344
Address: Bd. Unirii 25, Timișoara
Contact: Elena Stanciu
Email: elena@betaservices.ro
Payment Terms: 15 days
Credit Limit: 20,000 RON
```

**Client 3 - Individual (PFA):**
```
Name: Vasile Georgescu PFA
CUI: 33445566
Address: Str. Primăverii 10, Brașov
Email: vasile.g@email.com
Payment Terms: Cash
```

## 1.7 Add Suppliers
Navigate to: **Procurement > Suppliers > Add Supplier**

**Supplier 1:**
```
Name: SC MEGA IMPORT SRL
CUI: RO99887766
Address: Str. Depozitelor 15, București
Contact: Mihai Radu
Email: comenzi@megaimport.ro
Payment Terms: 45 days
```

**Supplier 2:**
```
Name: SC UTILITIES PLUS SRL
CUI: RO55443322
Address: Str. Energiei 5, București
Email: facturi@utilitiesplus.ro
Payment Terms: 30 days
Category: Utilities
```

---

# PHASE 2: MONTHLY OPERATIONS

## MONTH 1 - JANUARY 2025

### Week 1: Sales Invoices

#### Invoice 1 - Standard VAT 21%
Navigate to: **Invoices > Create Invoice**
```
Client: SC ALPHA TRADE SRL
Invoice Date: 05-01-2025
Due Date: 04-02-2025
Items:
  - Servicii consultanță IT | Qty: 40 hours | Price: 150 RON/hr | VAT: 21%
  Subtotal: 6,000 RON
  VAT 21%: 1,260 RON
  TOTAL: 7,260 RON
```
**Actions:**
1. Click "Create Invoice"
2. Click "Preview" - verify PDF layout
3. Click "Send to e-Factura"
4. Verify upload confirmation

**Validation:**
- [ ] Invoice number auto-generated (format: FACT-2025-0001)
- [ ] VAT calculated correctly: 6,000 × 21% = 1,260
- [ ] e-Factura XML generated
- [ ] SPV upload index received

#### Invoice 2 - Reduced VAT 11%
```
Client: SC BETA SERVICES SRL
Invoice Date: 08-01-2025
Items:
  - Produse alimentare | Qty: 100 | Price: 50 RON | VAT: 11%
  Subtotal: 5,000 RON
  VAT 11%: 550 RON
  TOTAL: 5,550 RON
```

#### Invoice 3 - Mixed VAT Rates
```
Client: SC ALPHA TRADE SRL
Invoice Date: 12-01-2025
Items:
  - Echipamente IT | Qty: 5 | Price: 2,000 RON | VAT: 21%
  - Servicii instalare | Qty: 8 hours | Price: 100 RON/hr | VAT: 21%
  Subtotal: 10,800 RON
  VAT 21%: 2,268 RON
  TOTAL: 13,068 RON
```

#### Invoice 4 - Export (0% VAT)
```
Client: Foreign Client GmbH (Add new)
CUI: DE123456789
Invoice Date: 15-01-2025
Items:
  - Software License | Qty: 1 | Price: 5,000 EUR | VAT: 0% (Export)
  TOTAL: 5,000 EUR
```

#### Invoice 5 - Credit Note
```
Type: Credit Note
Reference: FACT-2025-0001
Client: SC ALPHA TRADE SRL
Date: 20-01-2025
Reason: Discount 10% for early payment
Items:
  - Discount on Invoice FACT-2025-0001 | Amount: -600 RON | VAT: -126 RON
  TOTAL: -726 RON
```

### Week 2: Supplier Invoices

Navigate to: **Expenses > Record Supplier Invoice**

#### Supplier Invoice 1
```
Supplier: SC MEGA IMPORT SRL
Invoice Number: MG-2025-0150
Invoice Date: 03-01-2025
Items:
  - Componente electronice | 3,500 RON | VAT 21%: 735 RON
  TOTAL: 4,235 RON
Payment Status: Unpaid
```

#### Supplier Invoice 2
```
Supplier: SC UTILITIES PLUS SRL
Invoice Number: UP-JAN-2025
Invoice Date: 10-01-2025
Items:
  - Electricitate ianuarie | 1,200 RON | VAT 21%: 252 RON
  - Gaz ianuarie | 800 RON | VAT 21%: 168 RON
  TOTAL: 2,420 RON
Category: Utilities
```

#### Supplier Invoice 3
```
Supplier: SC OFFICE SUPPLIES SRL (Add new)
CUI: RO11112222
Invoice Number: OS-2025-0088
Invoice Date: 18-01-2025
Items:
  - Consumabile birou | 500 RON | VAT 21%: 105 RON
  TOTAL: 605 RON
Payment: Immediate (cash)
```

### Week 3: Payroll Processing

Navigate to: **HR > Payroll > Process Monthly Payroll**

Select: January 2025

**Expected Calculations for Ion Popescu (15,000 RON gross):**
```
Gross Salary: 15,000 RON
CAS (25%): 3,750 RON (employee contribution)
CASS (10%): 1,500 RON (employee contribution)
Income Tax (10%): 975 RON (on 9,750 taxable)
Net Salary: 8,775 RON

Employer Contributions:
CAM (2.25%): 337.50 RON
```

**Validation Checkpoints:**
- [ ] All three employees calculated
- [ ] Minimum wage validation (if applicable)
- [ ] Tax calculations match Romanian fiscal code
- [ ] Payslips generated as PDF

**Actions:**
1. Review all calculations
2. Click "Approve Payroll"
3. Generate bank payment file
4. Download payslips

### Week 4: Month-End Compliance

#### Generate D300 VAT Return
Navigate to: **ANAF > VAT Returns > Generate D300**

**Expected Summary for January:**
```
Sales (Base + VAT):
  - Standard 21%: 16,800 + 3,528 = 20,328 RON
  - Reduced 11%: 5,000 + 550 = 5,550 RON
  - Export 0%: 24,500 RON (5,000 EUR × 4.90 rate)

Purchases (Base + VAT):
  - Deductible VAT: 4,000 + 1,260 = 5,260 RON

VAT Balance:
  - Collected: 4,078 RON
  - Deductible: 1,260 RON
  - VAT to Pay: 2,818 RON
```

**Validation:**
- [ ] All invoices included
- [ ] VAT rates correctly applied
- [ ] Export invoices at 0%
- [ ] Credit note deducted

#### Generate SAF-T D406
Navigate to: **ANAF > SAF-T > Generate D406**

Select: January 2025

**Validation:**
- [ ] XML file generated
- [ ] File size under 500MB
- [ ] DUKIntegrator validation passes
- [ ] All transactions included

**Download and verify XML structure:**
- Header with company info
- GeneralLedgerEntries
- SourceDocuments (Invoices)
- TaxTable with correct rates

#### Submit e-Factura Status Check
Navigate to: **ANAF > e-Factura > Status**

**Verify for each invoice:**
- [ ] Upload index received
- [ ] Download ID confirmed
- [ ] Status: "Accepted" or "Pending"
- [ ] No rejection errors

---

## MONTH 2 - FEBRUARY 2025

### Business Scenarios

#### New Client Onboarding
```
Client: SC GAMMA LOGISTICS SRL
CUI: RO77889900
Credit Limit: 100,000 RON
Special Terms: 2% discount for payment within 10 days
```

#### Sales Invoices (5)
1. FACT-2025-0006: Alpha Trade - 8,500 RON + VAT
2. FACT-2025-0007: Beta Services - 3,200 RON + VAT
3. FACT-2025-0008: Gamma Logistics - 15,000 RON + VAT
4. FACT-2025-0009: Alpha Trade - 4,500 RON + VAT
5. FACT-2025-0010: Vasile Georgescu PFA - 1,500 RON + VAT

#### Receive Payments
Navigate to: **Payments > Record Payment**

```
Payment 1:
  Client: SC ALPHA TRADE SRL
  Amount: 7,260 RON
  Reference: Invoice FACT-2025-0001
  Date: 03-02-2025
  Method: Bank Transfer

Payment 2:
  Client: SC BETA SERVICES SRL
  Amount: 5,550 RON
  Reference: Invoice FACT-2025-0002
  Date: 10-02-2025
  Method: Bank Transfer
  Apply Early Payment Discount: Yes (2%)
```

**Validation:**
- [ ] Invoice marked as "Paid"
- [ ] Outstanding balance updated
- [ ] Bank reconciliation entry created

#### Supplier Payments
Navigate to: **Payments > Pay Supplier**

```
Payment to: SC MEGA IMPORT SRL
Amount: 4,235 RON
Reference: MG-2025-0150
Date: 15-02-2025
Bank: BCR
```

### Month-End February

#### Bank Reconciliation
Navigate to: **Finance > Bank Reconciliation**

1. Import bank statement (MT940 or CSV)
2. Auto-match transactions
3. Manually match remaining items
4. Verify closing balance matches

**Validation:**
- [ ] All payments matched
- [ ] No unreconciled items
- [ ] Bank balance = Book balance

---

## MONTHS 3-11: ONGOING OPERATIONS

### Monthly Checklist

For each month, repeat:

#### Week 1-2: Operational Tasks
- [ ] Create 5-10 sales invoices
- [ ] Record 3-5 supplier invoices
- [ ] Process customer payments
- [ ] Make supplier payments

#### Week 3: HR Tasks
- [ ] Process monthly payroll
- [ ] Review timesheet entries
- [ ] Handle any employee changes
- [ ] Generate payslips

#### Week 4: Compliance Tasks
- [ ] Generate D300 VAT return
- [ ] Submit to ANAF by 25th
- [ ] Generate D406 SAF-T
- [ ] Upload to ANAF by last day
- [ ] Submit D112 payroll declaration
- [ ] Bank reconciliation

### Special Scenarios by Month

#### March - Q1 Closing
- Generate Q1 financial reports
- Submit D100 quarterly income tax
- Review cash flow statement

#### April - Easter Holiday Handling
- Test holiday calendar
- Verify payroll with holiday pay
- Check deadline extensions

#### June - Mid-Year Review
- Generate 6-month P&L
- Compare budget vs actual
- Review AR aging report

#### July - VAT Rate Change Test
- Enter transactions before Aug 1
- Enter transactions after Aug 1 (new rates)
- Verify correct rate application

#### August - New VAT Rates (Legea 141/2025)
- Standard rate now 21%
- Reduced rate now 11%
- Test all invoice types with new rates

#### September - Back from Summer
- Catch up on delayed invoices
- Process late payments
- Review overdue receivables

#### November - Budget Planning
- Create next year budget
- Set departmental targets
- Configure budget alerts

---

## MONTH 12 - DECEMBER 2025 (Year-End)

### Year-End Closing Procedures

#### Step 1: Reconcile All Accounts
Navigate to: **Finance > Year-End > Reconciliation Wizard**

**Tasks:**
- [ ] Bank accounts reconciled to statements
- [ ] AR aging reviewed - collect outstanding
- [ ] AP aging reviewed - pay due invoices
- [ ] Inventory counted and valued
- [ ] Fixed assets depreciation posted

#### Step 2: Adjusting Entries
Navigate to: **Finance > Journal Entries**

**Common Adjustments:**
```
Entry 1: Accrued Expenses
  Debit: 628 - Cheltuieli diverse | 5,000 RON
  Credit: 408 - Furnizori facturi nesosite | 5,000 RON

Entry 2: Prepaid Insurance
  Debit: 471 - Cheltuieli înregistrate în avans | 3,000 RON
  Credit: 628 - Cheltuieli diverse | 3,000 RON

Entry 3: Depreciation
  Debit: 6811 - Cheltuieli de exploatare | 12,000 RON
  Credit: 2813 - Amortizarea mijloacelor fixe | 12,000 RON
```

#### Step 3: Generate Annual Reports

**Balance Sheet (Bilanț)**
Navigate to: **Reports > Financial Statements > Balance Sheet**
- Select: Full Year 2025
- Compare with: Prior Year
- Download as PDF and Excel

**Expected Sections:**
- Active imobilizate (Fixed Assets)
- Active circulante (Current Assets)
- Capitaluri proprii (Equity)
- Datorii (Liabilities)

**Profit & Loss (Cont de Profit și Pierdere)**
Navigate to: **Reports > Financial Statements > P&L**

**Expected Structure:**
```
Venituri din exploatare (Operating Revenue)
  - Vânzări produse: XXX RON
  - Prestări servicii: XXX RON
  Total: XXX RON

Cheltuieli din exploatare (Operating Expenses)
  - Salarii: XXX RON
  - Contribuții: XXX RON
  - Utilities: XXX RON
  - Depreciere: XXX RON
  Total: XXX RON

Profit din exploatare: XXX RON
Impozit pe profit (16%): XXX RON
Profit net: XXX RON
```

#### Step 4: Annual Tax Returns

**Corporate Tax (Impozit pe Profit)**
Navigate to: **ANAF > Annual Returns > Corporate Tax**

**Calculation:**
```
Accounting Profit: 150,000 RON
Non-deductible expenses: 10,000 RON
Taxable Profit: 160,000 RON
Tax Rate: 16%
Corporate Tax Due: 25,600 RON
```

**Annual VAT Summary**
Navigate to: **ANAF > Annual Returns > VAT Summary**

**Expected Report:**
- Total VAT collected: XXX RON
- Total VAT deductible: XXX RON
- Total VAT paid: XXX RON
- Verification against monthly D300s

---

# PHASE 3: REPORT READING & INTERPRETATION

## VAT Reports

### D300 Monthly VAT Return
**How to Read:**
```
Section A - Livrări/Prestări (Sales)
  Row 1: Sales at 21% - Base + VAT
  Row 2: Sales at 11% - Base + VAT
  Row 3: Exports (0%) - Base only
  Row 4: Intra-community - Base only

Section B - Achiziții (Purchases)
  Row 10: Purchases at 21% - Base + VAT
  Row 11: Purchases at 11% - Base + VAT
  Row 15: Intra-community acquisitions

Section C - VAT Calculation
  Row 20: Total VAT collected
  Row 21: Total VAT deductible
  Row 22: VAT to pay (if positive)
  Row 23: VAT refund (if negative)
```

**Validation:**
- Sum of invoices matches Section A
- Sum of supplier invoices matches Section B
- Row 22/23 matches expected balance

### SAF-T D406 Report
**Structure to Verify:**
```xml
<AuditFile>
  <Header>
    - TaxRegistrationNumber: RO12345678
    - FiscalYear: 2025
    - SelectionCriteria: Month/Quarter/Year
  </Header>
  <MasterFiles>
    - GeneralLedgerAccounts
    - Customers
    - Suppliers
    - Products
  </MasterFiles>
  <GeneralLedgerEntries>
    - All journal entries
    - Debit/Credit balance
  </GeneralLedgerEntries>
  <SourceDocuments>
    - SalesInvoices
    - PurchaseInvoices
    - Payments
  </SourceDocuments>
</AuditFile>
```

## Financial Reports

### Balance Sheet Interpretation
```
ASSETS = LIABILITIES + EQUITY

Key Ratios to Calculate:
- Current Ratio: Current Assets / Current Liabilities
  Target: > 1.5 (healthy liquidity)

- Quick Ratio: (Current Assets - Inventory) / Current Liabilities
  Target: > 1.0

- Debt Ratio: Total Liabilities / Total Assets
  Target: < 0.6 (60%)
```

### P&L Interpretation
```
Key Metrics:
- Gross Margin: (Revenue - COGS) / Revenue × 100
  Target: Industry dependent (30-50% for services)

- Operating Margin: Operating Profit / Revenue × 100
  Target: > 15% (healthy)

- Net Margin: Net Profit / Revenue × 100
  Target: > 10%

Month-over-Month Comparison:
- Revenue trend (growth/decline)
- Expense control
- Profit trajectory
```

### Cash Flow Report
```
Three Sections:
1. Operating Activities
   - Cash from customers (+)
   - Cash to suppliers (-)
   - Cash for salaries (-)
   = Net Operating Cash Flow

2. Investing Activities
   - Equipment purchases (-)
   - Asset sales (+)
   = Net Investing Cash Flow

3. Financing Activities
   - Loans received (+)
   - Loan repayments (-)
   - Dividends paid (-)
   = Net Financing Cash Flow

Total Change in Cash = Sum of all three
```

---

# PHASE 4: ERROR SCENARIOS & EDGE CASES

## Test Error Handling

### Invoice Errors
1. **Duplicate Invoice Number**
   - Try to create invoice with existing number
   - Expected: Error message, prevent save

2. **Invalid CUI**
   - Enter client with wrong CUI checksum
   - Expected: Validation error

3. **Negative Amount**
   - Enter negative quantity (not credit note)
   - Expected: Validation error

4. **Date in Future**
   - Create invoice dated next month
   - Expected: Warning, allow with confirmation

5. **Exceeds Credit Limit**
   - Create invoice > client credit limit
   - Expected: Warning, require approval

### e-Factura Errors
1. **Invalid XML Structure**
   - Monitor for SPV rejection
   - Check error codes
   - Fix and resubmit

2. **Certificate Expired**
   - Test with near-expiry certificate
   - Verify warning message

3. **Network Timeout**
   - Test during ANAF maintenance
   - Verify retry mechanism

### Payroll Errors
1. **Below Minimum Wage**
   - Enter salary below legal minimum
   - Expected: Error, block save

2. **Invalid CNP**
   - Enter CNP with wrong checksum
   - Expected: Validation error

3. **Duplicate Employee**
   - Try to add same CNP twice
   - Expected: Duplicate warning

---

# APPENDIX: TEST DATA TEMPLATES

## Sample Clients (Romanian)
```
1. SC ALPHA TRADE SRL | CUI: RO12345678 | București
2. SC BETA SERVICES SRL | CUI: RO87654321 | Cluj-Napoca
3. SC GAMMA LOGISTICS SRL | CUI: RO11223344 | Timișoara
4. SC DELTA MANUFACTURING SRL | CUI: RO55667788 | Brașov
5. SC EPSILON CONSULTING SRL | CUI: RO99887766 | Iași
```

## Sample Products/Services
```
1. Servicii consultanță IT | 150 RON/hour | VAT 21%
2. Licență software | 2,500 RON | VAT 21%
3. Echipamente IT | various | VAT 21%
4. Servicii mentenanță | 500 RON/month | VAT 21%
5. Produse alimentare | various | VAT 11%
```

## Sample Invoice Amounts
```
Small: 500 - 2,000 RON
Medium: 2,000 - 10,000 RON
Large: 10,000 - 50,000 RON
Enterprise: 50,000+ RON
```

## Valid Romanian CUI Format
```
Format: RO + 2-10 digits
Checksum: Last digit is control digit
Example: RO12345678
  - Remove RO prefix: 12345678
  - Apply weight: 7,5,3,2,1,7,5,3
  - Sum products
  - Mod 11
  - If 10, use 0
```

---

# FINAL VALIDATION CHECKLIST

## End of Year Verification

### Financial Accuracy
- [ ] Trial balance balances (Debit = Credit)
- [ ] Bank reconciliation complete
- [ ] All invoices accounted for
- [ ] VAT reconciles to D300 submissions
- [ ] Payroll matches D112 submissions

### Compliance Verification
- [ ] All 12 D300 submissions confirmed
- [ ] All 12 D406 submissions confirmed
- [ ] All e-Factura uploaded and accepted
- [ ] Corporate tax calculated correctly
- [ ] All deadlines met (or documented delays)

### Data Integrity
- [ ] No orphan transactions
- [ ] All documents have audit trail
- [ ] User actions logged
- [ ] Backup created and tested

### Report Accuracy
- [ ] Balance sheet balances
- [ ] P&L ties to GL
- [ ] Cash flow reconciles
- [ ] Departmental reports match totals

---

**Document Version:** 1.0
**Last Updated:** December 2025
**Prepared for:** DocumentIulia.ro QA Team
