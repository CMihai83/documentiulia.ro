-- =====================================================
-- SPRINT 1 MIGRATION: Persona System Core
-- Story: E1-US01 - Database Schema for Personas
-- Date: 2025-11-29
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: business_personas
-- Master list of all supported business personas
-- =====================================================
CREATE TABLE IF NOT EXISTS business_personas (
    id VARCHAR(50) PRIMARY KEY,
    name_ro VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description_ro TEXT,
    description_en TEXT,
    icon VARCHAR(50) DEFAULT 'briefcase',
    color VARCHAR(20) DEFAULT '#3B82F6',
    category VARCHAR(50), -- construction, services, retail, hospitality, etc.

    -- Feature configuration
    default_features JSONB DEFAULT '[]',
    dashboard_layout JSONB DEFAULT '{}',
    navigation_config JSONB DEFAULT '{}',
    onboarding_steps JSONB DEFAULT '[]',

    -- Quiz matching keywords (for "help me choose" feature)
    quiz_keywords JSONB DEFAULT '[]',

    -- Pricing tier defaults
    recommended_tier VARCHAR(20) DEFAULT 'starter',

    -- Status
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: company_persona_settings
-- Links companies to their selected persona with customizations
-- =====================================================
CREATE TABLE IF NOT EXISTS company_persona_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    persona_id VARCHAR(50) NOT NULL REFERENCES business_personas(id),

    -- Customizations
    custom_features JSONB DEFAULT '{}',
    custom_dashboard JSONB DEFAULT '{}',
    custom_navigation JSONB DEFAULT '{}',

    -- Onboarding progress
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    onboarding_dismissed BOOLEAN DEFAULT false,
    completed_steps JSONB DEFAULT '[]',

    -- How they selected the persona
    selection_method VARCHAR(30) DEFAULT 'manual', -- manual, quiz, recommended
    quiz_score DECIMAL(5,2),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One persona per company
    UNIQUE(company_id)
);

-- =====================================================
-- TABLE: feature_toggles
-- Master list of all platform features with persona/tier access
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_toggles (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- core, vertical, premium, regional

    -- Access control
    enabled_for_personas JSONB DEFAULT '[]', -- Empty means all personas
    required_tier VARCHAR(20) DEFAULT 'starter', -- starter, growth, professional

    -- Regional restrictions
    enabled_for_countries JSONB DEFAULT '[]', -- Empty means all countries

    -- Feature flags
    is_active BOOLEAN DEFAULT true,
    is_beta BOOLEAN DEFAULT false,
    requires_setup BOOLEAN DEFAULT false,

    -- UI hints
    upgrade_prompt_ro TEXT,
    upgrade_prompt_en TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: persona_feature_access
-- Explicit mapping of which features each persona gets
-- =====================================================
CREATE TABLE IF NOT EXISTS persona_feature_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona_id VARCHAR(50) NOT NULL REFERENCES business_personas(id) ON DELETE CASCADE,
    feature_id VARCHAR(100) NOT NULL REFERENCES feature_toggles(id) ON DELETE CASCADE,

    -- Access level
    is_enabled BOOLEAN DEFAULT true,
    is_default_visible BOOLEAN DEFAULT true, -- Show in navigation by default
    priority INT DEFAULT 5, -- 1-10, higher = more prominent

    -- Customization
    custom_label_ro VARCHAR(100),
    custom_label_en VARCHAR(100),
    custom_icon VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(persona_id, feature_id)
);

-- =====================================================
-- TABLE: persona_dashboard_widgets
-- Widget configurations for each persona's dashboard
-- =====================================================
CREATE TABLE IF NOT EXISTS persona_dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona_id VARCHAR(50) NOT NULL REFERENCES business_personas(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL, -- revenue_chart, expense_chart, quick_actions, etc.

    -- Widget configuration
    title_ro VARCHAR(100),
    title_en VARCHAR(100),
    widget_config JSONB DEFAULT '{}',
    data_source VARCHAR(100), -- API endpoint or data source

    -- Layout
    grid_position JSONB DEFAULT '{"x": 0, "y": 0, "w": 4, "h": 2}',
    display_order INT DEFAULT 0,

    -- Status
    is_default BOOLEAN DEFAULT true,
    is_removable BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: user_dashboard_customizations
-- User-specific dashboard customizations
-- =====================================================
CREATE TABLE IF NOT EXISTS user_dashboard_customizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Customizations
    widget_layout JSONB DEFAULT '[]',
    hidden_widgets JSONB DEFAULT '[]',
    custom_widgets JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, company_id)
);

-- =====================================================
-- TABLE: persona_onboarding_steps
-- Onboarding steps definition per persona
-- =====================================================
CREATE TABLE IF NOT EXISTS persona_onboarding_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    persona_id VARCHAR(50) NOT NULL REFERENCES business_personas(id) ON DELETE CASCADE,
    step_key VARCHAR(50) NOT NULL,

    -- Step content
    title_ro VARCHAR(200),
    title_en VARCHAR(200),
    description_ro TEXT,
    description_en TEXT,

    -- Step configuration
    step_type VARCHAR(30) DEFAULT 'action', -- action, info, setup, verification
    target_route VARCHAR(200), -- Where to navigate for this step
    completion_trigger VARCHAR(100), -- What completes this step

    -- Requirements
    is_required BOOLEAN DEFAULT false,
    is_skippable BOOLEAN DEFAULT true,
    estimated_minutes INT DEFAULT 5,

    -- Display
    icon VARCHAR(50),
    step_order INT DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(persona_id, step_key)
);

-- =====================================================
-- TABLE: user_onboarding_progress
-- Track each user's onboarding progress
-- =====================================================
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES persona_onboarding_steps(id) ON DELETE CASCADE,

    -- Progress
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, skipped
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    skipped_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, company_id, step_id)
);

-- =====================================================
-- TABLE: persona_quiz_questions
-- Questions for "Help me choose" persona quiz
-- =====================================================
CREATE TABLE IF NOT EXISTS persona_quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_ro TEXT NOT NULL,
    question_en TEXT NOT NULL,

    -- Options stored as JSONB array
    -- Each option: {value: string, label_ro: string, label_en: string, persona_weights: {persona_id: weight}}
    options JSONB NOT NULL DEFAULT '[]',

    -- Display
    question_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_company_persona_settings_company ON company_persona_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_company_persona_settings_persona ON company_persona_settings(persona_id);
CREATE INDEX IF NOT EXISTS idx_persona_feature_access_persona ON persona_feature_access(persona_id);
CREATE INDEX IF NOT EXISTS idx_persona_feature_access_feature ON persona_feature_access(feature_id);
CREATE INDEX IF NOT EXISTS idx_persona_dashboard_widgets_persona ON persona_dashboard_widgets(persona_id);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_customizations_user ON user_dashboard_customizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_progress_user ON user_onboarding_progress(user_id, company_id);

-- =====================================================
-- Add persona_id column to companies table (optional quick lookup)
-- =====================================================
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS persona_id VARCHAR(50) REFERENCES business_personas(id);

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS country_code CHAR(2) DEFAULT 'RO';

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS preferred_language CHAR(2) DEFAULT 'ro';

-- =====================================================
-- Triggers for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_business_personas_updated_at ON business_personas;
CREATE TRIGGER update_business_personas_updated_at
    BEFORE UPDATE ON business_personas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_persona_settings_updated_at ON company_persona_settings;
CREATE TRIGGER update_company_persona_settings_updated_at
    BEFORE UPDATE ON company_persona_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_dashboard_customizations_updated_at ON user_dashboard_customizations;
CREATE TRIGGER update_user_dashboard_customizations_updated_at
    BEFORE UPDATE ON user_dashboard_customizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT permissions
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON business_personas TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_persona_settings TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON feature_toggles TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON persona_feature_access TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON persona_dashboard_widgets TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_dashboard_customizations TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON persona_onboarding_steps TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_onboarding_progress TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON persona_quiz_questions TO accountech_app;

-- =====================================================
-- Migration complete
-- =====================================================
