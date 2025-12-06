-- ============================================
-- Migration: ANAF Cache Table
-- Caches ANAF API responses for performance
-- ============================================

-- ANAF API cache table
CREATE TABLE IF NOT EXISTS anaf_cache (
    cui VARCHAR(20) PRIMARY KEY,
    data JSONB NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cleanup of old cache entries
CREATE INDEX IF NOT EXISTS idx_anaf_cache_cached_at ON anaf_cache(cached_at);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON anaf_cache TO accountech_app;
