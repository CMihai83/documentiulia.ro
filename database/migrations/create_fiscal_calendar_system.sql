-- ============================================================================
-- DocumentIulia - Fiscal Calendar System
-- Complete Database Schema
-- ============================================================================
--
-- This migration creates a state-of-the-art fiscal calendar system that:
-- 1. Tracks ALL Romanian fiscal deadlines (200+ per year)
-- 2. Auto-generates declarations from platform data
-- 3. Monitors ANAF for form updates
-- 4. Integrates business activities with fiscal obligations
-- 5. Sends smart reminders
--
-- Created: 2025-11-22
-- Version: 1.0
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table 1: anaf_fiscal_deadlines
-- Purpose: Master list of ALL Romanian fiscal deadlines
-- ============================================================================

CREATE TABLE IF NOT EXISTS anaf_fiscal_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Deadline identification
    deadline_code VARCHAR(50) UNIQUE NOT NULL,
    deadline_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,

    -- Official info
    anaf_reference_url TEXT,
    legal_basis TEXT,
    anaf_form_code VARCHAR(50),

    -- Deadline rules
    frequency VARCHAR(30) NOT NULL,
    due_day INTEGER,
    due_month INTEGER,
    business_days_offset INTEGER DEFAULT 0,

    -- Complex rules (for special cases)
    calculation_rule JSONB,

    -- Applicability conditions
    applies_to JSONB NOT NULL,
    -- Entity type: 'company', 'individual', 'both'
    entity_type VARCHAR(20) DEFAULT 'company',

    -- Penalties for missing
    penalty_type VARCHAR(50),
    penalty_amount NUMERIC(12,2),
    penalty_calculation JSONB,

    -- Auto-generation support
    can_auto_generate BOOLEAN DEFAULT false,
    data_sources JSONB,

    -- Metadata
    priority VARCHAR(20) DEFAULT 'normal',
    reminder_days_before INTEGER[] DEFAULT ARRAY[7, 3, 1],

    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    last_verified_date DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for anaf_fiscal_deadlines
CREATE INDEX idx_anaf_deadlines_category ON anaf_fiscal_deadlines(category);
CREATE INDEX idx_anaf_deadlines_frequency ON anaf_fiscal_deadlines(frequency);
CREATE INDEX idx_anaf_deadlines_active ON anaf_fiscal_deadlines(is_active) WHERE is_active = true;
CREATE INDEX idx_anaf_deadlines_form_code ON anaf_fiscal_deadlines(anaf_form_code);
CREATE INDEX idx_anaf_deadlines_entity_type ON anaf_fiscal_deadlines(entity_type);

-- Comments
COMMENT ON TABLE anaf_fiscal_deadlines IS 'Master list of all Romanian fiscal deadlines and requirements';
COMMENT ON COLUMN anaf_fiscal_deadlines.deadline_code IS 'Unique identifier: D300_TVA_MONTHLY, D112_SALARIES_MONTHLY, etc.';
COMMENT ON COLUMN anaf_fiscal_deadlines.applies_to IS 'JSON defining which companies must comply: company types, turnover thresholds, etc.';
COMMENT ON COLUMN anaf_fiscal_deadlines.data_sources IS 'JSON mapping to platform data for auto-generation';

-- ============================================================================
-- Table 2: anaf_declaration_forms
-- Purpose: Store metadata about ANAF forms (structure, validation rules)
-- ============================================================================

CREATE TABLE IF NOT EXISTS anaf_declaration_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Form identification
    form_code VARCHAR(50) NOT NULL,
    form_name VARCHAR(255) NOT NULL,
    form_version VARCHAR(20) NOT NULL,

    -- Official sources
    anaf_download_url TEXT,
    anaf_xml_schema_url TEXT,
    anaf_instructions_url TEXT,

    -- Form structure (for auto-fill)
    form_structure JSONB NOT NULL,

    -- Validation rules
    validation_rules JSONB,

    -- Version control
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_current_version BOOLEAN DEFAULT true,

    -- Change tracking
    changes_from_previous JSONB,

    -- File attachments
    pdf_template_path TEXT,
    excel_template_path TEXT,
    xml_schema_path TEXT,

    -- Metadata
    last_checked_date DATE,
    checksum VARCHAR(64),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(form_code, form_version)
);

-- Indexes for anaf_declaration_forms
CREATE INDEX idx_anaf_forms_code ON anaf_declaration_forms(form_code);
CREATE INDEX idx_anaf_forms_current ON anaf_declaration_forms(is_current_version) WHERE is_current_version = true;
CREATE INDEX idx_anaf_forms_valid ON anaf_declaration_forms(valid_from, valid_to);

-- Comments
COMMENT ON TABLE anaf_declaration_forms IS 'ANAF declaration form definitions with field structure and validation rules';
COMMENT ON COLUMN anaf_declaration_forms.form_structure IS 'JSON defining all form fields, types, validations, and auto-fill mappings';
COMMENT ON COLUMN anaf_declaration_forms.validation_rules IS 'JSON with cross-field validations and business logic rules';

-- ============================================================================
-- Table 3: company_fiscal_calendar
-- Purpose: Personalized fiscal calendar for each company
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_fiscal_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Entity linkage (supports both companies and individual users)
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    deadline_id UUID NOT NULL REFERENCES anaf_fiscal_deadlines(id) ON DELETE CASCADE,

    -- At least one must be set
    CONSTRAINT check_entity_exists CHECK (company_id IS NOT NULL OR user_id IS NOT NULL),

    -- Calculated deadline for this company
    year INTEGER NOT NULL,
    period VARCHAR(20),
    due_date DATE NOT NULL,

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending',

    -- Declaration linkage (foreign key added later via ALTER TABLE)
    declaration_id UUID,

    -- Reminder tracking
    reminder_sent_dates JSONB DEFAULT '[]'::jsonb,

    -- User interactions
    marked_as_not_applicable BOOLEAN DEFAULT false,
    not_applicable_reason TEXT,
    custom_notes TEXT,

    -- Completion tracking
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    submission_method VARCHAR(50),
    submission_reference VARCHAR(100),

    -- Metadata
    auto_generated_at TIMESTAMP WITH TIME ZONE,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure uniqueness per entity (company OR user)
    UNIQUE(company_id, deadline_id, year, period),
    UNIQUE(user_id, deadline_id, year, period)
);

-- Indexes for company_fiscal_calendar
CREATE INDEX idx_company_calendar_company ON company_fiscal_calendar(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_company_calendar_user ON company_fiscal_calendar(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_company_calendar_deadline ON company_fiscal_calendar(deadline_id);
CREATE INDEX idx_company_calendar_due_date ON company_fiscal_calendar(due_date);
CREATE INDEX idx_company_calendar_status ON company_fiscal_calendar(status);
CREATE INDEX idx_company_calendar_pending ON company_fiscal_calendar(company_id, status, due_date)
    WHERE status IN ('pending', 'generated') AND company_id IS NOT NULL;
CREATE INDEX idx_company_calendar_pending_user ON company_fiscal_calendar(user_id, status, due_date)
    WHERE status IN ('pending', 'generated') AND user_id IS NOT NULL;
CREATE INDEX idx_company_calendar_overdue ON company_fiscal_calendar(company_id, due_date)
    WHERE status = 'pending' AND due_date < CURRENT_DATE AND company_id IS NOT NULL;
CREATE INDEX idx_company_calendar_overdue_user ON company_fiscal_calendar(user_id, due_date)
    WHERE status = 'pending' AND due_date < CURRENT_DATE AND user_id IS NOT NULL;

-- Comments
COMMENT ON TABLE company_fiscal_calendar IS 'Personalized fiscal calendar with calculated deadlines for each company';
COMMENT ON COLUMN company_fiscal_calendar.status IS 'pending, generated, reviewed, submitted, overdue';
COMMENT ON COLUMN company_fiscal_calendar.reminder_sent_dates IS 'JSON array tracking when reminders were sent';

-- ============================================================================
-- Table 4: fiscal_declarations
-- Purpose: Store generated declarations with data
-- ============================================================================

CREATE TABLE IF NOT EXISTS fiscal_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Entity linkage (supports both companies and individual users)
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    calendar_entry_id UUID REFERENCES company_fiscal_calendar(id),
    form_id UUID NOT NULL REFERENCES anaf_declaration_forms(id),

    -- At least one entity must be set
    CONSTRAINT check_declaration_entity CHECK (company_id IS NOT NULL OR user_id IS NOT NULL),

    -- Declaration details
    declaration_type VARCHAR(50) NOT NULL,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    year INTEGER NOT NULL,
    period VARCHAR(20),

    -- Generated data
    form_data JSONB NOT NULL,

    -- Data provenance (traceability)
    data_sources JSONB,

    -- Validation
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_errors JSONB DEFAULT '[]'::jsonb,
    validation_warnings JSONB DEFAULT '[]'::jsonb,

    -- Submission status
    status VARCHAR(50) DEFAULT 'draft',

    -- User review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- Submission tracking
    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by UUID REFERENCES users(id),
    submission_method VARCHAR(50),
    anaf_submission_id VARCHAR(100),
    anaf_response JSONB,

    -- File exports
    pdf_file_path TEXT,
    xml_file_path TEXT,
    excel_file_path TEXT,

    -- Version control
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES fiscal_declarations(id),
    is_amendment BOOLEAN DEFAULT false,
    amendment_reason TEXT,

    -- Metadata
    auto_generated BOOLEAN DEFAULT true,
    generation_duration_ms INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fiscal_declarations
CREATE INDEX idx_declarations_company ON fiscal_declarations(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_declarations_user ON fiscal_declarations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_declarations_calendar ON fiscal_declarations(calendar_entry_id);
CREATE INDEX idx_declarations_form ON fiscal_declarations(form_id);
CREATE INDEX idx_declarations_period ON fiscal_declarations(reporting_period_start, reporting_period_end);
CREATE INDEX idx_declarations_status ON fiscal_declarations(status);
CREATE INDEX idx_declarations_pending ON fiscal_declarations(company_id, status)
    WHERE status IN ('draft', 'reviewed') AND company_id IS NOT NULL;
CREATE INDEX idx_declarations_pending_user ON fiscal_declarations(user_id, status)
    WHERE status IN ('draft', 'reviewed') AND user_id IS NOT NULL;

-- Comments
COMMENT ON TABLE fiscal_declarations IS 'Auto-generated fiscal declarations with complete data and traceability';
COMMENT ON COLUMN fiscal_declarations.form_data IS 'JSON with complete filled form structure';
COMMENT ON COLUMN fiscal_declarations.data_sources IS 'JSON tracking which invoices/expenses/etc contributed to calculations';
COMMENT ON COLUMN fiscal_declarations.status IS 'draft, reviewed, submitted, accepted, rejected';

-- ============================================================================
-- Table 5: fiscal_reminders
-- Purpose: Smart reminder system
-- ============================================================================

CREATE TABLE IF NOT EXISTS fiscal_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Entity linkage (supports both companies and individual users)
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    calendar_entry_id UUID REFERENCES company_fiscal_calendar(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),

    -- At least one entity must be set
    CONSTRAINT check_reminder_entity CHECK (company_id IS NOT NULL OR user_id IS NOT NULL),

    -- Reminder details
    reminder_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',

    -- Timing
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,

    -- Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_label VARCHAR(100),

    -- Channels
    channels VARCHAR(50)[] DEFAULT ARRAY['email'],

    -- Status
    status VARCHAR(50) DEFAULT 'pending',

    -- Interaction tracking
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    dismissed_by UUID REFERENCES users(id),

    -- Delivery tracking
    email_sent_at TIMESTAMP WITH TIME ZONE,
    sms_sent_at TIMESTAMP WITH TIME ZONE,
    push_sent_at TIMESTAMP WITH TIME ZONE,

    delivery_errors JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fiscal_reminders
CREATE INDEX idx_reminders_company ON fiscal_reminders(company_id);
CREATE INDEX idx_reminders_user ON fiscal_reminders(user_id);
CREATE INDEX idx_reminders_calendar ON fiscal_reminders(calendar_entry_id);
CREATE INDEX idx_reminders_scheduled ON fiscal_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_reminders_pending ON fiscal_reminders(company_id, status, scheduled_for)
    WHERE status = 'pending';

-- Comments
COMMENT ON TABLE fiscal_reminders IS 'Smart reminder system with multi-channel delivery';
COMMENT ON COLUMN fiscal_reminders.reminder_type IS 'deadline_approaching, overdue, form_updated, auto_generated';
COMMENT ON COLUMN fiscal_reminders.channels IS 'Array: email, sms, push, in_app';

-- ============================================================================
-- Table 6: anaf_form_updates_log
-- Purpose: Track changes to ANAF forms over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS anaf_form_updates_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Form tracking
    form_code VARCHAR(50) NOT NULL,
    old_version VARCHAR(20),
    new_version VARCHAR(20) NOT NULL,

    -- Change detection
    change_type VARCHAR(50) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Change details
    changes_detected JSONB NOT NULL,

    -- Source information
    anaf_announcement_url TEXT,
    anaf_announcement_date DATE,

    -- Notification
    users_notified_count INTEGER DEFAULT 0,
    companies_affected_count INTEGER DEFAULT 0,
    notification_sent_at TIMESTAMP WITH TIME ZONE,

    -- Resolution
    handled BOOLEAN DEFAULT false,
    handled_at TIMESTAMP WITH TIME ZONE,
    handled_by VARCHAR(100),
    resolution_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for anaf_form_updates_log
CREATE INDEX idx_form_updates_form ON anaf_form_updates_log(form_code);
CREATE INDEX idx_form_updates_detected ON anaf_form_updates_log(detected_at);
CREATE INDEX idx_form_updates_unhandled ON anaf_form_updates_log(handled) WHERE handled = false;

-- Comments
COMMENT ON TABLE anaf_form_updates_log IS 'Audit log of ANAF form changes detected by scraper service';
COMMENT ON COLUMN anaf_form_updates_log.change_type IS 'new_form, version_update, structure_change, url_change';

-- ============================================================================
-- Table 7: business_activity_calendar
-- Purpose: Integrate business activities with fiscal calendar
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_activity_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Entity linkage (supports both companies and individual users)
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

    -- At least one entity must be set
    CONSTRAINT check_activity_entity CHECK (company_id IS NOT NULL OR user_id IS NOT NULL),

    -- Activity details
    activity_type VARCHAR(50) NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Timing
    due_date DATE,
    recurrence_rule JSONB,

    -- Fiscal linkage
    related_fiscal_deadline_id UUID REFERENCES anaf_fiscal_deadlines(id),
    fiscal_impact VARCHAR(100),

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),

    -- Reminders
    reminder_days_before INTEGER[] DEFAULT ARRAY[7, 3, 1],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for business_activity_calendar
CREATE INDEX idx_business_calendar_company ON business_activity_calendar(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_business_calendar_user ON business_activity_calendar(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_business_calendar_task ON business_activity_calendar(task_id);
CREATE INDEX idx_business_calendar_deadline ON business_activity_calendar(related_fiscal_deadline_id);
CREATE INDEX idx_business_calendar_due ON business_activity_calendar(due_date);

-- Comments
COMMENT ON TABLE business_activity_calendar IS 'Business activities linked to fiscal obligations';
COMMENT ON COLUMN business_activity_calendar.activity_type IS 'invoice_issuance, payment_collection, inventory_check, expense_recording, bank_reconciliation';
COMMENT ON COLUMN business_activity_calendar.recurrence_rule IS 'iCal RRULE format for recurring activities';

-- ============================================================================
-- UPDATE TRIGGER FUNCTION
-- ============================================================================

-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for anaf_fiscal_deadlines
DROP TRIGGER IF EXISTS update_anaf_deadlines_timestamp ON anaf_fiscal_deadlines;
CREATE TRIGGER update_anaf_deadlines_timestamp
    BEFORE UPDATE ON anaf_fiscal_deadlines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for anaf_declaration_forms
DROP TRIGGER IF EXISTS update_anaf_forms_timestamp ON anaf_declaration_forms;
CREATE TRIGGER update_anaf_forms_timestamp
    BEFORE UPDATE ON anaf_declaration_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for company_fiscal_calendar
DROP TRIGGER IF EXISTS update_company_calendar_timestamp ON company_fiscal_calendar;
CREATE TRIGGER update_company_calendar_timestamp
    BEFORE UPDATE ON company_fiscal_calendar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for fiscal_declarations
DROP TRIGGER IF EXISTS update_declarations_timestamp ON fiscal_declarations;
CREATE TRIGGER update_declarations_timestamp
    BEFORE UPDATE ON fiscal_declarations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for fiscal_reminders
DROP TRIGGER IF EXISTS update_reminders_timestamp ON fiscal_reminders;
CREATE TRIGGER update_reminders_timestamp
    BEFORE UPDATE ON fiscal_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for business_activity_calendar
DROP TRIGGER IF EXISTS update_business_calendar_timestamp ON business_activity_calendar;
CREATE TRIGGER update_business_calendar_timestamp
    BEFORE UPDATE ON business_activity_calendar
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FOREIGN KEY UPDATE
-- Add foreign key to existing fiscal_declarations table
-- ============================================================================

-- Update company_fiscal_calendar to link back to fiscal_declarations
-- (This creates a circular reference, but it's intentional for bidirectional linking)
ALTER TABLE company_fiscal_calendar
DROP CONSTRAINT IF EXISTS company_fiscal_calendar_declaration_id_fkey;

ALTER TABLE company_fiscal_calendar
ADD CONSTRAINT company_fiscal_calendar_declaration_id_fkey
FOREIGN KEY (declaration_id) REFERENCES fiscal_declarations(id) ON DELETE SET NULL;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to accountech_app user
GRANT ALL PRIVILEGES ON anaf_fiscal_deadlines TO accountech_app;
GRANT ALL PRIVILEGES ON anaf_declaration_forms TO accountech_app;
GRANT ALL PRIVILEGES ON company_fiscal_calendar TO accountech_app;
GRANT ALL PRIVILEGES ON fiscal_declarations TO accountech_app;
GRANT ALL PRIVILEGES ON fiscal_reminders TO accountech_app;
GRANT ALL PRIVILEGES ON anaf_form_updates_log TO accountech_app;
GRANT ALL PRIVILEGES ON business_activity_calendar TO accountech_app;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables were created
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename IN (
    'anaf_fiscal_deadlines',
    'anaf_declaration_forms',
    'company_fiscal_calendar',
    'fiscal_declarations',
    'fiscal_reminders',
    'anaf_form_updates_log',
    'business_activity_calendar'
)
ORDER BY tablename;

-- Count indexes created
SELECT
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN (
    'anaf_fiscal_deadlines',
    'anaf_declaration_forms',
    'company_fiscal_calendar',
    'fiscal_declarations',
    'fiscal_reminders',
    'anaf_form_updates_log',
    'business_activity_calendar'
)
ORDER BY tablename, indexname;

-- ============================================================================
-- NOTES
-- ============================================================================

-- Next steps after running this migration:
-- 1. Run seed file: fiscal_calendar_seed_data.sql (to populate deadlines and forms)
-- 2. Deploy backend services in /includes/services/fiscal_calendar/
-- 3. Deploy frontend components in /frontend/src/pages/fiscal-calendar/
-- 4. Set up cron jobs for:
--    - Daily ANAF scraper (2:00 AM)
--    - Hourly reminder processor
--    - Daily calendar generator (3:00 AM)

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
