-- =====================================================
-- Bank Integration System Migration
-- Version: 007
-- Created: 2025-01-21
-- Description: Tables for open banking integration
-- =====================================================

-- Table: bank_connections
-- Stores user bank account connections via PSD2/Open Banking APIs
CREATE TABLE IF NOT EXISTS bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Provider information
    provider VARCHAR(50) NOT NULL, -- 'nordigen', 'salt_edge'
    provider_connection_id VARCHAR(255) NOT NULL, -- External ID from provider
    institution_id VARCHAR(255), -- Bank identifier
    institution_name VARCHAR(255), -- Human-readable bank name (e.g., "BCR", "ING Bank")
    institution_logo_url VARCHAR(500), -- Bank logo URL

    -- Account information
    account_id VARCHAR(255), -- External account ID
    account_name VARCHAR(255), -- User-defined nickname
    account_number VARCHAR(100), -- IBAN or account number (last 4 digits only for security)
    currency VARCHAR(3) DEFAULT 'RON',
    account_type VARCHAR(50), -- 'checking', 'savings', 'credit_card'

    -- Status and tokens
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'pending', 'expired', 'error', 'disconnected'
    access_token TEXT, -- Encrypted access token
    refresh_token TEXT, -- Encrypted refresh token
    token_expires_at TIMESTAMP,

    -- Sync information
    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(50), -- 'success', 'failed', 'partial'
    sync_error_message TEXT,

    -- PSD2 consent management
    consent_id VARCHAR(255), -- Provider consent ID
    consent_expires_at TIMESTAMP, -- PSD2 consent expiry (typically 90 days)
    consent_url TEXT, -- URL to renew consent

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Provider-specific data
    metadata JSONB,

    CONSTRAINT unique_provider_connection UNIQUE(provider, provider_connection_id)
);

-- Indexes for bank_connections
CREATE INDEX idx_bank_connections_company ON bank_connections(company_id);
CREATE INDEX idx_bank_connections_user ON bank_connections(user_id);
CREATE INDEX idx_bank_connections_status ON bank_connections(status);
CREATE INDEX idx_bank_connections_last_sync ON bank_connections(last_sync_at DESC);

-- Table: bank_transactions
-- Stores synchronized bank transactions from connected accounts
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Transaction identification
    provider_transaction_id VARCHAR(255) NOT NULL, -- External transaction ID
    transaction_date DATE NOT NULL,
    booking_date DATE, -- When transaction was booked
    value_date DATE, -- When transaction value was applied

    -- Transaction details
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',
    description TEXT NOT NULL, -- Original bank description
    clean_description TEXT, -- Cleaned/normalized description

    -- Counterparty information
    counterparty_name VARCHAR(255), -- Merchant or recipient
    counterparty_account VARCHAR(100), -- IBAN if available

    -- Categorization
    category VARCHAR(100), -- Auto-categorized (e.g., 'utilities', 'groceries', 'salary')
    category_confidence DECIMAL(5, 2), -- 0-100 confidence score
    subcategory VARCHAR(100), -- More specific category

    -- Transaction metadata
    transaction_type VARCHAR(50) NOT NULL, -- 'debit', 'credit', 'fee', 'interest'
    payment_method VARCHAR(50), -- 'card', 'transfer', 'direct_debit', 'cash'
    reference VARCHAR(255), -- Transaction reference/code

    -- Matching/Reconciliation
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'matched', 'ignored'
    matched_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    matched_expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
    matched_bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
    matched_at TIMESTAMP,
    matched_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Duplicate detection
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_of UUID REFERENCES bank_transactions(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Raw provider data
    metadata JSONB,

    CONSTRAINT unique_provider_transaction UNIQUE(connection_id, provider_transaction_id)
);

-- Indexes for bank_transactions
CREATE INDEX idx_bank_trans_connection ON bank_transactions(connection_id);
CREATE INDEX idx_bank_trans_company ON bank_transactions(company_id);
CREATE INDEX idx_bank_trans_date ON bank_transactions(transaction_date DESC);
CREATE INDEX idx_bank_trans_booking_date ON bank_transactions(booking_date DESC);
CREATE INDEX idx_bank_trans_status ON bank_transactions(status);
CREATE INDEX idx_bank_trans_category ON bank_transactions(category);
CREATE INDEX idx_bank_trans_amount ON bank_transactions(amount);
CREATE INDEX idx_bank_trans_type ON bank_transactions(transaction_type);
CREATE INDEX idx_bank_trans_matched_invoice ON bank_transactions(matched_invoice_id) WHERE matched_invoice_id IS NOT NULL;
CREATE INDEX idx_bank_trans_matched_expense ON bank_transactions(matched_expense_id) WHERE matched_expense_id IS NOT NULL;
CREATE INDEX idx_bank_trans_matched_bill ON bank_transactions(matched_bill_id) WHERE matched_bill_id IS NOT NULL;
CREATE INDEX idx_bank_trans_duplicates ON bank_transactions(is_duplicate) WHERE is_duplicate = true;

-- Table: transaction_categorization_rules
-- Stores user-defined and learned categorization rules
CREATE TABLE IF NOT EXISTS transaction_categorization_rules (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Rule configuration
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'keyword', 'amount_range', 'counterparty', 'regex', 'ml_learned'
    pattern TEXT NOT NULL, -- Matching pattern (keyword, regex, or JSON config)

    -- Target category
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),

    -- Rule behavior
    priority INTEGER DEFAULT 100, -- Higher = checked first
    is_active BOOLEAN DEFAULT true,
    is_system_rule BOOLEAN DEFAULT false, -- System vs user-created
    auto_apply BOOLEAN DEFAULT true, -- Automatically apply or suggest

    -- Performance tracking
    match_count INTEGER DEFAULT 0, -- Times rule matched
    accuracy_score DECIMAL(5, 2), -- User feedback score 0-100
    last_matched_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Additional configuration
    metadata JSONB
);

-- Indexes for transaction_categorization_rules
CREATE INDEX idx_cat_rules_company ON transaction_categorization_rules(company_id);
CREATE INDEX idx_cat_rules_active ON transaction_categorization_rules(is_active, priority DESC) WHERE is_active = true;
CREATE INDEX idx_cat_rules_category ON transaction_categorization_rules(category);

-- Table: bank_sync_logs
-- Audit log for synchronization operations
CREATE TABLE IF NOT EXISTS bank_sync_logs (
    id SERIAL PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,

    -- Sync metadata
    sync_type VARCHAR(50) NOT NULL, -- 'manual', 'automatic', 'scheduled', 'initial'
    status VARCHAR(50) NOT NULL, -- 'started', 'in_progress', 'completed', 'failed', 'partial'

    -- Statistics
    transactions_fetched INTEGER DEFAULT 0,
    transactions_new INTEGER DEFAULT 0,
    transactions_updated INTEGER DEFAULT 0,
    transactions_skipped INTEGER DEFAULT 0,
    transactions_duplicate INTEGER DEFAULT 0,

    -- Error handling
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER DEFAULT 0,

    -- Timing
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (completed_at - started_at))) STORED,

    -- User who initiated (NULL for automatic)
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Additional data
    metadata JSONB
);

-- Indexes for bank_sync_logs
CREATE INDEX idx_sync_logs_connection ON bank_sync_logs(connection_id);
CREATE INDEX idx_sync_logs_status ON bank_sync_logs(status);
CREATE INDEX idx_sync_logs_started ON bank_sync_logs(started_at DESC);
CREATE INDEX idx_sync_logs_type ON bank_sync_logs(sync_type);

-- Table: bank_reconciliation_matches
-- Manual and automatic matching between bank transactions and accounting records
CREATE TABLE IF NOT EXISTS bank_reconciliation_matches (
    id SERIAL PRIMARY KEY,
    bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Match details
    match_type VARCHAR(50) NOT NULL, -- 'invoice', 'expense', 'bill', 'transfer'
    match_target_id VARCHAR(255) NOT NULL, -- ID of matched record
    match_target_type VARCHAR(50) NOT NULL, -- Table name

    -- Match quality
    match_method VARCHAR(50) NOT NULL, -- 'automatic', 'manual', 'suggested'
    confidence_score DECIMAL(5, 2), -- 0-100 for automatic matches

    -- Amounts
    bank_amount DECIMAL(15, 2) NOT NULL,
    matched_amount DECIMAL(15, 2) NOT NULL,
    amount_difference DECIMAL(15, 2) GENERATED ALWAYS AS (bank_amount - matched_amount) STORED,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected'
    confirmed_at TIMESTAMP,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Additional notes
    notes TEXT,
    metadata JSONB
);

-- Indexes for bank_reconciliation_matches
CREATE INDEX idx_recon_matches_bank_trans ON bank_reconciliation_matches(bank_transaction_id);
CREATE INDEX idx_recon_matches_company ON bank_reconciliation_matches(company_id);
CREATE INDEX idx_recon_matches_status ON bank_reconciliation_matches(status);
CREATE INDEX idx_recon_matches_target ON bank_reconciliation_matches(match_target_type, match_target_id);

-- Table: bank_balance_snapshots
-- Historical balance tracking for each connected account
CREATE TABLE IF NOT EXISTS bank_balance_snapshots (
    id SERIAL PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,

    -- Balance details
    balance_date DATE NOT NULL,
    balance_type VARCHAR(50) NOT NULL, -- 'closing', 'available', 'pending'
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',

    -- Source
    source VARCHAR(50) NOT NULL, -- 'sync', 'calculated', 'manual'

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Additional data
    metadata JSONB,

    CONSTRAINT unique_balance_snapshot UNIQUE(connection_id, balance_date, balance_type)
);

-- Indexes for bank_balance_snapshots
CREATE INDEX idx_balance_snapshots_connection ON bank_balance_snapshots(connection_id);
CREATE INDEX idx_balance_snapshots_date ON bank_balance_snapshots(balance_date DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_connections_updated_at
    BEFORE UPDATE ON bank_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_updated_at();

CREATE TRIGGER bank_transactions_updated_at
    BEFORE UPDATE ON bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_updated_at();

CREATE TRIGGER cat_rules_updated_at
    BEFORE UPDATE ON transaction_categorization_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_updated_at();

CREATE TRIGGER recon_matches_updated_at
    BEFORE UPDATE ON bank_reconciliation_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_updated_at();

-- Comments for documentation
COMMENT ON TABLE bank_connections IS 'Stores connections to bank accounts via PSD2/Open Banking APIs';
COMMENT ON TABLE bank_transactions IS 'Bank transactions synchronized from connected accounts';
COMMENT ON TABLE transaction_categorization_rules IS 'Rules for automatic transaction categorization';
COMMENT ON TABLE bank_sync_logs IS 'Audit log for bank synchronization operations';
COMMENT ON TABLE bank_reconciliation_matches IS 'Links between bank transactions and accounting records';
COMMENT ON TABLE bank_balance_snapshots IS 'Historical daily balance snapshots for accounts';

-- Insert default system categorization rules
INSERT INTO transaction_categorization_rules (company_id, rule_name, rule_type, pattern, category, priority, is_system_rule, metadata) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Salary Income', 'keyword', 'salariu|salary|wages', 'income_salary', 200, true, '{"confidence": 95}'),
    ('00000000-0000-0000-0000-000000000000', 'Utilities - Electricity', 'keyword', 'enel|electrica|energie', 'utilities_electricity', 180, true, '{"confidence": 90}'),
    ('00000000-0000-0000-0000-000000000000', 'Utilities - Water', 'keyword', 'apa|water|veolia', 'utilities_water', 180, true, '{"confidence": 90}'),
    ('00000000-0000-0000-0000-000000000000', 'Utilities - Gas', 'keyword', 'gaz|gas|engie', 'utilities_gas', 180, true, '{"confidence": 90}'),
    ('00000000-0000-0000-0000-000000000000', 'Utilities - Internet', 'keyword', 'rcs|rds|digi|orange|vodafone|telekom', 'utilities_internet', 180, true, '{"confidence": 90}'),
    ('00000000-0000-0000-0000-000000000000', 'Rent Payment', 'keyword', 'chirie|rent|landlord', 'rent', 190, true, '{"confidence": 95}'),
    ('00000000-0000-0000-0000-000000000000', 'Groceries', 'keyword', 'kaufland|carrefour|lidl|auchan|mega image|profi', 'groceries', 170, true, '{"confidence": 85}'),
    ('00000000-0000-0000-0000-000000000000', 'Fuel/Gas Station', 'keyword', 'petrom|omv|rompetrol|lukoil|benzinarie', 'transportation_fuel', 170, true, '{"confidence": 85}'),
    ('00000000-0000-0000-0000-000000000000', 'Insurance', 'keyword', 'asigurare|insurance|rca|casco', 'insurance', 175, true, '{"confidence": 90}'),
    ('00000000-0000-0000-0000-000000000000', 'Tax Payment', 'keyword', 'anaf|impozit|tax|taxe', 'taxes', 195, true, '{"confidence": 95}');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON bank_connections TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON bank_transactions TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON transaction_categorization_rules TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON bank_sync_logs TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON bank_reconciliation_matches TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON bank_balance_snapshots TO accountech_app;
GRANT USAGE, SELECT ON SEQUENCE bank_sync_logs_id_seq TO accountech_app;
GRANT USAGE, SELECT ON SEQUENCE transaction_categorization_rules_id_seq TO accountech_app;
GRANT USAGE, SELECT ON SEQUENCE bank_reconciliation_matches_id_seq TO accountech_app;
GRANT USAGE, SELECT ON SEQUENCE bank_balance_snapshots_id_seq TO accountech_app;

-- Migration complete
SELECT 'Migration 007_bank_integration.sql completed successfully' AS status;
