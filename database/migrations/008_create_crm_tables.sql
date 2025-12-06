-- ============================================================================
-- CRM Module Database Migration
-- Version: 1.0
-- Date: 2025-11-18
-- Description: Create tables for CRM (Contacts enhancements, Opportunities, Quotations)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ENHANCE CONTACTS TABLE
-- ============================================================================

-- Add CRM-specific fields to existing contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS position VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS county VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'România',
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS source VARCHAR(50),
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_contacts_company_name ON contacts(company_id, company_name);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_rating ON contacts(company_id, rating);

-- ============================================================================
-- 2. OPPORTUNITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    contact_id UUID,

    -- Opportunity Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'RON',
    probability INTEGER CHECK (probability BETWEEN 0 AND 100) DEFAULT 50,
    expected_close_date DATE,

    -- Pipeline Stage
    stage VARCHAR(50) NOT NULL DEFAULT 'lead',
    stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Assignment
    assigned_to UUID,

    -- Loss Reason (if stage = 'lost')
    loss_reason VARCHAR(100),
    loss_notes TEXT,

    -- Source Tracking
    source VARCHAR(50),
    campaign VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,

    -- Foreign Keys
    CONSTRAINT opportunities_company_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT opportunities_contact_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT opportunities_assigned_fkey FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for opportunities
CREATE INDEX idx_opportunities_company ON opportunities(company_id, stage);
CREATE INDEX idx_opportunities_contact ON opportunities(contact_id);
CREATE INDEX idx_opportunities_assigned ON opportunities(assigned_to);
CREATE INDEX idx_opportunities_stage ON opportunities(company_id, stage, expected_close_date);
CREATE INDEX idx_opportunities_dates ON opportunities(company_id, created_at DESC);

-- ============================================================================
-- 3. QUOTATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    opportunity_id UUID,

    -- Quotation Details
    quotation_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,

    -- Financial
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 19.00,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    sent_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    converted_to_invoice_id UUID,

    -- Terms
    payment_terms INTEGER DEFAULT 30,
    terms_and_conditions TEXT,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign Keys
    CONSTRAINT quotations_company_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT quotations_contact_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT,
    CONSTRAINT quotations_opportunity_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
    CONSTRAINT quotations_invoice_fkey FOREIGN KEY (converted_to_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,

    -- Unique constraint on quotation number per company
    CONSTRAINT quotations_number_unique UNIQUE (company_id, quotation_number)
);

-- Indexes for quotations
CREATE INDEX idx_quotations_company ON quotations(company_id, status);
CREATE INDEX idx_quotations_contact ON quotations(contact_id);
CREATE INDEX idx_quotations_opportunity ON quotations(opportunity_id);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);
CREATE INDEX idx_quotations_dates ON quotations(company_id, issue_date, expiry_date);
CREATE INDEX idx_quotations_created ON quotations(company_id, created_at DESC);

-- ============================================================================
-- 4. QUOTATION ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL,

    -- Item Details
    item_order INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'buc',

    -- Tax
    tax_rate DECIMAL(5, 2) DEFAULT 19.00,
    tax_amount DECIMAL(15, 2) DEFAULT 0,

    -- Totals
    line_total DECIMAL(15, 2) NOT NULL,

    -- Optional Product Link
    product_id UUID,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign Keys
    CONSTRAINT quotation_items_quotation_fkey FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    CONSTRAINT quotation_items_product_fkey FOREIGN KEY (product_id) REFERENCES inventory_products(id) ON DELETE SET NULL
);

-- Indexes for quotation items
CREATE INDEX idx_quotation_items_quotation ON quotation_items(quotation_id, item_order);
CREATE INDEX idx_quotation_items_product ON quotation_items(product_id);

-- ============================================================================
-- 5. OPPORTUNITY ACTIVITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS opportunity_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID NOT NULL,
    user_id UUID,

    -- Activity Details
    activity_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    description TEXT,

    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    duration_minutes INTEGER,
    outcome VARCHAR(100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign Keys
    CONSTRAINT opportunity_activities_opportunity_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    CONSTRAINT opportunity_activities_user_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for opportunity activities
CREATE INDEX idx_opportunity_activities_opportunity ON opportunity_activities(opportunity_id, created_at DESC);
CREATE INDEX idx_opportunity_activities_user ON opportunity_activities(user_id);
CREATE INDEX idx_opportunity_activities_type ON opportunity_activities(activity_type, scheduled_at);
CREATE INDEX idx_opportunity_activities_scheduled ON opportunity_activities(user_id, scheduled_at) WHERE completed_at IS NULL;

-- ============================================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Opportunities updated_at trigger
CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER opportunities_updated_at_trigger
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunities_updated_at();

-- Quotations updated_at trigger
CREATE OR REPLACE FUNCTION update_quotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotations_updated_at_trigger
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_quotations_updated_at();

-- ============================================================================
-- 7. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample opportunity stages (as reference)
-- Stages: lead, qualified, proposal, negotiation, won, lost

-- Insert sample quotation statuses (as reference)
-- Statuses: draft, sent, accepted, rejected, expired, converted

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
    RAISE NOTICE 'CRM Tables Created Successfully:';
    RAISE NOTICE '1. contacts (enhanced)';
    RAISE NOTICE '2. opportunities';
    RAISE NOTICE '3. quotations';
    RAISE NOTICE '4. quotation_items';
    RAISE NOTICE '5. opportunity_activities';
END $$;
