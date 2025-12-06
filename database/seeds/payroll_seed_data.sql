-- ============================================================================
-- DocumentIulia - Payroll Seed Data
-- Standard Romanian Salary Components
-- ============================================================================

-- Clear existing data (for re-running seed)
TRUNCATE TABLE salary_components CASCADE;

-- ============================================================================
-- STANDARD SALARY COMPONENTS (Romanian Labor Law)
-- ============================================================================

-- Base Salary
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    display_order,
    description
) VALUES (
    'BASE_SALARY',
    'Salariu de bază',
    'Base Salary',
    'base_salary',
    true,
    true,
    true,
    true,
    'fixed',
    1,
    'Salariul de bază conform Contract Individual de Muncă'
);

-- Overtime (Ore suplimentare)
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    display_order,
    description
) VALUES (
    'OVERTIME',
    'Ore suplimentare',
    'Overtime',
    'overtime',
    true,
    true,
    true,
    true,
    'hourly',
    10,
    'Plată ore suplimentare: +75% (zile lucrătoare), +100% (weekend/sărbători), +200% (noapte)'
);

-- Performance Bonus
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    display_order,
    description
) VALUES (
    'PERFORMANCE_BONUS',
    'Bonus de performanță',
    'Performance Bonus',
    'bonus',
    true,
    true,
    true,
    true,
    'fixed',
    20,
    'Bonus lunar/trimestrial/anual pentru atingerea obiectivelor'
);

-- Christmas Bonus (13th Salary)
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    percentage_of_base,
    display_order,
    description
) VALUES (
    'CHRISTMAS_BONUS',
    'Salariu 13',
    '13th Salary',
    'bonus',
    true,
    true,
    true,
    true,
    'percentage',
    100.00,
    21,
    'Salariul 13 (Crăciun) - echivalentul unui salariu de bază'
);

-- Easter Bonus
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    percentage_of_base,
    display_order,
    description
) VALUES (
    'EASTER_BONUS',
    'Bonus Paște',
    'Easter Bonus',
    'bonus',
    true,
    true,
    true,
    true,
    'percentage',
    50.00,
    22,
    'Bonus de Paște (optional) - de obicei 50% din salariul de bază'
);

-- Vacation Allowance
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    display_order,
    description
) VALUES (
    'VACATION_ALLOWANCE',
    'Indemnizație de concediu',
    'Vacation Allowance',
    'allowance',
    true,
    true,
    true,
    true,
    'fixed',
    30,
    'Indemnizația de concediu de odihnă'
);

-- Transport Allowance (NON-TAXABLE up to limit)
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    default_amount,
    display_order,
    description
) VALUES (
    'TRANSPORT_ALLOWANCE',
    'Indemnizație transport',
    'Transport Allowance',
    'allowance',
    false,
    false,
    false,
    false,
    'fixed',
    300.00,
    40,
    'Indemnizație de transport (neimpozabilă în limita legii)'
);

-- Meal Vouchers (Tichete de masă) - NON-TAXABLE
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    default_amount,
    display_order,
    description
) VALUES (
    'MEAL_VOUCHERS',
    'Tichete de masă',
    'Meal Vouchers',
    'benefit',
    false,
    false,
    false,
    false,
    'fixed',
    400.00,
    41,
    'Tichete de masă (neimpozabile, valoare maximă 40 RON/zi × 10 zile = 400 RON/lună în 2024)'
);

-- Commission (Sales)
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    display_order,
    description
) VALUES (
    'SALES_COMMISSION',
    'Comision vânzări',
    'Sales Commission',
    'commission',
    true,
    true,
    true,
    true,
    'percentage',
    50,
    'Comision pentru vânzări (procent din cifra de afaceri sau profit)'
);

-- Night Shift Allowance
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    percentage_of_base,
    display_order,
    description
) VALUES (
    'NIGHT_SHIFT',
    'Spor tură de noapte',
    'Night Shift Allowance',
    'allowance',
    true,
    true,
    true,
    true,
    'percentage',
    25.00,
    51,
    'Spor pentru tură de noapte (min. 25% din salariul de bază/oră)'
);

-- Hazardous Work Allowance
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    display_order,
    description
) VALUES (
    'HAZARDOUS_WORK',
    'Spor condiții periculoase',
    'Hazardous Work Allowance',
    'allowance',
    true,
    true,
    true,
    true,
    'percentage',
    52,
    'Spor pentru condiții vătămătoare sau periculoase'
);

-- Managerial Allowance
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    display_order,
    description
) VALUES (
    'MANAGERIAL_ALLOWANCE',
    'Indemnizație conducere',
    'Managerial Allowance',
    'allowance',
    true,
    true,
    true,
    true,
    'percentage',
    53,
    'Indemnizație pentru funcții de conducere'
);

-- Sickness Leave (First 5 days - employer pays 75%)
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    percentage_of_base,
    display_order,
    description
) VALUES (
    'SICK_LEAVE_EMPLOYER',
    'Concediu medical (zile 1-5)',
    'Sickness Leave (Days 1-5)',
    'allowance',
    true,
    true,
    true,
    true,
    'percentage',
    75.00,
    60,
    'Concediu medical primele 5 zile (plătite de angajator la 75%)'
);

-- Sickness Leave (After 5 days - CNAS pays 75%)
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    percentage_of_base,
    display_order,
    description
) VALUES (
    'SICK_LEAVE_CNAS',
    'Concediu medical (după ziua 5)',
    'Sickness Leave (After Day 5)',
    'allowance',
    true,
    true,
    true,
    true,
    'percentage',
    75.00,
    61,
    'Concediu medical după ziua 5 (plătite de CNAS la 75%)'
);

-- Maternity Leave
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    display_order,
    description
) VALUES (
    'MATERNITY_LEAVE',
    'Indemnizație concediu maternitate',
    'Maternity Leave',
    'allowance',
    true,
    false,
    false,
    false,
    'percentage',
    62,
    'Indemnizație de maternitate (plătită de CNAS, 85% din media ultimelor 6 luni)'
);

-- Child Care Allowance
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    display_order,
    description
) VALUES (
    'CHILD_CARE',
    'Indemnizație creștere copil',
    'Child Care Allowance',
    'allowance',
    false,
    false,
    false,
    false,
    'fixed',
    63,
    'Indemnizație pentru creșterea copilului (plătită de stat)'
);

-- Termination Severance
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    display_order,
    description
) VALUES (
    'SEVERANCE_PAY',
    'Indemnizație de concediere',
    'Severance Pay',
    'allowance',
    true,
    true,
    true,
    true,
    'fixed',
    70,
    'Indemnizație de concediere conform Codului Muncii'
);

-- Union Dues (Deduction)
INSERT INTO salary_components (
    code,
    name,
    name_en,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax,
    calculation_method,
    percentage_of_base,
    display_order,
    description
) VALUES (
    'UNION_DUES',
    'Cotizație sindicat',
    'Union Dues',
    'allowance',
    false,
    false,
    false,
    false,
    'percentage',
    1.00,
    80,
    'Cotizație pentru sindicat (de obicei 1% din salariul brut)'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Count components
SELECT
    component_type,
    COUNT(*) as count
FROM salary_components
GROUP BY component_type
ORDER BY component_type;

-- List all components
SELECT
    code,
    name,
    component_type,
    is_taxable,
    is_subject_to_cas,
    is_subject_to_cass,
    is_subject_to_income_tax
FROM salary_components
ORDER BY display_order;

-- ============================================================================
-- NOTES
-- ============================================================================

-- Romanian Payroll Key Rules (2024-2025):
--
-- 1. CAS (Contribuția Asigurări Sociale):
--    - Employer: 25% of gross
--    - Employee: 25% of gross (deducted)
--
-- 2. CASS (Contribuția Asigurări Sociale de Sănătate):
--    - Employer: 10% of gross
--    - Employee: 10% of gross (deducted)
--
-- 3. Income Tax:
--    - 10% on taxable income (after personal deductions)
--
-- 4. Personal Deduction (2024):
--    - Basic: 510 RON/month (6,120 RON/year)
--    - Per dependent: 510 RON/month
--    - Total deduction can reduce taxable income
--
-- 5. Non-Taxable Benefits:
--    - Meal vouchers: Max 40 RON/day
--    - Transport: Within legal limits
--    - Certain bonuses (cultural, sports)
--
-- 6. Net Salary Calculation:
--    Net = Gross - CAS(employee) - CASS(employee) - Income Tax - Other Deductions
--
-- 7. Employer Total Cost:
--    Total Cost = Gross + CAS(employer) + CASS(employer)
--    Total Cost = Gross × 1.35
--
-- Example:
--    Gross Salary: 5,000 RON
--    CAS employer: 1,250 RON (25%)
--    CASS employer: 500 RON (10%)
--    Total employer cost: 6,750 RON
--
--    Employee receives:
--    Gross: 5,000 RON
--    - CAS (25%): -1,250 RON
--    - CASS (10%): -500 RON
--    - Personal deduction: +510 RON (increases taxable income by reducing base)
--    Taxable income: 5,000 - 510 = 4,490 RON
--    - Income tax (10%): -449 RON
--    Net salary: 5,000 - 1,250 - 500 - 449 = 2,801 RON

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
