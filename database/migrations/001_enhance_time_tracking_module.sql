-- =============================================================================
-- Migration: Enhance Time Tracking Module with AI and Advanced Features
-- Created: 2025-11-19
-- Description: Adds AI-powered features, GPS tracking, approval workflows,
--              screenshots, activity tracking, and analytics capabilities
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial features

-- =============================================================================
-- PHASE 1: Enhance existing time_entries table
-- =============================================================================

-- Add new columns to time_entries table
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

-- AI Features
ADD COLUMN IF NOT EXISTS ai_suggested_task_id UUID REFERENCES tasks(id),
ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS ai_prediction_model VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_learning_feedback VARCHAR(20) CHECK (ai_learning_feedback IN ('correct', 'incorrect', 'adjusted', NULL)),

-- Geolocation Features
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS location_captured_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS geofence_id UUID,
ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false,

-- Activity Tracking
ADD COLUMN IF NOT EXISTS activity_level VARCHAR(20) DEFAULT 'normal' CHECK (activity_level IN ('idle', 'low', 'normal', 'high', 'very_high')),
ADD COLUMN IF NOT EXISTS keyboard_strokes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mouse_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS screenshot_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_window_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS active_application VARCHAR(100),

-- Approval Workflow
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disputed', 'under_review')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,

-- Break Time Tracking
ADD COLUMN IF NOT EXISTS break_duration_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS breaks_count INTEGER DEFAULT 0,

-- Tags and categorization
ADD COLUMN IF NOT EXISTS tags TEXT[], -- Array of tags
ADD COLUMN IF NOT EXISTS time_entry_type VARCHAR(30) DEFAULT 'regular' CHECK (time_entry_type IN ('regular', 'overtime', 'holiday', 'on_call', 'training')),

-- Billing details
ADD COLUMN IF NOT EXISTS billable_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'RON',
ADD COLUMN IF NOT EXISTS invoiced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_id UUID,

-- Metadata
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
ADD COLUMN IF NOT EXISTS device_info JSONB,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_end_time ON time_entries(end_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_approved_by ON time_entries(approved_by);
CREATE INDEX IF NOT EXISTS idx_time_entries_location ON time_entries USING GIST(ST_MakePoint(location_lng, location_lat));
CREATE INDEX IF NOT EXISTS idx_time_entries_tags ON time_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_time_entries_ai_suggested ON time_entries(ai_suggested_task_id);

-- =============================================================================
-- PHASE 2: Create supporting tables
-- =============================================================================

-- Time entry breaks table
CREATE TABLE IF NOT EXISTS time_entry_breaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    break_start TIMESTAMP WITH TIME ZONE NOT NULL,
    break_end TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    break_type VARCHAR(30) DEFAULT 'regular' CHECK (break_type IN ('regular', 'lunch', 'bathroom', 'meeting', 'other')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_time_entry_breaks_time_entry ON time_entry_breaks(time_entry_id);

-- Screenshots table
CREATE TABLE IF NOT EXISTS time_entry_screenshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    screenshot_url TEXT NOT NULL,
    thumbnail_url TEXT,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    blur_level INTEGER DEFAULT 0 CHECK (blur_level >= 0 AND blur_level <= 100),
    activity_level VARCHAR(20),
    file_size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_screenshots_time_entry ON time_entry_screenshots(time_entry_id);
CREATE INDEX idx_screenshots_captured_at ON time_entry_screenshots(captured_at);

-- Geofences table for location-based tracking
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    center_lat DECIMAL(10,8) NOT NULL,
    center_lng DECIMAL(11,8) NOT NULL,
    radius_meters INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    allowed_projects UUID[], -- Array of project IDs allowed in this geofence
    requires_geofence BOOLEAN DEFAULT false, -- If true, time entries must be within this geofence
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_geofences_company ON geofences(company_id);
CREATE INDEX idx_geofences_location ON geofences USING GIST(ST_Buffer(ST_MakePoint(center_lng, center_lat)::geography, radius_meters)::geometry);

-- Time entry approval workflow history
CREATE TABLE IF NOT EXISTS time_entry_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_changes', 'disputed')),
    comments TEXT,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_approvals_time_entry ON time_entry_approvals(time_entry_id);
CREATE INDEX idx_approvals_approver ON time_entry_approvals(approver_id);

-- AI task predictions and learning
CREATE TABLE IF NOT EXISTS ai_task_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    predicted_task_id UUID REFERENCES tasks(id),
    confidence_score DECIMAL(3,2) NOT NULL,
    prediction_factors JSONB, -- Store factors that influenced prediction
    context_data JSONB, -- Time of day, day of week, recent tasks, etc.
    actual_task_id UUID REFERENCES tasks(id),
    feedback VARCHAR(20) CHECK (feedback IN ('correct', 'incorrect', 'adjusted', NULL)),
    model_version VARCHAR(50),
    prediction_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    feedback_time TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_ai_predictions_user ON ai_task_predictions(user_id);
CREATE INDEX idx_ai_predictions_predicted_task ON ai_task_predictions(predicted_task_id);
CREATE INDEX idx_ai_predictions_actual_task ON ai_task_predictions(actual_task_id);
CREATE INDEX idx_ai_predictions_time ON ai_task_predictions(prediction_time);

-- Task duration estimations and learning
CREATE TABLE IF NOT EXISTS ai_task_duration_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id),
    estimated_hours DECIMAL(8,2) NOT NULL,
    actual_hours DECIMAL(8,2),
    estimation_factors JSONB,
    accuracy_score DECIMAL(3,2), -- How accurate the estimate was
    model_version VARCHAR(50),
    estimated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_duration_estimates_task ON ai_task_duration_estimates(task_id);

-- Activity patterns for learning user behavior
CREATE TABLE IF NOT EXISTS user_activity_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day < 24),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week < 7), -- 0=Sunday
    common_tasks UUID[], -- Array of frequently performed tasks
    common_projects UUID[], -- Array of frequently worked projects
    avg_activity_level VARCHAR(20),
    avg_duration_hours DECIMAL(6,2),
    pattern_confidence DECIMAL(3,2),
    sample_size INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_patterns_user ON user_activity_patterns(user_id);
CREATE INDEX idx_activity_patterns_time ON user_activity_patterns(hour_of_day, day_of_week);

-- Time tracking rules and policies
CREATE TABLE IF NOT EXISTS time_tracking_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Screenshot settings
    require_screenshots BOOLEAN DEFAULT false,
    screenshot_interval_minutes INTEGER,
    screenshot_blur_level INTEGER DEFAULT 0,

    -- Location settings
    require_geofence BOOLEAN DEFAULT false,
    allowed_geofences UUID[],

    -- Activity settings
    idle_timeout_minutes INTEGER DEFAULT 10,
    auto_pause_on_idle BOOLEAN DEFAULT true,
    min_activity_threshold INTEGER DEFAULT 20, -- Minimum mouse/keyboard activity per minute

    -- Approval settings
    require_approval BOOLEAN DEFAULT false,
    approval_threshold_hours DECIMAL(6,2), -- Entries above this require approval
    auto_approve_after_days INTEGER,

    -- Break settings
    require_break_tracking BOOLEAN DEFAULT false,
    max_continuous_hours DECIMAL(4,2), -- Max hours before break required

    -- Overtime settings
    overtime_threshold_hours DECIMAL(4,2) DEFAULT 8.00,
    overtime_multiplier DECIMAL(3,2) DEFAULT 1.50,

    -- Applicable to
    applies_to_all_users BOOLEAN DEFAULT true,
    applies_to_users UUID[],
    applies_to_projects UUID[],

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_policies_company ON time_tracking_policies(company_id);

-- =============================================================================
-- PHASE 3: Create views for analytics
-- =============================================================================

-- Daily time summary view
CREATE OR REPLACE VIEW v_daily_time_summary AS
SELECT
    te.company_id,
    te.employee_id,
    te.entry_date,
    COUNT(*) as entries_count,
    SUM(te.duration_seconds) / 3600.0 as total_hours,
    SUM(CASE WHEN te.is_billable THEN te.duration_seconds ELSE 0 END) / 3600.0 as billable_hours,
    SUM(CASE WHEN te.is_billable THEN te.billable_amount ELSE 0 END) as billable_revenue,
    AVG(CASE WHEN te.activity_level = 'high' OR te.activity_level = 'very_high' THEN 1.0 ELSE 0.0 END) as high_activity_rate,
    COUNT(CASE WHEN te.status = 'approved' THEN 1 END) as approved_entries,
    COUNT(CASE WHEN te.status = 'pending' THEN 1 END) as pending_entries
FROM time_entries te
GROUP BY te.company_id, te.employee_id, te.entry_date;

-- Project time allocation view
CREATE OR REPLACE VIEW v_project_time_allocation AS
SELECT
    p.id as project_id,
    p.company_id,
    p.name as project_name,
    p.client_id,
    COUNT(DISTINCT te.employee_id) as team_members,
    COUNT(te.id) as total_entries,
    SUM(te.duration_seconds) / 3600.0 as total_hours,
    SUM(CASE WHEN te.is_billable THEN te.duration_seconds ELSE 0 END) / 3600.0 as billable_hours,
    SUM(te.billable_amount) as total_revenue,
    p.budget,
    (SUM(te.billable_amount) / NULLIF(p.budget, 0)) * 100 as budget_utilization_pct,
    MIN(te.entry_date) as first_entry_date,
    MAX(te.entry_date) as last_entry_date
FROM projects p
LEFT JOIN time_entries te ON te.project_id = p.id
GROUP BY p.id, p.company_id, p.name, p.client_id, p.budget;

-- Task time tracking view
CREATE OR REPLACE VIEW v_task_time_tracking AS
SELECT
    t.id as task_id,
    t.company_id,
    t.project_id,
    t.name as task_name,
    t.estimated_hours,
    COUNT(te.id) as time_entries_count,
    SUM(te.duration_seconds) / 3600.0 as actual_hours,
    t.estimated_hours - (SUM(te.duration_seconds) / 3600.0) as hours_remaining,
    CASE
        WHEN t.estimated_hours > 0 THEN
            ((SUM(te.duration_seconds) / 3600.0) / t.estimated_hours) * 100
        ELSE 0
    END as completion_pct,
    AVG(CASE WHEN te.ai_confidence_score > 0 THEN te.ai_confidence_score END) as avg_ai_confidence
FROM tasks t
LEFT JOIN time_entries te ON te.task_id = t.id
GROUP BY t.id, t.company_id, t.project_id, t.name, t.estimated_hours;

-- User productivity metrics view
CREATE OR REPLACE VIEW v_user_productivity_metrics AS
SELECT
    te.employee_id,
    te.company_id,
    DATE_TRUNC('week', te.entry_date) as week_start,
    SUM(te.duration_seconds) / 3600.0 as total_hours,
    SUM(CASE WHEN te.is_billable THEN te.duration_seconds ELSE 0 END) / 3600.0 as billable_hours,
    (SUM(CASE WHEN te.is_billable THEN te.duration_seconds ELSE 0 END)::DECIMAL /
     NULLIF(SUM(te.duration_seconds), 0)) * 100 as billable_pct,
    AVG(CASE
        WHEN te.activity_level = 'very_high' THEN 5
        WHEN te.activity_level = 'high' THEN 4
        WHEN te.activity_level = 'normal' THEN 3
        WHEN te.activity_level = 'low' THEN 2
        WHEN te.activity_level = 'idle' THEN 1
    END) as avg_activity_score,
    COUNT(DISTINCT te.project_id) as projects_worked,
    COUNT(DISTINCT te.task_id) as tasks_completed,
    SUM(te.billable_amount) as revenue_generated
FROM time_entries te
GROUP BY te.employee_id, te.company_id, DATE_TRUNC('week', te.entry_date);

-- =============================================================================
-- PHASE 4: Create triggers and functions
-- =============================================================================

-- Function to calculate duration from start/end times
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate duration if start_time and end_time are set
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;

        -- Also update the legacy 'hours' field for backwards compatibility
        NEW.hours := NEW.duration_seconds / 3600.0;
    END IF;

    -- Calculate billable amount
    IF NEW.is_billable AND NEW.hourly_rate IS NOT NULL THEN
        NEW.billable_amount := (NEW.duration_seconds / 3600.0) * NEW.hourly_rate;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to time_entries
DROP TRIGGER IF EXISTS trg_calculate_duration ON time_entries;
CREATE TRIGGER trg_calculate_duration
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION calculate_time_entry_duration();

-- Function to validate geofence location
CREATE OR REPLACE FUNCTION validate_geofence_location()
RETURNS TRIGGER AS $$
DECLARE
    v_geofence RECORD;
    v_policy RECORD;
    v_distance_meters DECIMAL;
BEGIN
    -- Check if location validation is required
    SELECT * INTO v_policy
    FROM time_tracking_policies
    WHERE company_id = NEW.company_id
      AND require_geofence = true
      AND is_active = true
      AND (applies_to_all_users = true OR NEW.employee_id = ANY(applies_to_users))
    LIMIT 1;

    IF FOUND THEN
        -- Find applicable geofence
        IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
            SELECT
                g.*,
                ST_Distance(
                    ST_MakePoint(g.center_lng, g.center_lat)::geography,
                    ST_MakePoint(NEW.location_lng, NEW.location_lat)::geography
                ) as distance
            INTO v_geofence
            FROM geofences g
            WHERE g.company_id = NEW.company_id
              AND g.is_active = true
              AND ST_DWithin(
                  ST_MakePoint(g.center_lng, g.center_lat)::geography,
                  ST_MakePoint(NEW.location_lng, NEW.location_lat)::geography,
                  g.radius_meters
              )
            ORDER BY distance ASC
            LIMIT 1;

            IF FOUND THEN
                NEW.geofence_id := v_geofence.id;
                NEW.location_verified := true;
            ELSE
                NEW.location_verified := false;
                -- Could also RAISE EXCEPTION here if strict validation is required
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach geofence validation trigger
DROP TRIGGER IF EXISTS trg_validate_geofence ON time_entries;
CREATE TRIGGER trg_validate_geofence
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW
    WHEN (NEW.location_lat IS NOT NULL)
    EXECUTE FUNCTION validate_geofence_location();

-- Function to update activity patterns for ML learning
CREATE OR REPLACE FUNCTION update_activity_patterns()
RETURNS TRIGGER AS $$
DECLARE
    v_hour INTEGER;
    v_day INTEGER;
BEGIN
    -- Only update patterns for completed, approved entries
    IF NEW.status = 'approved' AND NEW.end_time IS NOT NULL THEN
        v_hour := EXTRACT(HOUR FROM NEW.start_time);
        v_day := EXTRACT(DOW FROM NEW.start_time);

        INSERT INTO user_activity_patterns (
            user_id,
            company_id,
            hour_of_day,
            day_of_week,
            common_tasks,
            common_projects,
            avg_activity_level,
            avg_duration_hours,
            sample_size,
            last_updated
        )
        VALUES (
            NEW.employee_id,
            NEW.company_id,
            v_hour,
            v_day,
            ARRAY[NEW.task_id]::UUID[],
            ARRAY[NEW.project_id]::UUID[],
            NEW.activity_level,
            NEW.duration_seconds / 3600.0,
            1,
            NOW()
        )
        ON CONFLICT (user_id, hour_of_day, day_of_week)
        DO UPDATE SET
            common_tasks = (
                SELECT ARRAY_AGG(DISTINCT t)
                FROM UNNEST(user_activity_patterns.common_tasks || NEW.task_id) t
                WHERE t IS NOT NULL
            ),
            common_projects = (
                SELECT ARRAY_AGG(DISTINCT p)
                FROM UNNEST(user_activity_patterns.common_projects || NEW.project_id) p
                WHERE p IS NOT NULL
            ),
            avg_duration_hours = (
                (user_activity_patterns.avg_duration_hours * user_activity_patterns.sample_size + NEW.duration_seconds / 3600.0) /
                (user_activity_patterns.sample_size + 1)
            ),
            sample_size = user_activity_patterns.sample_size + 1,
            last_updated = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach activity pattern learning trigger
DROP TRIGGER IF EXISTS trg_update_activity_patterns ON time_entries;
CREATE TRIGGER trg_update_activity_patterns
    AFTER INSERT OR UPDATE ON time_entries
    FOR EACH ROW
    WHEN (NEW.status = 'approved')
    EXECUTE FUNCTION update_activity_patterns();

-- =============================================================================
-- PHASE 5: Insert default data and configurations
-- =============================================================================

-- Default time tracking policy for all companies (can be customized per company)
INSERT INTO time_tracking_policies (
    company_id,
    name,
    description,
    require_screenshots,
    screenshot_interval_minutes,
    require_geofence,
    require_approval,
    approval_threshold_hours,
    auto_approve_after_days,
    idle_timeout_minutes,
    auto_pause_on_idle,
    overtime_threshold_hours,
    overtime_multiplier,
    applies_to_all_users,
    is_active
)
SELECT
    c.id,
    'Default Time Tracking Policy',
    'Automatically created default policy for time tracking',
    false, -- No screenshots by default
    15, -- Screenshot every 15 minutes if enabled
    false, -- No geofence requirement by default
    false, -- No approval required by default
    8.0, -- Entries over 8 hours require approval
    7, -- Auto-approve after 7 days
    10, -- 10 minutes idle timeout
    true, -- Auto-pause on idle
    8.0, -- Overtime after 8 hours
    1.5, -- 1.5x overtime multiplier
    true, -- Applies to all users
    true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM time_tracking_policies ttp WHERE ttp.company_id = c.id
);

-- =============================================================================
-- PHASE 6: Grant permissions
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON time_entries TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON time_entry_breaks TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON time_entry_screenshots TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON geofences TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON time_entry_approvals TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_task_predictions TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_task_duration_estimates TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_activity_patterns TO accountech_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON time_tracking_policies TO accountech_app;

GRANT SELECT ON v_daily_time_summary TO accountech_app;
GRANT SELECT ON v_project_time_allocation TO accountech_app;
GRANT SELECT ON v_task_time_tracking TO accountech_app;
GRANT SELECT ON v_user_productivity_metrics TO accountech_app;

-- =============================================================================
-- Migration complete!
-- =============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Time Tracking Module Enhancement Migration Completed Successfully!';
    RAISE NOTICE 'Added features:';
    RAISE NOTICE '  - AI-powered task prediction and duration estimation';
    RAISE NOTICE '  - GPS/Geofencing support for location-based tracking';
    RAISE NOTICE '  - Screenshot capture and activity monitoring';
    RAISE NOTICE '  - Approval workflows with multi-level authorization';
    RAISE NOTICE '  - Break time tracking';
    RAISE NOTICE '  - Activity pattern learning for ML';
    RAISE NOTICE '  - Analytics views for reporting';
    RAISE NOTICE '  - Automated triggers for data consistency';
END $$;
