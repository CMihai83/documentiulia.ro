-- Migration 015: ANAF CUI Validation Cache
-- E2-US07: ANAF CUI/CIF validation with caching

-- ANAF lookup cache table
CREATE TABLE IF NOT EXISTS anaf_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cui VARCHAR(20) NOT NULL UNIQUE,
    data JSONB NOT NULL,
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_anaf_cache_cui ON anaf_cache(cui);
CREATE INDEX IF NOT EXISTS idx_anaf_cache_cached_at ON anaf_cache(cached_at);

-- CUI validation history (for auditing)
CREATE TABLE IF NOT EXISTS cui_validation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    cui VARCHAR(20) NOT NULL,
    normalized_cui VARCHAR(20) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    anaf_queried BOOLEAN DEFAULT false,
    validation_result JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for validation history
CREATE INDEX IF NOT EXISTS idx_cui_history_user ON cui_validation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cui_history_company ON cui_validation_history(company_id);
CREATE INDEX IF NOT EXISTS idx_cui_history_cui ON cui_validation_history(cui);
CREATE INDEX IF NOT EXISTS idx_cui_history_created ON cui_validation_history(created_at);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_anaf_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS trigger_update_anaf_cache_timestamp ON anaf_cache;
CREATE TRIGGER trigger_update_anaf_cache_timestamp
    BEFORE UPDATE ON anaf_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_anaf_cache_updated_at();

-- Function to clean old cache entries (older than 7 days)
CREATE OR REPLACE FUNCTION clean_old_anaf_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM anaf_cache WHERE cached_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE anaf_cache IS 'Cache for ANAF CUI/CIF validation API responses';
COMMENT ON TABLE cui_validation_history IS 'Audit log for CUI validation requests';
COMMENT ON FUNCTION clean_old_anaf_cache IS 'Removes cache entries older than 7 days';
