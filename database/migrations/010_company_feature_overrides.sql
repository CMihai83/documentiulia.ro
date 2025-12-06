-- Migration: Company Feature Overrides Table
-- Allows per-company feature enable/disable overrides

-- Create company_feature_overrides table
CREATE TABLE IF NOT EXISTS company_feature_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature_id VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    reason VARCHAR(500),
    enabled_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    -- Unique constraint: one override per company per feature
    UNIQUE(company_id, feature_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_company_feature_overrides_company
    ON company_feature_overrides(company_id);
CREATE INDEX IF NOT EXISTS idx_company_feature_overrides_feature
    ON company_feature_overrides(feature_id);
CREATE INDEX IF NOT EXISTS idx_company_feature_overrides_active
    ON company_feature_overrides(company_id, feature_id)
    WHERE is_enabled = true;

-- Add subscription_tier to companies if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE companies ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free';
    END IF;
END $$;

-- Add feature usage tracking table
CREATE TABLE IF NOT EXISTS feature_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feature_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'accessed', 'blocked', 'upgrade_prompt'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_feature_usage_company_date
    ON feature_usage_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature
    ON feature_usage_log(feature_id, created_at DESC);

-- Comments
COMMENT ON TABLE company_feature_overrides IS 'Per-company feature toggle overrides';
COMMENT ON TABLE feature_usage_log IS 'Tracks feature access for analytics and upgrade prompts';
