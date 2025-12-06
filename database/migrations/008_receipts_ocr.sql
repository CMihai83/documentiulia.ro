-- Receipt OCR System Migration
-- Created: 2025-01-21
-- Description: Add support for receipt upload, OCR processing, and expense linking

-- =====================================================
-- 1. RECEIPTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,

    -- File details
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image/jpeg', 'image/png', 'application/pdf'

    -- OCR processing
    ocr_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    ocr_provider VARCHAR(50) DEFAULT 'google_vision', -- google_vision, tesseract, manual
    ocr_raw_text TEXT,
    ocr_confidence DECIMAL(5, 2), -- 0-100
    processed_at TIMESTAMP,
    error_message TEXT,

    -- Extracted fields
    merchant_name VARCHAR(255),
    merchant_confidence DECIMAL(5, 2),

    receipt_date DATE,
    date_confidence DECIMAL(5, 2),

    total_amount DECIMAL(15, 2),
    amount_confidence DECIMAL(5, 2),

    vat_amount DECIMAL(15, 2),
    vat_rate DECIMAL(5, 2), -- 19, 9, 5
    vat_confidence DECIMAL(5, 2),

    currency VARCHAR(3) DEFAULT 'RON',
    payment_method VARCHAR(50), -- cash, card, transfer
    receipt_number VARCHAR(100),

    -- Line items (JSONB for flexibility)
    line_items JSONB, -- [{"description": "...", "quantity": 1, "price": 10.50}]

    -- User corrections (for machine learning)
    was_corrected BOOLEAN DEFAULT false,
    corrections JSONB, -- {"merchant_name": {"original": "...", "corrected": "..."}}

    -- Metadata
    image_width INTEGER,
    image_height INTEGER,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT receipts_filename_unique UNIQUE(company_id, filename)
);

COMMENT ON TABLE receipts IS 'Stores uploaded receipt images and OCR extracted data';
COMMENT ON COLUMN receipts.ocr_status IS 'Processing status: pending, processing, completed, failed';
COMMENT ON COLUMN receipts.ocr_confidence IS 'Overall confidence score 0-100 for OCR extraction';
COMMENT ON COLUMN receipts.line_items IS 'JSON array of receipt line items with description, quantity, price';
COMMENT ON COLUMN receipts.corrections IS 'User corrections to OCR data for machine learning improvement';

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

-- Fast company lookups
CREATE INDEX idx_receipts_company ON receipts(company_id);

-- Fast user lookups
CREATE INDEX idx_receipts_user ON receipts(user_id);

-- Fast expense linking
CREATE INDEX idx_receipts_expense ON receipts(expense_id);

-- Fast status filtering
CREATE INDEX idx_receipts_status ON receipts(ocr_status);

-- Fast date range queries
CREATE INDEX idx_receipts_date ON receipts(receipt_date DESC);

-- Fast merchant search
CREATE INDEX idx_receipts_merchant ON receipts(merchant_name);

-- Unprocessed receipts
CREATE INDEX idx_receipts_pending ON receipts(ocr_status, created_at)
WHERE ocr_status = 'pending';

-- Failed receipts for review
CREATE INDEX idx_receipts_failed ON receipts(ocr_status, created_at)
WHERE ocr_status = 'failed';

-- Low confidence receipts for review
CREATE INDEX idx_receipts_low_confidence ON receipts(ocr_confidence)
WHERE ocr_confidence < 70;

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_receipts_updated_at
    BEFORE UPDATE ON receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. OCR PROCESSING QUEUE TABLE (Optional - for async processing)
-- =====================================================

CREATE TABLE IF NOT EXISTS receipt_processing_queue (
    id SERIAL PRIMARY KEY,
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 5, -- 1-10, higher = more urgent
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT receipt_queue_unique UNIQUE(receipt_id)
);

COMMENT ON TABLE receipt_processing_queue IS 'Queue for async OCR processing with retry logic';

CREATE INDEX idx_queue_status ON receipt_processing_queue(status, priority DESC, created_at);
CREATE INDEX idx_queue_receipt ON receipt_processing_queue(receipt_id);

-- =====================================================
-- 5. OCR TEMPLATES TABLE (For common merchants)
-- =====================================================

CREATE TABLE IF NOT EXISTS receipt_templates (
    id SERIAL PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL for system templates
    merchant_name VARCHAR(255) NOT NULL,
    merchant_pattern VARCHAR(500), -- Regex pattern to match merchant

    -- Field extraction patterns
    date_pattern VARCHAR(500),
    amount_pattern VARCHAR(500),
    vat_pattern VARCHAR(500),

    -- Template metadata
    is_system_template BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5, 2), -- 0-100

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT template_merchant_unique UNIQUE(company_id, merchant_name)
);

COMMENT ON TABLE receipt_templates IS 'Pre-defined patterns for common merchants to improve accuracy';

CREATE INDEX idx_templates_company ON receipt_templates(company_id);
CREATE INDEX idx_templates_merchant ON receipt_templates(merchant_name);
CREATE INDEX idx_templates_system ON receipt_templates(is_system_template)
WHERE is_system_template = true;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON receipt_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. DEFAULT SYSTEM TEMPLATES (Romanian merchants)
-- =====================================================

INSERT INTO receipt_templates (
    merchant_name, merchant_pattern, is_system_template
) VALUES
    ('Kaufland', 'KAUFLAND|KAUFLAND ROMANIA|KAUFLAND S\.R\.L\.', true),
    ('Carrefour', 'CARREFOUR|CARREFOUR ROMANIA', true),
    ('Lidl', 'LIDL|LIDL ROMANIA', true),
    ('Auchan', 'AUCHAN|AUCHAN ROMANIA', true),
    ('Profi', 'PROFI|PROFI ROM FOOD', true),
    ('Mega Image', 'MEGA IMAGE|MEGAIMAGE', true),
    ('Cora', 'CORA|CORA ROMANIA', true),
    ('Penny', 'PENNY|PENNY MARKET', true),
    ('Selgros', 'SELGROS|SELGROS CASH', true),
    ('Metro', 'METRO|METRO CASH', true),
    ('OMV', 'OMV|OMV PETROM', true),
    ('Petrom', 'PETROM|OMV PETROM', true),
    ('Mol', 'MOL|MOL ROMANIA', true),
    ('Rompetrol', 'ROMPETROL|ROMPETROL DOWNSTREAM', true),
    ('Lukoil', 'LUKOIL|LUKOIL ROMANIA', true)
ON CONFLICT (company_id, merchant_name) DO NOTHING;

-- =====================================================
-- 7. RECEIPT STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW receipt_stats AS
SELECT
    company_id,
    COUNT(*) as total_receipts,
    COUNT(*) FILTER (WHERE ocr_status = 'completed') as completed,
    COUNT(*) FILTER (WHERE ocr_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE ocr_status = 'failed') as failed,
    COUNT(*) FILTER (WHERE expense_id IS NOT NULL) as linked_to_expense,
    AVG(ocr_confidence) FILTER (WHERE ocr_status = 'completed') as avg_confidence,
    SUM(total_amount) FILTER (WHERE ocr_status = 'completed') as total_amount_sum,
    MIN(receipt_date) as earliest_receipt,
    MAX(receipt_date) as latest_receipt
FROM receipts
GROUP BY company_id;

COMMENT ON VIEW receipt_stats IS 'Aggregated statistics for receipt processing by company';

-- =====================================================
-- 8. FUNCTION: Get unprocessed receipts count
-- =====================================================

CREATE OR REPLACE FUNCTION get_unprocessed_receipts_count(p_company_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM receipts
        WHERE company_id = p_company_id
        AND ocr_status = 'pending'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_unprocessed_receipts_count IS 'Returns count of pending receipts for a company';

-- =====================================================
-- 9. FUNCTION: Get receipts needing review (low confidence)
-- =====================================================

CREATE OR REPLACE FUNCTION get_receipts_needing_review(
    p_company_id UUID,
    p_confidence_threshold DECIMAL DEFAULT 70
)
RETURNS TABLE (
    receipt_id UUID,
    merchant_name VARCHAR,
    receipt_date DATE,
    total_amount DECIMAL,
    ocr_confidence DECIMAL,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.merchant_name,
        r.receipt_date,
        r.total_amount,
        r.ocr_confidence,
        r.created_at
    FROM receipts r
    WHERE r.company_id = p_company_id
    AND r.ocr_status = 'completed'
    AND r.ocr_confidence < p_confidence_threshold
    ORDER BY r.ocr_confidence ASC, r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_receipts_needing_review IS 'Returns receipts with low confidence scores that need manual review';

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON receipts TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON receipt_processing_queue TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON receipt_templates TO accountech_app;
GRANT SELECT ON receipt_stats TO accountech_app;
GRANT EXECUTE ON FUNCTION get_unprocessed_receipts_count TO accountech_app;
GRANT EXECUTE ON FUNCTION get_receipts_needing_review TO accountech_app;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('receipts', 'receipt_processing_queue', 'receipt_templates');

    IF table_count = 3 THEN
        RAISE NOTICE '✅ Receipt OCR migration completed successfully';
        RAISE NOTICE '   - receipts table created';
        RAISE NOTICE '   - receipt_processing_queue table created';
        RAISE NOTICE '   - receipt_templates table created';
        RAISE NOTICE '   - 15 system templates inserted';
        RAISE NOTICE '   - Indexes and triggers created';
        RAISE NOTICE '   - Views and functions created';
    ELSE
        RAISE WARNING '⚠️  Migration incomplete: only % of 3 tables created', table_count;
    END IF;
END $$;
