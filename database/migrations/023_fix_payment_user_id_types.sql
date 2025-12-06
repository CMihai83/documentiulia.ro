-- Fix user_id type mismatch in payment infrastructure tables
-- users.id is UUID but payment tables have INTEGER user_id

BEGIN;

-- Drop and recreate payment_intents with correct user_id type
DROP TABLE IF EXISTS course_purchases CASCADE;
DROP TABLE IF EXISTS payment_intents CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS recurring_invoices CASCADE;
DROP TABLE IF EXISTS payment_reminders CASCADE;

-- Recreate payment_intents with UUID user_id
CREATE TABLE payment_intents (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    company_id INTEGER,
    payment_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    stripe_session_id VARCHAR(255),
    stripe_payment_intent VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_intents_user ON payment_intents(user_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_stripe_session ON payment_intents(stripe_session_id);

-- Recreate subscriptions with UUID user_id
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Recreate course_purchases with UUID user_id
CREATE TABLE course_purchases (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL,
    payment_intent_id INTEGER REFERENCES payment_intents(id),
    amount_paid DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    access_granted_at TIMESTAMP,
    access_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_course_purchases_user ON course_purchases(user_id);
CREATE INDEX idx_course_purchases_course ON course_purchases(course_id);

-- Recreate recurring_invoices with UUID user_id and invoice_id
CREATE TABLE recurring_invoices (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    subscription_id INTEGER REFERENCES subscriptions(id),
    invoice_id UUID REFERENCES invoices(id),
    frequency VARCHAR(20) NOT NULL,
    next_invoice_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recurring_invoices_user ON recurring_invoices(user_id);
CREATE INDEX idx_recurring_invoices_next_date ON recurring_invoices(next_invoice_date);

-- Recreate payment_reminders with UUID user_id and invoice_id
CREATE TABLE payment_reminders (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    reminder_stage INTEGER NOT NULL DEFAULT 1,
    sent_at TIMESTAMP,
    next_reminder_at TIMESTAMP,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_reminders_invoice ON payment_reminders(invoice_id);
CREATE INDEX idx_payment_reminders_next ON payment_reminders(next_reminder_at);

COMMIT;
