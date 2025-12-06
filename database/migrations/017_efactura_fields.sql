-- Migration: 017_efactura_fields.sql
-- Description: Add fields required for e-Factura compliance
-- Date: 2024-11-29

-- Add e-Factura fields to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trade_register_number VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_city VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_county VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_postal_code VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_country VARCHAR(2) DEFAULT 'RO';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

-- Add e-Factura fields to contacts (customers/suppliers)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS trade_register_number VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_city VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_county VARCHAR(100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_postal_code VARCHAR(20);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address_country VARCHAR(2) DEFAULT 'RO';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);

-- Add VAT fields to invoice_line_items
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) DEFAULT 19.00;
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS vat_code VARCHAR(10) DEFAULT 'S';
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS product_code VARCHAR(100);
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(10) DEFAULT 'BUC';

-- Add e-Factura fields to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'transfer';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(20) DEFAULT 'standard';

-- Create e-Factura settings table
CREATE TABLE IF NOT EXISTS efactura_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    auto_submit BOOLEAN DEFAULT false,
    anaf_client_id VARCHAR(255),
    anaf_client_secret VARCHAR(255),
    anaf_oauth_token TEXT,
    anaf_refresh_token TEXT,
    anaf_token_expires_at TIMESTAMP,
    use_test_environment BOOLEAN DEFAULT true,
    notification_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id)
);

-- Create efactura_sync_log table if not exists
CREATE TABLE IF NOT EXISTS efactura_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    action VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    request_data JSONB,
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_efactura_sync_log_company ON efactura_sync_log(company_id);
CREATE INDEX IF NOT EXISTS idx_efactura_sync_log_invoice ON efactura_sync_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_efactura_sync_log_created ON efactura_sync_log(created_at);

-- UBL code lists for Romania
CREATE TABLE IF NOT EXISTS efactura_code_lists (
    id SERIAL PRIMARY KEY,
    list_type VARCHAR(50) NOT NULL,
    code VARCHAR(20) NOT NULL,
    name_ro VARCHAR(255),
    name_en VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(list_type, code)
);

-- Insert VAT category codes
INSERT INTO efactura_code_lists (list_type, code, name_ro, name_en, description)
VALUES
    ('VAT_CATEGORY', 'S', 'Standard', 'Standard rate', 'Standard VAT rate (19%)'),
    ('VAT_CATEGORY', 'Z', 'Zero', 'Zero rated', 'Zero rated VAT'),
    ('VAT_CATEGORY', 'E', 'Scutit', 'Exempt', 'VAT exempt'),
    ('VAT_CATEGORY', 'AE', 'Taxare inversă', 'Reverse charge', 'Reverse charge VAT'),
    ('VAT_CATEGORY', 'K', 'Intra-comunitar', 'Intra-Community supply', 'Intra-community supply')
ON CONFLICT (list_type, code) DO NOTHING;

-- Insert payment method codes
INSERT INTO efactura_code_lists (list_type, code, name_ro, name_en, description)
VALUES
    ('PAYMENT_MEANS', '10', 'Numerar', 'Cash', 'Payment by cash'),
    ('PAYMENT_MEANS', '30', 'Transfer bancar', 'Credit transfer', 'Payment by credit transfer'),
    ('PAYMENT_MEANS', '31', 'Debit direct', 'Debit transfer', 'Payment by debit transfer'),
    ('PAYMENT_MEANS', '48', 'Card bancar', 'Bank card', 'Payment by bank card'),
    ('PAYMENT_MEANS', '49', 'Debit direct', 'Direct debit', 'Payment by direct debit'),
    ('PAYMENT_MEANS', '57', 'Ordin plată', 'Standing agreement', 'Payment by standing order'),
    ('PAYMENT_MEANS', '58', 'Card credit', 'SEPA credit transfer', 'SEPA credit transfer'),
    ('PAYMENT_MEANS', '59', 'Card debit', 'SEPA direct debit', 'SEPA direct debit'),
    ('PAYMENT_MEANS', 'ZZZ', 'Acord mutual', 'Mutually defined', 'Mutually defined payment method')
ON CONFLICT (list_type, code) DO NOTHING;

-- Insert unit of measure codes (common Romanian units)
INSERT INTO efactura_code_lists (list_type, code, name_ro, name_en, description)
VALUES
    ('UNIT_CODE', 'BUC', 'Bucată', 'Piece', 'Each/piece'),
    ('UNIT_CODE', 'H87', 'Bucată', 'Piece', 'Each/piece (UBL standard)'),
    ('UNIT_CODE', 'KGM', 'Kilogram', 'Kilogram', 'Kilogram'),
    ('UNIT_CODE', 'MTR', 'Metru', 'Meter', 'Meter'),
    ('UNIT_CODE', 'MTK', 'Metru pătrat', 'Square meter', 'Square meter'),
    ('UNIT_CODE', 'MTQ', 'Metru cub', 'Cubic meter', 'Cubic meter'),
    ('UNIT_CODE', 'LTR', 'Litru', 'Liter', 'Liter'),
    ('UNIT_CODE', 'HUR', 'Oră', 'Hour', 'Hour'),
    ('UNIT_CODE', 'DAY', 'Zi', 'Day', 'Day'),
    ('UNIT_CODE', 'MON', 'Lună', 'Month', 'Month'),
    ('UNIT_CODE', 'SET', 'Set', 'Set', 'Set'),
    ('UNIT_CODE', 'KWH', 'Kilowatt-oră', 'Kilowatt-hour', 'Kilowatt-hour')
ON CONFLICT (list_type, code) DO NOTHING;

-- Insert Romanian counties
INSERT INTO efactura_code_lists (list_type, code, name_ro, name_en, description)
VALUES
    ('COUNTY', 'AB', 'Alba', 'Alba', 'Județul Alba'),
    ('COUNTY', 'AR', 'Arad', 'Arad', 'Județul Arad'),
    ('COUNTY', 'AG', 'Argeș', 'Argeș', 'Județul Argeș'),
    ('COUNTY', 'BC', 'Bacău', 'Bacău', 'Județul Bacău'),
    ('COUNTY', 'BH', 'Bihor', 'Bihor', 'Județul Bihor'),
    ('COUNTY', 'BN', 'Bistrița-Năsăud', 'Bistrița-Năsăud', 'Județul Bistrița-Năsăud'),
    ('COUNTY', 'BT', 'Botoșani', 'Botoșani', 'Județul Botoșani'),
    ('COUNTY', 'BV', 'Brașov', 'Brașov', 'Județul Brașov'),
    ('COUNTY', 'BR', 'Brăila', 'Brăila', 'Județul Brăila'),
    ('COUNTY', 'B', 'București', 'Bucharest', 'Municipiul București'),
    ('COUNTY', 'BZ', 'Buzău', 'Buzău', 'Județul Buzău'),
    ('COUNTY', 'CS', 'Caraș-Severin', 'Caraș-Severin', 'Județul Caraș-Severin'),
    ('COUNTY', 'CL', 'Călărași', 'Călărași', 'Județul Călărași'),
    ('COUNTY', 'CJ', 'Cluj', 'Cluj', 'Județul Cluj'),
    ('COUNTY', 'CT', 'Constanța', 'Constanța', 'Județul Constanța'),
    ('COUNTY', 'CV', 'Covasna', 'Covasna', 'Județul Covasna'),
    ('COUNTY', 'DB', 'Dâmbovița', 'Dâmbovița', 'Județul Dâmbovița'),
    ('COUNTY', 'DJ', 'Dolj', 'Dolj', 'Județul Dolj'),
    ('COUNTY', 'GL', 'Galați', 'Galați', 'Județul Galați'),
    ('COUNTY', 'GR', 'Giurgiu', 'Giurgiu', 'Județul Giurgiu'),
    ('COUNTY', 'GJ', 'Gorj', 'Gorj', 'Județul Gorj'),
    ('COUNTY', 'HR', 'Harghita', 'Harghita', 'Județul Harghita'),
    ('COUNTY', 'HD', 'Hunedoara', 'Hunedoara', 'Județul Hunedoara'),
    ('COUNTY', 'IL', 'Ialomița', 'Ialomița', 'Județul Ialomița'),
    ('COUNTY', 'IS', 'Iași', 'Iași', 'Județul Iași'),
    ('COUNTY', 'IF', 'Ilfov', 'Ilfov', 'Județul Ilfov'),
    ('COUNTY', 'MM', 'Maramureș', 'Maramureș', 'Județul Maramureș'),
    ('COUNTY', 'MH', 'Mehedinți', 'Mehedinți', 'Județul Mehedinți'),
    ('COUNTY', 'MS', 'Mureș', 'Mureș', 'Județul Mureș'),
    ('COUNTY', 'NT', 'Neamț', 'Neamț', 'Județul Neamț'),
    ('COUNTY', 'OT', 'Olt', 'Olt', 'Județul Olt'),
    ('COUNTY', 'PH', 'Prahova', 'Prahova', 'Județul Prahova'),
    ('COUNTY', 'SM', 'Satu Mare', 'Satu Mare', 'Județul Satu Mare'),
    ('COUNTY', 'SJ', 'Sălaj', 'Sălaj', 'Județul Sălaj'),
    ('COUNTY', 'SB', 'Sibiu', 'Sibiu', 'Județul Sibiu'),
    ('COUNTY', 'SV', 'Suceava', 'Suceava', 'Județul Suceava'),
    ('COUNTY', 'TR', 'Teleorman', 'Teleorman', 'Județul Teleorman'),
    ('COUNTY', 'TM', 'Timiș', 'Timiș', 'Județul Timiș'),
    ('COUNTY', 'TL', 'Tulcea', 'Tulcea', 'Județul Tulcea'),
    ('COUNTY', 'VS', 'Vaslui', 'Vaslui', 'Județul Vaslui'),
    ('COUNTY', 'VL', 'Vâlcea', 'Vâlcea', 'Județul Vâlcea'),
    ('COUNTY', 'VN', 'Vrancea', 'Vrancea', 'Județul Vrancea')
ON CONFLICT (list_type, code) DO NOTHING;

COMMENT ON TABLE efactura_settings IS 'e-Factura configuration per company';
COMMENT ON TABLE efactura_sync_log IS 'e-Factura API sync log for audit trail';
COMMENT ON TABLE efactura_code_lists IS 'UBL and Romanian code lists for e-Factura';
