-- Decision Tree Auto-Update System
-- Migration: 004_decision_tree_auto_update_system
-- Date: 2025-11-15
-- Purpose: Enable automated tracking and updating of decision tree content based on legislation changes

-- ==================================================
-- PHASE 1: Variable System
-- ==================================================

-- Table: legislation_variables
-- Stores all dynamic values referenced in decision trees (thresholds, rates, deadlines)
CREATE TABLE IF NOT EXISTS legislation_variables (
    id SERIAL PRIMARY KEY,
    variable_key VARCHAR(100) UNIQUE NOT NULL,
    variable_name VARCHAR(255) NOT NULL,
    current_value TEXT NOT NULL,
    value_type VARCHAR(50) NOT NULL CHECK (value_type IN ('amount', 'percentage', 'days', 'text', 'date')),
    unit VARCHAR(20),  -- 'RON', 'EUR', '%', 'days', NULL
    legislation_id INTEGER REFERENCES fiscal_legislation(id),
    effective_from DATE NOT NULL,
    effective_to DATE,
    source_url TEXT,
    last_verified TIMESTAMP,
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_legvar_key ON legislation_variables(variable_key);
CREATE INDEX idx_legvar_effective ON legislation_variables(effective_from DESC);
CREATE INDEX idx_legvar_verification ON legislation_variables(last_verified);

COMMENT ON TABLE legislation_variables IS 'Central repository for all dynamic legal/fiscal values used in decision trees';
COMMENT ON COLUMN legislation_variables.variable_key IS 'Unique identifier used in templates: {{variable_key}}';
COMMENT ON COLUMN legislation_variables.value_type IS 'Data type for validation and formatting';

-- ==================================================
-- PHASE 2: Update Points Tracking
-- ==================================================

-- Table: decision_tree_update_points
-- Tracks specific data points in decision trees that require periodic verification
CREATE TABLE IF NOT EXISTS decision_tree_update_points (
    id SERIAL PRIMARY KEY,
    tree_id INTEGER REFERENCES decision_trees(id) ON DELETE CASCADE,
    answer_id INTEGER REFERENCES decision_answers(id) ON DELETE CASCADE,
    node_id INTEGER REFERENCES decision_nodes(id) ON DELETE CASCADE,
    update_category VARCHAR(100) NOT NULL CHECK (update_category IN (
        'threshold', 'deadline', 'tax_rate', 'penalty', 'cost_estimate',
        'processing_time', 'form_requirement', 'procedure_step', 'contact_info'
    )),
    data_point_name VARCHAR(255) NOT NULL,
    current_value TEXT NOT NULL,
    value_source VARCHAR(255),  -- 'fiscal_legislation:123', 'ANAF website', 'Manual entry'
    linked_variable_key VARCHAR(100) REFERENCES legislation_variables(variable_key),
    update_frequency VARCHAR(50) NOT NULL CHECK (update_frequency IN (
        'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'on_legislation_change', 'manual'
    )),
    last_verified TIMESTAMP,
    next_verification_due DATE NOT NULL,
    verification_url TEXT,
    verification_instructions TEXT,
    responsible_person VARCHAR(100),
    criticality VARCHAR(20) NOT NULL CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    auto_updateable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_update_points_tree ON decision_tree_update_points(tree_id);
CREATE INDEX idx_update_points_due ON decision_tree_update_points(next_verification_due);
CREATE INDEX idx_update_points_criticality ON decision_tree_update_points(criticality, next_verification_due);
CREATE INDEX idx_update_points_category ON decision_tree_update_points(update_category);
CREATE INDEX idx_update_points_variable ON decision_tree_update_points(linked_variable_key);

COMMENT ON TABLE decision_tree_update_points IS 'Tracks all data points requiring periodic verification/update';
COMMENT ON COLUMN decision_tree_update_points.criticality IS 'Impact level: critical=system-wide, high=financial, medium=informational, low=cosmetic';
COMMENT ON COLUMN decision_tree_update_points.auto_updateable IS 'Can this point be auto-updated from legislation_variables?';

-- ==================================================
-- PHASE 3: Update History & Audit Trail
-- ==================================================

-- Table: decision_tree_update_history
-- Audit trail for all updates made to decision tree content
CREATE TABLE IF NOT EXISTS decision_tree_update_history (
    id SERIAL PRIMARY KEY,
    update_point_id INTEGER REFERENCES decision_tree_update_points(id),
    tree_id INTEGER REFERENCES decision_trees(id),
    answer_id INTEGER REFERENCES decision_answers(id),
    field_name VARCHAR(100),  -- 'answer_template', 'warnings', 'next_steps', etc.
    old_value TEXT,
    new_value TEXT,
    change_type VARCHAR(50) CHECK (change_type IN (
        'manual_edit', 'variable_update', 'legislation_change', 'periodic_verification', 'bulk_update'
    )),
    trigger_source VARCHAR(255),  -- 'variable:tva_threshold', 'legislation_id:123', 'user:uuid'
    auto_applied BOOLEAN DEFAULT FALSE,
    verified_by UUID,  -- User who verified/approved change
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_update_history_point ON decision_tree_update_history(update_point_id);
CREATE INDEX idx_update_history_tree ON decision_tree_update_history(tree_id);
CREATE INDEX idx_update_history_date ON decision_tree_update_history(created_at DESC);

-- ==================================================
-- PHASE 4: Pending Updates Queue
-- ==================================================

-- Table: pending_tree_updates
-- Queue of proposed updates awaiting admin review
CREATE TABLE IF NOT EXISTS pending_tree_updates (
    id SERIAL PRIMARY KEY,
    tree_id INTEGER REFERENCES decision_trees(id),
    answer_id INTEGER REFERENCES decision_answers(id),
    update_point_id INTEGER REFERENCES decision_tree_update_points(id),
    change_type VARCHAR(50) NOT NULL,
    trigger_source VARCHAR(100),
    field_name VARCHAR(100),  -- Which field to update
    current_content TEXT,
    proposed_content TEXT,
    diff_preview TEXT,  -- Human-readable diff
    confidence_score DECIMAL(3,2),  -- 0.00-1.00 for auto-generated updates
    auto_approved BOOLEAN DEFAULT FALSE,
    reviewed BOOLEAN DEFAULT FALSE,
    approved BOOLEAN,
    reviewed_by UUID,
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pending_updates_tree ON pending_tree_updates(tree_id);
CREATE INDEX idx_pending_updates_reviewed ON pending_tree_updates(reviewed, created_at DESC);
CREATE INDEX idx_pending_updates_auto ON pending_tree_updates(auto_approved, reviewed);

-- ==================================================
-- PHASE 5: Template System
-- ==================================================

-- Table: answer_templates
-- Reusable templates for generating consistent answer content
CREATE TABLE IF NOT EXISTS answer_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(100) UNIQUE NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),  -- 'mandatory_action', 'optional_action', 'informational'
    html_template TEXT NOT NULL,  -- Contains {{variable_placeholders}}
    required_variables JSONB,  -- ["tva_threshold", "deadline_days"]
    optional_variables JSONB,  -- ["cost_breakdown", "timeline"]
    section_includes JSONB,  -- Which sections to include: {costs: true, timeline: true, mba: false}
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_answer_templates_key ON answer_templates(template_key);
CREATE INDEX idx_answer_templates_category ON answer_templates(category);

COMMENT ON TABLE answer_templates IS 'Reusable HTML templates with variable placeholders for consistent content generation';

-- ==================================================
-- PHASE 6: Enhanced Decision Answers
-- ==================================================

-- Add new columns to decision_answers for auto-update support
ALTER TABLE decision_answers ADD COLUMN IF NOT EXISTS legislation_ids INTEGER[];
ALTER TABLE decision_answers ADD COLUMN IF NOT EXISTS variable_mappings JSONB;  -- {"threshold": "tva_registration_threshold"}
ALTER TABLE decision_answers ADD COLUMN IF NOT EXISTS template_key VARCHAR(100) REFERENCES answer_templates(template_key);
ALTER TABLE decision_answers ADD COLUMN IF NOT EXISTS last_content_update TIMESTAMP;
ALTER TABLE decision_answers ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_answers_legislation ON decision_answers USING GIN(legislation_ids);
CREATE INDEX IF NOT EXISTS idx_answers_template ON decision_answers(template_key);

COMMENT ON COLUMN decision_answers.legislation_ids IS 'Array of fiscal_legislation.id that this answer references';
COMMENT ON COLUMN decision_answers.variable_mappings IS 'Map of template variables to legislation_variables keys';

-- ==================================================
-- FUNCTIONS & TRIGGERS
-- ==================================================

-- Function: Update next_verification_due based on frequency
CREATE OR REPLACE FUNCTION calculate_next_verification_date(
    p_last_verified TIMESTAMP,
    p_frequency VARCHAR
) RETURNS DATE AS $$
BEGIN
    RETURN CASE p_frequency
        WHEN 'daily' THEN (p_last_verified + INTERVAL '1 day')::DATE
        WHEN 'weekly' THEN (p_last_verified + INTERVAL '1 week')::DATE
        WHEN 'monthly' THEN (p_last_verified + INTERVAL '1 month')::DATE
        WHEN 'quarterly' THEN (p_last_verified + INTERVAL '3 months')::DATE
        WHEN 'annual' THEN (p_last_verified + INTERVAL '1 year')::DATE
        ELSE (p_last_verified + INTERVAL '1 year')::DATE  -- Default to annual
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: Auto-update next_verification_due when update point is verified
CREATE OR REPLACE FUNCTION update_verification_date_trigger() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_verified IS DISTINCT FROM OLD.last_verified THEN
        NEW.next_verification_due = calculate_next_verification_date(
            NEW.last_verified,
            NEW.update_frequency
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_verification_date ON decision_tree_update_points;
CREATE TRIGGER trg_update_verification_date
BEFORE UPDATE ON decision_tree_update_points
FOR EACH ROW
EXECUTE FUNCTION update_verification_date_trigger();

-- Function: Mark answer as needing update when linked legislation changes
CREATE OR REPLACE FUNCTION notify_legislation_change_trigger() RETURNS TRIGGER AS $$
BEGIN
    -- Log the change
    INSERT INTO legislation_updates_log (
        scrape_date,
        source_url,
        articles_updated,
        status
    ) VALUES (
        NOW(),
        COALESCE(NEW.source_url, 'Manual update'),
        1,
        'success'
    );

    -- Find all affected answers
    INSERT INTO pending_tree_updates (
        tree_id,
        answer_id,
        change_type,
        trigger_source,
        field_name,
        current_content,
        proposed_content,
        confidence_score,
        auto_approved
    )
    SELECT
        dt.id,
        da.id,
        'legislation_change',
        'legislation_id:' || NEW.id,
        'answer_template',
        da.answer_template,
        da.answer_template,  -- Placeholder - would be AI-generated
        0.50,  -- Medium confidence for manual review
        FALSE
    FROM decision_answers da
    JOIN decision_paths dp ON da.path_id = dp.id
    JOIN decision_nodes dn ON dp.node_id = dn.id
    JOIN decision_trees dt ON dn.tree_id = dt.id
    WHERE NEW.id = ANY(da.legislation_ids);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_legislation_change ON fiscal_legislation;
CREATE TRIGGER trg_notify_legislation_change
AFTER UPDATE ON fiscal_legislation
FOR EACH ROW
WHEN (OLD.full_text IS DISTINCT FROM NEW.full_text OR
      OLD.effective_date IS DISTINCT FROM NEW.effective_date)
EXECUTE FUNCTION notify_legislation_change_trigger();

-- Function: Propagate variable updates to all linked answers
CREATE OR REPLACE FUNCTION propagate_variable_update(
    p_variable_key VARCHAR,
    p_new_value TEXT,
    p_auto_apply BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
    affected_answers INTEGER,
    pending_updates INTEGER,
    preview TEXT
) AS $$
DECLARE
    v_old_value TEXT;
    v_affected_count INTEGER;
    v_pending_count INTEGER;
BEGIN
    -- Get old value
    SELECT current_value INTO v_old_value
    FROM legislation_variables
    WHERE variable_key = p_variable_key;

    -- Update variable
    UPDATE legislation_variables
    SET current_value = p_new_value,
        updated_at = NOW(),
        last_verified = NOW()
    WHERE variable_key = p_variable_key;

    -- Find all answers using this variable
    SELECT COUNT(*) INTO v_affected_count
    FROM decision_answers
    WHERE variable_mappings ? p_variable_key;

    IF p_auto_apply THEN
        -- Auto-apply updates
        UPDATE decision_answers
        SET answer_template = replace(answer_template, v_old_value, p_new_value),
            warnings = replace(warnings, v_old_value, p_new_value),
            strategic_advice = replace(strategic_advice, v_old_value, p_new_value),
            last_content_update = NOW()
        WHERE variable_mappings ? p_variable_key;

        v_pending_count = 0;
    ELSE
        -- Create pending updates for review
        INSERT INTO pending_tree_updates (
            tree_id,
            answer_id,
            change_type,
            trigger_source,
            field_name,
            current_content,
            proposed_content,
            confidence_score,
            auto_approved
        )
        SELECT
            dt.id,
            da.id,
            'variable_update',
            'variable:' || p_variable_key,
            'answer_template',
            da.answer_template,
            replace(da.answer_template, v_old_value, p_new_value),
            0.95,  -- High confidence for variable replacements
            FALSE
        FROM decision_answers da
        JOIN decision_paths dp ON da.path_id = dp.id
        JOIN decision_nodes dn ON dp.node_id = dn.id
        JOIN decision_trees dt ON dn.tree_id = dt.id
        WHERE da.variable_mappings ? p_variable_key;

        GET DIAGNOSTICS v_pending_count = ROW_COUNT;
    END IF;

    RETURN QUERY SELECT
        v_affected_count,
        v_pending_count,
        'Updated ' || p_variable_key || ' from "' || v_old_value || '" to "' || p_new_value || '"';
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- VIEWS FOR ADMIN DASHBOARD
-- ==================================================

-- View: Overdue update points
CREATE OR REPLACE VIEW overdue_update_points AS
SELECT
    up.*,
    dt.tree_name,
    dt.tree_key,
    CURRENT_DATE - up.next_verification_due AS days_overdue,
    CASE
        WHEN up.criticality = 'critical' THEN 1
        WHEN up.criticality = 'high' THEN 2
        WHEN up.criticality = 'medium' THEN 3
        ELSE 4
    END as priority_order
FROM decision_tree_update_points up
JOIN decision_trees dt ON up.tree_id = dt.id
WHERE up.next_verification_due < CURRENT_DATE
ORDER BY priority_order, days_overdue DESC;

-- View: Update points due this week
CREATE OR REPLACE VIEW update_points_due_this_week AS
SELECT
    up.*,
    dt.tree_name,
    dt.tree_key,
    up.next_verification_due - CURRENT_DATE AS days_until_due
FROM decision_tree_update_points up
JOIN decision_trees dt ON up.tree_id = dt.id
WHERE up.next_verification_due BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY up.next_verification_due;

-- View: Update statistics by category
CREATE OR REPLACE VIEW update_points_statistics AS
SELECT
    update_category,
    criticality,
    COUNT(*) as total_points,
    COUNT(*) FILTER (WHERE next_verification_due < CURRENT_DATE) as overdue_count,
    COUNT(*) FILTER (WHERE next_verification_due BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) as due_this_week,
    AVG(CURRENT_DATE - last_verified) FILTER (WHERE last_verified IS NOT NULL) as avg_days_since_verification
FROM decision_tree_update_points
GROUP BY update_category, criticality
ORDER BY criticality, update_category;

-- ==================================================
-- SEED DATA: Initial Variables
-- ==================================================

INSERT INTO legislation_variables (variable_key, variable_name, current_value, value_type, unit, effective_from, source_url) VALUES
-- TVA / VAT
('tva_registration_threshold', 'Prag înregistrare TVA', '300000', 'amount', 'RON', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('tva_standard_rate', 'Cotă TVA standard', '19', 'percentage', '%', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('tva_reduced_rate_9', 'Cotă TVA redusă', '9', 'percentage', '%', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('tva_reduced_rate_5', 'Cotă TVA super-redusă', '5', 'percentage', '%', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('tva_registration_deadline', 'Termen înregistrare TVA', '10', 'days', 'zile lucrătoare', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('tva_declaration_deadline', 'Termen declarație TVA', '25', 'days', 'ale lunii următoare', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('tva_penalty_min', 'Penalitate minimă TVA', '500', 'amount', 'RON', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('tva_penalty_max', 'Penalitate maximă TVA', '1000', 'amount', 'RON', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),

-- Microenterprise
('microenterprise_revenue_threshold', 'Prag venit microîntreprindere', '500000', 'amount', 'EUR', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('microenterprise_employee_threshold', 'Prag angajați microîntreprindere', '9', 'days', 'angajați', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('microenterprise_tax_rate_1', 'Cotă impozit microîntreprindere (venituri din consultanță < 80%)', '1', 'percentage', '%', '2023-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('microenterprise_tax_rate_3', 'Cotă impozit microîntreprindere (venituri din consultanță >= 80%)', '3', 'percentage', '%', '2023-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),

-- Profit Tax
('profit_tax_rate', 'Cotă impozit profit', '16', 'percentage', '%', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('dividend_tax_rate', 'Cotă impozit dividend', '8', 'percentage', '%', '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),

-- Social Contributions
('cas_employee_rate', 'CAS angajat', '25', 'percentage', '%', '2021-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('cass_employee_rate', 'CASS angajat', '10', 'percentage', '%', '2018-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('minimum_gross_salary', 'Salariu minim brut pe economie', '3300', 'amount', 'RON', '2024-01-01', 'https://www.gov.ro'),

-- Deadlines
('d100_deadline', 'Termen declarație D100 (impozit profit)', '25 mai', 'text', NULL, '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm'),
('d112_deadline', 'Termen declarație D112 (angajați)', '31 ianuarie', 'text', NULL, '2016-01-01', 'https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal.htm')
ON CONFLICT (variable_key) DO NOTHING;

COMMENT ON TABLE legislation_variables IS 'Successfully created auto-update system for decision trees';

-- Grant permissions
GRANT SELECT ON legislation_variables TO accountech_app;
GRANT SELECT ON decision_tree_update_points TO accountech_app;
GRANT SELECT ON decision_tree_update_history TO accountech_app;
GRANT SELECT ON pending_tree_updates TO accountech_app;
GRANT SELECT ON answer_templates TO accountech_app;
GRANT SELECT ON overdue_update_points TO accountech_app;
GRANT SELECT ON update_points_due_this_week TO accountech_app;
GRANT SELECT ON update_points_statistics TO accountech_app;
