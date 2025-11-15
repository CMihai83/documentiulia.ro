# Decision Tree Update Points - Complete Collection
## Critical Data Points Requiring Periodic Updates

**Last Updated**: 2025-11-15
**Status**: Initial catalog for TVA Registration tree + planned expansions

---

## 📋 How to Use This Document

This document catalogs **every single data point** across all decision trees that:
1. Can change due to legislation updates
2. Requires periodic verification
3. Has financial/legal impact on users

**Update Frequency Legend**:
- 🔴 **CRITICAL** = Immediate impact, check on every legislation change
- 🟠 **HIGH** = Financial impact, check annually or on budget law
- 🟡 **MEDIUM** = Informational, check quarterly
- 🟢 **LOW** = Cosmetic/procedural, check semi-annually

---

## 🌳 TREE 1: TVA Registration (`tva_registration`)

### THRESHOLDS (🔴 CRITICAL)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 1.1 | TVA registration mandatory threshold | 300.000 RON | Cod Fiscal Art. 316 | `tva_registration_threshold` | Annual Budget Law | 2025-11-15 |
| 1.2 | Intra-EU distance sales threshold | 10.000 EUR | Cod Fiscal Art. 274 | `intra_eu_sales_threshold` | EU Directive change | 2025-11-15 |

**Impact**: If threshold changes from 300k → 350k RON, affects:
- Answer path for "Peste 300.000 lei"
- 4 terminal answers (PFA, SRL, II, Altele)
- Warning messages
- Strategic advice sections

### DEADLINES (🔴 CRITICAL)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 2.1 | Registration deadline after threshold breach | 10 zile lucrătoare | Cod Fiscal Art. 316 alin. 11 | `tva_registration_deadline` | Legislation change | 2025-11-15 |
| 2.2 | VAT declaration submission deadline (monthly) | 25 ale lunii următoare | Cod Fiscal Art. 323 | `tva_declaration_deadline_monthly` | Legislation change | 2025-11-15 |
| 2.3 | VAT declaration submission deadline (quarterly) | 25 ale primei luni din trimestru următor | Cod Fiscal Art. 323 | `tva_declaration_deadline_quarterly` | Legislation change | 2025-11-15 |
| 2.4 | VAT payment deadline | Aceeași dată cu declarația | Cod Fiscal Art. 323 | `tva_payment_deadline` | Legislation change | 2025-11-15 |

**Impact**: If deadline changes from 10 → 15 days:
- Red alert boxes in 4 answers
- Next steps timeline
- Warning sections

### TAX RATES (🔴 CRITICAL)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 3.1 | Standard VAT rate | 19% | Cod Fiscal Art. 291 alin. 1 | `tva_standard_rate` | Legislation change | 2025-11-15 |
| 3.2 | Reduced VAT rate | 9% | Cod Fiscal Art. 291 alin. 2 | `tva_reduced_rate_9` | Legislation change | 2025-11-15 |
| 3.3 | Super-reduced VAT rate | 5% | Cod Fiscal Art. 291 alin. 2 | `tva_reduced_rate_5` | Legislation change | 2025-11-15 |

**Impact**: If standard rate changes from 19% → 20%:
- Cost calculations in strategic advice
- Example scenarios
- Cash-flow impact analysis

### PENALTIES (🟠 HIGH)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 4.1 | Late registration penalty (minimum) | 500 RON | Cod Fiscal Art. 336 | `tva_penalty_late_registration_min` | Annual review | 2025-11-15 |
| 4.2 | Late registration penalty (maximum) | 1.000 RON | Cod Fiscal Art. 336 | `tva_penalty_late_registration_max` | Annual review | 2025-11-15 |
| 4.3 | Late declaration penalty | 0,08% pe zi din TVA datorat | Cod Fiscal Art. 337 | `tva_penalty_late_declaration_rate` | Annual review | 2025-11-15 |
| 4.4 | Non-submission penalty | 0,2% pe zi din TVA datorat | Cod Fiscal Art. 337 | `tva_penalty_non_submission_rate` | Annual review | 2025-11-15 |

**Impact**: Penalties directly mentioned in warnings section

### COSTS (🟡 MEDIUM - Market Research)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 5.1 | Registration fee | Gratuită (online) | ANAF procedures | `tva_registration_fee` | Quarterly | 2025-11-15 |
| 5.2 | Accountant monthly fee (min) | 300 RON | Market research | `accountant_fee_tva_min` | Quarterly | 2025-11-15 |
| 5.3 | Accountant monthly fee (max) | 700 RON | Market research | `accountant_fee_tva_max` | Quarterly | 2025-11-15 |
| 5.4 | Invoicing software (min) | 100 RON | Market research | `software_invoicing_min` | Quarterly | 2025-11-15 |
| 5.5 | Invoicing software (max) | 300 RON | Market research | `software_invoicing_max` | Quarterly | 2025-11-15 |
| 5.6 | Staff training (one-time) | 500 RON | Market research | `staff_training_tva_cost` | Quarterly | 2025-11-15 |

**Impact**: Cost breakdown section in answers

### PROCESSING TIMES (🟡 MEDIUM - ANAF Stats)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 6.1 | ANAF registration processing time | 3-5 zile lucrătoare | ANAF statistics | `anaf_registration_processing_days` | Quarterly | 2025-11-15 |
| 6.2 | VAT certificate issuance time | 2-3 zile | ANAF statistics | `vat_certificate_issuance_days` | Quarterly | 2025-11-15 |
| 6.3 | Total setup time estimate | 2-3 săptămâni | Internal estimate | `tva_setup_total_weeks` | Quarterly | 2025-11-15 |

**Impact**: Timeline section in answers

### FORMS & DOCUMENTS (🟢 LOW - Rarely Change)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 7.1 | Form 010 version | Versiunea 15.07.2024 | ANAF Forms | `form_010_version` | Semi-annual | 2025-11-15 |
| 7.2 | Form 010 download URL | https://static.anaf.ro/.../Declaratii_R010.pdf | ANAF Forms | `form_010_url` | Semi-annual | 2025-11-15 |
| 7.3 | VIES registration form | Form 088 | ANAF Forms | `form_088_vies` | Semi-annual | 2025-11-15 |
| 7.4 | SPV (Private Virtual Space) URL | https://www.anaf.ro/SpatiulPrivatVirtual/ | ANAF | `spv_url` | Semi-annual | 2025-11-15 |

**Impact**: Next steps section (download links)

### PROCEDURES (🟢 LOW)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 8.1 | ANAF office visit required | Nu (online submission available) | ANAF procedures | `anaf_visit_required` | Annual | 2025-11-15 |
| 8.2 | Estimated value declaration required | Da (pentru înregistrare voluntară) | Cod Fiscal Art. 316 | `estimated_value_declaration_required` | Legislation | 2025-11-15 |

---

## 🌳 TREE 2: Microenterprise Eligibility (PLANNED)

### THRESHOLDS (🔴 CRITICAL)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 9.1 | Microenterprise revenue threshold | 500.000 EUR | Cod Fiscal Art. 47 | `microenterprise_revenue_threshold` | Annual | N/A |
| 9.2 | Microenterprise employee count threshold | 9 angajați | Cod Fiscal Art. 47 | `microenterprise_employees_threshold` | Legislation | N/A |
| 9.3 | Small enterprise revenue threshold | 10M EUR | Cod Fiscal Art. 47 | `small_enterprise_revenue_threshold` | Annual | N/A |
| 9.4 | Small enterprise employee count threshold | 49 angajați | Cod Fiscal Art. 47 | `small_enterprise_employees_threshold` | Legislation | N/A |

### TAX RATES (🔴 CRITICAL)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 10.1 | Microenterprise tax (consultancy < 80%) | 1% | Cod Fiscal Art. 47 | `microenterprise_tax_rate_1` | Annual | N/A |
| 10.2 | Microenterprise tax (consultancy >= 80%) | 3% | Cod Fiscal Art. 47 | `microenterprise_tax_rate_3` | Annual | N/A |
| 10.3 | Profit tax rate (non-micro) | 16% | Cod Fiscal Art. 13 | `profit_tax_rate` | Legislation | N/A |

---

## 🌳 TREE 3: Employee Hiring (PLANNED)

### SOCIAL CONTRIBUTIONS (🔴 CRITICAL)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 11.1 | CAS (pension) employee rate | 25% | Cod Fiscal Art. 139 | `cas_employee_rate` | Legislation | N/A |
| 11.2 | CASS (health) employee rate | 10% | Cod Fiscal Art. 155 | `cass_employee_rate` | Legislation | N/A |
| 11.3 | Work insurance rate (employer) | 2,25% | Cod Fiscal Art. 220 | `work_insurance_rate` | Legislation | N/A |

### MINIMUM WAGE (🟠 HIGH)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 12.1 | Minimum gross salary (national) | 3.300 RON | Gov. Decision | `minimum_gross_salary` | Annual (Jan 1) | N/A |
| 12.2 | Minimum gross salary (construction) | 4.000 RON | Gov. Decision | `minimum_gross_salary_construction` | Annual | N/A |

### DEADLINES (🔴 CRITICAL)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 13.1 | REVISAL registration deadline | Înainte de începere muncă | ITM regulations | `revisal_deadline` | Legislation | N/A |
| 13.2 | D112 annual declaration deadline | 31 ianuarie | Cod Fiscal Art. 119 | `d112_deadline` | Legislation | N/A |
| 13.3 | Monthly salary declaration deadline | 25 ale lunii | Cod Fiscal Art. 119 | `monthly_salary_declaration_deadline` | Legislation | N/A |

---

## 🌳 TREE 4: Deductible Expenses (PLANNED)

### DEDUCTIBILITY RULES (🟠 HIGH)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 14.1 | Protocol expenses limit | 2% din cifra de afaceri | Cod Fiscal Art. 25 | `protocol_expenses_limit_pct` | Legislation | N/A |
| 14.2 | Fuel deductibility (petrol/diesel) | 50% TVA | Cod Fiscal Art. 297 | `fuel_vat_deductibility_pct` | Legislation | N/A |
| 14.3 | Fuel deductibility (electric) | 100% TVA | Cod Fiscal Art. 297 | `fuel_electric_vat_deductibility_pct` | Legislation | N/A |
| 14.4 | Leasing deductibility | 100% | Cod Fiscal Art. 25 | `leasing_deductibility_pct` | Legislation | N/A |

---

## 🌳 TREE 5: Dividend Distribution (PLANNED)

### TAX RATES (🔴 CRITICAL)

| # | Data Point | Current Value | Source | Variable Key | Update Trigger | Last Verified |
|---|------------|---------------|--------|--------------|----------------|---------------|
| 15.1 | Dividend tax rate | 8% | Cod Fiscal Art. 97 | `dividend_tax_rate` | Legislation | N/A |
| 15.2 | Withholding tax (non-residents) | 8% | Cod Fiscal Art. 97 | `dividend_withholding_tax_rate` | Legislation | N/A |

---

## 📊 UPDATE FREQUENCY SUMMARY

**By Criticality**:
- 🔴 **CRITICAL** (15 points): Check immediately on legislation change
- 🟠 **HIGH** (8 points): Check annually or on budget law
- 🟡 **MEDIUM** (9 points): Check quarterly
- 🟢 **LOW** (6 points): Check semi-annually

**Total**: 38 update points across 1 live tree + 4 planned trees

---

## 🔄 UPDATE WORKFLOW

### 1. Legislation Change Detected
```
Trigger: fiscal_legislation table updated
Action: Auto-create pending_tree_updates entries
Notification: Email admin with affected trees
```

### 2. Variable Change Proposed
```
Admin changes variable in legislation_variables table
System generates diff preview for all affected answers
Admin reviews and approves changes
```

### 3. Periodic Verification
```
Cron job runs daily at 9 AM
Checks decision_tree_update_points for overdue verifications
Sends email with critical/high priority items
Admin marks items as verified → next_verification_due auto-calculated
```

### 4. Bulk Update (Annual)
```
Every January 1st (Budget Law effective date):
- Review all CRITICAL thresholds
- Review all tax rates
- Update minimum wage
- Verify all deadlines
```

---

## 🎯 VERIFICATION SCHEDULE

### Daily
- Check for legislation changes (automated)

### Weekly
- Review pending_tree_updates queue

### Monthly
- Spot-check 5 random update points

### Quarterly (1st week of Jan, Apr, Jul, Oct)
- All MEDIUM priority items (costs, processing times)
- Verify ANAF form links still active

### Semi-Annually (January, July)
- All LOW priority items (procedures, forms)

### Annually (January)
- All CRITICAL thresholds
- All HIGH priority tax rates
- Budget law impact assessment

---

## 📋 ADMIN CHECKLIST TEMPLATE

```markdown
### Quarterly Verification - [Quarter] 2025

**Date**: __________
**Verified by**: __________

#### CRITICAL Items
- [ ] TVA registration threshold (current: 300.000 RON) → Verified: _____ / Changed to: _____
- [ ] TVA standard rate (current: 19%) → Verified: _____ / Changed to: _____
- [ ] Microenterprise threshold (current: 500.000 EUR) → Verified: _____ / Changed to: _____

#### HIGH Priority Items
- [ ] TVA penalties (min: 500 RON, max: 1.000 RON) → Verified: _____ / Changed to: _____
- [ ] Minimum gross salary (current: 3.300 RON) → Verified: _____ / Changed to: _____

#### MEDIUM Priority Items
- [ ] Accountant fees (300-700 RON) → Market research done: _____ / New range: _____
- [ ] Software costs (100-300 RON) → Market research done: _____ / New range: _____
- [ ] ANAF processing times (3-5 days) → Stats checked: _____ / New estimate: _____

#### LOW Priority Items
- [ ] Form 010 version (current: 15.07.2024) → Link active: _____ / New version: _____
- [ ] SPV URL (anaf.ro/SpatiulPrivatVirtual) → Link active: _____ / Changed: _____

**Total items verified**: ____ / ____
**Items requiring updates**: ____
**Pending updates created**: ____
```

---

## 🚨 CRITICAL ALERT THRESHOLDS

**Email Notifications Triggered When**:
1. ⚠️ **CRITICAL item overdue by 1+ days**
2. ⚠️ **HIGH item overdue by 7+ days**
3. ⚠️ **5+ MEDIUM items overdue**
4. ✅ **Legislation change detected** (immediate)
5. ✅ **Variable update proposed** (immediate)

**Escalation**:
- Day 1: Email to content team
- Day 3: Email to tech lead
- Day 7: Slack notification to all admins
- Day 14: Mark tree as "outdated" in frontend

---

**Document Status**: ✅ Complete catalog for Tree 1, planned structure for Trees 2-5
**Next Review**: 2026-01-01
**Responsible**: Content Team + Legal Advisor
