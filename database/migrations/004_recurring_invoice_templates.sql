-- =====================================================
-- PHASE 2: Recurring Invoice Templates
-- Migration: 004_recurring_invoice_templates.sql
-- Date: 2025-11-21
-- Description: Creates table for recurring invoice templates (automated billing)
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- RECURRING INVOICE TEMPLATES
-- Stores invoice templates for automated generation
-- =====================================================
CREATE TABLE IF NOT EXISTS recurring_invoice_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    next_invoice_date DATE NOT NULL,
    end_date DATE,
    invoice_template JSONB NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    auto_send BOOLEAN DEFAULT true,
    last_generated_at TIMESTAMP,
    invoices_generated_count INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_templates_company ON recurring_invoice_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_customer ON recurring_invoice_templates(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_status ON recurring_invoice_templates(status);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_next_date ON recurring_invoice_templates(next_invoice_date);

-- Add foreign key constraints
ALTER TABLE recurring_invoice_templates
    ADD CONSTRAINT fk_recurring_templates_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE recurring_invoice_templates
    ADD CONSTRAINT fk_recurring_templates_customer
    FOREIGN KEY (customer_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE recurring_invoice_templates
    ADD CONSTRAINT fk_recurring_templates_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON TABLE recurring_invoice_templates IS 'Stores recurring invoice templates for automated billing';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_invoice_templates TO accountech_app;

-- Add recurring_invoice_template_id to invoices table for tracking
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS recurring_invoice_template_id UUID;

CREATE INDEX IF NOT EXISTS idx_invoices_recurring_template ON invoices(recurring_invoice_template_id);

ALTER TABLE invoices
    ADD CONSTRAINT fk_invoices_recurring_template
    FOREIGN KEY (recurring_invoice_template_id) REFERENCES recurring_invoice_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN invoices.recurring_invoice_template_id IS 'Links invoice to its recurring template (if auto-generated)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 004_recurring_invoice_templates.sql completed successfully';
    RAISE NOTICE '   - Created recurring_invoice_templates table';
    RAISE NOTICE '   - Added recurring_invoice_template_id to invoices table';
    RAISE NOTICE '   - System ready for automated recurring billing';
END $$;
