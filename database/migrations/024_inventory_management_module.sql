-- ============================================================================
-- INVENTORY MANAGEMENT MODULE
-- Phase 2 - Module 2.1: Complete Inventory System
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PRODUCTS TABLE
-- Core product/service catalog
-- ============================================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,

    -- Product Identity
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    barcode VARCHAR(100),

    -- Classification
    category VARCHAR(100),
    subcategory VARCHAR(100),
    brand VARCHAR(100),
    unit_of_measure VARCHAR(50) DEFAULT 'buc', -- buc, kg, litri, metri, etc.

    -- Pricing
    purchase_price DECIMAL(15,2),
    selling_price DECIMAL(15,2) NOT NULL,
    min_selling_price DECIMAL(15,2), -- Below this, show warning
    profit_margin DECIMAL(5,2), -- Calculated: (selling - purchase) / purchase * 100

    -- Tax & Accounting
    vat_rate DECIMAL(5,2) DEFAULT 19.00,
    account_code VARCHAR(50), -- Link to chart of accounts

    -- Inventory Settings
    track_inventory BOOLEAN DEFAULT true,
    allow_negative_stock BOOLEAN DEFAULT false,
    reorder_level DECIMAL(15,3),
    reorder_quantity DECIMAL(15,3),

    -- Product Details
    weight DECIMAL(10,3), -- kg
    dimensions VARCHAR(100), -- L x W x H in cm
    manufacturer VARCHAR(255),
    supplier_sku VARCHAR(100),

    -- Media
    primary_image_url VARCHAR(500),
    images JSONB, -- Array of image URLs

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_sellable BOOLEAN DEFAULT true,
    is_purchasable BOOLEAN DEFAULT true,

    -- Metadata
    custom_fields JSONB,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT products_company_sku_unique UNIQUE(company_id, sku)
);

CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);

COMMENT ON TABLE products IS 'Product and service catalog with inventory tracking';

-- ============================================================================
-- 2. PRODUCT VARIANTS
-- Support for products with variations (size, color, etc.)
-- ============================================================================

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Variant Identity
    sku VARCHAR(100) NOT NULL UNIQUE,
    variant_name VARCHAR(255), -- "Large Blue" or "XL"

    -- Variant Attributes
    attributes JSONB, -- {size: "XL", color: "blue"}

    -- Pricing (can override parent)
    purchase_price DECIMAL(15,2),
    selling_price DECIMAL(15,2),

    -- Inventory
    barcode VARCHAR(100),
    track_inventory BOOLEAN DEFAULT true,

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);

-- ============================================================================
-- 3. WAREHOUSES/LOCATIONS
-- Physical storage locations
-- ============================================================================

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,

    -- Warehouse Details
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50), -- Short code: "WH1", "STORE-CTR"
    warehouse_type VARCHAR(50) DEFAULT 'warehouse', -- warehouse, store, dropship

    -- Address
    address TEXT,
    city VARCHAR(100),
    county VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'RO',

    -- Contact
    manager_id UUID, -- REFERENCES employees(id)
    phone VARCHAR(50),
    email VARCHAR(255),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_sellable BOOLEAN DEFAULT false, -- Can sell directly from this location

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouses_company ON warehouses(company_id);
CREATE INDEX idx_warehouses_active ON warehouses(is_active);

COMMENT ON TABLE warehouses IS 'Physical storage locations and retail stores';

-- ============================================================================
-- 4. STOCK LEVELS
-- Current inventory quantities per product per warehouse
-- ============================================================================

CREATE TABLE stock_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    -- Quantities
    quantity_available DECIMAL(15,3) DEFAULT 0,
    quantity_reserved DECIMAL(15,3) DEFAULT 0, -- Reserved for orders not yet fulfilled
    quantity_on_order DECIMAL(15,3) DEFAULT 0, -- Expected from purchase orders

    -- Calculated
    quantity_free DECIMAL(15,3) GENERATED ALWAYS AS (quantity_available - quantity_reserved) STORED,

    -- Reorder Settings (can override product defaults)
    reorder_level DECIMAL(15,3),
    reorder_quantity DECIMAL(15,3),

    -- Costing
    average_cost DECIMAL(15,2), -- Weighted average cost
    fifo_cost DECIMAL(15,2), -- FIFO cost
    last_purchase_cost DECIMAL(15,2),

    -- Metadata
    last_count_date DATE,
    last_movement_date TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT stock_levels_unique UNIQUE(product_id, warehouse_id, variant_id)
);

CREATE INDEX idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX idx_stock_levels_warehouse ON stock_levels(warehouse_id);
CREATE INDEX idx_stock_levels_variant ON stock_levels(variant_id);
CREATE INDEX idx_stock_levels_low_stock ON stock_levels(warehouse_id)
    WHERE quantity_available <= reorder_level;

COMMENT ON TABLE stock_levels IS 'Real-time inventory quantities per location';

-- ============================================================================
-- 5. STOCK MOVEMENTS
-- Complete audit trail of all inventory changes
-- ============================================================================

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,

    -- What & Where
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    -- Movement Details
    movement_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment', 'transfer', 'return'
    movement_subtype VARCHAR(50), -- 'purchase', 'sale', 'production', 'damage', 'theft', 'count'

    -- Quantity & Cost
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),

    -- Reference to Source Transaction
    reference_type VARCHAR(50), -- 'purchase_order', 'invoice', 'bill', 'transfer', 'adjustment'
    reference_id UUID,
    reference_number VARCHAR(100),

    -- Transfer specific (if movement_type = 'transfer')
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),

    -- Additional Info
    notes TEXT,
    batch_number VARCHAR(100),
    serial_numbers JSONB, -- For serialized items

    -- Who & When
    created_by UUID, -- REFERENCES users(id)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure transfers have both warehouses
    CONSTRAINT transfer_warehouses_check CHECK (
        (movement_type != 'transfer') OR
        (from_warehouse_id IS NOT NULL AND to_warehouse_id IS NOT NULL)
    )
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_company ON stock_movements(company_id);

COMMENT ON TABLE stock_movements IS 'Complete audit trail of all inventory movements';

-- ============================================================================
-- 6. STOCK ADJUSTMENTS
-- Manual inventory corrections
-- ============================================================================

CREATE TABLE stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    -- Adjustment Details
    adjustment_number VARCHAR(50) UNIQUE NOT NULL,
    adjustment_date DATE NOT NULL,
    adjustment_type VARCHAR(50), -- 'count', 'damage', 'theft', 'correction'

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, confirmed, posted

    -- Totals
    total_items INTEGER,
    total_value DECIMAL(15,2),

    -- Approval
    approved_by UUID, -- REFERENCES users(id)
    approved_at TIMESTAMP,

    -- Notes
    reason TEXT,
    notes TEXT,

    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_adjustment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adjustment_id UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),

    -- Quantities
    quantity_system DECIMAL(15,3), -- What system thinks we have
    quantity_counted DECIMAL(15,3), -- What we actually have
    quantity_difference DECIMAL(15,3), -- counted - system

    -- Costing
    unit_cost DECIMAL(15,2),
    value_difference DECIMAL(15,2), -- quantity_difference * unit_cost

    notes TEXT
);

CREATE INDEX idx_stock_adjustments_warehouse ON stock_adjustments(warehouse_id);
CREATE INDEX idx_stock_adjustments_status ON stock_adjustments(status);
CREATE INDEX idx_stock_adjustment_items_adjustment ON stock_adjustment_items(adjustment_id);

-- ============================================================================
-- 7. STOCK TRANSFERS
-- Moving inventory between warehouses
-- ============================================================================

CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,

    -- Transfer Details
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    transfer_date DATE NOT NULL,

    -- Locations
    from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, in_transit, received, cancelled

    -- Dates
    shipped_at TIMESTAMP,
    expected_arrival DATE,
    received_at TIMESTAMP,

    -- People
    requested_by UUID, -- REFERENCES users(id)
    shipped_by UUID,
    received_by UUID,

    -- Notes
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,

    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),

    quantity_requested DECIMAL(15,3),
    quantity_shipped DECIMAL(15,3),
    quantity_received DECIMAL(15,3),

    notes TEXT
);

CREATE INDEX idx_stock_transfers_from ON stock_transfers(from_warehouse_id);
CREATE INDEX idx_stock_transfers_to ON stock_transfers(to_warehouse_id);
CREATE INDEX idx_stock_transfers_status ON stock_transfers(status);

-- ============================================================================
-- 8. LOW STOCK ALERTS
-- Automated notifications for reordering
-- ============================================================================

CREATE TABLE low_stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,

    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    -- Alert Details
    current_quantity DECIMAL(15,3),
    reorder_level DECIMAL(15,3),
    suggested_order_quantity DECIMAL(15,3),

    -- Status
    alert_status VARCHAR(50) DEFAULT 'active', -- active, acknowledged, ordered, resolved

    -- Actions
    acknowledged_by UUID, -- REFERENCES users(id)
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_low_stock_alerts_product ON low_stock_alerts(product_id);
CREATE INDEX idx_low_stock_alerts_warehouse ON low_stock_alerts(warehouse_id);
CREATE INDEX idx_low_stock_alerts_status ON low_stock_alerts(alert_status);

-- ============================================================================
-- 9. INVENTORY VALUATION SNAPSHOTS
-- Periodic snapshots for reporting
-- ============================================================================

CREATE TABLE inventory_valuations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id),

    -- Snapshot Details
    valuation_date DATE NOT NULL,
    valuation_method VARCHAR(50), -- 'average_cost', 'fifo', 'lifo'

    -- Totals
    total_quantity DECIMAL(15,3),
    total_value DECIMAL(15,2),
    total_products INTEGER,

    -- Breakdown by category
    category_breakdown JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, warehouse_id, valuation_date)
);

CREATE INDEX idx_inventory_valuations_company ON inventory_valuations(company_id);
CREATE INDEX idx_inventory_valuations_date ON inventory_valuations(valuation_date DESC);

COMMENT ON TABLE inventory_valuations IS 'Daily/monthly inventory valuation snapshots for reporting';

-- ============================================================================
-- 10. TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update product profit margin
CREATE OR REPLACE FUNCTION update_product_profit_margin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.purchase_price > 0 THEN
        NEW.profit_margin := ((NEW.selling_price - NEW.purchase_price) / NEW.purchase_price) * 100;
    END IF;
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_profit_margin
    BEFORE INSERT OR UPDATE OF selling_price, purchase_price ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_profit_margin();

-- Auto-create low stock alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- If stock drops below reorder level, create alert
    IF NEW.quantity_available <= COALESCE(NEW.reorder_level, 0) AND
       COALESCE(NEW.reorder_level, 0) > 0 THEN

        INSERT INTO low_stock_alerts (
            company_id,
            product_id,
            variant_id,
            warehouse_id,
            current_quantity,
            reorder_level,
            suggested_order_quantity
        )
        SELECT
            p.company_id,
            NEW.product_id,
            NEW.variant_id,
            NEW.warehouse_id,
            NEW.quantity_available,
            NEW.reorder_level,
            COALESCE(NEW.reorder_quantity, NEW.reorder_level)
        FROM products p
        WHERE p.id = NEW.product_id
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_low_stock
    AFTER INSERT OR UPDATE OF quantity_available ON stock_levels
    FOR EACH ROW
    EXECUTE FUNCTION check_low_stock();

COMMIT;
