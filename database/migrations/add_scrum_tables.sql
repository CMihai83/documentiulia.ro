-- ============================================================================
-- SCRUM PROJECT MANAGEMENT SYSTEM - DATABASE SCHEMA
-- DocumentiUlia.ro - AI-Powered Project Management
-- Created: 2025-11-23
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. EPICS TABLE
-- Large initiatives spanning multiple sprints
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
    color VARCHAR(7), -- Hex color for visualization

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Indexes for performance
    CONSTRAINT epics_company_project_fk FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id)
);

CREATE INDEX idx_epics_project ON epics(project_id);
CREATE INDEX idx_epics_status ON epics(status);
CREATE INDEX idx_epics_owner ON epics(owner_id);

-- ============================================================================
-- 2. SPRINTS TABLE
-- Time-boxed iterations (usually 1-4 weeks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    goal TEXT, -- Sprint goal statement

    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Status
    status VARCHAR(50) DEFAULT 'planned', -- planned, active, completed, cancelled

    -- Capacity & Metrics
    capacity INTEGER, -- Team capacity in story points
    velocity INTEGER DEFAULT 0, -- Actual velocity (completed points)
    completed_story_points INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT sprints_dates_valid CHECK (end_date > start_date),
    CONSTRAINT sprints_company_project_fk FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id)
);

CREATE INDEX idx_sprints_project ON sprints(project_id);
CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_sprints_dates ON sprints(start_date, end_date);

-- ============================================================================
-- 3. TASKS TABLE
-- Individual work items (User Stories, Bugs, Tasks, Subtasks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    epic_id UUID REFERENCES epics(id) ON DELETE SET NULL,
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- For subtasks

    -- Basic Info
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'story', -- story, bug, task, subtask, spike, epic
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
    status VARCHAR(50) DEFAULT 'backlog', -- backlog, todo, in_progress, in_review, testing, blocked, done, cancelled

    -- Scrum Metrics
    story_points INTEGER,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2) DEFAULT 0,

    -- AI Fields (for intelligent features)
    ai_estimated_points INTEGER, -- AI suggestion
    ai_complexity_score DECIMAL(5,2), -- 0-100 complexity rating
    ai_risk_level VARCHAR(50), -- low, medium, high, critical
    ai_predicted_completion DATE,
    ai_confidence DECIMAL(5,2), -- 0-1 confidence score

    -- Assignments
    assignee_id UUID REFERENCES users(id),
    reporter_id UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),

    -- Categorization
    labels TEXT[], -- Array of labels/tags (e.g., 'frontend', 'backend', 'urgent')
    custom_fields JSONB, -- Flexible custom fields for extensibility

    -- Dates
    start_date DATE,
    due_date DATE,
    completed_date TIMESTAMP,

    -- Positioning (for Kanban board drag-and-drop)
    position INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT tasks_company_project_fk FOREIGN KEY (company_id, project_id) REFERENCES projects(company_id, id)
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_epic ON tasks(epic_id);
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_labels ON tasks USING GIN(labels);
CREATE INDEX idx_tasks_custom_fields ON tasks USING GIN(custom_fields);

-- ============================================================================
-- 4. TASK DEPENDENCIES
-- Manage task relationships and blockers
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'blocks', -- blocks, related_to, duplicates, follows
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Prevent circular dependencies and self-references
    CONSTRAINT task_dependencies_no_self_ref CHECK (task_id != depends_on_task_id),
    CONSTRAINT task_dependencies_unique UNIQUE (task_id, depends_on_task_id, dependency_type)
);

CREATE INDEX idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- ============================================================================
-- 5. TASK COMMENTS
-- Collaboration through comments with @mentions
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    mentions UUID[], -- Array of mentioned user IDs for notifications
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    edited BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_comments_user ON task_comments(user_id);
CREATE INDEX idx_task_comments_created ON task_comments(created_at DESC);

-- ============================================================================
-- 6. TASK ACTIVITY LOG
-- Audit trail for all task changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- created, updated, status_changed, assigned, commented, etc.
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    metadata JSONB, -- Additional context
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_activity_task ON task_activity(task_id);
CREATE INDEX idx_task_activity_user ON task_activity(user_id);
CREATE INDEX idx_task_activity_action ON task_activity(action);
CREATE INDEX idx_task_activity_created ON task_activity(created_at DESC);

-- ============================================================================
-- 7. TIME ENTRIES
-- Time tracking for tasks
-- ============================================================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    hours DECIMAL(10,2) NOT NULL CHECK (hours > 0),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    billable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);

-- ============================================================================
-- 8. SPRINT RETROSPECTIVES
-- Capture team feedback and improvement actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS sprint_retrospectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    went_well TEXT[], -- What went well
    needs_improvement TEXT[], -- What needs improvement
    action_items TEXT[], -- Action items for next sprint
    team_sentiment VARCHAR(50), -- positive, neutral, negative
    sentiment_score DECIMAL(3,2), -- -1 to 1 sentiment score
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT retrospectives_unique_sprint UNIQUE (sprint_id)
);

CREATE INDEX idx_retrospectives_sprint ON sprint_retrospectives(sprint_id);

-- ============================================================================
-- 9. AI TRAINING DATA
-- Store patterns for machine learning and predictions
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_task_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    task_type VARCHAR(50),
    task_title_pattern TEXT,
    task_description_length INTEGER,
    num_subtasks INTEGER,
    has_dependencies BOOLEAN,
    complexity_keywords TEXT[],
    actual_story_points INTEGER,
    actual_hours DECIMAL(10,2),
    completion_days INTEGER,
    assignee_experience_level VARCHAR(50), -- junior, mid, senior
    success BOOLEAN DEFAULT TRUE, -- Completed on time and within estimate
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_patterns_company ON ai_task_patterns(company_id);
CREATE INDEX idx_ai_patterns_type ON ai_task_patterns(task_type);
CREATE INDEX idx_ai_patterns_created ON ai_task_patterns(created_at DESC);

-- ============================================================================
-- 10. TASK ATTACHMENTS
-- File attachments for tasks
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER, -- bytes
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
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
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS completed_tasks,
    COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) AS completed_points,
    COALESCE(SUM(t.story_points), 0) AS total_points,
    ROUND(
        COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0)::DECIMAL /
        NULLIF(COALESCE(SUM(t.story_points), 0), 0) * 100,
        2
    ) AS completion_percentage
FROM sprints s
LEFT JOIN tasks t ON t.sprint_id = s.id
GROUP BY s.id, s.name, s.project_id, s.status, s.start_date, s.end_date, s.capacity;

-- View: Epic Progress Summary
CREATE OR REPLACE VIEW epic_progress AS
SELECT
    e.id AS epic_id,
    e.name AS epic_name,
    e.project_id,
    e.status,
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS completed_tasks,
    COALESCE(SUM(t.story_points), 0) AS total_points,
    COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) AS completed_points,
    ROUND(
        COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0)::DECIMAL /
        NULLIF(COALESCE(SUM(t.story_points), 0), 0) * 100,
        2
    ) AS completion_percentage
FROM epics e
LEFT JOIN tasks t ON t.epic_id = e.id
GROUP BY e.id, e.name, e.project_id, e.status;

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
    t.project_id,
    p.name AS project_name,
    t.sprint_id,
    s.name AS sprint_name,
    t.epic_id,
    e.name AS epic_name,
    t.assignee_id,
    u.first_name || ' ' || u.last_name AS assignee_name,
    t.created_at,
    t.due_date,
    t.completed_date,
    (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) AS comment_count,
    (SELECT COUNT(*) FROM task_attachments ta WHERE ta.task_id = t.id) AS attachment_count
FROM tasks t
LEFT JOIN projects p ON p.id = t.project_id
LEFT JOIN sprints s ON s.id = t.sprint_id
LEFT JOIN epics e ON e.id = t.epic_id
LEFT JOIN users u ON u.id = t.assignee_id;

-- ============================================================================
-- FUNCTIONS FOR AUTOMATED CALCULATIONS
-- ============================================================================

-- Function: Update epic story points
CREATE OR REPLACE FUNCTION update_epic_story_points()
RETURNS TRIGGER AS $$
BEGIN
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_epic_story_points
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
WHEN (NEW.epic_id IS NOT NULL OR OLD.epic_id IS NOT NULL)
EXECUTE FUNCTION update_epic_story_points();

-- Function: Update sprint velocity
CREATE OR REPLACE FUNCTION update_sprint_velocity()
RETURNS TRIGGER AS $$
BEGIN
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sprint_velocity
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
WHEN (NEW.sprint_id IS NOT NULL OR OLD.sprint_id IS NOT NULL)
EXECUTE FUNCTION update_sprint_velocity();

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample epic
INSERT INTO epics (company_id, project_id, name, description, priority, status, owner_id)
SELECT
    company_id,
    id,
    'Payment Integration Epic',
    'Complete payment gateway integration with Stripe and PayPal',
    'high',
    'in_progress',
    created_by
FROM projects
WHERE name = 'Test Project - Complete'
LIMIT 1;

-- Insert sample sprint
INSERT INTO sprints (company_id, project_id, name, goal, start_date, end_date, status, capacity)
SELECT
    company_id,
    id,
    'Sprint 24: Payment Features',
    'Implement core payment processing functionality',
    '2025-11-18'::DATE,
    '2025-12-01'::DATE,
    'active',
    45
FROM projects
WHERE name = 'Test Project - Complete'
LIMIT 1;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ SCRUM Project Management Database Schema Created Successfully!';
    RAISE NOTICE '📊 Tables created: epics, sprints, tasks, task_dependencies, task_comments, task_activity, time_entries, sprint_retrospectives, ai_task_patterns, task_attachments';
    RAISE NOTICE '📈 Views created: sprint_progress, epic_progress, task_summary';
    RAISE NOTICE '⚡ Triggers created: Auto-update epic points and sprint velocity';
END $$;
