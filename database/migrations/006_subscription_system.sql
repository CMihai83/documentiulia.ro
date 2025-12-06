/**
 * Subscription System Migration
 *
 * Creates tables for subscription management:
 * - subscription_plans: Available subscription tiers
 * - user_subscriptions: Active/expired subscriptions
 * - subscription_invoices: Billing history
 * - subscription_features: Feature access control
 *
 * Created: 2025-01-21
 */

-- =====================================================
-- SUBSCRIPTION PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL UNIQUE,
    plan_slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price_monthly_ron DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_yearly_ron DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'RON',
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')) DEFAULT 'monthly',
    is_popular BOOLEAN DEFAULT false,
    max_users INTEGER DEFAULT 1,
    max_companies INTEGER DEFAULT 1,
    max_invoices_per_month INTEGER,
    max_storage_gb INTEGER DEFAULT 1,
    features JSONB, -- Array of feature IDs/names
    is_active BOOLEAN DEFAULT true,
    trial_days INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_slug ON subscription_plans(plan_slug);

-- =====================================================
-- USER SUBSCRIPTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')) DEFAULT 'active',

    -- Billing details
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')) DEFAULT 'monthly',
    amount_paid DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RON',

    -- Subscription period
    started_at TIMESTAMP DEFAULT NOW(),
    trial_ends_at TIMESTAMP,
    current_period_start TIMESTAMP DEFAULT NOW(),
    current_period_end TIMESTAMP NOT NULL,
    canceled_at TIMESTAMP,
    ended_at TIMESTAMP,

    -- Payment details
    payment_method VARCHAR(50), -- 'card', 'bank_transfer', 'paypal'
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    last_payment_date TIMESTAMP,
    next_billing_date TIMESTAMP,

    -- Auto-renewal
    auto_renew BOOLEAN DEFAULT true,
    cancel_at_period_end BOOLEAN DEFAULT false,

    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_company ON user_subscriptions(company_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

-- =====================================================
-- SUBSCRIPTION INVOICES
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_invoices (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

    -- Invoice details
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE,

    -- Amounts
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RON',

    -- Status
    status VARCHAR(50) CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'refunded', 'void')) DEFAULT 'pending',

    -- Payment details
    payment_method VARCHAR(50),
    stripe_invoice_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    payment_url TEXT,

    -- Line items
    line_items JSONB, -- Array of items with description, quantity, price

    -- PDF
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP,

    -- Metadata
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_invoices_subscription ON subscription_invoices(subscription_id);
CREATE INDEX idx_subscription_invoices_user ON subscription_invoices(user_id);
CREATE INDEX idx_subscription_invoices_company ON subscription_invoices(company_id);
CREATE INDEX idx_subscription_invoices_status ON subscription_invoices(status);
CREATE INDEX idx_subscription_invoices_date ON subscription_invoices(invoice_date DESC);
CREATE INDEX idx_subscription_invoices_number ON subscription_invoices(invoice_number);

-- =====================================================
-- SUBSCRIPTION FEATURES
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_features (
    id SERIAL PRIMARY KEY,
    feature_name VARCHAR(100) NOT NULL UNIQUE,
    feature_key VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50), -- 'core', 'premium', 'enterprise'
    feature_type VARCHAR(50) CHECK (feature_type IN ('boolean', 'limit', 'quota')) DEFAULT 'boolean',
    default_value JSONB, -- For limits/quotas
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_features_key ON subscription_features(feature_key);
CREATE INDEX idx_subscription_features_category ON subscription_features(category);

-- =====================================================
-- PLAN FEATURES (Many-to-Many)
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_features (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    feature_id INTEGER NOT NULL REFERENCES subscription_features(id) ON DELETE CASCADE,
    feature_value JSONB, -- Override value for this plan (limits, quotas)
    is_included BOOLEAN DEFAULT true,
    UNIQUE(plan_id, feature_id)
);

CREATE INDEX idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX idx_plan_features_feature ON plan_features(feature_id);

-- =====================================================
-- SUBSCRIPTION USAGE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_usage (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    last_reset_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(subscription_id, feature_key, period_start)
);

CREATE INDEX idx_subscription_usage_subscription ON subscription_usage(subscription_id);
CREATE INDEX idx_subscription_usage_period ON subscription_usage(period_start, period_end);

-- =====================================================
-- DISCOUNT CODES / COUPONS
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Discount details
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount')) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RON',

    -- Validity
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    max_redemptions INTEGER,
    times_redeemed INTEGER DEFAULT 0,

    -- Restrictions
    applies_to_plans INTEGER[], -- Array of plan IDs
    minimum_amount DECIMAL(10, 2),
    first_time_only BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_coupons_code ON subscription_coupons(code);
CREATE INDEX idx_subscription_coupons_active ON subscription_coupons(is_active);

-- =====================================================
-- COUPON REDEMPTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES subscription_coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    invoice_id INTEGER REFERENCES subscription_invoices(id) ON DELETE SET NULL,
    discount_applied DECIMAL(10, 2) NOT NULL,
    redeemed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_user ON coupon_redemptions(user_id);

-- =====================================================
-- INSERT DEFAULT SUBSCRIPTION PLANS
-- =====================================================

INSERT INTO subscription_plans (
    plan_name, plan_slug, description,
    price_monthly_ron, price_yearly_ron,
    is_popular, max_users, max_companies, max_invoices_per_month, max_storage_gb,
    features, sort_order
) VALUES
(
    'Free',
    'free',
    'Perfect pentru freelanceri și afaceri mici care tocmai încep',
    0,
    0,
    false,
    1,
    1,
    10,
    1,
    '["basic_invoicing", "expense_tracking", "basic_reports"]'::jsonb,
    1
),
(
    'Starter',
    'starter',
    'Ideal pentru antreprenori și PFA-uri care vor să-și profisionalizeze gestiunea financiară',
    49,
    490,
    false,
    1,
    1,
    50,
    5,
    '["unlimited_invoices", "expense_tracking", "basic_reports", "fiscal_ai_assistant", "decision_trees", "email_support"]'::jsonb,
    2
),
(
    'Professional',
    'professional',
    'Pentru afaceri în creștere care necesită instrumente avansate de gestiune',
    99,
    990,
    true,
    3,
    1,
    200,
    20,
    '["unlimited_invoices", "expense_tracking", "advanced_reports", "fiscal_ai_assistant", "decision_trees", "inventory_management", "crm_system", "bank_integration", "receipt_ocr", "priority_support", "courses_access"]'::jsonb,
    3
),
(
    'Business',
    'business',
    'Soluția completă pentru companii medii cu nevoi complexe',
    199,
    1990,
    false,
    10,
    3,
    NULL, -- unlimited
    100,
    '["unlimited_invoices", "expense_tracking", "advanced_reports", "fiscal_ai_assistant", "decision_trees", "inventory_management", "crm_system", "bank_integration", "receipt_ocr", "project_management", "time_tracking", "custom_integrations", "dedicated_support", "courses_access", "white_label"]'::jsonb,
    4
)
ON CONFLICT (plan_slug) DO NOTHING;

-- =====================================================
-- INSERT DEFAULT FEATURES
-- =====================================================

INSERT INTO subscription_features (feature_name, feature_key, description, category, feature_type, default_value) VALUES
('Facturi nelimitate', 'unlimited_invoices', 'Creați un număr nelimitat de facturi', 'core', 'boolean', 'true'::jsonb),
('Urmărire cheltuieli', 'expense_tracking', 'Monitorizați toate cheltuielile afacerii', 'core', 'boolean', 'true'::jsonb),
('Rapoarte de bază', 'basic_reports', 'Rapoarte financiare simple', 'core', 'boolean', 'true'::jsonb),
('Rapoarte avansate', 'advanced_reports', 'Rapoarte financiare detaliate și analize', 'premium', 'boolean', 'false'::jsonb),
('Asistent fiscal AI', 'fiscal_ai_assistant', 'Consultanță fiscală automată cu AI', 'premium', 'boolean', 'false'::jsonb),
('Arbori decizionali', 'decision_trees', 'Ghiduri interactive pentru decizii fiscale', 'premium', 'boolean', 'false'::jsonb),
('Gestiune stocuri', 'inventory_management', 'Sistem complet de gestiune a stocurilor', 'premium', 'boolean', 'false'::jsonb),
('Sistem CRM', 'crm_system', 'Gestionarea relațiilor cu clienții', 'premium', 'boolean', 'false'::jsonb),
('Integrare bancară', 'bank_integration', 'Sincronizare automată cu conturile bancare', 'premium', 'boolean', 'false'::jsonb),
('OCR chitanțe', 'receipt_ocr', 'Scanare automată a chitanțelor cu OCR', 'premium', 'boolean', 'false'::jsonb),
('Management proiecte', 'project_management', 'Urmărire proiecte și taskuri', 'enterprise', 'boolean', 'false'::jsonb),
('Time tracking', 'time_tracking', 'Monitorizare timp lucrat pe proiecte', 'enterprise', 'boolean', 'false'::jsonb),
('Acces cursuri', 'courses_access', 'Acces la toate cursurile educaționale', 'premium', 'boolean', 'false'::jsonb),
('Suport prioritar', 'priority_support', 'Răspunsuri în max 4 ore lucrătoare', 'premium', 'boolean', 'false'::jsonb),
('Suport dedicat', 'dedicated_support', 'Account manager dedicat', 'enterprise', 'boolean', 'false'::jsonb),
('Integrări personalizate', 'custom_integrations', 'API custom și integrări pe măsură', 'enterprise', 'boolean', 'false'::jsonb),
('White label', 'white_label', 'Personalizare completă cu brandul tău', 'enterprise', 'boolean', 'false'::jsonb),
('Limită facturi/lună', 'invoice_limit', 'Număr maxim de facturi pe lună', 'core', 'limit', '{"limit": 10}'::jsonb),
('Spațiu stocare (GB)', 'storage_limit', 'Spațiu pentru documente și atașamente', 'core', 'quota', '{"quota": 1}'::jsonb),
('Utilizatori', 'user_limit', 'Număr de utilizatori în cont', 'core', 'limit', '{"limit": 1}'::jsonb),
('Companii', 'company_limit', 'Număr de companii gestionate', 'core', 'limit', '{"limit": 1}'::jsonb)
ON CONFLICT (feature_key) DO NOTHING;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_plans_timestamp
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_timestamp();

CREATE TRIGGER trigger_update_user_subscriptions_timestamp
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_timestamp();

CREATE TRIGGER trigger_update_subscription_invoices_timestamp
    BEFORE UPDATE ON subscription_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_timestamp();

CREATE TRIGGER trigger_update_subscription_usage_timestamp
    BEFORE UPDATE ON subscription_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_timestamp();

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'SUB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_invoice_number
    BEFORE INSERT ON subscription_invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE subscription_plans IS 'Available subscription tiers with pricing and features';
COMMENT ON TABLE user_subscriptions IS 'Active and historical user subscriptions';
COMMENT ON TABLE subscription_invoices IS 'Billing invoices for subscriptions';
COMMENT ON TABLE subscription_features IS 'Available platform features';
COMMENT ON TABLE plan_features IS 'Features included in each subscription plan';
COMMENT ON TABLE subscription_usage IS 'Track usage against quota limits';
COMMENT ON TABLE subscription_coupons IS 'Discount codes and promotional offers';
COMMENT ON TABLE coupon_redemptions IS 'History of coupon usage';

COMMENT ON COLUMN user_subscriptions.status IS 'active: Currently active | trialing: In trial period | past_due: Payment failed | canceled: User canceled | expired: Subscription ended';
COMMENT ON COLUMN subscription_invoices.status IS 'draft: Not yet sent | pending: Awaiting payment | paid: Payment received | failed: Payment failed | refunded: Refunded to customer | void: Canceled';
COMMENT ON COLUMN subscription_features.feature_type IS 'boolean: Simple on/off | limit: Hard limit (e.g., max invoices) | quota: Consumable resource (e.g., storage)';
