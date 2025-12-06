-- e-Factura Database Tables Migration
-- DocumentIulia Platform
-- Created: 2025-11-22

-- Table 1: efactura_invoices
-- Tracks e-Factura upload status for each invoice
CREATE TABLE IF NOT EXISTS efactura_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    company_id UUID NOT NULL,
    upload_index BIGINT UNIQUE,
    xml_file_path VARCHAR(500),
    xml_hash VARCHAR(64),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    anaf_status VARCHAR(50),
    anaf_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_at TIMESTAMP,
    validated_at TIMESTAMP,
    last_sync_at TIMESTAMP,
    upload_attempt_count INTEGER DEFAULT 0,
    last_error TEXT,
    UNIQUE(invoice_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_efactura_invoices_status ON efactura_invoices(status);
CREATE INDEX IF NOT EXISTS idx_efactura_invoices_company ON efactura_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_efactura_invoices_invoice ON efactura_invoices(invoice_id);
CREATE INDEX IF NOT EXISTS idx_efactura_invoices_upload_index ON efactura_invoices(upload_index) WHERE upload_index IS NOT NULL;

-- Table 2: efactura_oauth_tokens
-- Stores encrypted OAuth 2.0 tokens for ANAF API access
CREATE TABLE IF NOT EXISTS efactura_oauth_tokens (
    company_id UUID PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP NOT NULL,
    scope TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_refreshed_at TIMESTAMP,
    encryption_key_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_efactura_oauth_expires ON efactura_oauth_tokens(expires_at);

-- Table 3: efactura_received_invoices
-- Stores invoices received from suppliers via ANAF
CREATE TABLE IF NOT EXISTS efactura_received_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    download_id VARCHAR(255) NOT NULL,
    cif VARCHAR(20) NOT NULL,
    seller_name VARCHAR(255),
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',
    xml_file_path VARCHAR(500),
    matched_purchase_order_id UUID,
    match_confidence INTEGER,
    auto_matched BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, download_id)
);

CREATE INDEX IF NOT EXISTS idx_efactura_received_company ON efactura_received_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_efactura_received_cif ON efactura_received_invoices(cif);
CREATE INDEX IF NOT EXISTS idx_efactura_received_date ON efactura_received_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_efactura_received_matched ON efactura_received_invoices(matched_purchase_order_id) WHERE matched_purchase_order_id IS NOT NULL;

-- Table 4: efactura_sync_log
-- Audit log for all e-Factura operations
CREATE TABLE IF NOT EXISTS efactura_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    operation VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    details JSONB,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_efactura_sync_company ON efactura_sync_log(company_id);
CREATE INDEX IF NOT EXISTS idx_efactura_sync_operation ON efactura_sync_log(operation);
CREATE INDEX IF NOT EXISTS idx_efactura_sync_date ON efactura_sync_log(synced_at);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON efactura_invoices TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON efactura_oauth_tokens TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON efactura_received_invoices TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON efactura_sync_log TO accountech_app;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ e-Factura tables created successfully!';
    RAISE NOTICE 'Tables: efactura_invoices, efactura_oauth_tokens, efactura_received_invoices, efactura_sync_log';
END $$;
