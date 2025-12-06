-- ============================================================================
-- SCRUM PROJECT MANAGEMENT - INCREMENTAL MIGRATION
-- Add missing tables and columns to existing schema
-- Created: 2025-11-23
-- ============================================================================

-- ============================================================================
-- 1. CREATE EPICS TABLE (The only major table missing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS epics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
    status VARCHAR(50) DEFAULT 'backlog', -- backlog, in_progress, completed, cancelled

    -- Dates
    start_date DATE,
    target_date DATE,
    completed_date DATE,

    -- Ownership
    owner_id UUID REFERENCES users(id),

    -- Metrics
    story_points_total INTEGER DEFAULT 0,
    story_points_completed INTEGER DEFAULT 0,

    -- UI
    color VARCHAR(7) DEFAULT '#6366f1', -- Hex color for visualization (default indigo)

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_epics_project ON epics(project_id);
CREATE INDEX IF NOT EXISTS idx_epics_company ON epics(company_id);
CREATE INDEX IF NOT EXISTS idx_epics_status ON epics(status);
CREATE INDEX IF NOT EXISTS idx_epics_owner ON epics(owner_id);

COMMENT ON TABLE epics IS 'Large initiatives spanning multiple sprints (e.g., "Payment Integration", "User Management")';

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO EXISTING TASKS TABLE
-- ============================================================================

-- Add epic_id reference
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='epic_id') THEN
        ALTER TABLE tasks ADD COLUMN epic_id UUID REFERENCES epics(id) ON DELETE SET NULL;
        CREATE INDEX idx_tasks_epic ON tasks(epic_id);
    END IF;
END $$;

-- Add sprint_id reference
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='sprint_id') THEN
        ALTER TABLE tasks ADD COLUMN sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;
        CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
    END IF;
END $$;

-- Rename assigned_to to assignee_id for consistency
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assigned_to') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assignee_id') THEN
            ALTER TABLE tasks RENAME COLUMN assigned_to TO assignee_id;
        END IF;
    END IF;
END $$;

-- Add reporter_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='reporter_id') THEN
        ALTER TABLE tasks ADD COLUMN reporter_id UUID REFERENCES users(id);
    END IF;
END $$;

-- Add reviewer_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='reviewer_id') THEN
        ALTER TABLE tasks ADD COLUMN reviewer_id UUID REFERENCES users(id);
    END IF;
END $$;

-- Rename name to title for clarity
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='name') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='title') THEN
            ALTER TABLE tasks RENAME COLUMN name TO title;
        END IF;
    END IF;
END $$;

-- Rename task_type to type for simplicity
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='task_type') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='type') THEN
            ALTER TABLE tasks RENAME COLUMN type TO task_type_old;
            ALTER TABLE tasks RENAME COLUMN task_type TO type;
        END IF;
    END IF;
END $$;

-- Add story_points column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='story_points') THEN
        ALTER TABLE tasks ADD COLUMN story_points INTEGER;
    END IF;
END $$;

-- Rename tags to labels for clarity
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='tags') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='labels') THEN
            ALTER TABLE tasks RENAME COLUMN tags TO labels;
        END IF;
    END IF;
END $$;

-- Add AI columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='ai_estimated_points') THEN
        ALTER TABLE tasks ADD COLUMN ai_estimated_points INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='ai_complexity_score') THEN
        ALTER TABLE tasks ADD COLUMN ai_complexity_score DECIMAL(5,2);
        COMMENT ON COLUMN tasks.ai_complexity_score IS '0-100 AI-calculated complexity rating';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='ai_risk_level') THEN
        ALTER TABLE tasks ADD COLUMN ai_risk_level VARCHAR(50);
        COMMENT ON COLUMN tasks.ai_risk_level IS 'low, medium, high, critical - AI-predicted risk';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='ai_predicted_completion') THEN
        ALTER TABLE tasks ADD COLUMN ai_predicted_completion DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='ai_confidence') THEN
        ALTER TABLE tasks ADD COLUMN ai_confidence DECIMAL(5,2);
        COMMENT ON COLUMN tasks.ai_confidence IS '0-1 AI confidence score';
    END IF;
END $$;

-- Add position for Kanban board ordering
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='position') THEN
        ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0;
        CREATE INDEX idx_tasks_position ON tasks(position);
    END IF;
END $$;

-- Rename completed_at to completed_date for consistency
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='completed_at') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='completed_date') THEN
            ALTER TABLE tasks RENAME COLUMN completed_at TO completed_date;
        END IF;
    END IF;
END $$;

-- Add created_by
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='created_by') THEN
        ALTER TABLE tasks ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
END $$;

-- ============================================================================
-- 3. UPDATE SPRINTS TABLE - ADD MISSING COLUMNS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sprints' AND column_name='capacity') THEN
        ALTER TABLE sprints ADD COLUMN capacity INTEGER;
        COMMENT ON COLUMN sprints.capacity IS 'Team capacity in story points for this sprint';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sprints' AND column_name='velocity') THEN
        ALTER TABLE sprints ADD COLUMN velocity INTEGER DEFAULT 0;
        COMMENT ON COLUMN sprints.velocity IS 'Actual velocity (completed story points)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sprints' AND column_name='completed_story_points') THEN
        ALTER TABLE sprints ADD COLUMN completed_story_points INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sprints' AND column_name='created_by') THEN
        ALTER TABLE sprints ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
END $$;

-- ============================================================================
-- 4. CREATE USEFUL VIEWS
-- ============================================================================

-- View: Sprint Progress Summary
CREATE OR REPLACE VIEW sprint_progress AS
SELECT
    s.id AS sprint_id,
    s.name AS sprint_name,
    s.project_id,
    s.status,
    s.start_date,
    s.end_date,
    s.capacity,
    s.velocity,
    CURRENT_DATE - s.start_date AS days_elapsed,
    s.end_date - CURRENT_DATE AS days_remaining,
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS completed_tasks,
    COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) AS completed_points,
    COALESCE(SUM(t.story_points), 0) AS total_points,
    ROUND(
        COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0)::DECIMAL /
        NULLIF(COALESCE(SUM(t.story_points), 0), 0) * 100,
        2
    ) AS completion_percentage,
    CASE
        WHEN s.end_date < CURRENT_DATE THEN 'overdue'
        WHEN CURRENT_DATE >= s.start_date AND CURRENT_DATE <= s.end_date THEN 'active'
        ELSE 'upcoming'
    END AS sprint_phase
FROM sprints s
LEFT JOIN tasks t ON t.sprint_id = s.id
GROUP BY s.id, s.name, s.project_id, s.status, s.start_date, s.end_date, s.capacity, s.velocity;

COMMENT ON VIEW sprint_progress IS 'Real-time sprint progress with completion metrics';

-- View: Epic Progress Summary
CREATE OR REPLACE VIEW epic_progress AS
SELECT
    e.id AS epic_id,
    e.name AS epic_name,
    e.project_id,
    e.status,
    e.priority,
    e.start_date,
    e.target_date,
    e.color,
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS completed_tasks,
    COALESCE(SUM(t.story_points), 0) AS total_points,
    COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) AS completed_points,
    ROUND(
        COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0)::DECIMAL /
        NULLIF(COALESCE(SUM(t.story_points), 0), 0) * 100,
        2
    ) AS completion_percentage,
    CASE
        WHEN e.target_date IS NOT NULL AND e.target_date < CURRENT_DATE AND e.status != 'completed' THEN 'at_risk'
        WHEN e.status = 'completed' THEN 'completed'
        WHEN e.status = 'in_progress' THEN 'on_track'
        ELSE 'not_started'
    END AS health_status
FROM epics e
LEFT JOIN tasks t ON t.epic_id = e.id
GROUP BY e.id, e.name, e.project_id, e.status, e.priority, e.start_date, e.target_date, e.color;

COMMENT ON VIEW epic_progress IS 'Epic progress tracking with health indicators';

-- View: Task Summary with All Related Info
CREATE OR REPLACE VIEW task_summary AS
SELECT
    t.id,
    t.title,
    t.type,
    t.status,
    t.priority,
    t.story_points,
    t.estimated_hours,
    t.actual_hours,
    t.ai_risk_level,
    t.ai_complexity_score,
    t.project_id,
    p.name AS project_name,
    t.sprint_id,
    s.name AS sprint_name,
    t.epic_id,
    e.name AS epic_name,
    t.assignee_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') AS assignee_name,
    t.created_at,
    t.due_date,
    t.completed_date,
    t.labels,
    (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) AS comment_count,
    (SELECT COUNT(*) FROM task_attachments ta WHERE ta.task_id = t.id) AS attachment_count,
    (SELECT COUNT(*) FROM task_dependencies td WHERE td.task_id = t.id) AS dependency_count
FROM tasks t
LEFT JOIN projects p ON p.id = t.project_id
LEFT JOIN sprints s ON s.id = t.sprint_id
LEFT JOIN epics e ON e.id = t.epic_id
LEFT JOIN users u ON u.id = t.assignee_id;

COMMENT ON VIEW task_summary IS 'Complete task overview with all relationships';

-- ============================================================================
-- 5. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger: Update epic story points when tasks change
CREATE OR REPLACE FUNCTION update_epic_story_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Update for the new epic (if task moved to an epic)
    IF NEW.epic_id IS NOT NULL THEN
        UPDATE epics
        SET
            story_points_total = (
                SELECT COALESCE(SUM(story_points), 0)
                FROM tasks
                WHERE epic_id = NEW.epic_id
            ),
            story_points_completed = (
                SELECT COALESCE(SUM(story_points), 0)
                FROM tasks
                WHERE epic_id = NEW.epic_id AND status = 'done'
            ),
            updated_at = NOW()
        WHERE id = NEW.epic_id;
    END IF;

    -- Update for the old epic (if task moved away from an epic)
    IF OLD.epic_id IS NOT NULL AND (NEW.epic_id IS NULL OR NEW.epic_id != OLD.epic_id) THEN
        UPDATE epics
        SET
            story_points_total = (
                SELECT COALESCE(SUM(story_points), 0)
                FROM tasks
                WHERE epic_id = OLD.epic_id
            ),
            story_points_completed = (
                SELECT COALESCE(SUM(story_points), 0)
                FROM tasks
                WHERE epic_id = OLD.epic_id AND status = 'done'
            ),
            updated_at = NOW()
        WHERE id = OLD.epic_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_epic_story_points ON tasks;
CREATE TRIGGER trigger_update_epic_story_points
AFTER INSERT OR UPDATE OF epic_id, story_points, status OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_epic_story_points();

-- Trigger: Update sprint velocity when tasks change
CREATE OR REPLACE FUNCTION update_sprint_velocity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update for the new sprint (if task moved to a sprint)
    IF NEW.sprint_id IS NOT NULL THEN
        UPDATE sprints
        SET
            completed_story_points = (
                SELECT COALESCE(SUM(story_points), 0)
                FROM tasks
                WHERE sprint_id = NEW.sprint_id AND status = 'done'
            ),
            velocity = (
                SELECT COALESCE(SUM(story_points), 0)
                FROM tasks
                WHERE sprint_id = NEW.sprint_id AND status = 'done'
            ),
            updated_at = NOW()
        WHERE id = NEW.sprint_id;
    END IF;

    -- Update for the old sprint (if task moved away from a sprint)
    IF OLD.sprint_id IS NOT NULL AND (NEW.sprint_id IS NULL OR NEW.sprint_id != OLD.sprint_id) THEN
        UPDATE sprints
        SET
            completed_story_points = (
                SELECT COALESCE(SUM(story_points), 0)
                FROM tasks
                WHERE sprint_id = OLD.sprint_id AND status = 'done'
            ),
            velocity = (
                SELECT COALESCE(SUM(story_points), 0)
                FROM tasks
                WHERE sprint_id = OLD.sprint_id AND status = 'done'
            ),
            updated_at = NOW()
        WHERE id = OLD.sprint_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sprint_velocity ON tasks;
CREATE TRIGGER trigger_update_sprint_velocity
AFTER INSERT OR UPDATE OF sprint_id, story_points, status OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_sprint_velocity();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ SCRUM Database Schema Enhancement Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 New Tables:';
    RAISE NOTICE '   - epics (for large initiatives)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Updated Tables:';
    RAISE NOTICE '   - tasks: Added epic_id, sprint_id, AI fields, story_points';
    RAISE NOTICE '   - sprints: Added capacity, velocity tracking';
    RAISE NOTICE '';
    RAISE NOTICE '📈 New Views:';
    RAISE NOTICE '   - sprint_progress (real-time sprint metrics)';
    RAISE NOTICE '   - epic_progress (epic completion tracking)';
    RAISE NOTICE '   - task_summary (complete task overview)';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ Triggers:';
    RAISE NOTICE '   - Auto-update epic story points';
    RAISE NOTICE '   - Auto-update sprint velocity';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for Scrum Project Management!';
END $$;
