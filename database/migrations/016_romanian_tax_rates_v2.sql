-- Migration 016v2: Romanian Tax Rates Configuration
-- E2-US02: Romanian tax calculations (renamed to avoid conflict)

-- Romanian tax rates reference table
CREATE TABLE IF NOT EXISTS romanian_tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_type VARCHAR(50) NOT NULL,
    tax_name_ro VARCHAR(100) NOT NULL,
    tax_name_en VARCHAR(100) NOT NULL,
    rate DECIMAL(6,4) NOT NULL,
    effective_from DATE NOT NULL,
    effective_until DATE,
    applicable_to JSONB DEFAULT '[]',
    conditions JSONB DEFAULT '{}',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tax_type, effective_from)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ro_tax_rates_type ON romanian_tax_rates(tax_type);
CREATE INDEX IF NOT EXISTS idx_ro_tax_rates_active ON romanian_tax_rates(is_active, effective_from);

-- Insert 2024/2025 Romanian tax rates
INSERT INTO romanian_tax_rates (tax_type, tax_name_ro, tax_name_en, rate, effective_from, applicable_to, notes) VALUES
-- Income tax
('income_tax', 'Impozit pe venit', 'Income Tax', 0.1000, '2024-01-01', '["pfa", "srl", "employee"]', 'Standard 10% income tax'),

-- Social contributions (employee/PFA)
('cas', 'Contributie asigurari sociale (CAS)', 'Social Security Contribution (CAS)', 0.2500, '2024-01-01', '["pfa", "employee"]', 'Pension contribution 25%'),
('cass', 'Contributie asigurari sociale de sanatate (CASS)', 'Health Insurance Contribution (CASS)', 0.1000, '2024-01-01', '["pfa", "employee"]', 'Health insurance 10%'),

-- Micro-enterprise tax rates
('micro_1', 'Impozit micro cu angajati (1%)', 'Micro-enterprise Tax with Employees (1%)', 0.0100, '2024-01-01', '["srl_micro"]', 'Micro-enterprise with at least 1 employee'),
('micro_3', 'Impozit micro fara angajati (3%)', 'Micro-enterprise Tax without Employees (3%)', 0.0300, '2024-01-01', '["srl_micro"]', 'Micro-enterprise without employees'),

-- Corporate profit tax
('profit_tax', 'Impozit pe profit', 'Corporate Income Tax', 0.1600, '2024-01-01', '["srl_profit"]', 'Standard corporate income tax 16%'),

-- Dividend tax
('dividend_tax', 'Impozit pe dividende', 'Dividend Tax', 0.0800, '2024-01-01', '["srl"]', 'Dividend withholding tax 8%'),

-- VAT rates
('vat_19', 'TVA standard 19%', 'Standard VAT 19%', 0.1900, '2024-01-01', '["all"]', 'Standard VAT rate'),
('vat_9', 'TVA redus 9%', 'Reduced VAT 9%', 0.0900, '2024-01-01', '["all"]', 'Food, hotels, restaurants, water, etc.'),
('vat_5', 'TVA redus 5%', 'Reduced VAT 5%', 0.0500, '2024-01-01', '["all"]', 'Books, housing up to 120sqm, etc.'),
('vat_0', 'TVA 0%', 'Zero VAT', 0.0000, '2024-01-01', '["all"]', 'Exports, intra-community supplies'),

-- Employer contributions
('cam', 'Contributie asiguratorie pentru munca (CAM)', 'Work Insurance Contribution (CAM)', 0.0225, '2024-01-01', '["employer"]', 'Employer work insurance 2.25%'),

-- Specific taxes
('construction_tax', 'Impozit specific constructii', 'Construction Specific Tax', 0.0050, '2024-01-01', '["construction"]', 'Construction industry specific tax')
ON CONFLICT (tax_type, effective_from) DO NOTHING;

-- Minimum wage reference (for CAS/CASS thresholds)
CREATE TABLE IF NOT EXISTS minimum_wage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(10,2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_until DATE,
    notes TEXT,
    UNIQUE(effective_from)
);

-- Insert minimum wage history
INSERT INTO minimum_wage_history (amount, effective_from, notes) VALUES
(3300, '2024-01-01', 'Salariul minim brut 2024'),
(3700, '2025-01-01', 'Salariul minim brut 2025 (proiectat)')
ON CONFLICT (effective_from) DO NOTHING;

-- Function to get Romanian tax rate
CREATE OR REPLACE FUNCTION get_romanian_tax_rate(p_tax_type VARCHAR, p_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL AS $$
DECLARE
    v_rate DECIMAL;
BEGIN
    SELECT rate INTO v_rate
    FROM romanian_tax_rates
    WHERE tax_type = p_tax_type
      AND is_active = true
      AND effective_from <= p_date
      AND (effective_until IS NULL OR effective_until >= p_date)
    ORDER BY effective_from DESC
    LIMIT 1;

    RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get minimum wage
CREATE OR REPLACE FUNCTION get_minimum_wage(p_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL AS $$
DECLARE
    v_wage DECIMAL;
BEGIN
    SELECT amount INTO v_wage
    FROM minimum_wage_history
    WHERE effective_from <= p_date
      AND (effective_until IS NULL OR effective_until >= p_date)
    ORDER BY effective_from DESC
    LIMIT 1;

    RETURN COALESCE(v_wage, 3300);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE romanian_tax_rates IS 'Romanian tax rates reference table';
COMMENT ON TABLE minimum_wage_history IS 'Romanian minimum wage history';
COMMENT ON FUNCTION get_romanian_tax_rate IS 'Get Romanian tax rate for a given type and date';
COMMENT ON FUNCTION get_minimum_wage IS 'Get Romanian minimum wage for a given date';
