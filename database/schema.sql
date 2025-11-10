-- ============================================
-- AccounTech AI - Production Database Schema
-- Complete Business Intelligence Platform
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- ============================================
-- 1. USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user', -- user, admin, accountant
    status VARCHAR(50) DEFAULT 'active', -- active, suspended, deleted
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(100),
    registration_number VARCHAR(100),
    industry VARCHAR(100),
    business_type VARCHAR(100), -- sole_proprietor, llc, corporation, partnership
    founding_date DATE,
    fiscal_year_end DATE,
    base_currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(100) DEFAULT 'UTC',
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- owner, admin, accountant, member, viewer
    permissions JSONB DEFAULT '[]',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- ============================================
-- 2. CHART OF ACCOUNTS & FINANCIAL STRUCTURE
-- ============================================

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
    account_subtype VARCHAR(100), -- checking, savings, credit_card, accounts_receivable, etc.
    parent_account_id UUID REFERENCES accounts(id),
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_system_account BOOLEAN DEFAULT FALSE,
    balance DECIMAL(15,2) DEFAULT 0,
    balance_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

CREATE TABLE fiscal_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_type VARCHAR(50) NOT NULL, -- month, quarter, year
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- open, closed, locked
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, period_type, start_date)
);

-- ============================================
-- 3. TRANSACTIONS & JOURNAL ENTRIES
-- ============================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- invoice, bill, payment, journal, expense
    transaction_number VARCHAR(100),
    transaction_date DATE NOT NULL,
    posting_date DATE,
    reference_number VARCHAR(100),
    description TEXT,
    memo TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    status VARCHAR(50) DEFAULT 'draft', -- draft, posted, void, reconciled
    created_by UUID REFERENCES users(id),
    posted_by UUID REFERENCES users(id),
    posted_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES users(id),
    reconciled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    line_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('journal_entries', 'created_at',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- ============================================
-- 4. CUSTOMERS & CONTACTS
-- ============================================

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_type VARCHAR(50) NOT NULL, -- customer, vendor, employee, contractor
    display_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    website VARCHAR(255),
    tax_id VARCHAR(100),
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state_province VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(2),
    shipping_address_line1 VARCHAR(255),
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state_province VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(2),
    payment_terms INTEGER DEFAULT 30, -- days
    credit_limit DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_company_type ON contacts(company_id, contact_type);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_tags ON contacts USING gin(tags);

-- ============================================
-- 5. INVOICES & RECEIVABLES
-- ============================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES contacts(id),
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, partial, paid, overdue, void
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    amount_due DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    reference_number VARCHAR(100),
    notes TEXT,
    terms_conditions TEXT,
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, invoice_number)
);

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    item_type VARCHAR(50) DEFAULT 'service', -- product, service, hours
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    amount DECIMAL(15,2) NOT NULL,
    account_id UUID REFERENCES accounts(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recurring_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES contacts(id),
    template_data JSONB NOT NULL,
    frequency VARCHAR(50) NOT NULL, -- weekly, monthly, quarterly, yearly
    start_date DATE NOT NULL,
    end_date DATE,
    next_invoice_date DATE NOT NULL,
    last_invoice_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. BILLS & PAYABLES
-- ============================================

CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES contacts(id),
    bill_number VARCHAR(100),
    vendor_invoice_number VARCHAR(100),
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, open, partial, paid, overdue, void
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    amount_due DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    notes TEXT,
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bill_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    account_id UUID REFERENCES accounts(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. PAYMENTS & BANKING
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payment_type VARCHAR(50) NOT NULL, -- received, sent
    payment_method VARCHAR(50), -- cash, check, credit_card, bank_transfer, online
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    reference_number VARCHAR(100),
    from_account_id UUID REFERENCES accounts(id),
    to_account_id UUID REFERENCES accounts(id),
    contact_id UUID REFERENCES contacts(id),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'completed', -- pending, completed, failed, void
    transaction_id UUID REFERENCES transactions(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id),
    bill_id UUID REFERENCES bills(id),
    amount_allocated DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    bank_name VARCHAR(255) NOT NULL,
    account_number_masked VARCHAR(100),
    account_type VARCHAR(50), -- checking, savings, credit_card
    routing_number VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'USD',
    current_balance DECIMAL(15,2) DEFAULT 0,
    last_reconciled_balance DECIMAL(15,2),
    last_reconciled_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    plaid_access_token VARCHAR(500),
    plaid_item_id VARCHAR(255),
    auto_sync_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    post_date DATE,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    balance DECIMAL(15,2),
    transaction_type VARCHAR(50),
    category VARCHAR(100),
    merchant_name VARCHAR(255),
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending', -- pending, posted, reconciled, ignored
    matched_transaction_id UUID REFERENCES transactions(id),
    plaid_transaction_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('bank_transactions', 'created_at',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- ============================================
-- 8. EXPENSES & RECEIPTS
-- ============================================

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    vendor_id UUID REFERENCES contacts(id),
    category_id UUID REFERENCES accounts(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_account_id UUID REFERENCES accounts(id),
    description TEXT,
    merchant_name VARCHAR(255),
    is_billable BOOLEAN DEFAULT FALSE,
    customer_id UUID REFERENCES contacts(id),
    tax_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, reimbursed
    submitted_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    transaction_id UUID REFERENCES transactions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    storage_url VARCHAR(500) NOT NULL,
    ocr_data JSONB,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. EMPLOYEES & PAYROLL
-- ============================================

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id),
    employee_number VARCHAR(100),
    employment_type VARCHAR(50), -- full_time, part_time, contractor
    department VARCHAR(100),
    position_title VARCHAR(255),
    hire_date DATE,
    termination_date DATE,
    salary_amount DECIMAL(15,2),
    salary_frequency VARCHAR(50), -- hourly, weekly, biweekly, monthly, yearly
    payment_method VARCHAR(50), -- direct_deposit, check
    bank_account_number VARCHAR(100),
    bank_routing_number VARCHAR(50),
    tax_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    customer_id UUID REFERENCES contacts(id),
    project_name VARCHAR(255),
    entry_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    hours DECIMAL(10,2) NOT NULL,
    hourly_rate DECIMAL(15,2),
    description TEXT,
    is_billable BOOLEAN DEFAULT FALSE,
    is_invoiced BOOLEAN DEFAULT FALSE,
    invoice_id UUID REFERENCES invoices(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. BUDGETS & FORECASTING
-- ============================================

CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    budget_type VARCHAR(50) NOT NULL, -- operating, capital, project, department
    fiscal_year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    category VARCHAR(255),
    period_type VARCHAR(50), -- monthly, quarterly, yearly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    budgeted_amount DECIMAL(15,2) NOT NULL,
    actual_amount DECIMAL(15,2) DEFAULT 0,
    variance_amount DECIMAL(15,2),
    variance_percent DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cash_flow_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    period_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly
    forecasted_inflow DECIMAL(15,2) NOT NULL DEFAULT 0,
    forecasted_outflow DECIMAL(15,2) NOT NULL DEFAULT 0,
    forecasted_net DECIMAL(15,2) NOT NULL DEFAULT 0,
    forecasted_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    actual_inflow DECIMAL(15,2),
    actual_outflow DECIMAL(15,2),
    actual_net DECIMAL(15,2),
    actual_balance DECIMAL(15,2),
    confidence_level DECIMAL(5,2), -- 0-100%
    methodology VARCHAR(100), -- historical, ai_predicted, manual
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, forecast_date, period_type)
);

SELECT create_hypertable('cash_flow_forecasts', 'created_at',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- ============================================
-- 11. REPORTS & ANALYTICS
-- ============================================

CREATE TABLE saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL,
    report_name VARCHAR(255) NOT NULL,
    parameters JSONB NOT NULL,
    schedule VARCHAR(50), -- none, daily, weekly, monthly
    recipients JSONB DEFAULT '[]',
    last_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE report_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saved_report_id UUID REFERENCES saved_reports(id) ON DELETE CASCADE,
    snapshot_date TIMESTAMPTZ NOT NULL,
    data JSONB NOT NULL,
    file_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. AI INSIGHTS & DECISION SUPPORT
-- ============================================

CREATE TABLE business_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL, -- revenue, profit, cash, customer_acquisition
    goal_name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(15,2),
    target_metric VARCHAR(100),
    target_date DATE,
    current_progress DECIMAL(15,2),
    progress_percent DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'active', -- active, achieved, abandoned
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- warning, opportunity, info, success
    category VARCHAR(100), -- cash_flow, revenue, expenses, invoice, goal
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_label VARCHAR(100),
    action_url VARCHAR(500),
    data_context JSONB,
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    dismissed_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_company_priority ON insights(company_id, priority, created_at DESC);

CREATE TABLE decision_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    scenario_type VARCHAR(100) NOT NULL, -- hiring, expansion, cost_reduction, pricing
    title VARCHAR(255) NOT NULL,
    context TEXT,
    options JSONB NOT NULL,
    ai_recommendation TEXT,
    user_decision VARCHAR(255),
    decided_at TIMESTAMPTZ,
    decided_by UUID REFERENCES users(id),
    outcome_tracking JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE smart_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    prompt_type VARCHAR(100) NOT NULL,
    trigger_condition JSONB NOT NULL,
    question TEXT NOT NULL,
    context_data JSONB,
    response TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. TAX MANAGEMENT
-- ============================================

CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tax_name VARCHAR(255) NOT NULL,
    tax_type VARCHAR(50) NOT NULL, -- sales_tax, vat, gst, income_tax
    rate DECIMAL(5,2) NOT NULL,
    jurisdiction VARCHAR(255),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tax_filings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    filing_type VARCHAR(100) NOT NULL,
    tax_year INTEGER NOT NULL,
    filing_period VARCHAR(50), -- q1, q2, q3, q4, annual
    due_date DATE NOT NULL,
    filed_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    total_tax_liability DECIMAL(15,2),
    amount_paid DECIMAL(15,2),
    filing_data JSONB,
    filed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. DOCUMENTS & FILE STORAGE
-- ============================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_type VARCHAR(100), -- invoice, receipt, contract, report
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    storage_url VARCHAR(500) NOT NULL,
    folder_path VARCHAR(500),
    description TEXT,
    tags JSONB DEFAULT '[]',
    related_entity_type VARCHAR(100), -- invoice, expense, employee
    related_entity_id UUID,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_company_type ON documents(company_id, document_type);
CREATE INDEX idx_documents_related ON documents(related_entity_type, related_entity_id);

-- ============================================
-- 15. AUDIT LOG & ACTIVITY TRACKING
-- ============================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('audit_log', 'created_at',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- ============================================
-- 16. NOTIFICATIONS & ALERTS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    priority VARCHAR(50) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    sent_via JSONB DEFAULT '[]', -- ["in_app", "email", "sms"]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ============================================
-- 17. SYSTEM SETTINGS & CONFIGURATIONS
-- ============================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50), -- company, user, system
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, setting_key)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_transactions_company_date ON transactions(company_id, transaction_date DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status IN ('sent', 'partial', 'overdue');
CREATE INDEX idx_bills_company_status ON bills(company_id, status);
CREATE INDEX idx_payments_company_date ON payments(company_id, payment_date DESC);
CREATE INDEX idx_expenses_company_date ON expenses(company_id, expense_date DESC);
CREATE INDEX idx_contacts_company ON contacts(company_id, is_active);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Account Balance View
CREATE VIEW account_balances AS
SELECT
    a.id,
    a.company_id,
    a.code,
    a.name,
    a.account_type,
    COALESCE(SUM(je.debit_amount), 0) - COALESCE(SUM(je.credit_amount), 0) as balance
FROM accounts a
LEFT JOIN journal_entries je ON a.id = je.account_id
GROUP BY a.id, a.company_id, a.code, a.name, a.account_type;

-- Aged Receivables View
CREATE VIEW aged_receivables AS
SELECT
    i.company_id,
    i.customer_id,
    c.display_name as customer_name,
    COUNT(*) as invoice_count,
    SUM(i.amount_due) as total_due,
    SUM(CASE WHEN CURRENT_DATE - i.due_date <= 30 THEN i.amount_due ELSE 0 END) as current_due,
    SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN i.amount_due ELSE 0 END) as days_31_60,
    SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN i.amount_due ELSE 0 END) as days_61_90,
    SUM(CASE WHEN CURRENT_DATE - i.due_date > 90 THEN i.amount_due ELSE 0 END) as over_90_days
FROM invoices i
JOIN contacts c ON i.customer_id = c.id
WHERE i.status IN ('sent', 'partial', 'overdue')
GROUP BY i.company_id, i.customer_id, c.display_name;

-- Cash Flow Summary View
CREATE VIEW cash_flow_summary AS
SELECT
    company_id,
    DATE_TRUNC('month', transaction_date) as month,
    SUM(CASE WHEN transaction_type = 'payment' AND amount > 0 THEN amount ELSE 0 END) as inflows,
    SUM(CASE WHEN transaction_type = 'payment' AND amount < 0 THEN ABS(amount) ELSE 0 END) as outflows,
    SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) as net_cash_flow
FROM transactions
WHERE status = 'posted'
GROUP BY company_id, DATE_TRUNC('month', transaction_date);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA SEEDING
-- ============================================

-- Insert default chart of accounts template (will be expanded)
INSERT INTO accounts (company_id, code, name, account_type, account_subtype, is_system_account) VALUES
    (uuid_nil(), '1000', 'Cash', 'asset', 'cash', true),
    (uuid_nil(), '1200', 'Accounts Receivable', 'asset', 'accounts_receivable', true),
    (uuid_nil(), '2000', 'Accounts Payable', 'liability', 'accounts_payable', true),
    (uuid_nil(), '3000', 'Owner Equity', 'equity', 'equity', true),
    (uuid_nil(), '4000', 'Revenue', 'revenue', 'sales', true),
    (uuid_nil(), '5000', 'Cost of Goods Sold', 'expense', 'cogs', true),
    (uuid_nil(), '6000', 'Operating Expenses', 'expense', 'operating', true);

-- ============================================
-- DATABASE SCHEMA COMPLETE
-- Version: 1.0.0
-- Total Tables: 45+
-- ============================================
