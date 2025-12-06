-- Migration: Persona-Specific Navigation System
-- Navigation items that adapt based on company persona

-- Navigation items registry
CREATE TABLE IF NOT EXISTS navigation_items (
    id VARCHAR(100) PRIMARY KEY,
    name_ro VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    icon VARCHAR(100), -- Icon name or emoji
    href VARCHAR(255) NOT NULL, -- Route path
    parent_id VARCHAR(100) REFERENCES navigation_items(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_section BOOLEAN DEFAULT false, -- Is this a section header?
    badge_source VARCHAR(255), -- API endpoint for badge count
    required_feature VARCHAR(100), -- Feature toggle required
    required_tier VARCHAR(50) DEFAULT 'free',
    enabled_for_personas JSONB DEFAULT '[]', -- Empty = all personas
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persona navigation layouts (which items and in what order)
CREATE TABLE IF NOT EXISTS persona_navigation_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id VARCHAR(100) NOT NULL,
    items JSONB NOT NULL, -- Array of {item_id, sort_order, is_visible}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(persona_id)
);

-- User favorites (pinned items)
CREATE TABLE IF NOT EXISTS user_navigation_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL REFERENCES navigation_items(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, company_id, item_id)
);

-- User recent items
CREATE TABLE IF NOT EXISTS user_navigation_recent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL REFERENCES navigation_items(id) ON DELETE CASCADE,
    visited_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, company_id, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nav_items_parent ON navigation_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_nav_items_sort ON navigation_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_nav_favorites_user ON user_navigation_favorites(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_nav_recent_user ON user_navigation_recent(user_id, company_id);

-- Seed: Core navigation items (available to all personas)
INSERT INTO navigation_items (id, name_ro, name_en, icon, href, sort_order, enabled_for_personas)
VALUES
    ('dashboard', 'Dashboard', 'Dashboard', 'home', '/dashboard', 0, '[]'),
    ('invoices', 'Facturi', 'Invoices', 'file-text', '/invoices', 10, '[]'),
    ('expenses', 'Cheltuieli', 'Expenses', 'credit-card', '/expenses', 20, '[]'),
    ('contacts', 'Contacte', 'Contacts', 'users', '/contacts', 30, '[]'),
    ('reports', 'Rapoarte', 'Reports', 'bar-chart', '/reports', 100, '[]'),
    ('settings', 'Setări', 'Settings', 'settings', '/settings', 200, '[]')
ON CONFLICT (id) DO UPDATE SET
    name_ro = EXCLUDED.name_ro,
    name_en = EXCLUDED.name_en;

-- Seed: Construction/Trades specific items
INSERT INTO navigation_items (id, name_ro, name_en, icon, href, sort_order, enabled_for_personas, required_tier)
VALUES
    ('estimates', 'Devize', 'Estimates', 'calculator', '/estimates', 40,
     '["construction_contractor", "electrical_contractor", "general_trades"]', 'starter'),
    ('projects', 'Proiecte', 'Projects', 'folder', '/projects', 50,
     '["construction_contractor", "electrical_contractor", "general_trades", "consultant", "freelancer"]', 'starter'),
    ('materials', 'Materiale', 'Materials', 'package', '/materials', 60,
     '["construction_contractor", "general_trades"]', 'starter'),
    ('crew', 'Echipă', 'Crew', 'hard-hat', '/crew', 70,
     '["construction_contractor", "electrical_contractor", "general_trades"]', 'professional'),
    ('service_calls', 'Intervenții', 'Service Calls', 'tool', '/service-calls', 45,
     '["electrical_contractor"]', 'starter')
ON CONFLICT (id) DO UPDATE SET
    name_ro = EXCLUDED.name_ro,
    name_en = EXCLUDED.name_en,
    enabled_for_personas = EXCLUDED.enabled_for_personas;

-- Seed: Delivery specific items
INSERT INTO navigation_items (id, name_ro, name_en, icon, href, sort_order, enabled_for_personas, required_tier)
VALUES
    ('routes', 'Rute', 'Routes', 'map', '/routes', 40,
     '["delivery_service", "courier_freelancer"]', 'starter'),
    ('drivers', 'Șoferi', 'Drivers', 'truck', '/drivers', 50,
     '["delivery_service"]', 'starter'),
    ('packages', 'Colete', 'Packages', 'box', '/packages', 60,
     '["delivery_service", "courier_freelancer"]', 'free'),
    ('fleet', 'Flotă', 'Fleet', 'truck', '/fleet', 70,
     '["delivery_service"]', 'professional')
ON CONFLICT (id) DO UPDATE SET
    name_ro = EXCLUDED.name_ro,
    name_en = EXCLUDED.name_en,
    enabled_for_personas = EXCLUDED.enabled_for_personas;

-- Seed: Retail specific items
INSERT INTO navigation_items (id, name_ro, name_en, icon, href, sort_order, enabled_for_personas, required_tier)
VALUES
    ('inventory', 'Inventar', 'Inventory', 'archive', '/inventory', 40,
     '["retail_shop", "ecommerce_seller"]', 'starter'),
    ('products', 'Produse', 'Products', 'tag', '/products', 50,
     '["retail_shop", "ecommerce_seller"]', 'free'),
    ('orders', 'Comenzi', 'Orders', 'shopping-cart', '/orders', 60,
     '["retail_shop", "ecommerce_seller"]', 'free')
ON CONFLICT (id) DO UPDATE SET
    name_ro = EXCLUDED.name_ro,
    name_en = EXCLUDED.name_en,
    enabled_for_personas = EXCLUDED.enabled_for_personas;

-- Seed: Freelancer/Consultant specific items
INSERT INTO navigation_items (id, name_ro, name_en, icon, href, sort_order, enabled_for_personas, required_tier)
VALUES
    ('time_tracking', 'Pontaj', 'Time Tracking', 'clock', '/time-tracking', 40,
     '["freelancer", "consultant"]', 'free'),
    ('clients', 'Clienți', 'Clients', 'briefcase', '/clients', 35,
     '["freelancer", "consultant", "professional_services"]', 'free')
ON CONFLICT (id) DO UPDATE SET
    name_ro = EXCLUDED.name_ro,
    name_en = EXCLUDED.name_en,
    enabled_for_personas = EXCLUDED.enabled_for_personas;

-- Seed: Sub-navigation items (children)
INSERT INTO navigation_items (id, name_ro, name_en, icon, href, parent_id, sort_order, enabled_for_personas)
VALUES
    ('invoices_list', 'Lista facturi', 'Invoice List', 'list', '/invoices', 'invoices', 0, '[]'),
    ('invoices_new', 'Factură nouă', 'New Invoice', 'plus', '/invoices/new', 'invoices', 1, '[]'),
    ('invoices_recurring', 'Facturi recurente', 'Recurring Invoices', 'repeat', '/invoices/recurring', 'invoices', 2, '[]'),
    ('expenses_list', 'Lista cheltuieli', 'Expense List', 'list', '/expenses', 'expenses', 0, '[]'),
    ('expenses_new', 'Cheltuială nouă', 'New Expense', 'plus', '/expenses/new', 'expenses', 1, '[]'),
    ('reports_income', 'Profit și pierdere', 'Profit & Loss', 'trending-up', '/reports/income', 'reports', 0, '[]'),
    ('reports_balance', 'Bilanț', 'Balance Sheet', 'pie-chart', '/reports/balance', 'reports', 1, '[]'),
    ('reports_tax', 'Raport TVA', 'VAT Report', 'file-text', '/reports/tax', 'reports', 2, '[]'),
    ('settings_company', 'Companie', 'Company', 'building', '/settings/company', 'settings', 0, '[]'),
    ('settings_users', 'Utilizatori', 'Users', 'users', '/settings/users', 'settings', 1, '[]'),
    ('settings_persona', 'Profil afacere', 'Business Profile', 'sliders', '/settings/persona', 'settings', 2, '[]'),
    ('settings_billing', 'Abonament', 'Subscription', 'credit-card', '/settings/billing', 'settings', 3, '[]')
ON CONFLICT (id) DO UPDATE SET
    name_ro = EXCLUDED.name_ro,
    name_en = EXCLUDED.name_en,
    parent_id = EXCLUDED.parent_id;

-- Comments
COMMENT ON TABLE navigation_items IS 'Registry of all navigation items';
COMMENT ON TABLE persona_navigation_layouts IS 'Default navigation order per persona';
COMMENT ON TABLE user_navigation_favorites IS 'User pinned/favorite navigation items';
COMMENT ON TABLE user_navigation_recent IS 'Recently visited navigation items per user';
