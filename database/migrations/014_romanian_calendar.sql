-- Migration 014: Romanian Calendar & Holidays
-- E2-US06: Romanian business calendar integration

-- Romanian holidays table
CREATE TABLE IF NOT EXISTS romanian_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    date DATE NOT NULL,
    name_ro VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    holiday_type VARCHAR(50) NOT NULL, -- public, bank, religious, optional
    is_bank_holiday BOOLEAN DEFAULT true,
    is_work_free BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, date)
);

-- Tax deadlines calendar
CREATE TABLE IF NOT EXISTS tax_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deadline_type VARCHAR(100) NOT NULL, -- tva, impozit_venit, cas_cass, d112, d394, etc.
    name_ro VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ro TEXT,
    description_en TEXT,
    day_of_month INTEGER, -- For monthly deadlines (e.g., 25 for TVA)
    month_of_year INTEGER, -- For annual deadlines (e.g., 3 for March)
    recurrence VARCHAR(20) NOT NULL, -- monthly, quarterly, annually, once
    applicable_to JSONB DEFAULT '[]', -- ["pfa", "srl", "all"]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User/company tax deadline tracking
CREATE TABLE IF NOT EXISTS company_tax_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    deadline_id UUID NOT NULL REFERENCES tax_deadlines(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, submitted, completed, overdue
    submitted_at TIMESTAMPTZ,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, deadline_id, due_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_romanian_holidays_year ON romanian_holidays(year);
CREATE INDEX IF NOT EXISTS idx_romanian_holidays_date ON romanian_holidays(date);
CREATE INDEX IF NOT EXISTS idx_tax_deadlines_type ON tax_deadlines(deadline_type);
CREATE INDEX IF NOT EXISTS idx_company_deadlines_company ON company_tax_deadlines(company_id);
CREATE INDEX IF NOT EXISTS idx_company_deadlines_due ON company_tax_deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_company_deadlines_status ON company_tax_deadlines(status);

-- Seed Romanian Public Holidays for 2024-2026
INSERT INTO romanian_holidays (year, date, name_ro, name_en, holiday_type, is_bank_holiday, is_work_free) VALUES
-- 2024
(2024, '2024-01-01', 'Anul Nou', 'New Year''s Day', 'public', true, true),
(2024, '2024-01-02', 'Anul Nou (ziua 2)', 'New Year''s Day (day 2)', 'public', true, true),
(2024, '2024-01-24', 'Ziua Unirii Principatelor Române', 'Union Day', 'public', true, true),
(2024, '2024-05-03', 'Vinerea Mare', 'Good Friday (Orthodox)', 'religious', true, true),
(2024, '2024-05-05', 'Paștele Ortodox', 'Orthodox Easter Sunday', 'religious', true, true),
(2024, '2024-05-06', 'Paștele Ortodox (ziua 2)', 'Orthodox Easter Monday', 'religious', true, true),
(2024, '2024-05-01', 'Ziua Muncii', 'Labour Day', 'public', true, true),
(2024, '2024-06-01', 'Ziua Copilului', 'Children''s Day', 'public', true, true),
(2024, '2024-06-23', 'Rusaliile', 'Pentecost Sunday', 'religious', true, true),
(2024, '2024-06-24', 'Rusaliile (ziua 2)', 'Pentecost Monday', 'religious', true, true),
(2024, '2024-08-15', 'Adormirea Maicii Domnului', 'Assumption of Mary', 'religious', true, true),
(2024, '2024-11-30', 'Sfântul Andrei', 'St. Andrew''s Day', 'public', true, true),
(2024, '2024-12-01', 'Ziua Națională a României', 'National Day of Romania', 'public', true, true),
(2024, '2024-12-25', 'Crăciunul', 'Christmas Day', 'religious', true, true),
(2024, '2024-12-26', 'Crăciunul (ziua 2)', 'Christmas Day (day 2)', 'religious', true, true),

-- 2025
(2025, '2025-01-01', 'Anul Nou', 'New Year''s Day', 'public', true, true),
(2025, '2025-01-02', 'Anul Nou (ziua 2)', 'New Year''s Day (day 2)', 'public', true, true),
(2025, '2025-01-24', 'Ziua Unirii Principatelor Române', 'Union Day', 'public', true, true),
(2025, '2025-04-18', 'Vinerea Mare', 'Good Friday (Orthodox)', 'religious', true, true),
(2025, '2025-04-20', 'Paștele Ortodox', 'Orthodox Easter Sunday', 'religious', true, true),
(2025, '2025-04-21', 'Paștele Ortodox (ziua 2)', 'Orthodox Easter Monday', 'religious', true, true),
(2025, '2025-05-01', 'Ziua Muncii', 'Labour Day', 'public', true, true),
(2025, '2025-06-01', 'Ziua Copilului', 'Children''s Day', 'public', true, true),
(2025, '2025-06-08', 'Rusaliile', 'Pentecost Sunday', 'religious', true, true),
(2025, '2025-06-09', 'Rusaliile (ziua 2)', 'Pentecost Monday', 'religious', true, true),
(2025, '2025-08-15', 'Adormirea Maicii Domnului', 'Assumption of Mary', 'religious', true, true),
(2025, '2025-11-30', 'Sfântul Andrei', 'St. Andrew''s Day', 'public', true, true),
(2025, '2025-12-01', 'Ziua Națională a României', 'National Day of Romania', 'public', true, true),
(2025, '2025-12-25', 'Crăciunul', 'Christmas Day', 'religious', true, true),
(2025, '2025-12-26', 'Crăciunul (ziua 2)', 'Christmas Day (day 2)', 'religious', true, true),

-- 2026
(2026, '2026-01-01', 'Anul Nou', 'New Year''s Day', 'public', true, true),
(2026, '2026-01-02', 'Anul Nou (ziua 2)', 'New Year''s Day (day 2)', 'public', true, true),
(2026, '2026-01-24', 'Ziua Unirii Principatelor Române', 'Union Day', 'public', true, true),
(2026, '2026-04-10', 'Vinerea Mare', 'Good Friday (Orthodox)', 'religious', true, true),
(2026, '2026-04-12', 'Paștele Ortodox', 'Orthodox Easter Sunday', 'religious', true, true),
(2026, '2026-04-13', 'Paștele Ortodox (ziua 2)', 'Orthodox Easter Monday', 'religious', true, true),
(2026, '2026-05-01', 'Ziua Muncii', 'Labour Day', 'public', true, true),
(2026, '2026-05-31', 'Rusaliile', 'Pentecost Sunday', 'religious', true, true),
(2026, '2026-06-01', 'Ziua Copilului / Rusaliile (ziua 2)', 'Children''s Day / Pentecost Monday', 'public', true, true),
(2026, '2026-08-15', 'Adormirea Maicii Domnului', 'Assumption of Mary', 'religious', true, true),
(2026, '2026-11-30', 'Sfântul Andrei', 'St. Andrew''s Day', 'public', true, true),
(2026, '2026-12-01', 'Ziua Națională a României', 'National Day of Romania', 'public', true, true),
(2026, '2026-12-25', 'Crăciunul', 'Christmas Day', 'religious', true, true),
(2026, '2026-12-26', 'Crăciunul (ziua 2)', 'Christmas Day (day 2)', 'religious', true, true)
ON CONFLICT (year, date) DO NOTHING;

-- Seed Tax Deadlines
INSERT INTO tax_deadlines (deadline_type, name_ro, name_en, description_ro, description_en, day_of_month, month_of_year, recurrence, applicable_to) VALUES
-- Monthly deadlines
('tva_lunar', 'Declarație TVA (lunar)', 'Monthly VAT Declaration', 'Declarația 300 - TVA lunar pentru plătitori lunari', 'Form 300 - Monthly VAT for monthly filers', 25, NULL, 'monthly', '["srl", "pfa_tva"]'),
('impozit_salarii', 'Impozit și contribuții salarii', 'Salary Tax & Contributions', 'Declarația 112 și plata impozitului pe salarii, CAS, CASS', 'Form 112 and payment of salary tax, CAS, CASS', 25, NULL, 'monthly', '["srl", "pfa_angajator"]'),

-- Quarterly deadlines
('tva_trimestrial', 'Declarație TVA (trimestrial)', 'Quarterly VAT Declaration', 'Declarația 300 - TVA trimestrial', 'Form 300 - Quarterly VAT', 25, NULL, 'quarterly', '["srl", "pfa_tva"]'),
('impozit_micro', 'Impozit micro-întreprindere', 'Micro-enterprise Tax', 'Plata impozitului pe veniturile micro-întreprinderilor (1% sau 3%)', 'Micro-enterprise income tax payment (1% or 3%)', 25, NULL, 'quarterly', '["srl_micro"]'),

-- Annual deadlines
('declaratie_unica', 'Declarația Unică (PFA)', 'Unique Declaration (PFA)', 'Declarația Unică pentru PFA, II, IF', 'Unique Declaration for self-employed', 25, 5, 'annually', '["pfa", "ii", "if"]'),
('bilant_anual', 'Bilanț anual', 'Annual Balance Sheet', 'Situațiile financiare anuale', 'Annual financial statements', 31, 5, 'annually', '["srl"]'),
('impozit_profit', 'Declarație impozit profit', 'Corporate Tax Declaration', 'Declarația 101 - impozit pe profit', 'Form 101 - Corporate income tax', 25, 3, 'annually', '["srl_profit"]'),
('declaratie_394', 'Declarația 394', 'Form 394', 'Declarația recapitulativă privind livrările/achizițiile/prestările intracomunitare', 'Recapitulative statement - intra-community operations', 25, NULL, 'monthly', '["srl", "pfa_tva"]'),
('declaratie_390', 'Declarația 390 VIES', 'Form 390 VIES', 'Declarația recapitulativă intracomunitară', 'Intra-community recapitulative statement', 25, NULL, 'monthly', '["srl", "pfa_tva"]')
ON CONFLICT DO NOTHING;

-- Function to calculate Orthodox Easter
CREATE OR REPLACE FUNCTION calculate_orthodox_easter(p_year INTEGER) RETURNS DATE AS $$
DECLARE
    a INTEGER;
    b INTEGER;
    c INTEGER;
    d INTEGER;
    e INTEGER;
    month INTEGER;
    day INTEGER;
BEGIN
    -- Meeus/Jones/Butcher algorithm for Orthodox Easter
    a := p_year % 4;
    b := p_year % 7;
    c := p_year % 19;
    d := (19 * c + 15) % 30;
    e := (2 * a + 4 * b - d + 34) % 7;
    month := (d + e + 114) / 31;
    day := ((d + e + 114) % 31) + 1;

    -- Add 13 days for Julian to Gregorian calendar conversion (valid until 2099)
    RETURN (p_year || '-' || month || '-' || day)::DATE + INTERVAL '13 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if date is a holiday
CREATE OR REPLACE FUNCTION is_romanian_holiday(p_date DATE) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM romanian_holidays
        WHERE date = p_date AND is_work_free = true
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get next business day
CREATE OR REPLACE FUNCTION get_next_business_day(p_date DATE) RETURNS DATE AS $$
DECLARE
    result_date DATE := p_date;
BEGIN
    WHILE EXTRACT(DOW FROM result_date) IN (0, 6) -- Weekend
          OR is_romanian_holiday(result_date) LOOP
        result_date := result_date + INTERVAL '1 day';
    END LOOP;
    RETURN result_date;
END;
$$ LANGUAGE plpgsql;

-- Function to count business days between dates
CREATE OR REPLACE FUNCTION count_business_days(p_start DATE, p_end DATE) RETURNS INTEGER AS $$
DECLARE
    counter INTEGER := 0;
    current_date DATE := p_start;
BEGIN
    WHILE current_date <= p_end LOOP
        IF EXTRACT(DOW FROM current_date) NOT IN (0, 6)
           AND NOT is_romanian_holiday(current_date) THEN
            counter := counter + 1;
        END IF;
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    RETURN counter;
END;
$$ LANGUAGE plpgsql;

-- View for upcoming deadlines
CREATE OR REPLACE VIEW v_upcoming_tax_deadlines AS
SELECT
    td.id as deadline_id,
    td.deadline_type,
    td.name_ro,
    td.name_en,
    td.description_ro,
    td.description_en,
    td.recurrence,
    td.applicable_to,
    CASE
        WHEN td.recurrence = 'monthly' THEN
            CASE
                WHEN EXTRACT(DAY FROM CURRENT_DATE) <= td.day_of_month THEN
                    DATE_TRUNC('month', CURRENT_DATE) + (td.day_of_month - 1) * INTERVAL '1 day'
                ELSE
                    DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + (td.day_of_month - 1) * INTERVAL '1 day'
            END
        WHEN td.recurrence = 'quarterly' THEN
            -- Next quarter end + day offset
            DATE_TRUNC('quarter', CURRENT_DATE + INTERVAL '3 months') + (td.day_of_month - 1) * INTERVAL '1 day'
        WHEN td.recurrence = 'annually' THEN
            MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, td.month_of_year, td.day_of_month)
        ELSE NULL
    END::DATE as next_due_date
FROM tax_deadlines td
WHERE td.is_active = true;

-- Comments
COMMENT ON TABLE romanian_holidays IS 'Romanian public and bank holidays';
COMMENT ON TABLE tax_deadlines IS 'Romanian tax filing deadlines';
COMMENT ON TABLE company_tax_deadlines IS 'Company-specific tax deadline tracking';
COMMENT ON FUNCTION calculate_orthodox_easter IS 'Calculate Orthodox Easter date for a given year';
COMMENT ON FUNCTION is_romanian_holiday IS 'Check if a date is a Romanian holiday';
COMMENT ON FUNCTION get_next_business_day IS 'Get the next business day (skipping weekends and holidays)';
