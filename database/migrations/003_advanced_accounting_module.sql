-- =====================================================
-- Advanced Accounting Module - Database Migration
-- =====================================================
-- Version: 1.0.0
-- Created: 2025-11-19
-- Description: Complete double-entry bookkeeping system
--              with chart of accounts, bank reconciliation,
--              multi-currency, fixed assets, and tax management
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SECTION 1: CHART OF ACCOUNTS
-- =====================================================

-- Enhance existing chart_of_accounts table
ALTER TABLE chart_of_accounts
ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) NOT NULL DEFAULT 'asset'
    CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
ADD COLUMN IF NOT EXISTS account_subtype VARCHAR(50),
ADD COLUMN IF NOT EXISTS normal_balance VARCHAR(10) DEFAULT 'debit'
    CHECK (normal_balance IN ('debit', 'credit')),
ADD COLUMN IF NOT EXISTS parent_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_system_account BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_manual_entries BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS require_reconciliation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_tax_code_id UUID,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_coa_parent_account ON chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_coa_account_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_code ON chart_of_accounts(code);

COMMENT ON COLUMN chart_of_accounts.account_type IS 'Main account category: asset, liability, equity, revenue, expense';
COMMENT ON COLUMN chart_of_accounts.normal_balance IS 'Normal balance side for this account type';
COMMENT ON COLUMN chart_of_accounts.level IS 'Hierarchy level (1=parent, 2=child, etc.)';

-- =====================================================
-- SECTION 2: DOUBLE-ENTRY JOURNAL SYSTEM
-- =====================================================

-- Enhance existing journal_entries table
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS entry_type VARCHAR(50) DEFAULT 'manual'
    CHECK (entry_type IN ('manual', 'automatic', 'recurring', 'adjustment', 'closing', 'opening')),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'posted', 'voided', 'reversed')),
ADD COLUMN IF NOT EXISTS posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS period_id UUID,
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_id UUID,
ADD COLUMN IF NOT EXISTS reversal_of_entry_id UUID REFERENCES journal_entries(id),
ADD COLUMN IF NOT EXISTS reversed_by_entry_id UUID REFERENCES journal_entries(id),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Enhance existing journal_entry_lines table
ALTER TABLE journal_entry_lines
ADD COLUMN IF NOT EXISTS line_type VARCHAR(10) NOT NULL DEFAULT 'debit'
    CHECK (line_type IN ('debit', 'credit')),
ADD COLUMN IF NOT EXISTS quantity DECIMAL(15,4),
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,4),
ADD COLUMN IF NOT EXISTS tax_code_id UUID,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dimension_1 VARCHAR(100),
ADD COLUMN IF NOT EXISTS dimension_2 VARCHAR(100),
ADD COLUMN IF NOT EXISTS dimension_3 VARCHAR(100),
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS vendor_id UUID,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_posting_date ON journal_entries(posting_date);
CREATE INDEX IF NOT EXISTS idx_je_period ON journal_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jel_project ON journal_entry_lines(project_id);

COMMENT ON COLUMN journal_entries.entry_type IS 'Type of journal entry creation method';
COMMENT ON COLUMN journal_entries.status IS 'Entry lifecycle status';
COMMENT ON COLUMN journal_entry_lines.line_type IS 'Debit or credit side of the entry';

-- =====================================================
-- SECTION 3: MULTI-CURRENCY SUPPORT
-- =====================================================

CREATE TABLE IF NOT EXISTS currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(3) NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10),
    decimal_places INTEGER DEFAULT 2,
    is_base_currency BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    exchange_rate DECIMAL(15,6) DEFAULT 1.000000,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    from_currency_id UUID NOT NULL REFERENCES currencies(id),
    to_currency_id UUID NOT NULL REFERENCES currencies(id),
    rate DECIMAL(15,6) NOT NULL,
    effective_date DATE NOT NULL,
    source VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, from_currency_id, to_currency_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_currencies_company ON currencies(company_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency_id, to_currency_id);

COMMENT ON TABLE currencies IS 'Multi-currency support for international transactions';
COMMENT ON TABLE exchange_rates IS 'Historical exchange rates for currency conversion';

-- =====================================================
-- SECTION 4: BANK RECONCILIATION
-- =====================================================

-- Enhance existing bank_accounts table
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'checking'
    CHECK (account_type IN ('checking', 'savings', 'credit_card', 'line_of_credit', 'other')),
ADD COLUMN IF NOT EXISTS currency_id UUID REFERENCES currencies(id),
ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS opening_balance_date DATE,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reconciled_date DATE,
ADD COLUMN IF NOT EXISTS last_reconciled_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS bank_feed_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_feed_config JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enhance existing bank_transactions table
ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50)
    CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'other')),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'cleared', 'reconciled', 'void')),
ADD COLUMN IF NOT EXISTS payee VARCHAR(255),
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id),
ADD COLUMN IF NOT EXISTS matched_transaction_id UUID,
ADD COLUMN IF NOT EXISTS reconciliation_id UUID,
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Enhance existing reconciliations table
ALTER TABLE reconciliations
ADD COLUMN IF NOT EXISTS reconciliation_type VARCHAR(50) DEFAULT 'bank'
    CHECK (reconciliation_type IN ('bank', 'credit_card', 'merchant', 'inventory')),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'approved', 'cancelled')),
ADD COLUMN IF NOT EXISTS statement_date DATE NOT NULL,
ADD COLUMN IF NOT EXISTS statement_balance DECIMAL(15,2) NOT NULL,
ADD COLUMN IF NOT EXISTS book_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS difference DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cleared_transactions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cleared_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS outstanding_checks DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS outstanding_deposits DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS reconciliation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reconciliation_id UUID NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
    bank_transaction_id UUID REFERENCES bank_transactions(id),
    journal_entry_line_id UUID REFERENCES journal_entry_lines(id),
    transaction_date DATE NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    is_cleared BOOLEAN DEFAULT false,
    matched BOOLEAN DEFAULT false,
    match_confidence DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_items ON reconciliation_items(reconciliation_id);

COMMENT ON TABLE reconciliation_items IS 'Individual items in a bank reconciliation process';

-- =====================================================
-- SECTION 5: FIXED ASSETS & DEPRECIATION
-- =====================================================

CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    asset_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    asset_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    accumulated_depreciation_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    depreciation_expense_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    acquisition_date DATE NOT NULL,
    acquisition_cost DECIMAL(15,2) NOT NULL,
    salvage_value DECIMAL(15,2) DEFAULT 0,
    useful_life_years INTEGER NOT NULL,
    useful_life_months INTEGER,
    depreciation_method VARCHAR(50) NOT NULL DEFAULT 'straight_line'
        CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'double_declining', 'units_of_production', 'sum_of_years_digits')),
    depreciation_rate DECIMAL(5,2),
    placed_in_service_date DATE,
    disposal_date DATE,
    disposal_amount DECIMAL(15,2),
    disposal_method VARCHAR(50),
    current_book_value DECIMAL(15,2),
    total_depreciation DECIMAL(15,2) DEFAULT 0,
    vendor_id UUID,
    location VARCHAR(255),
    serial_number VARCHAR(100),
    warranty_expiration DATE,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'disposed', 'fully_depreciated', 'impaired')),
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, asset_number)
);

CREATE TABLE IF NOT EXISTS depreciation_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fixed_asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    period_date DATE NOT NULL,
    opening_book_value DECIMAL(15,2) NOT NULL,
    depreciation_amount DECIMAL(15,2) NOT NULL,
    accumulated_depreciation DECIMAL(15,2) NOT NULL,
    ending_book_value DECIMAL(15,2) NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(id),
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(fixed_asset_id, period_date)
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_company ON fixed_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(category);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_depreciation_schedules_asset ON depreciation_schedules(fixed_asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_schedules_date ON depreciation_schedules(period_date);

COMMENT ON TABLE fixed_assets IS 'Long-term assets subject to depreciation';
COMMENT ON TABLE depreciation_schedules IS 'Monthly depreciation calculations for each asset';

-- =====================================================
-- SECTION 6: TAX MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS tax_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tax_type VARCHAR(50) NOT NULL
        CHECK (tax_type IN ('sales', 'purchase', 'withholding', 'payroll', 'vat', 'other')),
    rate DECIMAL(5,2) NOT NULL,
    is_compound BOOLEAN DEFAULT false,
    compound_with_tax_code_id UUID REFERENCES tax_codes(id),
    is_included_in_price BOOLEAN DEFAULT false,
    sales_tax_account_id UUID REFERENCES chart_of_accounts(id),
    purchase_tax_account_id UUID REFERENCES chart_of_accounts(id),
    applies_to VARCHAR(20) DEFAULT 'both'
        CHECK (applies_to IN ('sales', 'purchases', 'both')),
    effective_from DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    country_code VARCHAR(2),
    region_code VARCHAR(10),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS tax_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL
        CHECK (transaction_type IN ('sale', 'purchase', 'payment', 'refund')),
    tax_code_id UUID NOT NULL REFERENCES tax_codes(id),
    base_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    journal_entry_line_id UUID REFERENCES journal_entry_lines(id),
    invoice_id UUID REFERENCES invoices(id),
    bill_id UUID REFERENCES bills(id),
    customer_id UUID REFERENCES customers(id),
    vendor_id UUID,
    is_reverse_charge BOOLEAN DEFAULT false,
    tax_period_id UUID,
    reported_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL
        CHECK (period_type IN ('monthly', 'quarterly', 'annually')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    filing_due_date DATE,
    status VARCHAR(20) DEFAULT 'open'
        CHECK (status IN ('open', 'closed', 'filed', 'amended')),
    total_sales_tax DECIMAL(15,2) DEFAULT 0,
    total_purchase_tax DECIMAL(15,2) DEFAULT 0,
    net_tax_due DECIMAL(15,2) DEFAULT 0,
    filed_at TIMESTAMP WITH TIME ZONE,
    filed_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_tax_codes_company ON tax_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_transactions_date ON tax_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_tax_transactions_period ON tax_transactions(tax_period_id);
CREATE INDEX IF NOT EXISTS idx_tax_periods_company ON tax_periods(company_id);

COMMENT ON TABLE tax_codes IS 'Tax rate definitions (VAT, sales tax, etc.)';
COMMENT ON TABLE tax_transactions IS 'Individual tax calculations on transactions';
COMMENT ON TABLE tax_periods IS 'Tax reporting periods with filing status';

-- =====================================================
-- SECTION 7: FINANCIAL PERIODS & CLOSING
-- =====================================================

CREATE TABLE IF NOT EXISTS financial_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    period_type VARCHAR(20) NOT NULL
        CHECK (period_type IN ('month', 'quarter', 'year')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    fiscal_year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'open'
        CHECK (status IN ('open', 'closed', 'locked')),
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES users(id),
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by UUID REFERENCES users(id),
    closing_entry_id UUID REFERENCES journal_entries(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_financial_periods_company ON financial_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_periods_status ON financial_periods(status);
CREATE INDEX IF NOT EXISTS idx_financial_periods_dates ON financial_periods(start_date, end_date);

COMMENT ON TABLE financial_periods IS 'Accounting periods for financial reporting and closing';

-- =====================================================
-- SECTION 8: ACCOUNT BALANCES (MATERIALIZED VIEW)
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS account_balances AS
SELECT
    c.id as company_id,
    a.id as account_id,
    a.code as account_code,
    a.name as account_name,
    a.account_type,
    a.normal_balance,
    COALESCE(SUM(CASE
        WHEN jel.line_type = 'debit' THEN jel.amount
        ELSE -jel.amount
    END), 0) as balance,
    COALESCE(SUM(CASE
        WHEN jel.line_type = 'debit' THEN jel.amount
        ELSE 0
    END), 0) as total_debits,
    COALESCE(SUM(CASE
        WHEN jel.line_type = 'credit' THEN jel.amount
        ELSE 0
    END), 0) as total_credits,
    COUNT(jel.id) as transaction_count,
    MAX(je.posting_date) as last_transaction_date
FROM companies c
CROSS JOIN chart_of_accounts a
LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
WHERE a.company_id = c.id
GROUP BY c.id, a.id, a.code, a.name, a.account_type, a.normal_balance;

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_balances_unique ON account_balances(company_id, account_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_type ON account_balances(account_type);

COMMENT ON MATERIALIZED VIEW account_balances IS 'Pre-calculated account balances for fast financial reporting';

-- =====================================================
-- SECTION 9: FINANCIAL REPORTING VIEWS
-- =====================================================

-- Trial Balance View
CREATE OR REPLACE VIEW trial_balance_view AS
SELECT
    ab.company_id,
    ab.account_code,
    ab.account_name,
    ab.account_type,
    ab.total_debits,
    ab.total_credits,
    CASE
        WHEN ab.normal_balance = 'debit' THEN ab.balance
        ELSE 0
    END as debit_balance,
    CASE
        WHEN ab.normal_balance = 'credit' THEN ABS(ab.balance)
        ELSE 0
    END as credit_balance
FROM account_balances ab
WHERE ab.balance != 0
ORDER BY ab.account_code;

-- Balance Sheet View
CREATE OR REPLACE VIEW balance_sheet_view AS
SELECT
    ab.company_id,
    ab.account_type,
    SUM(CASE
        WHEN ab.account_type IN ('asset') AND ab.normal_balance = 'debit' THEN ab.balance
        WHEN ab.account_type IN ('asset') AND ab.normal_balance = 'credit' THEN -ab.balance
        WHEN ab.account_type IN ('liability', 'equity') AND ab.normal_balance = 'credit' THEN ab.balance
        WHEN ab.account_type IN ('liability', 'equity') AND ab.normal_balance = 'debit' THEN -ab.balance
        ELSE 0
    END) as total_amount
FROM account_balances ab
WHERE ab.account_type IN ('asset', 'liability', 'equity')
GROUP BY ab.company_id, ab.account_type;

-- Income Statement View
CREATE OR REPLACE VIEW income_statement_view AS
SELECT
    ab.company_id,
    ab.account_type,
    SUM(CASE
        WHEN ab.account_type = 'revenue' AND ab.normal_balance = 'credit' THEN ab.balance
        WHEN ab.account_type = 'revenue' AND ab.normal_balance = 'debit' THEN -ab.balance
        WHEN ab.account_type = 'expense' AND ab.normal_balance = 'debit' THEN ab.balance
        WHEN ab.account_type = 'expense' AND ab.normal_balance = 'credit' THEN -ab.balance
        ELSE 0
    END) as total_amount
FROM account_balances ab
WHERE ab.account_type IN ('revenue', 'expense')
GROUP BY ab.company_id, ab.account_type;

COMMENT ON VIEW trial_balance_view IS 'Trial balance report showing all account balances';
COMMENT ON VIEW balance_sheet_view IS 'Balance sheet summary by account type';
COMMENT ON VIEW income_statement_view IS 'Income statement (P&L) summary';

-- =====================================================
-- SECTION 10: AUTOMATED TRIGGERS
-- =====================================================

-- Trigger: Validate double-entry balance
CREATE OR REPLACE FUNCTION validate_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    debit_total DECIMAL(15,2);
    credit_total DECIMAL(15,2);
BEGIN
    -- Calculate totals for this journal entry
    SELECT
        COALESCE(SUM(CASE WHEN line_type = 'debit' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN line_type = 'credit' THEN amount ELSE 0 END), 0)
    INTO debit_total, credit_total
    FROM journal_entry_lines
    WHERE journal_entry_id = NEW.id;

    -- Check if debits equal credits
    IF ABS(debit_total - credit_total) > 0.01 THEN
        RAISE EXCEPTION 'Journal entry % is not balanced: debits=%, credits=%',
            NEW.id, debit_total, credit_total;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_journal_entry_balance
    BEFORE UPDATE OF status ON journal_entries
    FOR EACH ROW
    WHEN (NEW.status = 'posted' AND OLD.status != 'posted')
    EXECUTE FUNCTION validate_journal_entry_balance();

-- Trigger: Update bank account balance
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE bank_accounts
        SET
            current_balance = COALESCE((
                SELECT SUM(CASE
                    WHEN transaction_type IN ('deposit', 'interest') THEN amount
                    WHEN transaction_type IN ('withdrawal', 'fee') THEN -amount
                    ELSE 0
                END)
                FROM bank_transactions
                WHERE bank_account_id = NEW.bank_account_id
                  AND status IN ('cleared', 'reconciled')
            ), 0) + opening_balance,
            updated_at = NOW()
        WHERE id = NEW.bank_account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_balance
    AFTER INSERT OR UPDATE ON bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_account_balance();

-- Trigger: Update fixed asset book value
CREATE OR REPLACE FUNCTION update_fixed_asset_book_value()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE fixed_assets
    SET
        total_depreciation = COALESCE((
            SELECT SUM(depreciation_amount)
            FROM depreciation_schedules
            WHERE fixed_asset_id = NEW.fixed_asset_id
              AND is_posted = true
        ), 0),
        current_book_value = acquisition_cost - COALESCE((
            SELECT SUM(depreciation_amount)
            FROM depreciation_schedules
            WHERE fixed_asset_id = NEW.fixed_asset_id
              AND is_posted = true
        ), 0),
        updated_at = NOW()
    WHERE id = NEW.fixed_asset_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_value
    AFTER INSERT OR UPDATE ON depreciation_schedules
    FOR EACH ROW
    WHEN (NEW.is_posted = true)
    EXECUTE FUNCTION update_fixed_asset_book_value();

-- Trigger: Update tax period totals
CREATE OR REPLACE FUNCTION update_tax_period_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tax_periods
    SET
        total_sales_tax = COALESCE((
            SELECT SUM(tax_amount)
            FROM tax_transactions
            WHERE tax_period_id = NEW.tax_period_id
              AND transaction_type IN ('sale')
        ), 0),
        total_purchase_tax = COALESCE((
            SELECT SUM(tax_amount)
            FROM tax_transactions
            WHERE tax_period_id = NEW.tax_period_id
              AND transaction_type IN ('purchase')
        ), 0),
        updated_at = NOW()
    WHERE id = NEW.tax_period_id;

    -- Calculate net tax due
    UPDATE tax_periods
    SET net_tax_due = total_sales_tax - total_purchase_tax
    WHERE id = NEW.tax_period_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tax_period
    AFTER INSERT OR UPDATE ON tax_transactions
    FOR EACH ROW
    WHEN (NEW.tax_period_id IS NOT NULL)
    EXECUTE FUNCTION update_tax_period_totals();

-- =====================================================
-- SECTION 11: DEFAULT DATA & SEED
-- =====================================================

-- Function to create default chart of accounts
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Assets
    INSERT INTO chart_of_accounts (company_id, code, name, account_type, normal_balance, level, is_system_account)
    VALUES
        (p_company_id, '1000', 'Assets', 'asset', 'debit', 1, true),
        (p_company_id, '1100', 'Current Assets', 'asset', 'debit', 2, true),
        (p_company_id, '1110', 'Cash and Cash Equivalents', 'asset', 'debit', 3, true),
        (p_company_id, '1120', 'Accounts Receivable', 'asset', 'debit', 3, true),
        (p_company_id, '1130', 'Inventory', 'asset', 'debit', 3, true),
        (p_company_id, '1200', 'Fixed Assets', 'asset', 'debit', 2, true),
        (p_company_id, '1210', 'Property, Plant & Equipment', 'asset', 'debit', 3, true),
        (p_company_id, '1220', 'Accumulated Depreciation', 'asset', 'credit', 3, true),

        -- Liabilities
        (p_company_id, '2000', 'Liabilities', 'liability', 'credit', 1, true),
        (p_company_id, '2100', 'Current Liabilities', 'liability', 'credit', 2, true),
        (p_company_id, '2110', 'Accounts Payable', 'liability', 'credit', 3, true),
        (p_company_id, '2120', 'Sales Tax Payable', 'liability', 'credit', 3, true),
        (p_company_id, '2200', 'Long-term Liabilities', 'liability', 'credit', 2, true),
        (p_company_id, '2210', 'Long-term Debt', 'liability', 'credit', 3, true),

        -- Equity
        (p_company_id, '3000', 'Equity', 'equity', 'credit', 1, true),
        (p_company_id, '3100', 'Owners Equity', 'equity', 'credit', 2, true),
        (p_company_id, '3200', 'Retained Earnings', 'equity', 'credit', 2, true),

        -- Revenue
        (p_company_id, '4000', 'Revenue', 'revenue', 'credit', 1, true),
        (p_company_id, '4100', 'Sales Revenue', 'revenue', 'credit', 2, true),
        (p_company_id, '4200', 'Service Revenue', 'revenue', 'credit', 2, true),

        -- Expenses
        (p_company_id, '5000', 'Expenses', 'expense', 'debit', 1, true),
        (p_company_id, '5100', 'Cost of Goods Sold', 'expense', 'debit', 2, true),
        (p_company_id, '5200', 'Operating Expenses', 'expense', 'debit', 2, true),
        (p_company_id, '5300', 'Depreciation Expense', 'expense', 'debit', 2, true)
    ON CONFLICT (company_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_chart_of_accounts IS 'Creates standard chart of accounts for new companies';

-- =====================================================
-- SECTION 12: PERMISSIONS & GRANTS
-- =====================================================

-- Grant permissions to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO accountech_app;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO accountech_app;
GRANT SELECT ON account_balances TO accountech_app;
GRANT SELECT ON trial_balance_view, balance_sheet_view, income_statement_view TO accountech_app;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Refresh materialized view
REFRESH MATERIALIZED VIEW account_balances;

-- Print success message
DO $$
BEGIN
    RAISE NOTICE '✅ Advanced Accounting Module migration completed successfully!';
    RAISE NOTICE '📊 Created 15+ new tables';
    RAISE NOTICE '📈 Created 4 financial reporting views';
    RAISE NOTICE '⚡ Created 4 automated triggers';
    RAISE NOTICE '💰 Enhanced existing tables with multi-currency and tax support';
END $$;
