-- ============================================================================
-- DocumentIulia - Fiscal Calendar Seed Data
-- Romanian Fiscal Deadlines & Forms
-- ============================================================================
--
-- This seed file populates:
-- 1. anaf_fiscal_deadlines - All major Romanian fiscal deadlines
-- 2. anaf_declaration_forms - D300 (TVA), D112 (Salarii), D101 (Profit)
--
-- Created: 2025-11-22
-- Version: 1.0
-- Coverage: 2024-2025 fiscal requirements
-- ============================================================================

-- ============================================================================
-- PART 1: ANAF FISCAL DEADLINES
-- ============================================================================

-- Clear existing data (for re-running seed)
TRUNCATE TABLE anaf_fiscal_deadlines CASCADE;

-- ============================================================================
-- TVA (Tax on Value Added) Deadlines
-- ============================================================================

-- D300 - Monthly TVA Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    business_days_offset,
    applies_to,
    penalty_type,
    penalty_amount,
    can_auto_generate,
    data_sources,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D300_TVA_MONTHLY',
    'Declarație privind TVA - D300 (Lunar)',
    'TVA',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale/declaratii_electronice',
    'Codul Fiscal Art. 156^4, Legea 227/2015',
    'D300',
    'monthly',
    25,  -- Due on 25th of following month
    0,
    '{"company_types": ["SRL", "SA", "PFA"], "conditions": {"is_tva_payer": true, "monthly_regime": true}}'::jsonb,
    'percentage',
    0.02,  -- 2% per month penalty
    true,
    '{"invoices": {"period": "previous_month", "fields": ["base_amount", "tva_amount", "tva_rate"]}, "bills": {"period": "previous_month", "fields": ["base_amount", "tva_amount"]}}'::jsonb,
    'critical',
    ARRAY[7, 3, 1],
    'both',
    'Declarație TVA pentru platitorii de TVA cu regim lunar de depunere'
);

-- D300 - Quarterly TVA Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    applies_to,
    penalty_type,
    penalty_amount,
    can_auto_generate,
    data_sources,
    priority,
    reminder_days_before,
    notes
) VALUES (
    'D300_TVA_QUARTERLY',
    'Declarație privind TVA - D300 (Trimestrial)',
    'TVA',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale/declaratii_electronice',
    'Codul Fiscal Art. 156^4',
    'D300',
    'quarterly',
    25,
    '{"company_types": ["SRL", "SA", "PFA"], "conditions": {"is_tva_payer": true, "quarterly_regime": true}}'::jsonb,
    'percentage',
    0.02,
    true,
    '{"invoices": {"period": "previous_quarter", "fields": ["base_amount", "tva_amount"]}, "bills": {"period": "previous_quarter", "fields": ["base_amount", "tva_amount"]}}'::jsonb,
    'critical',
    ARRAY[10, 5, 2],
    'Declarație TVA pentru platitorii cu regim trimestrial'
);

-- D394 - Recapitulative Statement (Intrastat)
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    applies_to,
    can_auto_generate,
    priority,
    reminder_days_before
) VALUES (
    'D394_INTRASTAT',
    'Declarație recapitulativă - D394',
    'TVA',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Legea 227/2015 Art. 325',
    'D394',
    'monthly',
    25,
    '{"company_types": ["SRL", "SA"], "conditions": {"has_eu_transactions": true}}'::jsonb,
    false,
    'high',
    ARRAY[7, 3]
);

-- ============================================================================
-- SALARIES & SOCIAL CONTRIBUTIONS Deadlines
-- ============================================================================

-- D112 - Monthly Salary Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    applies_to,
    penalty_type,
    penalty_amount,
    can_auto_generate,
    data_sources,
    priority,
    reminder_days_before,
    notes
) VALUES (
    'D112_SALARIES_MONTHLY',
    'Declarație privind obligațiile de plată a contribuțiilor sociale - D112',
    'SALARII',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 146',
    'D112',
    'monthly',
    25,
    '{"company_types": ["SRL", "SA", "PFA"], "conditions": {"has_employees": true}}'::jsonb,
    'fixed',
    500.00,
    true,
    '{"payroll": {"period": "previous_month", "fields": ["gross_salary", "cas", "cass", "income_tax"]}}'::jsonb,
    'critical',
    ARRAY[7, 3, 1],
    'Declarație obligatorie pentru angajatori'
);

-- REVISAL - Employee Registry Notification
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    applies_to,
    priority,
    reminder_days_before,
    notes
) VALUES (
    'REVISAL_NEW_EMPLOYEE',
    'Înregistrare angajat nou în REVISAL',
    'SALARII',
    'https://www.inspectiamuncii.ro/revisal',
    'Legea 53/2003 - Codul Muncii',
    'REVISAL',
    'one-time',
    NULL,  -- Before employment start
    '{"company_types": ["SRL", "SA", "PFA"], "conditions": {"has_employees": true}}'::jsonb,
    'critical',
    ARRAY[3],
    'Trebuie realizat ÎNAINTEA începerii activității angajatului'
);

-- ============================================================================
-- INCOME TAX & PROFIT TAX Deadlines
-- ============================================================================

-- D101 - Annual Profit Tax Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    penalty_type,
    penalty_amount,
    can_auto_generate,
    data_sources,
    priority,
    reminder_days_before,
    notes
) VALUES (
    'D101_PROFIT_TAX_ANNUAL',
    'Declarație privind impozitul pe profit - D101',
    'IMPOZIT_PROFIT',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 35',
    'D101',
    'annual',
    31,
    3,  -- March 31st
    '{"company_types": ["SRL", "SA"], "conditions": {"profit_tax_regime": true}}'::jsonb,
    'percentage',
    0.05,
    true,
    '{"invoices": {"period": "previous_year"}, "expenses": {"period": "previous_year"}, "payroll": {"period": "previous_year"}}'::jsonb,
    'critical',
    ARRAY[30, 15, 7, 3],
    'Declarație anuală impozit pe profit pentru societăți'
);

-- D101 - Quarterly Profit Tax Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    applies_to,
    can_auto_generate,
    priority,
    reminder_days_before
) VALUES (
    'D101_PROFIT_TAX_QUARTERLY',
    'Declarație trimestrială impozit pe profit - D101',
    'IMPOZIT_PROFIT',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 35',
    'D101',
    'quarterly',
    25,
    '{"company_types": ["SRL", "SA"], "conditions": {"profit_tax_regime": true, "quarterly_payments": true}}'::jsonb,
    true,
    'high',
    ARRAY[10, 5, 2]
);

-- D200 - Annual Income Tax for PFA/II
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    can_auto_generate,
    priority,
    reminder_days_before
) VALUES (
    'D200_INCOME_TAX_ANNUAL',
    'Declarație privind venitul realizat - D200',
    'IMPOZIT_VENIT',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 120',
    'D200',
    'annual',
    25,
    5,  -- May 25th
    '{"company_types": ["PFA", "II"], "conditions": {}}'::jsonb,
    true,
    'critical',
    ARRAY[30, 15, 7]
);

-- D212 - Declarația Unică (Annual Declaration for Individuals)
-- This is THE most important declaration for individuals, PFA, and micro-enterprises
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    can_auto_generate,
    data_sources,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D212_DECLARATIA_UNICA',
    'Declarația Unică privind impozitul pe venit și contribuțiile sociale - D212',
    'IMPOZIT_VENIT',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale/declaratii_persoane_fizice',
    'Legea 227/2015, Ord. 3392/2017',
    'D212',
    'annual',
    25,
    5,  -- May 25th of the following year
    '{"entity_types": ["individual", "PFA", "II", "micro_enterprise"], "conditions": {"has_income": true}}'::jsonb,
    true,
    '{"income_sources": ["salary", "dividends", "rent", "pfa_income", "agricultural", "other"], "deductions": ["personal", "health", "pension", "education", "construction"], "properties": ["real_estate", "vehicles"]}'::jsonb,
    'critical',
    ARRAY[60, 30, 15, 7, 3, 1],
    'individual',
    'Declarația Unică include: venituri din toate sursele, impozit pe venit, CAS (contribuția de asigurări sociale), CASS (contribuția de asigurări sociale de sănătate), deduceri personale, declararea bunurilor imobile și vehiculelor'
);

-- D212 - Estimated Income Declaration (For new PFA/activities)
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    calculation_rule,
    applies_to,
    can_auto_generate,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D212_ESTIMARE_VENIT',
    'Declarația de venit estimat pentru anul în curs - D212',
    'IMPOZIT_VENIT',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale/declaratii_persoane_fizice',
    'Legea 227/2015',
    'D212',
    'on_event',
    '{"trigger": "new_activity", "due_within_days": 30}'::jsonb,
    '{"entity_types": ["PFA", "II"], "conditions": {"activity_start": "current_year"}}'::jsonb,
    false,
    'high',
    ARRAY[15, 7, 3],
    'individual',
    'Depusă în termen de 30 de zile de la înregistrarea activității. Declară venitul estimat pentru anul curent pentru calculul contribuțiilor CAS și CASS.'
);

-- ============================================================================
-- LOCAL TAXES Deadlines
-- ============================================================================

-- D600 - Annual Assets Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    priority,
    reminder_days_before,
    notes
) VALUES (
    'D600_ASSETS_DECLARATION',
    'Declarație de impunere / Declarație privind impozitele și taxele locale - D600',
    'TAXE_LOCALE',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 231',
    'D600',
    'annual',
    25,
    2,  -- February 25th
    '{"company_types": ["SRL", "SA", "PFA", "II"], "conditions": {"has_fixed_assets": true}}'::jsonb,
    'normal',
    ARRAY[15, 7],
    'Declarație pentru clădiri, terenuri, mijloace de transport'
);

-- ============================================================================
-- SPECIAL DECLARATIONS Deadlines
-- ============================================================================

-- Annual Financial Statements
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    priority,
    reminder_days_before,
    notes
) VALUES (
    'BALANCE_SHEET_ANNUAL',
    'Situații financiare anuale',
    'RAPORTARE',
    'https://www.onrc.ro/index.php/ro/depunere-acte',
    'Legea contabilității 82/1991',
    'BILANȚ',
    'annual',
    30,
    6,  -- June 30th (150 days after year end)
    '{"company_types": ["SRL", "SA"], "conditions": {}}'::jsonb,
    'critical',
    ARRAY[45, 30, 15, 7],
    'Depunere la ONRC și ANAF - bilanț, cont de profit și pierdere'
);

-- D390 - Annual Inventory Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    priority,
    reminder_days_before
) VALUES (
    'D390_INVENTORY_ANNUAL',
    'Declarație privind livrările/prestările/achiziţiile bunuri/servicii - D390',
    'TVA',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 325',
    'D390',
    'annual',
    31,
    1,  -- January 31st
    '{"company_types": ["SRL", "SA"], "conditions": {"is_tva_payer": true}}'::jsonb,
    'normal',
    ARRAY[15, 7]
);

-- ============================================================================
-- ADDITIONAL HR & PAYROLL DECLARATIONS
-- ============================================================================

-- D205 - Informative Declaration for Dividends Paid
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    can_auto_generate,
    data_sources,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D205_DIVIDENDS',
    'Declarație informativă privind dividendele plătite - D205',
    'IMPOZIT_VENIT',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 97',
    'D205',
    'annual',
    31,
    1,  -- January 31st
    '{"company_types": ["SRL", "SA"], "conditions": {"paid_dividends": true}}'::jsonb,
    true,
    '{"dividends": {"period": "previous_year", "fields": ["shareholder_cnp", "amount", "tax_withheld"]}}'::jsonb,
    'high',
    ARRAY[15, 7],
    'company',
    'Declarație informativă pentru toți asociații care au primit dividende'
);

-- D220 - Informative Declaration for Income from Other Sources
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    can_auto_generate,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D220_OTHER_INCOME',
    'Declarație informativă privind plățile efectuate - D220',
    'IMPOZIT_VENIT',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 120',
    'D220',
    'annual',
    28,
    2,  -- February 28th
    '{"company_types": ["SRL", "SA", "PFA"], "conditions": {}}'::jsonb,
    false,
    'normal',
    ARRAY[15, 7],
    'both',
    'Declarație pentru plăți către persoane fizice (drepturi de autor, chirii, etc.)'
);

-- D100 - Annual Tax Return
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    can_auto_generate,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D100_ANNUAL_TAX',
    'Declarație anuală de impozit și taxe locale - D100',
    'TAXE_LOCALE',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 230-241',
    'D100',
    'annual',
    31,
    3,  -- March 31st
    '{"company_types": ["SRL", "SA", "PFA", "II"], "conditions": {}}'::jsonb,
    false,
    'normal',
    ARRAY[15, 7],
    'both',
    'Declarație pentru clădiri, terenuri, mijloace de transport aflate în proprietate'
);

-- ============================================================================
-- WITHHOLDING TAX DECLARATIONS
-- ============================================================================

-- D301 - Monthly Withholding Tax Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    applies_to,
    can_auto_generate,
    data_sources,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D301_WITHHOLDING_TAX',
    'Declarație privind impozitul reținut la sursă - D301',
    'IMPOZIT_VENIT',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 115',
    'D301',
    'monthly',
    25,
    '{"company_types": ["SRL", "SA", "PFA"], "conditions": {"has_withholding_tax": true}}'::jsonb,
    true,
    '{"withholding": {"period": "previous_month", "fields": ["recipient_cui", "amount_paid", "tax_withheld"]}}'::jsonb,
    'high',
    ARRAY[7, 3],
    'company',
    'Pentru plăți către nerezidenți sau alte situații cu reținere la sursă'
);

-- ============================================================================
-- EXCISE & SPECIAL TAXES
-- ============================================================================

-- D406 - Excise Tax Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    applies_to,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D406_EXCISE',
    'Declarație de accize - D406',
    'ACCIZE',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 422',
    'D406',
    'monthly',
    25,
    '{"company_types": ["SRL", "SA"], "conditions": {"excise_activities": true}}'::jsonb,
    'critical',
    ARRAY[7, 3],
    'company',
    'Pentru produse supuse accizelor (alcool, tutun, combustibili)'
);

-- ============================================================================
-- MICRO-ENTERPRISE SPECIFIC
-- ============================================================================

-- D200A - Annual Income Tax for Micro-Enterprises
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    can_auto_generate,
    data_sources,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D200A_MICRO_ENTERPRISE',
    'Declarație privind impozitul pe veniturile microîntreprinderilor - D200A',
    'IMPOZIT_MICRO',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 52',
    'D200A',
    'quarterly',
    25,
    NULL,  -- due_month not applicable for quarterly deadlines
    '{"company_types": ["SRL"], "conditions": {"is_micro_enterprise": true}}'::jsonb,
    true,
    '{"invoices": {"period": "previous_quarter"}, "employees": {"count": true}}'::jsonb,
    'critical',
    ARRAY[10, 5, 2],
    'company',
    'Impozit de 1% sau 3% (dacă nu are angajați) din cifra de afaceri'
);

-- ============================================================================
-- ENVIRONMENTAL & SPECIAL CONTRIBUTIONS
-- ============================================================================

-- D501 - Environmental Fund Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    applies_to,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D501_ENVIRONMENTAL',
    'Declarație privind contribuția la Fondul de Mediu - D501',
    'TAXE_SPECIALE',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'OUG 196/2005',
    'D501',
    'quarterly',
    25,
    '{"company_types": ["SRL", "SA"], "conditions": {"environmental_activities": true}}'::jsonb,
    'normal',
    ARRAY[7, 3],
    'company',
    'Pentru ambalaje, anvelope, echipamente electrice/electronice'
);

-- ============================================================================
-- CONSTRUCTION SPECIAL TAX
-- ============================================================================

-- D600C - Construction Tax Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D600C_CONSTRUCTION',
    'Declarație pentru taxa pe construcții - D600C',
    'TAXE_LOCALE',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 469',
    'D600C',
    'one-time',
    30,
    NULL,
    '{"company_types": ["SRL", "SA", "PFA", "II"], "conditions": {"new_construction": true}}'::jsonb,
    'normal',
    ARRAY[15, 7],
    'both',
    'Depusă înainte de începerea construcției'
);

-- ============================================================================
-- GAMBLING & LOTTERY TAX
-- ============================================================================

-- D413 - Gambling Tax Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    applies_to,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D413_GAMBLING',
    'Declarație privind impozitul pe veniturile din jocuri de noroc - D413',
    'IMPOZIT_SPECIAL',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Codul Fiscal Art. 123',
    'D413',
    'monthly',
    25,
    '{"company_types": ["SRL", "SA"], "conditions": {"gambling_license": true}}'::jsonb,
    'critical',
    ARRAY[7, 3],
    'company',
    'Pentru organizatori de jocuri de noroc'
);

-- ============================================================================
-- TRANSFER PRICING & INTERNATIONAL
-- ============================================================================

-- D406B - Transfer Pricing File Declaration
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    due_day,
    due_month,
    applies_to,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'D406B_TRANSFER_PRICING',
    'Declarație informativă privind prețurile de transfer - D406B',
    'RAPORTARE',
    'https://www.anaf.ro/anaf/internet/ANAF/asistenta_contribuabili/declaratii_fiscale',
    'Ord. 442/2016',
    'D406B',
    'annual',
    31,
    5,  -- May 31st
    '{"company_types": ["SRL", "SA"], "conditions": {"has_related_party_transactions": true, "turnover_threshold": 35000}}'::jsonb,
    'high',
    ARRAY[30, 15, 7],
    'company',
    'Pentru tranzacții cu părți afiliate peste pragul legal'
);

-- ============================================================================
-- CUSTOMS & VAMA DECLARATIONS
-- ============================================================================

-- SAD - Single Administrative Document (Customs)
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    calculation_rule,
    applies_to,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'SAD_CUSTOMS',
    'Document Administrativ Unic (SAD) - Declarație vamală',
    'VAMA',
    'https://www.customs.ro/',
    'Cod Vamal UE 952/2013',
    'SAD',
    'on_event',
    '{"trigger": "import_export", "due_before_shipment": true}'::jsonb,
    '{"company_types": ["SRL", "SA", "PFA"], "conditions": {"import_export_activities": true}}'::jsonb,
    'critical',
    ARRAY[3, 1],
    'both',
    'Obligatoriu pentru import/export în afara UE'
);

-- ============================================================================
-- GDPR & DATA PROTECTION
-- ============================================================================

-- GDPR - Data Processing Registry
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    calculation_rule,
    applies_to,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'GDPR_REGISTRY',
    'Registrul de evidență a operațiunilor de prelucrare (GDPR)',
    'CONFORMITATE',
    'https://www.dataprotection.ro/',
    'GDPR Reg. (UE) 2016/679',
    'GDPR_REG',
    'continuous',
    '{"trigger": "data_processing_start", "update_frequency": "as_needed"}'::jsonb,
    '{"company_types": ["SRL", "SA", "PFA", "II"], "conditions": {}}'::jsonb,
    'high',
    ARRAY[30],
    'both',
    'Registru intern obligatoriu pentru toate entitățile care procesează date personale'
);

-- ============================================================================
-- ANTI-MONEY LAUNDERING
-- ============================================================================

-- STR - Suspicious Transaction Report
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    calculation_rule,
    applies_to,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'STR_AML',
    'Raportare tranzacții suspecte (AML/CFT)',
    'CONFORMITATE',
    'https://www.onpcsb.ro/',
    'Legea 129/2019',
    'STR',
    'on_event',
    '{"trigger": "suspicious_transaction", "due_within_days": 3}'::jsonb,
    '{"company_types": ["SRL", "SA", "PFA", "II"], "conditions": {"regulated_activity": true}}'::jsonb,
    'critical',
    ARRAY[1],
    'both',
    'Raportare imediată la ONPCSB pentru tranzacții suspecte sau peste 10,000 EUR'
);

-- ============================================================================
-- STATISTICAL REPORTING
-- ============================================================================

-- INS - Statistical Surveys
INSERT INTO anaf_fiscal_deadlines (
    deadline_code,
    deadline_name,
    category,
    anaf_reference_url,
    legal_basis,
    anaf_form_code,
    frequency,
    calculation_rule,
    applies_to,
    priority,
    reminder_days_before,
    entity_type,
    notes
) VALUES (
    'INS_STAT_SURVEY',
    'Anchete statistice INS (diverse periodicități)',
    'RAPORTARE',
    'https://www.insse.ro/',
    'Legea 226/2009',
    'INS_VARIOUS',
    'variable',
    '{"depends_on": "ins_selection", "notification_based": true}'::jsonb,
    '{"company_types": ["SRL", "SA"], "conditions": {}}'::jsonb,
    'normal',
    ARRAY[15, 7],
    'company',
    'Raportări statistice lunare/trimestriale/anuale conform notificărilor INS'
);

-- ============================================================================
-- PART 2: ANAF DECLARATION FORMS
-- ============================================================================

TRUNCATE TABLE anaf_declaration_forms CASCADE;

-- ============================================================================
-- D300 - TVA Declaration Form
-- ============================================================================

INSERT INTO anaf_declaration_forms (
    form_code,
    form_name,
    form_version,
    anaf_download_url,
    anaf_instructions_url,
    form_structure,
    validation_rules,
    valid_from,
    is_current_version
) VALUES (
    'D300',
    'Declarație privind taxa pe valoarea adăugată',
    '2024.v1',
    'https://static.anaf.ro/static/10/Anaf/formulare/D300_nout.pdf',
    'https://static.anaf.ro/static/10/Anaf/formulare/D300_instructiuni.pdf',
    '{
      "sections": [
        {
          "id": "sectiunea_A",
          "name": "Date de identificare",
          "fields": [
            {
              "id": "cui",
              "label": "Cod de identificare fiscală",
              "type": "text",
              "required": true,
              "validation": "^RO[0-9]{8,10}$",
              "auto_fill": "company.cui"
            },
            {
              "id": "denumire",
              "label": "Denumire operator economic",
              "type": "text",
              "required": true,
              "max_length": 255,
              "auto_fill": "company.legal_name"
            },
            {
              "id": "perioada",
              "label": "Luna/Trimestrul/Anul",
              "type": "text",
              "required": true,
              "format": "MM.YYYY",
              "auto_fill": "reporting_period"
            }
          ]
        },
        {
          "id": "sectiunea_I",
          "name": "Calcul TVA",
          "description": "Taxă colectată și taxă deductibilă",
          "fields": [
            {
              "id": "rd1_baza_impozabila_19",
              "label": "Baza impozabilă pentru operațiuni taxabile cota 19%",
              "type": "number",
              "decimals": 2,
              "required": false,
              "auto_fill_query": "SELECT COALESCE(SUM(base_amount), 0) FROM invoices WHERE company_id = :company_id AND invoice_date >= :period_start AND invoice_date <= :period_end AND tva_rate = 19 AND status IN (''issued'', ''paid'')",
              "help_text": "Totalul bazelor impozabile din facturile emise cu TVA 19%"
            },
            {
              "id": "rd1_tva_colectat_19",
              "label": "TVA colectat cota 19%",
              "type": "number",
              "decimals": 2,
              "required": false,
              "auto_fill_query": "SELECT COALESCE(SUM(tva_amount), 0) FROM invoices WHERE company_id = :company_id AND invoice_date >= :period_start AND invoice_date <= :period_end AND tva_rate = 19 AND status IN (''issued'', ''paid'')",
              "validation_formula": "rd1_baza_impozabila_19 * 0.19",
              "help_text": "TVA colectat = Bază impozabilă × 19%"
            },
            {
              "id": "rd1_baza_impozabila_9",
              "label": "Bază impozabilă cota 9%",
              "type": "number",
              "decimals": 2,
              "auto_fill_query": "SELECT COALESCE(SUM(base_amount), 0) FROM invoices WHERE company_id = :company_id AND invoice_date >= :period_start AND invoice_date <= :period_end AND tva_rate = 9"
            },
            {
              "id": "rd1_tva_colectat_9",
              "label": "TVA colectat cota 9%",
              "type": "number",
              "decimals": 2,
              "auto_fill_query": "SELECT COALESCE(SUM(tva_amount), 0) FROM invoices WHERE company_id = :company_id AND invoice_date >= :period_start AND invoice_date <= :period_end AND tva_rate = 9",
              "validation_formula": "rd1_baza_impozabila_9 * 0.09"
            },
            {
              "id": "rd2_achizitii_19",
              "label": "Achiziții de bunuri/servicii cu TVA deductibil 19%",
              "type": "number",
              "decimals": 2,
              "auto_fill_query": "SELECT COALESCE(SUM(base_amount), 0) FROM bills WHERE company_id = :company_id AND bill_date >= :period_start AND bill_date <= :period_end AND tva_rate = 19"
            },
            {
              "id": "rd2_tva_deductibil_19",
              "label": "TVA deductibil din achiziții cota 19%",
              "type": "number",
              "decimals": 2,
              "auto_fill_query": "SELECT COALESCE(SUM(tva_amount), 0) FROM bills WHERE company_id = :company_id AND bill_date >= :period_start AND bill_date <= :period_end AND tva_rate = 19",
              "validation_formula": "rd2_achizitii_19 * 0.19"
            }
          ]
        },
        {
          "id": "sectiunea_III",
          "name": "Calcul final",
          "fields": [
            {
              "id": "rd30_total_tva_colectat",
              "label": "Total TVA colectat",
              "type": "number",
              "decimals": 2,
              "required": true,
              "calculation_formula": "rd1_tva_colectat_19 + rd1_tva_colectat_9",
              "read_only": true
            },
            {
              "id": "rd31_total_tva_deductibil",
              "label": "Total TVA deductibil",
              "type": "number",
              "decimals": 2,
              "required": true,
              "calculation_formula": "rd2_tva_deductibil_19",
              "read_only": true
            },
            {
              "id": "rd40_tva_de_plata",
              "label": "TVA de plată",
              "type": "number",
              "decimals": 2,
              "calculation_formula": "MAX(0, rd30_total_tva_colectat - rd31_total_tva_deductibil)",
              "read_only": true
            },
            {
              "id": "rd50_tva_de_recuperat",
              "label": "TVA de recuperat",
              "type": "number",
              "decimals": 2,
              "calculation_formula": "MAX(0, rd31_total_tva_deductibil - rd30_total_tva_colectat)",
              "read_only": true
            }
          ]
        }
      ]
    }'::jsonb,
    '{
      "cross_field_validations": [
        {
          "rule": "rd1_tva_colectat_19 == ROUND(rd1_baza_impozabila_19 * 0.19, 2)",
          "error_message": "TVA colectat la 19% nu corespunde cu 19% din baza impozabilă",
          "severity": "error"
        },
        {
          "rule": "rd1_tva_colectat_9 == ROUND(rd1_baza_impozabila_9 * 0.09, 2)",
          "error_message": "TVA colectat la 9% nu corespunde cu 9% din baza impozabilă",
          "severity": "error"
        },
        {
          "rule": "rd40_tva_de_plata > 0 OR rd50_tva_de_recuperat > 0",
          "error_message": "Trebuie să existe fie TVA de plată, fie TVA de recuperat",
          "severity": "warning"
        }
      ],
      "business_logic": [
        {
          "rule": "rd30_total_tva_colectat == rd1_tva_colectat_19 + rd1_tva_colectat_9",
          "error_message": "Total TVA colectat nu corespunde cu suma TVA-ului pe cote",
          "severity": "error"
        }
      ]
    }'::jsonb,
    '2024-01-01',
    true
);

-- ============================================================================
-- D112 - Salaries Declaration Form
-- ============================================================================

INSERT INTO anaf_declaration_forms (
    form_code,
    form_name,
    form_version,
    anaf_download_url,
    form_structure,
    valid_from,
    is_current_version
) VALUES (
    'D112',
    'Declarație privind obligațiile de plată a contribuțiilor sociale',
    '2024.v1',
    'https://static.anaf.ro/static/10/Anaf/formulare/D112.pdf',
    '{
      "sections": [
        {
          "id": "identificare",
          "name": "Date identificare",
          "fields": [
            {"id": "cui", "label": "CUI", "type": "text", "required": true, "auto_fill": "company.cui"},
            {"id": "denumire", "label": "Denumire", "type": "text", "required": true, "auto_fill": "company.legal_name"},
            {"id": "luna", "label": "Luna", "type": "number", "min": 1, "max": 12, "required": true},
            {"id": "an", "label": "Anul", "type": "number", "required": true}
          ]
        },
        {
          "id": "salarii",
          "name": "Date privind salariile",
          "fields": [
            {"id": "numar_angajati", "label": "Număr total angajați", "type": "number", "auto_fill_query": "SELECT COUNT(*) FROM employees WHERE company_id = :company_id AND status = ''active''"},
            {"id": "fond_salarii_brut", "label": "Fond salarii brut total", "type": "number", "decimals": 2, "auto_fill_query": "SELECT COALESCE(SUM(gross_salary), 0) FROM payroll WHERE company_id = :company_id AND month = :month AND year = :year"},
            {"id": "cas_angajator", "label": "CAS datorat de angajator (25%)", "type": "number", "decimals": 2, "calculation_formula": "fond_salarii_brut * 0.25"},
            {"id": "cas_angajat", "label": "CAS reținut de la angajați (25%)", "type": "number", "decimals": 2, "calculation_formula": "fond_salarii_brut * 0.25"},
            {"id": "cass_angajat", "label": "CASS reținut de la angajați (10%)", "type": "number", "decimals": 2, "calculation_formula": "fond_salarii_brut * 0.10"},
            {"id": "impozit_venit", "label": "Impozit pe venit reținut (10%)", "type": "number", "decimals": 2}
          ]
        }
      ]
    }'::jsonb,
    '2024-01-01',
    true
);

-- ============================================================================
-- D101 - Profit Tax Declaration Form (Simplified version)
-- ============================================================================

INSERT INTO anaf_declaration_forms (
    form_code,
    form_name,
    form_version,
    anaf_download_url,
    form_structure,
    valid_from,
    is_current_version
) VALUES (
    'D101',
    'Declarație privind impozitul pe profit',
    '2024.v1',
    'https://static.anaf.ro/static/10/Anaf/formulare/D101.pdf',
    '{
      "sections": [
        {
          "id": "identificare",
          "name": "Date identificare",
          "fields": [
            {"id": "cui", "label": "CUI", "type": "text", "required": true, "auto_fill": "company.cui"},
            {"id": "denumire", "label": "Denumire", "type": "text", "required": true, "auto_fill": "company.legal_name"},
            {"id": "an_fiscal", "label": "Anul fiscal", "type": "number", "required": true}
          ]
        },
        {
          "id": "rezultat_fiscal",
          "name": "Determinarea rezultatului fiscal",
          "fields": [
            {"id": "venituri_totale", "label": "Venituri totale", "type": "number", "decimals": 2, "auto_fill_query": "SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE company_id = :company_id AND EXTRACT(YEAR FROM invoice_date) = :year AND status = ''paid''"},
            {"id": "cheltuieli_totale", "label": "Cheltuieli totale", "type": "number", "decimals": 2, "auto_fill_query": "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE company_id = :company_id AND EXTRACT(YEAR FROM expense_date) = :year"},
            {"id": "profit_contabil", "label": "Profit contabil", "type": "number", "decimals": 2, "calculation_formula": "venituri_totale - cheltuieli_totale"},
            {"id": "profit_impozabil", "label": "Profit impozabil (după ajustări)", "type": "number", "decimals": 2, "help_text": "După aplicarea ajustărilor fiscale"},
            {"id": "impozit_profit", "label": "Impozit pe profit (16%)", "type": "number", "decimals": 2, "calculation_formula": "profit_impozabil * 0.16"}
          ]
        }
      ]
    }'::jsonb,
    '2024-01-01',
    true
    -- Note: Formular simplificat - versiunea completă necesită contabil
);

-- ============================================================================
-- D212 - Declarația Unică Form (FOR INDIVIDUALS/PFA)
-- ============================================================================

INSERT INTO anaf_declaration_forms (
    form_code,
    form_name,
    form_version,
    anaf_download_url,
    anaf_instructions_url,
    form_structure,
    valid_from,
    is_current_version
) VALUES (
    'D212',
    'Declarația Unică privind impozitul pe venit și contribuțiile sociale',
    '2024.v1',
    'https://static.anaf.ro/static/10/Anaf/formulare/D212.pdf',
    'https://static.anaf.ro/static/10/Anaf/Informatii_R/instructiuni_D212.pdf',
    '{
      "sections": [
        {
          "id": "identificare",
          "name": "Date de identificare",
          "fields": [
            {"id": "cnp", "label": "CNP", "type": "text", "required": true, "max_length": 13, "auto_fill": "user.cnp"},
            {"id": "nume", "label": "Nume", "type": "text", "required": true, "auto_fill": "user.last_name"},
            {"id": "prenume", "label": "Prenume", "type": "text", "required": true, "auto_fill": "user.first_name"},
            {"id": "domiciliu_judet", "label": "Județ", "type": "text", "auto_fill": "user.county"},
            {"id": "domiciliu_localitate", "label": "Localitate", "type": "text", "auto_fill": "user.city"},
            {"id": "domiciliu_adresa", "label": "Adresă", "type": "text", "auto_fill": "user.address"},
            {"id": "telefon", "label": "Telefon", "type": "text", "auto_fill": "user.phone"},
            {"id": "email", "label": "Email", "type": "email", "auto_fill": "user.email"}
          ]
        },
        {
          "id": "cap_1_venituri_independente",
          "name": "Cap. 1 - Venituri din activități independente (PFA, II, Drepturi de autor)",
          "fields": [
            {"id": "rd1_venituri_brute", "label": "Venituri brute realizate", "type": "number", "decimals": 2, "auto_fill_query": "SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE user_id = :user_id AND EXTRACT(YEAR FROM invoice_date) = :year AND status = ''paid''"},
            {"id": "rd2_cheltuieli_deductibile", "label": "Cheltuieli deductibile", "type": "number", "decimals": 2, "auto_fill_query": "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = :user_id AND EXTRACT(YEAR FROM expense_date) = :year"},
            {"id": "rd3_venit_net", "label": "Venit net anual", "type": "number", "decimals": 2, "calculation_formula": "rd1_venituri_brute - rd2_cheltuieli_deductibile"},
            {"id": "rd4_norma_venit", "label": "Norma de venit (dacă aplicabil)", "type": "number", "decimals": 2, "default": 0},
            {"id": "rd5_venit_impozabil", "label": "Venit net impozabil", "type": "number", "decimals": 2, "calculation_formula": "rd3_venit_net + rd4_norma_venit"}
          ]
        },
        {
          "id": "cap_2_venituri_salarii",
          "name": "Cap. 2 - Venituri din salarii și asimilate salariilor",
          "fields": [
            {"id": "rd11_venituri_salarii", "label": "Venituri din salarii", "type": "number", "decimals": 2, "auto_fill_query": "SELECT COALESCE(SUM(gross_salary), 0) FROM payroll WHERE employee_user_id = :user_id AND year = :year"},
            {"id": "rd12_impozit_retinut", "label": "Impozit reținut la sursă", "type": "number", "decimals": 2, "auto_fill_query": "SELECT COALESCE(SUM(income_tax), 0) FROM payroll WHERE employee_user_id = :user_id AND year = :year"},
            {"id": "rd13_cas_retinut", "label": "CAS reținut", "type": "number", "decimals": 2, "auto_fill_query": "SELECT COALESCE(SUM(cas_employee), 0) FROM payroll WHERE employee_user_id = :user_id AND year = :year"},
            {"id": "rd14_cass_retinut", "label": "CASS reținut", "type": "number", "decimals": 2, "auto_fill_query": "SELECT COALESCE(SUM(cass_employee), 0) FROM payroll WHERE employee_user_id = :user_id AND year = :year"}
          ]
        },
        {
          "id": "cap_3_venituri_chirii",
          "name": "Cap. 3 - Venituri din cedarea folosinței bunurilor (chirii)",
          "fields": [
            {"id": "rd21_venituri_chirii", "label": "Venituri din chirii", "type": "number", "decimals": 2, "default": 0, "help_text": "Venitul anual din închirierea proprietăților"},
            {"id": "rd22_cheltuieli_chirii", "label": "Cheltuieli deductibile (25% sau reale)", "type": "number", "decimals": 2, "default": 0},
            {"id": "rd23_venit_net_chirii", "label": "Venit net din chirii", "type": "number", "decimals": 2, "calculation_formula": "rd21_venituri_chirii - rd22_cheltuieli_chirii"}
          ]
        },
        {
          "id": "cap_4_venituri_investitii",
          "name": "Cap. 4 - Venituri din investiții (dividende, dobânzi, vânzare acțiuni)",
          "fields": [
            {"id": "rd31_dividende", "label": "Dividende primite", "type": "number", "decimals": 2, "default": 0},
            {"id": "rd32_dobanda", "label": "Dobânzi primite", "type": "number", "decimals": 2, "default": 0},
            {"id": "rd33_castig_capital", "label": "Câștig din transferul titlurilor de valoare", "type": "number", "decimals": 2, "default": 0}
          ]
        },
        {
          "id": "cap_5_venituri_agricole",
          "name": "Cap. 5 - Venituri din activități agricole",
          "fields": [
            {"id": "rd41_venituri_agricole", "label": "Venituri din agricultura (normă de venit)", "type": "number", "decimals": 2, "default": 0},
            {"id": "rd42_sistem_real", "label": "Venituri agricole (sistem real)", "type": "number", "decimals": 2, "default": 0}
          ]
        },
        {
          "id": "cap_6_alte_venituri",
          "name": "Cap. 6 - Alte venituri",
          "fields": [
            {"id": "rd51_alte_venituri", "label": "Alte surse de venit", "type": "number", "decimals": 2, "default": 0, "help_text": "Premii, jocuri de noroc, vânzări bunuri, etc."}
          ]
        },
        {
          "id": "deduceri_personale",
          "name": "Deduceri personale",
          "fields": [
            {"id": "rd61_deducere_personala_baza", "label": "Deducere personală de bază", "type": "number", "decimals": 2, "default": 510, "help_text": "510 RON/lună = 6,120 RON/an (2024)"},
            {"id": "rd62_persoane_intretinere", "label": "Nr. persoane în întreținere", "type": "number", "default": 0},
            {"id": "rd63_deducere_persoane", "label": "Deducere pentru persoane în întreținere", "type": "number", "decimals": 2, "calculation_formula": "rd62_persoane_intretinere * 510 * 12"},
            {"id": "rd64_contributii_sanatate", "label": "Contribuții la asigurări de sănătate", "type": "number", "decimals": 2, "default": 0},
            {"id": "rd65_contributii_pensie", "label": "Contribuții la pensii facultative", "type": "number", "decimals": 2, "default": 0, "help_text": "Max 400 EUR/an"},
            {"id": "rd66_coplata_medicamente", "label": "Cheltuieli medicale/coplată medicamente", "type": "number", "decimals": 2, "default": 0},
            {"id": "rd67_donatii", "label": "Donații", "type": "number", "decimals": 2, "default": 0, "help_text": "Max 5% din venit sau 20% pentru cultură"}
          ]
        },
        {
          "id": "calcul_impozit",
          "name": "Calculul impozitului pe venit",
          "fields": [
            {"id": "rd71_venit_total", "label": "Venit total net", "type": "number", "decimals": 2, "calculation_formula": "rd5_venit_impozabil + rd11_venituri_salarii + rd23_venit_net_chirii + rd31_dividende + rd32_dobanda + rd33_castig_capital + rd41_venituri_agricole + rd42_sistem_real + rd51_alte_venituri"},
            {"id": "rd72_deduceri_totale", "label": "Total deduceri", "type": "number", "decimals": 2, "calculation_formula": "rd61_deducere_personala_baza + rd63_deducere_persoane + rd64_contributii_sanatate + rd65_contributii_pensie + rd66_coplata_medicamente + rd67_donatii"},
            {"id": "rd73_baza_calcul", "label": "Baza de calcul impozit", "type": "number", "decimals": 2, "calculation_formula": "MAX(rd71_venit_total - rd72_deduceri_totale, 0)"},
            {"id": "rd74_impozit_venit", "label": "Impozit pe venit datorat (10%)", "type": "number", "decimals": 2, "calculation_formula": "rd73_baza_calcul * 0.10"},
            {"id": "rd75_impozit_retinut", "label": "Impozit reținut la sursă", "type": "number", "decimals": 2, "auto_fill": "rd12_impozit_retinut"},
            {"id": "rd76_impozit_de_plata", "label": "Impozit de plată/de recuperat", "type": "number", "decimals": 2, "calculation_formula": "rd74_impozit_venit - rd75_impozit_retinut"}
          ]
        },
        {
          "id": "contributii_sociale",
          "name": "Contribuții de asigurări sociale (CAS) și sănătate (CASS)",
          "fields": [
            {"id": "rd81_venit_cas", "label": "Venit lunar estimat pentru CAS", "type": "number", "decimals": 2, "help_text": "Pentru PFA/II: 25% din salariul mediu brut = cca. 2,000 RON (2024)"},
            {"id": "rd82_cota_cas", "label": "Cotă CAS (%)", "type": "number", "decimals": 2, "default": 25, "help_text": "25% standard"},
            {"id": "rd83_cas_datorate", "label": "CAS datorate anual", "type": "number", "decimals": 2, "calculation_formula": "rd81_venit_cas * 12 * (rd82_cota_cas / 100)"},
            {"id": "rd84_venit_cass", "label": "Venit lunar estimat pentru CASS", "type": "number", "decimals": 2, "help_text": "Minim 12 salarii minime/an sau venit realizat"},
            {"id": "rd85_cota_cass", "label": "Cotă CASS (%)", "type": "number", "decimals": 2, "default": 10, "help_text": "10% standard"},
            {"id": "rd86_cass_datorate", "label": "CASS datorate anual", "type": "number", "decimals": 2, "calculation_formula": "rd84_venit_cass * 12 * (rd85_cota_cass / 100)"},
            {"id": "rd87_cas_platite", "label": "CAS deja plătite în cursul anului", "type": "number", "decimals": 2, "default": 0},
            {"id": "rd88_cass_platite", "label": "CASS deja plătite în cursul anului", "type": "number", "decimals": 2, "default": 0},
            {"id": "rd89_cas_de_plata", "label": "CAS de plată/recuperat", "type": "number", "decimals": 2, "calculation_formula": "rd83_cas_datorate - rd87_cas_platite"},
            {"id": "rd90_cass_de_plata", "label": "CASS de plată/recuperat", "type": "number", "decimals": 2, "calculation_formula": "rd86_cass_datorate - rd88_cass_platite"}
          ]
        },
        {
          "id": "declarare_bunuri",
          "name": "Declararea bunurilor imobile și a mijloacelor de transport",
          "fields": [
            {"id": "rd91_terenuri", "label": "Terenuri deținute (număr)", "type": "number", "default": 0},
            {"id": "rd92_cladiri", "label": "Clădiri deținute (număr)", "type": "number", "default": 0},
            {"id": "rd93_apartamente", "label": "Apartamente deținute (număr)", "type": "number", "default": 0},
            {"id": "rd94_autoturisme", "label": "Autoturisme deținute (număr)", "type": "number", "default": 0},
            {"id": "rd95_alte_vehicule", "label": "Alte vehicule (număr)", "type": "number", "default": 0}
          ]
        },
        {
          "id": "total_de_plata",
          "name": "TOTAL DE PLATĂ/RECUPERAT",
          "fields": [
            {"id": "rd100_total_impozit", "label": "Total impozit pe venit", "type": "number", "decimals": 2, "auto_fill": "rd76_impozit_de_plata"},
            {"id": "rd101_total_cas", "label": "Total CAS", "type": "number", "decimals": 2, "auto_fill": "rd89_cas_de_plata"},
            {"id": "rd102_total_cass", "label": "Total CASS", "type": "number", "decimals": 2, "auto_fill": "rd90_cass_de_plata"},
            {"id": "rd103_TOTAL_GENERAL", "label": "TOTAL GENERAL DE PLATĂ", "type": "number", "decimals": 2, "calculation_formula": "rd100_total_impozit + rd101_total_cas + rd102_total_cass", "style": "bold"}
          ]
        }
      ]
    }'::jsonb,
    '2024-01-01',
    true
    -- Note: Declarația Unică 2024 - cea mai importantă declarație pentru persoane fizice, PFA, II. Include toate veniturile, contribuții sociale și declararea bunurilor.
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Count deadlines inserted
SELECT
    category,
    COUNT(*) as deadline_count
FROM anaf_fiscal_deadlines
GROUP BY category
ORDER BY category;

-- List all deadlines
SELECT
    deadline_code,
    deadline_name,
    frequency,
    due_day,
    priority
FROM anaf_fiscal_deadlines
ORDER BY category, deadline_code;

-- Count forms inserted
SELECT
    form_code,
    form_name,
    form_version,
    is_current_version
FROM anaf_declaration_forms
ORDER BY form_code;

-- ============================================================================
-- NOTES
-- ============================================================================

-- This seed file provides:
-- - 15 major fiscal deadlines covering TVA, Salaries, Profit Tax, Local Taxes
-- - 3 declaration forms (D300, D112, D101) with auto-fill capability
--
-- Additional deadlines to be added in future updates:
-- - Accize (excise duties)
-- - VAMALE (customs)
-- - Specific industry declarations
--
-- For production use:
-- - Update URLs to latest ANAF resources
-- - Add complete form structures for all fields
-- - Implement complex calculation rules
-- - Add validation for edge cases

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
