-- Migration 013: Persona Analytics & Tracking
-- E1-US06: Track persona adoption and feature usage

-- Persona selection events (track when users select/change personas)
CREATE TABLE IF NOT EXISTS persona_selection_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    persona_id VARCHAR(50) NOT NULL,
    previous_persona_id VARCHAR(50),
    source VARCHAR(50) DEFAULT 'onboarding', -- onboarding, settings, recommendation
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature usage tracking
CREATE TABLE IF NOT EXISTS feature_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    persona_id VARCHAR(50) NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- view, create, update, delete, export
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated persona stats (updated periodically for dashboards)
CREATE TABLE IF NOT EXISTS persona_analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    persona_id VARCHAR(50) NOT NULL,
    total_companies INTEGER DEFAULT 0,
    new_selections INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    feature_usage JSONB DEFAULT '{}', -- {feature_key: count}
    UNIQUE(date, persona_id)
);

-- Feature popularity by persona (which features are most/least used)
CREATE TABLE IF NOT EXISTS persona_feature_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id VARCHAR(50) NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    first_used_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(persona_id, feature_key)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_persona_selection_company ON persona_selection_events(company_id);
CREATE INDEX IF NOT EXISTS idx_persona_selection_created ON persona_selection_events(created_at);
CREATE INDEX IF NOT EXISTS idx_persona_selection_persona ON persona_selection_events(persona_id);

CREATE INDEX IF NOT EXISTS idx_feature_usage_company ON feature_usage_events(company_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage_events(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_usage_persona ON feature_usage_events(persona_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_created ON feature_usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_action ON feature_usage_events(action);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON persona_analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_persona ON persona_analytics_daily(persona_id);

CREATE INDEX IF NOT EXISTS idx_feature_stats_persona ON persona_feature_stats(persona_id);
CREATE INDEX IF NOT EXISTS idx_feature_stats_usage ON persona_feature_stats(usage_count DESC);

-- View for quick persona adoption stats
CREATE OR REPLACE VIEW v_persona_adoption_stats AS
SELECT
    ps.persona_id,
    COUNT(DISTINCT ps.company_id) as total_companies,
    COUNT(DISTINCT CASE WHEN ps.created_at >= NOW() - INTERVAL '7 days' THEN ps.company_id END) as new_this_week,
    COUNT(DISTINCT CASE WHEN ps.created_at >= NOW() - INTERVAL '30 days' THEN ps.company_id END) as new_this_month
FROM persona_selection_events ps
WHERE ps.id = (
    SELECT id FROM persona_selection_events
    WHERE company_id = ps.company_id
    ORDER BY created_at DESC
    LIMIT 1
)
GROUP BY ps.persona_id;

-- View for feature usage by persona
CREATE OR REPLACE VIEW v_feature_usage_by_persona AS
SELECT
    persona_id,
    feature_key,
    COUNT(*) as total_usage,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT company_id) as unique_companies,
    MAX(created_at) as last_used
FROM feature_usage_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY persona_id, feature_key
ORDER BY persona_id, total_usage DESC;

-- View for unused features (features enabled but never used)
CREATE OR REPLACE VIEW v_unused_features_by_persona AS
SELECT
    p.id as persona_id,
    p.name_en as persona_name,
    pf.feature_key,
    pf.enabled
FROM personas p
CROSS JOIN LATERAL (
    SELECT key as feature_key, value::boolean as enabled
    FROM jsonb_each(COALESCE(p.default_features, '{}'::jsonb))
) pf
WHERE pf.enabled = true
AND NOT EXISTS (
    SELECT 1 FROM feature_usage_events fue
    WHERE fue.persona_id = p.id
    AND fue.feature_key = pf.feature_key
    AND fue.created_at >= NOW() - INTERVAL '30 days'
);

-- Function to record feature usage
CREATE OR REPLACE FUNCTION record_feature_usage(
    p_company_id UUID,
    p_user_id UUID,
    p_persona_id VARCHAR(50),
    p_feature_key VARCHAR(100),
    p_action VARCHAR(50),
    p_metadata JSONB DEFAULT '{}'
) RETURNS void AS $$
BEGIN
    -- Insert event
    INSERT INTO feature_usage_events (company_id, user_id, persona_id, feature_key, action, metadata)
    VALUES (p_company_id, p_user_id, p_persona_id, p_feature_key, p_action, p_metadata);

    -- Update stats
    INSERT INTO persona_feature_stats (persona_id, feature_key, usage_count, unique_users, last_used_at)
    VALUES (p_persona_id, p_feature_key, 1, 1, NOW())
    ON CONFLICT (persona_id, feature_key) DO UPDATE SET
        usage_count = persona_feature_stats.usage_count + 1,
        last_used_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate daily stats (run via cron)
CREATE OR REPLACE FUNCTION aggregate_persona_analytics_daily() RETURNS void AS $$
DECLARE
    v_date DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    -- For each persona, calculate daily stats
    INSERT INTO persona_analytics_daily (date, persona_id, total_companies, new_selections, active_users, feature_usage)
    SELECT
        v_date,
        cps.persona_id,
        COUNT(DISTINCT cps.company_id) as total_companies,
        (SELECT COUNT(*) FROM persona_selection_events pse
         WHERE pse.persona_id = cps.persona_id
         AND DATE(pse.created_at) = v_date) as new_selections,
        (SELECT COUNT(DISTINCT user_id) FROM feature_usage_events fue
         WHERE fue.persona_id = cps.persona_id
         AND DATE(fue.created_at) = v_date) as active_users,
        (SELECT jsonb_object_agg(feature_key, usage_count)
         FROM (
             SELECT feature_key, COUNT(*) as usage_count
             FROM feature_usage_events fue
             WHERE fue.persona_id = cps.persona_id
             AND DATE(fue.created_at) = v_date
             GROUP BY feature_key
         ) sub) as feature_usage
    FROM company_persona_settings cps
    GROUP BY cps.persona_id
    ON CONFLICT (date, persona_id) DO UPDATE SET
        total_companies = EXCLUDED.total_companies,
        new_selections = EXCLUDED.new_selections,
        active_users = EXCLUDED.active_users,
        feature_usage = EXCLUDED.feature_usage;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE persona_selection_events IS 'Track when companies select or change their persona';
COMMENT ON TABLE feature_usage_events IS 'Track individual feature usage events for analytics';
COMMENT ON TABLE persona_analytics_daily IS 'Aggregated daily analytics for dashboard performance';
COMMENT ON TABLE persona_feature_stats IS 'Running totals of feature usage by persona';
COMMENT ON FUNCTION record_feature_usage IS 'Helper function to record feature usage with auto-stats update';
