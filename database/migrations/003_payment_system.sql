-- =====================================================
-- PHASE 2: Payment System & Invoice Automation
-- Migration: 003_payment_system.sql
-- Date: 2025-11-21
-- Description: Creates tables for Stripe payments, course enrollments, and subscriptions
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PAYMENT TRANSACTIONS LOG
-- Tracks all payment attempts and completions
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status: pending, completed, failed, refunded
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
    provider_session_id VARCHAR(255),
    payment_intent_id VARCHAR(255),
    metadata JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    -- Indexes for performance
    CONSTRAINT chk_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_company ON payment_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_session ON payment_transactions(provider_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);

COMMENT ON TABLE payment_transactions IS 'Logs all payment transactions from Stripe and other providers';

-- =====================================================
-- COURSE ENROLLMENTS
-- Tracks user enrollments in courses
-- =====================================================
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'free',
    -- Status: free, pending, paid, refunded
    payment_amount DECIMAL(15,2),
    payment_provider VARCHAR(50),
    payment_transaction_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    -- Status: active, completed, cancelled, expired
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_accessed_at TIMESTAMP,
    completion_date TIMESTAMP,
    certificate_issued_at TIMESTAMP,
    certificate_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(user_id, course_id),
    CONSTRAINT chk_enrollment_payment_status CHECK (payment_status IN ('free', 'pending', 'paid', 'refunded')),
    CONSTRAINT chk_enrollment_status CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
    CONSTRAINT chk_enrollment_progress CHECK (progress_percentage BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_payment ON course_enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_created ON course_enrollments(created_at DESC);

COMMENT ON TABLE course_enrollments IS 'Tracks user enrollments and progress in courses';

-- =====================================================
-- SUBSCRIPTION PLANS
-- Defines available subscription tiers
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'month',
    -- Interval: day, week, month, year
    billing_interval_count INTEGER DEFAULT 1,
    trial_period_days INTEGER DEFAULT 0,
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    features JSONB,
    -- JSON array of features: ["feature1", "feature2"]
    max_users INTEGER,
    max_companies INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_plan_price CHECK (price >= 0),
    CONSTRAINT chk_plan_interval CHECK (billing_interval IN ('day', 'week', 'month', 'year')),
    CONSTRAINT chk_plan_interval_count CHECK (billing_interval_count > 0)
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);

COMMENT ON TABLE subscription_plans IS 'Defines subscription plan tiers and pricing';

-- =====================================================
-- SUBSCRIPTIONS
-- Tracks active user subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- Status: active, cancelled, past_due, trialing, incomplete, incomplete_expired, unpaid
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_subscription_status CHECK (status IN (
        'active', 'cancelled', 'past_due', 'trialing',
        'incomplete', 'incomplete_expired', 'unpaid'
    ))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

COMMENT ON TABLE subscriptions IS 'Tracks active and historical subscriptions';

-- =====================================================
-- ALTER EXISTING TABLES
-- Add payment-related columns to existing tables
-- =====================================================

-- Add payment link to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_link TEXT,
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_invoices_last_sent ON invoices(last_sent_at);

COMMENT ON COLUMN invoices.payment_link IS 'Stripe checkout URL for online payment';
COMMENT ON COLUMN invoices.last_sent_at IS 'Timestamp when invoice was last emailed';

-- Add payment tracking to courses
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_purchasable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enrollment_count INTEGER DEFAULT 0;

COMMENT ON COLUMN courses.stripe_product_id IS 'Stripe product ID for this course';

-- =====================================================
-- INSERT DEFAULT SUBSCRIPTION PLANS
-- Starter plans for the platform
-- =====================================================
INSERT INTO subscription_plans (name, slug, description, price, billing_interval, features, max_users, is_active, is_featured, sort_order)
VALUES
    (
        'Starter',
        'starter',
        'Perfect for freelancers and small businesses',
        19.00,
        'month',
        '["5 users", "Basic invoicing", "Expense tracking", "Email support"]'::jsonb,
        5,
        true,
        false,
        1
    ),
    (
        'Professional',
        'professional',
        'For growing businesses with advanced needs',
        49.00,
        'month',
        '["15 users", "Advanced invoicing", "Inventory management", "CRM", "Priority support", "Bank integration"]'::jsonb,
        15,
        true,
        true,
        2
    ),
    (
        'Enterprise',
        'enterprise',
        'For large organizations with custom requirements',
        149.00,
        'month',
        '["Unlimited users", "All features", "Custom integrations", "Dedicated support", "SLA guarantee", "Custom training"]'::jsonb,
        NULL,
        true,
        false,
        3
    )
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Active subscriptions summary
CREATE OR REPLACE VIEW v_active_subscriptions AS
SELECT
    s.id,
    s.user_id,
    s.company_id,
    sp.name as plan_name,
    sp.price as monthly_price,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    CASE
        WHEN s.current_period_end < NOW() THEN 'expired'
        WHEN s.trial_end > NOW() THEN 'trial'
        ELSE s.status
    END as effective_status
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status IN ('active', 'trialing', 'past_due')
ORDER BY s.created_at DESC;

COMMENT ON VIEW v_active_subscriptions IS 'Shows all active subscriptions with plan details';

-- Monthly recurring revenue (MRR) calculation
CREATE OR REPLACE VIEW v_mrr_summary AS
SELECT
    DATE_TRUNC('month', s.created_at) as month,
    COUNT(DISTINCT s.id) as active_subscriptions,
    SUM(sp.price) as total_mrr,
    AVG(sp.price) as avg_price_per_subscription
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status IN ('active', 'trialing')
GROUP BY DATE_TRUNC('month', s.created_at)
ORDER BY month DESC;

COMMENT ON VIEW v_mrr_summary IS 'Monthly recurring revenue summary';

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for course_enrollments
DROP TRIGGER IF EXISTS update_course_enrollments_updated_at ON course_enrollments;
CREATE TRIGGER update_course_enrollments_updated_at
    BEFORE UPDATE ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for subscription_plans
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_transactions TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON course_enrollments TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_plans TO accountech_app;
GRANT SELECT ON v_active_subscriptions TO accountech_app;
GRANT SELECT ON v_mrr_summary TO accountech_app;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Insert migration record
INSERT INTO schema_migrations (version, description, executed_at)
VALUES ('003', 'Payment system and invoice automation', NOW())
ON CONFLICT (version) DO NOTHING;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 003_payment_system.sql completed successfully';
    RAISE NOTICE '   - Created payment_transactions table';
    RAISE NOTICE '   - Created course_enrollments table';
    RAISE NOTICE '   - Created subscription_plans table (with 3 default plans)';
    RAISE NOTICE '   - Created subscriptions table';
    RAISE NOTICE '   - Added payment columns to invoices and courses';
    RAISE NOTICE '   - Created analytics views';
    RAISE NOTICE '   - System ready for Stripe integration';
END $$;
