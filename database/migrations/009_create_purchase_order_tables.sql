-- =====================================================
-- Purchase Orders Module - Database Schema
-- =====================================================
-- Created: 2025-11-18
-- Purpose: Complete procurement workflow (Quotation → PO → Invoice)
-- Tables: purchase_orders, purchase_order_items, purchase_order_receipts
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: purchase_orders
-- =====================================================
-- Main purchase orders table
-- Tracks POs from creation through approval to fulfillment
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,

    -- PO Identification
    po_number VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),

    -- Vendor Information
    vendor_id UUID, -- References contacts table (vendor)
    vendor_name VARCHAR(255) NOT NULL,
    vendor_email VARCHAR(255),
    vendor_phone VARCHAR(50),
    vendor_address TEXT,

    -- Quotation Link (if created from quotation)
    quotation_id UUID, -- References quotations table

    -- Financial Information
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'RON',

    -- Status Tracking
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- Status values: draft, pending_approval, approved, rejected, sent, partially_received, received, cancelled

    -- Approval Workflow
    approved_by UUID, -- References users table
    approved_at TIMESTAMP,
    rejected_by UUID, -- References users table
    rejected_at TIMESTAMP,
    rejection_reason TEXT,

    -- Dates
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,

    -- Additional Information
    notes TEXT,
    terms_and_conditions TEXT,
    payment_terms VARCHAR(100),
    delivery_address TEXT,

    -- Metadata
    created_by UUID NOT NULL, -- References users table
    updated_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT purchase_orders_company_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT purchase_orders_vendor_fkey FOREIGN KEY (vendor_id) REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT purchase_orders_quotation_fkey FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
    CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT purchase_orders_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT purchase_orders_po_number_unique UNIQUE (company_id, po_number),
    CONSTRAINT purchase_orders_status_check CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'sent', 'partially_received', 'received', 'cancelled'))
);

-- =====================================================
-- Indexes for purchase_orders
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_quotation_id ON purchase_orders(quotation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);

-- =====================================================
-- Trigger for purchase_orders updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_orders_updated_at_trigger
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_orders_updated_at();

-- =====================================================
-- Table: purchase_order_items
-- =====================================================
-- Line items for each purchase order
-- Links to inventory products or free-form items
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL,

    -- Product Information
    product_id UUID, -- References inventory_products table (optional)
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    description TEXT,

    -- Quantity and Pricing
    quantity DECIMAL(15, 3) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    discount_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,

    -- Calculated Fields
    subtotal DECIMAL(15, 2) NOT NULL, -- quantity * unit_price
    tax_amount DECIMAL(15, 2) NOT NULL, -- subtotal * tax_rate
    discount_amount DECIMAL(15, 2) NOT NULL, -- subtotal * discount_rate
    total_amount DECIMAL(15, 2) NOT NULL, -- subtotal + tax_amount - discount_amount

    -- Receiving Status
    quantity_received DECIMAL(15, 3) NOT NULL DEFAULT 0,
    quantity_pending DECIMAL(15, 3) NOT NULL, -- quantity - quantity_received

    -- Metadata
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT purchase_order_items_po_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    -- Note: product_id FK to inventory_products added when inventory module exists

    -- Constraints
    CONSTRAINT purchase_order_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT purchase_order_items_unit_price_positive CHECK (unit_price >= 0)
);

-- =====================================================
-- Indexes for purchase_order_items
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON purchase_order_items(product_id);

-- =====================================================
-- Trigger for purchase_order_items updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_purchase_order_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_order_items_updated_at_trigger
    BEFORE UPDATE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_items_updated_at();

-- =====================================================
-- Table: purchase_order_receipts
-- =====================================================
-- Tracks goods received against purchase orders
-- Supports partial receiving across multiple dates
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_order_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    purchase_order_id UUID NOT NULL,
    purchase_order_item_id UUID NOT NULL,

    -- Receipt Information
    receipt_number VARCHAR(50) NOT NULL,
    receipt_date DATE NOT NULL,

    -- Quantity Received
    quantity_received DECIMAL(15, 3) NOT NULL,

    -- Quality Check
    quality_status VARCHAR(50) NOT NULL DEFAULT 'accepted',
    -- Status values: accepted, rejected, partial
    quantity_accepted DECIMAL(15, 3) NOT NULL DEFAULT 0,
    quantity_rejected DECIMAL(15, 3) NOT NULL DEFAULT 0,
    rejection_reason TEXT,

    -- Warehouse Location (if inventory module exists)
    warehouse_id UUID,
    location VARCHAR(100),

    -- Notes
    notes TEXT,

    -- Metadata
    received_by UUID NOT NULL, -- References users table
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT purchase_order_receipts_company_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT purchase_order_receipts_po_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT purchase_order_receipts_po_item_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id) ON DELETE CASCADE,
    CONSTRAINT purchase_order_receipts_received_by_fkey FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE RESTRICT,

    -- Constraints
    CONSTRAINT purchase_order_receipts_receipt_number_unique UNIQUE (company_id, receipt_number),
    CONSTRAINT purchase_order_receipts_quantity_positive CHECK (quantity_received > 0),
    CONSTRAINT purchase_order_receipts_quality_status_check CHECK (quality_status IN ('accepted', 'rejected', 'partial'))
);

-- =====================================================
-- Indexes for purchase_order_receipts
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_company_id ON purchase_order_receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_po_id ON purchase_order_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_po_item_id ON purchase_order_receipts(purchase_order_item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_receipt_date ON purchase_order_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_received_by ON purchase_order_receipts(received_by);

-- =====================================================
-- Trigger for purchase_order_receipts updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_purchase_order_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_order_receipts_updated_at_trigger
    BEFORE UPDATE ON purchase_order_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_receipts_updated_at();

-- =====================================================
-- Trigger to update quantity_pending in purchase_order_items
-- =====================================================
-- Automatically recalculates pending quantity when receipts are added

CREATE OR REPLACE FUNCTION update_purchase_order_item_quantities()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_order_items
    SET
        quantity_received = (
            SELECT COALESCE(SUM(quantity_received), 0)
            FROM purchase_order_receipts
            WHERE purchase_order_item_id = NEW.purchase_order_item_id
        ),
        quantity_pending = quantity - (
            SELECT COALESCE(SUM(quantity_received), 0)
            FROM purchase_order_receipts
            WHERE purchase_order_item_id = NEW.purchase_order_item_id
        )
    WHERE id = NEW.purchase_order_item_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_order_receipts_update_item_quantities
    AFTER INSERT OR UPDATE ON purchase_order_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_item_quantities();

-- =====================================================
-- Trigger to update PO status based on receiving
-- =====================================================
-- Automatically updates PO status to partially_received or received

CREATE OR REPLACE FUNCTION update_purchase_order_status()
RETURNS TRIGGER AS $$
DECLARE
    total_quantity DECIMAL(15, 3);
    total_received DECIMAL(15, 3);
    po_id UUID;
BEGIN
    -- Get PO ID from the item
    SELECT purchase_order_id INTO po_id
    FROM purchase_order_items
    WHERE id = NEW.purchase_order_item_id;

    -- Calculate totals
    SELECT
        SUM(quantity),
        SUM(quantity_received)
    INTO total_quantity, total_received
    FROM purchase_order_items
    WHERE purchase_order_id = po_id;

    -- Update PO status
    IF total_received >= total_quantity THEN
        UPDATE purchase_orders
        SET status = 'received', actual_delivery_date = CURRENT_DATE
        WHERE id = po_id AND status != 'received';
    ELSIF total_received > 0 THEN
        UPDATE purchase_orders
        SET status = 'partially_received'
        WHERE id = po_id AND status NOT IN ('received', 'partially_received');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_order_receipts_update_po_status
    AFTER INSERT OR UPDATE ON purchase_order_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_status();

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE purchase_orders IS 'Purchase orders for procurement workflow';
COMMENT ON TABLE purchase_order_items IS 'Line items for purchase orders';
COMMENT ON TABLE purchase_order_receipts IS 'Goods receipt records for purchase orders';

COMMENT ON COLUMN purchase_orders.status IS 'PO status: draft, pending_approval, approved, rejected, sent, partially_received, received, cancelled';
COMMENT ON COLUMN purchase_order_receipts.quality_status IS 'Quality check result: accepted, rejected, partial';

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- Uncomment below to insert sample data for testing
/*
-- Note: Replace UUIDs with actual IDs from your system

INSERT INTO purchase_orders (
    company_id, po_number, vendor_name, vendor_email,
    subtotal, tax_amount, total_amount, currency,
    status, order_date, expected_delivery_date,
    created_by, notes
) VALUES (
    'YOUR_COMPANY_ID_HERE', 'PO-2025-0001', 'Furnizor Test SRL', 'contact@furnizor.ro',
    5000.00, 950.00, 5950.00, 'RON',
    'draft', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days',
    'YOUR_USER_ID_HERE', 'Test purchase order for development'
);
*/

-- =====================================================
-- End of Migration
-- =====================================================

COMMIT;
