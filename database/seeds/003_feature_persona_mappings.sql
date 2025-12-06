-- Sprint 2: Feature-Persona Mappings
-- Maps features to specific personas for better targeting

-- First, let's add some missing features
INSERT INTO feature_toggles (id, name, description, category, required_tier, enabled_for_personas, is_active, is_beta)
VALUES
-- Core features for all personas
('time_tracking', 'Pontaj', 'Urmarirea timpului si a proiectelor', 'core', 'starter', '[]', true, false),
('project_management', 'Proiecte', 'Gestionarea proiectelor si task-urilor', 'core', 'starter', '[]', true, false),

-- Premium features
('multi_currency', 'Multi-Valuta', 'Suport pentru multiple valute', 'premium', 'growth', '[]', true, false),
('api_access', 'Acces API', 'Integrare API pentru dezvoltatori', 'premium', 'professional', '[]', true, false),
('white_label', 'White Label', 'Personalizare completa brand', 'premium', 'enterprise', '[]', true, false),
('custom_reports', 'Rapoarte Custom', 'Generare rapoarte personalizate', 'premium', 'growth', '[]', true, false),
('team_collaboration', 'Colaborare Echipa', 'Functii avansate de colaborare', 'premium', 'growth', '[]', true, false),

-- Vertical features for specific personas
('online_orders', 'Comenzi Online', 'Gestionarea comenzilor online', 'vertical', 'starter', '["ecommerce", "retail", "horeca"]', true, false),
('appointments', 'Programari', 'Sistem de programari clienti', 'vertical', 'starter', '["beauty", "medical", "services"]', true, false),
('recipes', 'Retete', 'Gestionarea retetelor culinare', 'vertical', 'starter', '["horeca"]', true, false),
('reservations', 'Rezervari', 'Sistem de rezervari', 'vertical', 'starter', '["horeca"]', true, false),
('equipment_tracking', 'Echipamente', 'Urmarirea echipamentelor', 'vertical', 'starter', '["construction", "electrical", "agriculture"]', true, false),
('route_planning', 'Planificare Rute', 'Optimizare trasee livrari', 'vertical', 'growth', '["delivery", "transport"]', true, false),
('product_catalog', 'Catalog Produse', 'Gestionare catalog produse', 'vertical', 'starter', '["retail", "ecommerce"]', true, false),
('membership_tracking', 'Abonamente Clienti', 'Gestionare abonamente', 'vertical', 'starter', '["beauty", "services"]', true, false)

ON CONFLICT (id) DO UPDATE SET
    enabled_for_personas = EXCLUDED.enabled_for_personas,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Update existing features with persona restrictions
UPDATE feature_toggles SET enabled_for_personas = '["agriculture"]' WHERE id = 'livestock';
UPDATE feature_toggles SET enabled_for_personas = '["agriculture"]' WHERE id = 'crops';
UPDATE feature_toggles SET enabled_for_personas = '["agriculture"]' WHERE id = 'weather';
UPDATE feature_toggles SET enabled_for_personas = '["construction", "electrical"]' WHERE id = 'permits';
UPDATE feature_toggles SET enabled_for_personas = '["construction", "electrical"]' WHERE id = 'estimates';
UPDATE feature_toggles SET enabled_for_personas = '["construction"]' WHERE id = 'crew';
UPDATE feature_toggles SET enabled_for_personas = '["construction"]' WHERE id = 'materials';
UPDATE feature_toggles SET enabled_for_personas = '["electrical"]' WHERE id = 'certifications';
UPDATE feature_toggles SET enabled_for_personas = '["electrical"]' WHERE id = 'service_calls';
UPDATE feature_toggles SET enabled_for_personas = '["medical"]' WHERE id = 'patients';
UPDATE feature_toggles SET enabled_for_personas = '["medical"]' WHERE id = 'medical_records';
UPDATE feature_toggles SET enabled_for_personas = '["transport", "delivery"]' WHERE id = 'fleet';
UPDATE feature_toggles SET enabled_for_personas = '["transport", "delivery"]' WHERE id = 'fuel_tracking';
UPDATE feature_toggles SET enabled_for_personas = '["transport"]' WHERE id = 'cmr_documents';
UPDATE feature_toggles SET enabled_for_personas = '["transport", "delivery"]' WHERE id = 'dispatch';
UPDATE feature_toggles SET enabled_for_personas = '["delivery", "ecommerce"]' WHERE id = 'delivery_proof';
UPDATE feature_toggles SET enabled_for_personas = '["retail", "ecommerce"]' WHERE id = 'orders';
UPDATE feature_toggles SET enabled_for_personas = '["beauty", "services", "horeca"]' WHERE id = 'clients';

-- Create company_feature_overrides table if not exists
CREATE TABLE IF NOT EXISTS company_feature_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature_id VARCHAR(100) NOT NULL REFERENCES feature_toggles(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    enabled_by UUID REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, feature_id)
);

-- Create feature_usage_log table if not exists
CREATE TABLE IF NOT EXISTS feature_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL DEFAULT 'accessed',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_company ON feature_usage_log(company_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage_log(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_created ON feature_usage_log(created_at);

-- Add subscription_tier to companies if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE companies ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
    END IF;
END $$;

-- Set test company to starter tier so features work
UPDATE companies SET subscription_tier = 'starter' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

SELECT 'Feature-persona mappings seeded successfully!' as result;
