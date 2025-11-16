-- MIGRATION 022: Payment Infrastructure
-- Stripe integration, payment intents, webhook logs, subscriptions
-- Created: 2025-11-16

BEGIN;

-- Payment intents table
CREATE TABLE IF NOT EXISTS payment_intents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER, -- References users(id) but no FK for flexibility
    company_id INTEGER, -- References companies(id) for invoice payments
    payment_type VARCHAR(50) NOT NULL, -- 'course', 'subscription', 'invoice'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, failed, canceled
    stripe_session_id VARCHAR(255),
    stripe_payment_intent VARCHAR(255),
    metadata JSONB, -- Additional context (course_id, invoice_id, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_intents_user ON payment_intents(user_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_stripe_session ON payment_intents(stripe_session_id);

-- Stripe webhook logs
CREATE TABLE IF NOT EXISTS stripe_webhook_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_logs_event_type ON stripe_webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_processed ON stripe_webhook_logs(processed);
CREATE INDEX idx_webhook_logs_created ON stripe_webhook_logs(created_at);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan_id VARCHAR(50) NOT NULL, -- 'basic', 'premium', 'enterprise'
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, canceled, past_due, paused
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    next_billing_date DATE,
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, yearly
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_key VARCHAR(50) UNIQUE NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2),
    price_quarterly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    features JSONB, -- Array of features
    max_companies INTEGER DEFAULT 1,
    max_users_per_company INTEGER DEFAULT 5,
    max_invoices_per_month INTEGER,
    ai_queries_per_month INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO subscription_plans (plan_key, plan_name, description, price_monthly, price_quarterly, price_yearly, features, max_companies, max_users_per_company, max_invoices_per_month, ai_queries_per_month)
VALUES
('free', 'Free', 'Get started with basic features', 0, 0, 0, '["5 invoices/month", "Basic reports", "1 user"]', 1, 1, 5, 10),
('basic', 'Basic', 'For freelancers and small businesses', 19, 49, 180, '["Unlimited invoices", "Standard reports", "5 users", "Email support"]', 1, 5, NULL, 100),
('premium', 'Premium', 'For growing businesses', 49, 129, 480, '["All Basic features", "Advanced AI insights", "15 users", "Bank integration", "Priority support"]', 3, 15, NULL, 500),
('enterprise', 'Enterprise', 'For large organizations', 149, 399, 1500, '["All Premium features", "Unlimited users", "Custom integrations", "Dedicated support", "Custom AI models"]', NULL, NULL, NULL, NULL);

-- Recurring invoices
CREATE TABLE IF NOT EXISTS recurring_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    invoice_template_id INTEGER, -- Reference to a template invoice
    frequency VARCHAR(20) NOT NULL, -- monthly, quarterly, yearly, custom
    interval_days INTEGER, -- For custom frequency
    start_date DATE NOT NULL,
    end_date DATE,
    next_invoice_date DATE NOT NULL,
    last_generated_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    template_data JSONB NOT NULL, -- Invoice line items, terms, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recurring_invoices_company ON recurring_invoices(company_id);
CREATE INDEX idx_recurring_invoices_next_date ON recurring_invoices(next_invoice_date);
CREATE INDEX idx_recurring_invoices_active ON recurring_invoices(is_active);

-- Payment reminders
CREATE TABLE IF NOT EXISTS payment_reminders (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL,
    reminder_type VARCHAR(50) NOT NULL, -- before_due, on_due, overdue_7, overdue_14, overdue_30
    scheduled_date DATE NOT NULL,
    sent_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    email_to VARCHAR(255),
    email_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX idx_payment_reminders_scheduled ON payment_reminders(scheduled_date);
CREATE INDEX idx_payment_reminders_status ON payment_reminders(status);

-- Course purchases (track paid enrollments)
CREATE TABLE IF NOT EXISTS course_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    payment_intent_id INTEGER REFERENCES payment_intents(id),
    amount_paid DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_course_purchases_user ON course_purchases(user_id);
CREATE INDEX idx_course_purchases_course ON course_purchases(course_id);

COMMIT;
