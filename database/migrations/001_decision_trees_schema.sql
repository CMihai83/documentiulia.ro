-- ====================================================================
-- DOCUMENTIULIA DECISION TREE SYSTEM - DATABASE SCHEMA
-- ====================================================================
-- Purpose: Automated legislation updates + interactive decision trees
-- Author: AI-XYZ System
-- Date: 2025-11-15
-- ====================================================================

-- ====================================================================
-- 1. LEGISLATION SCRAPING & UPDATES
-- ====================================================================

-- Track legislation update history
CREATE TABLE IF NOT EXISTS legislation_updates_log (
    id SERIAL PRIMARY KEY,
    scrape_date TIMESTAMP NOT NULL DEFAULT NOW(),
    source_url VARCHAR(500) NOT NULL,
    articles_scraped INTEGER DEFAULT 0,
    articles_updated INTEGER DEFAULT 0,
    articles_new INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'success', -- success, failed, partial
    error_message TEXT,
    scrape_duration_seconds INTEGER,
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced fiscal_legislation table (add columns if not exist)
ALTER TABLE fiscal_legislation
    ADD COLUMN IF NOT EXISTS source_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS modification_date DATE, -- official modification date from lege5.ro
    ADD COLUMN IF NOT EXISTS effective_date DATE, -- when law becomes effective
    ADD COLUMN IF NOT EXISTS parent_law VARCHAR(100); -- parent law reference

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_fiscal_legislation_search
    ON fiscal_legislation USING gin(to_tsvector('romanian', title || ' ' || full_text));

CREATE INDEX IF NOT EXISTS idx_fiscal_legislation_category
    ON fiscal_legislation(category);

CREATE INDEX IF NOT EXISTS idx_fiscal_legislation_active
    ON fiscal_legislation(is_active);

-- ====================================================================
-- 2. DECISION TREE STRUCTURE
-- ====================================================================

-- Main decision trees (top-level categories)
CREATE TABLE IF NOT EXISTS decision_trees (
    id SERIAL PRIMARY KEY,
    tree_key VARCHAR(100) UNIQUE NOT NULL, -- accounting, fiscal, hr, audit, etc.
    tree_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- accounting, fiscal, hr, labor, commercial, audit
    icon VARCHAR(50), -- for UI display
    priority INTEGER DEFAULT 0, -- display order
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Decision tree nodes (questions in the tree)
CREATE TABLE IF NOT EXISTS decision_nodes (
    id SERIAL PRIMARY KEY,
    tree_id INTEGER REFERENCES decision_trees(id) ON DELETE CASCADE,
    node_key VARCHAR(100) UNIQUE NOT NULL, -- unique identifier for this node
    parent_node_id INTEGER REFERENCES decision_nodes(id) ON DELETE SET NULL, -- null = root node
    question TEXT NOT NULL, -- the question to ask user
    question_type VARCHAR(50) DEFAULT 'multiple_choice', -- multiple_choice, yes_no, numeric_input, text_input
    help_text TEXT, -- additional guidance
    examples JSONB, -- array of examples to help user understand
    display_order INTEGER DEFAULT 0,
    is_terminal BOOLEAN DEFAULT FALSE, -- true if this is a final answer node
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Decision paths (possible answers/transitions)
CREATE TABLE IF NOT EXISTS decision_paths (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES decision_nodes(id) ON DELETE CASCADE,
    path_key VARCHAR(100) NOT NULL, -- unique key for this path
    answer_option TEXT NOT NULL, -- the answer text (e.g., "Yes", "1-9 employees", etc.)
    next_node_id INTEGER REFERENCES decision_nodes(id) ON DELETE SET NULL, -- null = terminal answer
    legislation_refs JSONB, -- array of fiscal_legislation IDs
    answer_text TEXT, -- final answer if terminal node
    conditions JSONB, -- conditional logic (e.g., {"revenue": ">= 300000"})
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Terminal answers (final responses with legislation references)
CREATE TABLE IF NOT EXISTS decision_answers (
    id SERIAL PRIMARY KEY,
    path_id INTEGER REFERENCES decision_paths(id) ON DELETE CASCADE,
    answer_template TEXT NOT NULL, -- HTML template with placeholders
    legislation_articles JSONB, -- array of article references
    strategic_advice TEXT, -- business strategy recommendations
    related_obligations JSONB, -- related fiscal obligations (deadlines, forms, etc.)
    examples JSONB, -- practical examples
    warnings TEXT, -- important warnings/risks
    next_steps JSONB, -- actionable next steps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================================
-- 3. UNANSWERED QUESTIONS WORKFLOW
-- ====================================================================

-- Track questions that don't match decision trees
CREATE TABLE IF NOT EXISTS unanswered_questions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    user_context JSONB, -- fiscal context at time of question
    matched_tree_id INTEGER REFERENCES decision_trees(id), -- closest match
    similarity_score DECIMAL(5,2), -- 0-100 how close to existing trees
    status VARCHAR(50) DEFAULT 'pending', -- pending, ai_processing, human_review, answered, integrated
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    ai_generated_tree JSONB, -- AI-generated decision tree structure
    ai_confidence DECIMAL(5,2), -- AI confidence in generated tree
    human_reviewed_by UUID REFERENCES users(id),
    human_review_notes TEXT,
    approved_at TIMESTAMP,
    answer_sent_at TIMESTAMP,
    integrated_at TIMESTAMP, -- when tree was added to production
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User answers sent via in-app notification
CREATE TABLE IF NOT EXISTS unanswered_question_responses (
    id SERIAL PRIMARY KEY,
    unanswered_question_id INTEGER REFERENCES unanswered_questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    legislation_refs JSONB,
    generated_by VARCHAR(50), -- 'ai', 'human', 'hybrid'
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP,
    notification_read BOOLEAN DEFAULT FALSE,
    notification_read_at TIMESTAMP,
    user_feedback_rating INTEGER, -- 1-5 stars
    user_feedback_text TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- In-app notifications for users
CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'unanswered_question_response', 'legislation_update', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_id INTEGER, -- ID of related entity (e.g., unanswered_question_id)
    related_type VARCHAR(50), -- 'unanswered_question', 'legislation', etc.
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    action_url VARCHAR(500), -- URL to navigate when clicked
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON user_notifications(user_id, is_read);

-- ====================================================================
-- 4. TREE ANALYTICS & OPTIMIZATION
-- ====================================================================

-- Track user navigation through decision trees
CREATE TABLE IF NOT EXISTS decision_tree_analytics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tree_id INTEGER REFERENCES decision_trees(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    path_taken JSONB, -- array of node_ids traversed
    time_spent_seconds INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    abandoned_at_node_id INTEGER REFERENCES decision_nodes(id),
    final_answer_helpful BOOLEAN,
    user_rating INTEGER, -- 1-5 stars
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track most common paths for optimization
CREATE TABLE IF NOT EXISTS decision_path_popularity (
    id SERIAL PRIMARY KEY,
    path_id INTEGER REFERENCES decision_paths(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    avg_time_to_reach_seconds INTEGER,
    success_rate DECIMAL(5,2), -- % of users who found answer helpful
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================================
-- 5. SCRAPER CONFIGURATION & RATE LIMITING
-- ====================================================================

-- Scraper configuration
CREATE TABLE IF NOT EXISTS scraper_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default scraper config
INSERT INTO scraper_config (config_key, config_value, description) VALUES
    ('lege5_username', 'loredana.ciuca@tmdfriction.com', 'Lege5.ro login username'),
    ('lege5_password', 'tmdfriction', 'Lege5.ro login password (encrypt in production!)'),
    ('scrape_rate_limit_per_day', '3', 'Maximum legislation updates per day'),
    ('scrape_delay_seconds', '30', 'Delay between requests to avoid bot detection'),
    ('scrape_schedule_hour', '03', 'Hour of day to run scraper (3 AM)'),
    ('scrape_categories', '["fiscal", "accounting", "labor", "commercial", "audit"]', 'Categories to scrape'),
    ('user_agent_rotation', '["Mozilla/5.0...", "Chrome/..."]', 'Rotate user agents to avoid detection')
ON CONFLICT (config_key) DO NOTHING;

-- Rate limiting log
CREATE TABLE IF NOT EXISTS scraper_rate_limits (
    id SERIAL PRIMARY KEY,
    scrape_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scrape_count INTEGER DEFAULT 0,
    last_scrape_at TIMESTAMP,
    rate_limit_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ====================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_decision_nodes_tree ON decision_nodes(tree_id);
CREATE INDEX IF NOT EXISTS idx_decision_nodes_parent ON decision_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_decision_paths_node ON decision_paths(node_id);
CREATE INDEX IF NOT EXISTS idx_decision_paths_next ON decision_paths(next_node_id);
CREATE INDEX IF NOT EXISTS idx_unanswered_status ON unanswered_questions(status);
CREATE INDEX IF NOT EXISTS idx_unanswered_priority ON unanswered_questions(priority);
CREATE INDEX IF NOT EXISTS idx_analytics_tree ON decision_tree_analytics(tree_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON decision_tree_analytics(user_id);

-- ====================================================================
-- 7. INITIAL SEED DATA - SAMPLE DECISION TREE
-- ====================================================================

-- Sample tree: TVA Registration Decision Flow
INSERT INTO decision_trees (tree_key, tree_name, description, category, icon, priority) VALUES
('tva_registration', 'Înregistrare TVA', 'Ghid complet pentru înregistrarea ca plătitor de TVA', 'fiscal', '📊', 1)
ON CONFLICT (tree_key) DO NOTHING;

-- Root node: Do you have a business?
INSERT INTO decision_nodes (tree_id, node_key, parent_node_id, question, question_type, examples, display_order) VALUES
(
    (SELECT id FROM decision_trees WHERE tree_key = 'tva_registration'),
    'tva_root',
    NULL,
    'Ce tip de afacere ai?',
    'multiple_choice',
    '["SRL (Societate cu Răspundere Limitată)", "PFA (Persoană Fizică Autorizată)", "II (Întreprindere Individuală)", "Microîntreprindere"]'::jsonb,
    1
)
ON CONFLICT (node_key) DO NOTHING;

-- ====================================================================
-- 8. HELPER FUNCTIONS
-- ====================================================================

-- Function to get full decision path
CREATE OR REPLACE FUNCTION get_decision_path(p_node_id INTEGER)
RETURNS TABLE (
    node_id INTEGER,
    question TEXT,
    answer_option TEXT,
    legislation_refs JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE path AS (
        -- Base case: start node
        SELECT
            dn.id as node_id,
            dn.question,
            ''::TEXT as answer_option,
            '{}'::JSONB as legislation_refs,
            0 as level
        FROM decision_nodes dn
        WHERE dn.id = p_node_id

        UNION ALL

        -- Recursive case: parent nodes
        SELECT
            dn.id,
            dn.question,
            dp.answer_option,
            dp.legislation_refs,
            p.level + 1
        FROM decision_nodes dn
        JOIN decision_paths dp ON dp.next_node_id = p.node_id
        JOIN path p ON p.node_id = dp.node_id
    )
    SELECT
        path.node_id,
        path.question,
        path.answer_option,
        path.legislation_refs
    FROM path
    ORDER BY level DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if scraper can run (rate limit)
CREATE OR REPLACE FUNCTION can_scrape_today()
RETURNS BOOLEAN AS $$
DECLARE
    v_today_count INTEGER;
    v_rate_limit INTEGER;
BEGIN
    -- Get today's scrape count
    SELECT COALESCE(scrape_count, 0) INTO v_today_count
    FROM scraper_rate_limits
    WHERE scrape_date = CURRENT_DATE;

    -- Get rate limit from config
    SELECT config_value::INTEGER INTO v_rate_limit
    FROM scraper_config
    WHERE config_key = 'scrape_rate_limit_per_day';

    -- Return true if under limit
    RETURN (v_today_count < v_rate_limit);
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 9. GRANT PERMISSIONS
-- ====================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO accountech_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO accountech_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO accountech_app;

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================
-- Next steps:
-- 1. Run this migration: psql -h 127.0.0.1 -U accountech_app -d accountech_production -f 001_decision_trees_schema.sql
-- 2. Build Lege5ScraperService.php
-- 3. Build DecisionTreeService.php
-- 4. Build hybrid routing system
-- ====================================================================
