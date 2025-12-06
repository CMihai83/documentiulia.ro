-- ============================================================================
-- DocumentIulia - Complete Payroll System
-- Database Schema for Romanian Payroll Compliance
-- ============================================================================
--
-- This migration creates a comprehensive payroll system supporting:
-- 1. Monthly payroll processing (gross → net calculation)
-- 2. Romanian social contributions (CAS, CASS)
-- 3. Income tax withholding (10%)
-- 4. Payslip generation
-- 5. Bank payment file export (SEPA XML)
-- 6. D112 declaration auto-generation
-- 7. Full audit trail
--
-- Created: 2025-11-22
-- Version: 1.0
-- Compliance: Romanian Labor Code & Fiscal Code 2024-2025
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table 1: salary_components
-- Purpose: Define reusable salary components (base, bonuses, allowances)
-- ============================================================================

CREATE TABLE IF NOT EXISTS salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Component details
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),

    -- Component type
    component_type VARCHAR(50) NOT NULL,
    -- Types: base_salary, bonus, overtime, commission, allowance, benefit

    -- Tax treatment
    is_taxable BOOLEAN DEFAULT true,
    is_subject_to_cas BOOLEAN DEFAULT true,
    is_subject_to_cass BOOLEAN DEFAULT true,
    is_subject_to_income_tax BOOLEAN DEFAULT true,

    -- Calculation
    calculation_method VARCHAR(50) DEFAULT 'fixed',
    -- Methods: fixed, percentage, hourly, formula

    default_amount NUMERIC(12,2),
    percentage_of_base NUMERIC(5,2),

    -- Display
    display_order INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    description TEXT,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Table 2: employee_salary_structures
-- Purpose: Define each employee's salary structure
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Employee linkage
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Salary details
    base_salary NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',

    -- Work schedule
    hours_per_month NUMERIC(6,2) DEFAULT 160.00,
    -- Standard: 8 hours/day × 20 working days = 160 hours

    -- Effective dates
    effective_from DATE NOT NULL,
    effective_to DATE,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(employee_id, effective_from)
);

-- ============================================================================
-- Table 3: employee_salary_components
-- Purpose: Additional salary components per employee
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Linkage
    employee_salary_structure_id UUID NOT NULL REFERENCES employee_salary_structures(id) ON DELETE CASCADE,
    salary_component_id UUID NOT NULL REFERENCES salary_components(id) ON DELETE CASCADE,

    -- Amount
    amount NUMERIC(12,2),
    percentage NUMERIC(5,2),

    -- Recurrence
    is_recurring BOOLEAN DEFAULT true,
    recurrence_rule VARCHAR(50) DEFAULT 'monthly',
    -- monthly, one_time, quarterly, annual

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Table 4: payroll_periods
-- Purpose: Track payroll processing periods
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Company linkage
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Period
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Working days
    working_days INTEGER NOT NULL,
    working_hours NUMERIC(6,2),

    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    -- draft, calculated, approved, paid, closed

    -- Processing
    calculated_at TIMESTAMP WITH TIME ZONE,
    calculated_by UUID REFERENCES users(id),

    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),

    paid_at TIMESTAMP WITH TIME ZONE,
    paid_by UUID REFERENCES users(id),

    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES users(id),

    -- Bank payment
    bank_file_path TEXT,
    bank_file_generated_at TIMESTAMP WITH TIME ZONE,

    -- D112 Declaration
    d112_declaration_id UUID,
    -- Will link to fiscal_declarations table

    -- Totals (cached for performance)
    total_gross_salary NUMERIC(12,2) DEFAULT 0,
    total_net_salary NUMERIC(12,2) DEFAULT 0,
    total_cas_employer NUMERIC(12,2) DEFAULT 0,
    total_cass_employer NUMERIC(12,2) DEFAULT 0,
    total_cas_employee NUMERIC(12,2) DEFAULT 0,
    total_cass_employee NUMERIC(12,2) DEFAULT 0,
    total_income_tax NUMERIC(12,2) DEFAULT 0,

    -- Metadata
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(company_id, year, month)
);

-- ============================================================================
-- Table 5: payroll_items
-- Purpose: Individual payroll calculations per employee per period
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Linkage
    payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    employee_salary_structure_id UUID REFERENCES employee_salary_structures(id),

    -- Work time
    days_worked NUMERIC(5,2) NOT NULL,
    hours_worked NUMERIC(8,2),

    -- Gross salary components
    base_salary NUMERIC(12,2) NOT NULL,
    bonuses NUMERIC(12,2) DEFAULT 0,
    overtime NUMERIC(12,2) DEFAULT 0,
    allowances NUMERIC(12,2) DEFAULT 0,
    other_taxable NUMERIC(12,2) DEFAULT 0,

    -- Gross total
    gross_salary NUMERIC(12,2) NOT NULL,

    -- Employer contributions (NOT deducted from employee)
    cas_employer NUMERIC(12,2) NOT NULL,
    -- 25% of gross (employer pays)
    cas_employer_rate NUMERIC(5,2) DEFAULT 25.00,

    cass_employer NUMERIC(12,2) NOT NULL,
    -- 10% of gross (employer pays)
    cass_employer_rate NUMERIC(5,2) DEFAULT 10.00,

    -- Employee deductions
    cas_employee NUMERIC(12,2) NOT NULL,
    -- 25% of gross (deducted from employee)
    cas_employee_rate NUMERIC(5,2) DEFAULT 25.00,

    cass_employee NUMERIC(12,2) NOT NULL,
    -- 10% of gross (deducted from employee)
    cass_employee_rate NUMERIC(5,2) DEFAULT 10.00,

    -- Personal deductions
    personal_deduction NUMERIC(12,2) DEFAULT 0,
    -- 510 RON/month basic deduction (2024)

    dependents_deduction NUMERIC(12,2) DEFAULT 0,
    -- 510 RON/month per dependent

    -- Taxable income (after deductions)
    taxable_income NUMERIC(12,2) NOT NULL,

    -- Income tax
    income_tax NUMERIC(12,2) NOT NULL,
    -- 10% of taxable income
    income_tax_rate NUMERIC(5,2) DEFAULT 10.00,

    -- Other deductions
    union_fees NUMERIC(12,2) DEFAULT 0,
    meal_vouchers NUMERIC(12,2) DEFAULT 0,
    advances NUMERIC(12,2) DEFAULT 0,
    garnishments NUMERIC(12,2) DEFAULT 0,
    other_deductions NUMERIC(12,2) DEFAULT 0,

    -- Net salary (what employee receives)
    net_salary NUMERIC(12,2) NOT NULL,

    -- Non-taxable benefits
    meal_vouchers_value NUMERIC(12,2) DEFAULT 0,
    transportation_allowance NUMERIC(12,2) DEFAULT 0,

    -- Calculation details (JSON for transparency)
    calculation_details JSONB,

    -- Status
    status VARCHAR(50) DEFAULT 'calculated',
    -- calculated, approved, paid

    -- Payslip
    payslip_generated BOOLEAN DEFAULT false,
    payslip_file_path TEXT,
    payslip_sent_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(payroll_period_id, employee_id)
);

-- ============================================================================
-- Table 6: payroll_adjustments
-- Purpose: Track adjustments to payroll (corrections, bonuses, deductions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Linkage
    payroll_item_id UUID NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,

    -- Adjustment details
    adjustment_type VARCHAR(50) NOT NULL,
    -- Types: bonus, deduction, correction, retroactive, advance_recovery

    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,

    -- Tax treatment
    is_taxable BOOLEAN DEFAULT true,

    -- Approval
    approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    reason TEXT,
    created_by UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Table 7: payslips
-- Purpose: Track generated payslip documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Linkage
    payroll_item_id UUID NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Period
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,

    -- File details
    file_path TEXT NOT NULL,
    file_size INTEGER,

    -- Status
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES users(id),

    sent_at TIMESTAMP WITH TIME ZONE,
    sent_to_email VARCHAR(255),

    viewed_at TIMESTAMP WITH TIME ZONE,
    viewed_by UUID REFERENCES users(id),

    downloaded_at TIMESTAMP WITH TIME ZONE,

    -- Signature/hash for integrity
    document_hash VARCHAR(64),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Table 8: payroll_bank_payments
-- Purpose: Track bank payment files and individual transfers
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_bank_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Linkage
    payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Bank file
    file_path TEXT NOT NULL,
    file_format VARCHAR(50) DEFAULT 'SEPA_XML',
    -- Formats: SEPA_XML, CSV, proprietary_bank_format

    file_size INTEGER,
    file_hash VARCHAR(64),

    -- Payment details
    total_amount NUMERIC(12,2) NOT NULL,
    number_of_payments INTEGER NOT NULL,

    payment_date DATE NOT NULL,

    -- Bank account
    from_bank_account_id UUID REFERENCES bank_accounts(id),
    from_iban VARCHAR(34),

    -- Status
    status VARCHAR(50) DEFAULT 'generated',
    -- generated, uploaded_to_bank, confirmed, completed, failed

    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES users(id),

    uploaded_at TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES users(id),

    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Table 9: payroll_bank_payment_items
-- Purpose: Individual payment lines in bank file
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_bank_payment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Linkage
    payroll_bank_payment_id UUID NOT NULL REFERENCES payroll_bank_payments(id) ON DELETE CASCADE,
    payroll_item_id UUID NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Payment details
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',

    -- Recipient
    beneficiary_name VARCHAR(255) NOT NULL,
    beneficiary_iban VARCHAR(34) NOT NULL,
    beneficiary_bank VARCHAR(255),

    -- Payment reference
    payment_reference VARCHAR(140),
    -- e.g., "Salariu Feb 2025 - Popescu Ion"

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, sent, confirmed, failed

    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- Error tracking
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- salary_components
CREATE INDEX idx_salary_components_type ON salary_components(component_type);
CREATE INDEX idx_salary_components_active ON salary_components(is_active) WHERE is_active = true;

-- employee_salary_structures
CREATE INDEX idx_emp_salary_struct_employee ON employee_salary_structures(employee_id);
CREATE INDEX idx_emp_salary_struct_company ON employee_salary_structures(company_id);
CREATE INDEX idx_emp_salary_struct_active ON employee_salary_structures(is_active) WHERE is_active = true;
CREATE INDEX idx_emp_salary_struct_effective ON employee_salary_structures(effective_from, effective_to);

-- payroll_periods
CREATE INDEX idx_payroll_periods_company ON payroll_periods(company_id);
CREATE INDEX idx_payroll_periods_date ON payroll_periods(year, month);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);

-- payroll_items
CREATE INDEX idx_payroll_items_period ON payroll_items(payroll_period_id);
CREATE INDEX idx_payroll_items_employee ON payroll_items(employee_id);
CREATE INDEX idx_payroll_items_status ON payroll_items(status);

-- payslips
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_company ON payslips(company_id);
CREATE INDEX idx_payslips_period ON payslips(year, month);

-- payroll_bank_payments
CREATE INDEX idx_bank_payments_period ON payroll_bank_payments(payroll_period_id);
CREATE INDEX idx_bank_payments_company ON payroll_bank_payments(company_id);
CREATE INDEX idx_bank_payments_status ON payroll_bank_payments(status);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE salary_components IS 'Reusable salary component definitions (base, bonus, allowance, etc.)';
COMMENT ON TABLE employee_salary_structures IS 'Employee salary structures with effective dates';
COMMENT ON TABLE payroll_periods IS 'Monthly payroll processing periods';
COMMENT ON TABLE payroll_items IS 'Individual employee payroll calculations per period';
COMMENT ON TABLE payroll_adjustments IS 'Adjustments to payroll (bonuses, deductions, corrections)';
COMMENT ON TABLE payslips IS 'Generated payslip PDF documents';
COMMENT ON TABLE payroll_bank_payments IS 'Bank payment files (SEPA XML) for salary transfers';

COMMENT ON COLUMN payroll_items.cas_employer IS '25% employer contribution (NOT deducted from employee)';
COMMENT ON COLUMN payroll_items.cass_employer IS '10% employer contribution (NOT deducted from employee)';
COMMENT ON COLUMN payroll_items.cas_employee IS '25% employee contribution (deducted from gross)';
COMMENT ON COLUMN payroll_items.cass_employee IS '10% employee contribution (deducted from gross)';
COMMENT ON COLUMN payroll_items.income_tax IS '10% income tax on taxable income after personal deductions';
COMMENT ON COLUMN payroll_items.net_salary IS 'Final amount employee receives = gross - cas_employee - cass_employee - income_tax - other_deductions';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_salary_components_timestamp
    BEFORE UPDATE ON salary_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_salary_structures_timestamp
    BEFORE UPDATE ON employee_salary_structures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_periods_timestamp
    BEFORE UPDATE ON payroll_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_items_timestamp
    BEFORE UPDATE ON payroll_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_adjustments_timestamp
    BEFORE UPDATE ON payroll_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_bank_payments_timestamp
    BEFORE UPDATE ON payroll_bank_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_bank_payment_items_timestamp
    BEFORE UPDATE ON payroll_bank_payment_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT ALL PRIVILEGES ON salary_components TO accountech_app;
GRANT ALL PRIVILEGES ON employee_salary_structures TO accountech_app;
GRANT ALL PRIVILEGES ON employee_salary_components TO accountech_app;
GRANT ALL PRIVILEGES ON payroll_periods TO accountech_app;
GRANT ALL PRIVILEGES ON payroll_items TO accountech_app;
GRANT ALL PRIVILEGES ON payroll_adjustments TO accountech_app;
GRANT ALL PRIVILEGES ON payslips TO accountech_app;
GRANT ALL PRIVILEGES ON payroll_bank_payments TO accountech_app;
GRANT ALL PRIVILEGES ON payroll_bank_payment_items TO accountech_app;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
