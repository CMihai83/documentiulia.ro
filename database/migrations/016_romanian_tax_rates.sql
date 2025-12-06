-- Migration 016: Romanian Tax Rates Configuration
-- E2-US02: Romanian tax calculations

-- Tax rates configuration table
CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_type VARCHAR(50) NOT NULL,
    rate_name VARCHAR(100) NOT NULL,
    rate DECIMAL(6,4) NOT NULL, -- Stored as decimal (e.g., 0.1000 for 10%)
    effective_from DATE NOT NULL,
    effective_until DATE,
    applicable_to JSONB DEFAULT '[]', -- ["pfa", "srl", "micro", etc.]
    conditions JSONB DEFAULT '{}', -- Additional conditions for applicability
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax brackets for progressive taxes
CREATE TABLE IF NOT EXISTS tax_brackets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_type VARCHAR(50) NOT NULL,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2), -- NULL for unlimited
    rate DECIMAL(6,4) NOT NULL,
    fixed_amount DECIMAL(15,2) DEFAULT 0, -- Fixed component
    effective_from DATE NOT NULL,
    effective_until DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company tax settings
CREATE TABLE IF NOT EXISTS company_tax_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    business_type VARCHAR(50) NOT NULL, -- pfa, srl_micro, srl_profit, ii, if
    vat_registered BOOLEAN DEFAULT false,
    vat_quarterly BOOLEAN DEFAULT false, -- true = quarterly, false = monthly
    micro_tax_rate DECIMAL(6,4), -- 1% or 3%
    has_employees BOOLEAN DEFAULT false,
    employee_count INTEGER DEFAULT 0,
    fiscal_year_end INTEGER DEFAULT 12, -- Month of fiscal year end
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Tax calculation history
CREATE TABLE IF NOT EXISTS tax_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    calculation_type VARCHAR(50) NOT NULL,
    input_data JSONB NOT NULL,
    result_data JSONB NOT NULL,
    period_start DATE,
    period_end DATE,
    is_estimate BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tax_rates_type ON tax_rates(tax_type);
CREATE INDEX IF NOT EXISTS idx_tax_rates_effective ON tax_rates(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_tax_brackets_type ON tax_brackets(tax_type);
CREATE INDEX IF NOT EXISTS idx_company_tax_company ON company_tax_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_calculations_company ON tax_calculations(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_calculations_type ON tax_calculations(calculation_type);

-- Seed 2025 Romanian tax rates
INSERT INTO tax_rates (tax_type, rate_name, rate, effective_from, applicable_to, notes) VALUES
-- Income tax
('income_tax', 'Impozit pe venit', 0.1000, '2024-01-01', '["pfa", "srl", "employee"]', 'Standard 10% income tax'),

-- Social contributions
('cas', 'Contributie asigurari sociale (CAS)', 0.2500, '2024-01-01', '["pfa", "employee"]', 'Pension contribution 25%'),
('cass', 'Contributie asigurari sociale de sanatate (CASS)', 0.1000, '2024-01-01', '["pfa", "employee"]', 'Health insurance 10%'),

-- Micro-enterprise tax
('micro_1', 'Impozit micro 1%', 0.0100, '2024-01-01', '["srl_micro"]', 'Micro-enterprise with employees'),
('micro_3', 'Impozit micro 3%', 0.0300, '2024-01-01', '["srl_micro"]', 'Micro-enterprise without employees'),

-- Corporate tax
('profit_tax', 'Impozit pe profit', 0.1600, '2024-01-01', '["srl_profit"]', 'Corporate income tax 16%'),

-- Dividend tax
('dividend_tax', 'Impozit pe dividende', 0.0800, '2024-01-01', '["srl"]', 'Dividend withholding tax 8%'),

-- VAT rates
('vat_standard', 'TVA standard', 0.1900, '2024-01-01', '["all"]', 'Standard VAT rate 19%'),
('vat_reduced_9', 'TVA redus 9%', 0.0900, '2024-01-01', '["all"]', 'Reduced VAT for food, hotels, etc.'),
('vat_reduced_5', 'TVA redus 5%', 0.0500, '2024-01-01', '["all"]', 'Reduced VAT for books, housing, etc.'),
('vat_zero', 'TVA 0%', 0.0000, '2024-01-01', '["all"]', 'Zero-rated VAT for exports, etc.'),

-- Employer contributions
('cam', 'Contributie asiguratorie pentru munca (CAM)', 0.0225, '2024-01-01', '["employer"]', 'Work insurance contribution 2.25%'),

-- Other taxes
('construction_tax', 'Impozit specific constructii', 0.0050, '2024-01-01', '["construction"]', 'Construction-specific tax')
ON CONFLICT DO NOTHING;

-- CAS/CASS threshold brackets for 2025
INSERT INTO tax_brackets (tax_type, min_amount, max_amount, rate, effective_from, notes) VALUES
-- CAS minimum threshold (6 minimum wages)
('cas_minimum', 0, 19800.00, 0.2500, '2024-01-01', 'CAS applied on minimum 6 x minimum wage (3300 RON)'),
('cas_maximum', 0, 396000.00, 0.2500, '2024-01-01', 'CAS cap at 24 x average wage'),

-- CASS minimum threshold (6 minimum wages)
('cass_minimum', 0, 19800.00, 0.1000, '2024-01-01', 'CASS applied on minimum 6 x minimum wage (3300 RON)')
ON CONFLICT DO NOTHING;

-- Function to get current tax rate
CREATE OR REPLACE FUNCTION get_tax_rate(p_tax_type VARCHAR, p_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL AS $$
DECLARE
    v_rate DECIMAL;
BEGIN
    SELECT rate INTO v_rate
    FROM tax_rates
    WHERE tax_type = p_tax_type
      AND is_active = true
      AND effective_from <= p_date
      AND (effective_until IS NULL OR effective_until >= p_date)
    ORDER BY effective_from DESC
    LIMIT 1;

    RETURN COALESCE(v_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE tax_rates IS 'Romanian tax rates configuration';
COMMENT ON TABLE tax_brackets IS 'Tax brackets for progressive taxes';
COMMENT ON TABLE company_tax_settings IS 'Company-specific tax configuration';
COMMENT ON TABLE tax_calculations IS 'History of tax calculations';
COMMENT ON FUNCTION get_tax_rate IS 'Get current tax rate for a given tax type';
