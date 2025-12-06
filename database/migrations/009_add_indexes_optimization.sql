-- Database Optimization Migration
-- Adds indexes for better query performance
-- Run: PGPASSWORD='AccTech2025Prod@Secure' psql -h 127.0.0.1 -U accountech_app -d accountech_production -f 009_add_indexes_optimization.sql

BEGIN;

-- ============================================
-- CONTACTS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contacts_company_type ON contacts(company_id, type);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company_name ON contacts(company_id, company_name);
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts USING gin(to_tsvector('simple', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(company_name, '')));

-- ============================================
-- INVOICES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_company_customer ON invoices(company_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE status NOT IN ('paid', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(company_id, invoice_number);

-- ============================================
-- EXPENSES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_expenses_company_date ON expenses(company_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_company_category ON expenses(company_id, category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_vendor ON expenses(company_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(company_id, status);

-- ============================================
-- PROJECTS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projects_company_status ON projects(company_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date) WHERE status = 'active';

-- ============================================
-- TASKS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks(sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE status NOT IN ('done', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(company_id, created_at DESC);

-- ============================================
-- RECEIPTS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_receipts_company_date ON receipts(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_receipts_vendor ON receipts(company_id, vendor_name);

-- ============================================
-- BANK TRANSACTIONS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company ON bank_transactions(company_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_category ON bank_transactions(company_id, category_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON bank_transactions(company_id, is_reconciled);

-- ============================================
-- EMPLOYEES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_company_status ON employees(company_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(company_id, department);

-- ============================================
-- TIME ENTRIES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_company_date ON time_entries(company_id, date DESC);

-- ============================================
-- JOURNAL ENTRIES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account ON journal_entries(account_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON journal_entries(company_id, EXTRACT(YEAR FROM entry_date), EXTRACT(MONTH FROM entry_date));

-- ============================================
-- AUDIT LOGS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at DESC);

-- ============================================
-- ERROR LOGS TABLE (CREATE IF NOT EXISTS)
-- ============================================
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    component VARCHAR(100),
    message TEXT NOT NULL,
    context JSONB,
    request_info JSONB,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_component ON error_logs(component, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_date ON error_logs(created_at DESC);

-- ============================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- ============================================
-- Active projects only
CREATE INDEX IF NOT EXISTS idx_active_projects ON projects(company_id, name) WHERE status = 'active';

-- Unpaid invoices
CREATE INDEX IF NOT EXISTS idx_unpaid_invoices ON invoices(company_id, due_date, total_amount) WHERE status IN ('sent', 'overdue');

-- Open tasks
CREATE INDEX IF NOT EXISTS idx_open_tasks ON tasks(project_id, priority, created_at) WHERE status NOT IN ('done', 'cancelled');

-- ============================================
-- ANALYZE TABLES
-- ============================================
ANALYZE contacts;
ANALYZE invoices;
ANALYZE expenses;
ANALYZE projects;
ANALYZE tasks;
ANALYZE receipts;
ANALYZE employees;
ANALYZE time_entries;
ANALYZE journal_entries;
ANALYZE audit_logs;

COMMIT;

-- Print summary
DO $$
DECLARE
    idx_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO idx_count FROM pg_indexes WHERE schemaname = 'public';
    RAISE NOTICE 'Database optimization complete. Total indexes: %', idx_count;
END $$;
