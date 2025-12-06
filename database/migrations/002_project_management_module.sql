-- =============================================================================
-- Migration: Project Management Module - Enterprise Features
-- Created: 2025-11-19
-- Description: Adds Gantt charts, Kanban boards, dependencies, milestones,
--              resource allocation, and advanced project tracking
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PHASE 1: Enhance existing projects table
-- =============================================================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'custom' CHECK (project_type IN ('custom', 'template', 'agile', 'waterfall', 'hybrid')),
ADD COLUMN IF NOT EXISTS methodology VARCHAR(50) DEFAULT 'agile' CHECK (methodology IN ('agile', 'scrum', 'kanban', 'waterfall', 'hybrid')),
ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'on_track' CHECK (health_status IN ('on_track', 'at_risk', 'critical', 'on_hold', 'completed')),
ADD COLUMN IF NOT EXISTS completion_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS custom_fields JSONB,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_health_status ON projects(health_status);
CREATE INDEX IF NOT EXISTS idx_projects_completion ON projects(completion_percentage);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived) WHERE archived = true;

-- =============================================================================
-- PHASE 2: Enhance existing tasks table
-- =============================================================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id),
ADD COLUMN IF NOT EXISTS task_type VARCHAR(30) DEFAULT 'task' CHECK (task_type IN ('task', 'subtask', 'milestone', 'bug', 'feature', 'epic')),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS effort_hours DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS is_critical_path BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS predecessor_constraint VARCHAR(20) DEFAULT 'FS' CHECK (predecessor_constraint IN ('FS', 'SS', 'FF', 'SF')),
ADD COLUMN IF NOT EXISTS lag_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_fields JSONB,
ADD COLUMN IF NOT EXISTS tags TEXT[];

CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_critical_path ON tasks(is_critical_path) WHERE is_critical_path = true;
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);

-- =============================================================================
-- PHASE 3: Task Dependencies (for Gantt charts)
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    predecessor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    successor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) DEFAULT 'FS' CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
    lag_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(predecessor_task_id, successor_task_id)
);

CREATE INDEX idx_task_deps_project ON task_dependencies(project_id);
CREATE INDEX idx_task_deps_predecessor ON task_dependencies(predecessor_task_id);
CREATE INDEX idx_task_deps_successor ON task_dependencies(successor_task_id);

-- =============================================================================
-- PHASE 4: Project Milestones
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'at_risk')),
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_critical BOOLEAN DEFAULT false,
    associated_tasks UUID[],
    deliverables TEXT[],
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_milestones_project ON project_milestones(project_id);
CREATE INDEX idx_milestones_due_date ON project_milestones(due_date);
CREATE INDEX idx_milestones_status ON project_milestones(status);

-- =============================================================================
-- PHASE 5: Resource Allocation
-- =============================================================================

CREATE TABLE IF NOT EXISTS resource_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(100),
    allocation_percentage DECIMAL(5,2) DEFAULT 100.00,
    hourly_rate DECIMAL(10,2),
    start_date DATE NOT NULL,
    end_date DATE,
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resource_alloc_project ON resource_allocations(project_id);
CREATE INDEX idx_resource_alloc_task ON resource_allocations(task_id);
CREATE INDEX idx_resource_alloc_user ON resource_allocations(user_id);
CREATE INDEX idx_resource_alloc_dates ON resource_allocations(start_date, end_date);

-- =============================================================================
-- PHASE 6: Kanban Boards
-- =============================================================================

CREATE TABLE IF NOT EXISTS kanban_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kanban_boards_project ON kanban_boards(project_id);

CREATE TABLE IF NOT EXISTS kanban_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    column_order INTEGER NOT NULL,
    wip_limit INTEGER,
    color VARCHAR(7),
    is_done_column BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kanban_cols_board ON kanban_columns(board_id);

CREATE TABLE IF NOT EXISTS kanban_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    card_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kanban_cards_column ON kanban_cards(column_id);
CREATE INDEX idx_kanban_cards_task ON kanban_cards(task_id);

-- =============================================================================
-- PHASE 7: Project Documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    description TEXT,
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES project_documents(id),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_proj_docs_project ON project_documents(project_id);
CREATE INDEX idx_proj_docs_task ON project_documents(task_id);
CREATE INDEX idx_proj_docs_uploaded_by ON project_documents(uploaded_by);

-- =============================================================================
-- PHASE 8: Project Risks
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('technical', 'schedule', 'budget', 'resource', 'external', 'quality', 'scope')),
    probability VARCHAR(20) CHECK (probability IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    impact VARCHAR(20) CHECK (impact IN ('very_low', 'low', 'medium', 'high', 'very_high')),
    risk_score INTEGER,
    status VARCHAR(20) DEFAULT 'identified' CHECK (status IN ('identified', 'analyzing', 'mitigating', 'monitoring', 'closed', 'occurred')),
    mitigation_plan TEXT,
    contingency_plan TEXT,
    owner_id UUID REFERENCES users(id),
    identified_date DATE DEFAULT CURRENT_DATE,
    review_date DATE,
    closed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_proj_risks_project ON project_risks(project_id);
CREATE INDEX idx_proj_risks_status ON project_risks(status);
CREATE INDEX idx_proj_risks_score ON project_risks(risk_score DESC);

-- =============================================================================
-- PHASE 9: Sprint Management (for Agile projects)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    velocity_points INTEGER,
    committed_points INTEGER,
    completed_points INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sprints_project ON sprints(project_id);
CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_sprints_dates ON sprints(start_date, end_date);

CREATE TABLE IF NOT EXISTS sprint_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    story_points INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sprint_id, task_id)
);

CREATE INDEX idx_sprint_tasks_sprint ON sprint_tasks(sprint_id);
CREATE INDEX idx_sprint_tasks_task ON sprint_tasks(task_id);

-- =============================================================================
-- PHASE 10: Project Comments/Activity
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment_text TEXT NOT NULL,
    mentions UUID[],
    attachments JSONB,
    parent_comment_id UUID REFERENCES project_comments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (project_id IS NOT NULL OR task_id IS NOT NULL)
);

CREATE INDEX idx_proj_comments_project ON project_comments(project_id);
CREATE INDEX idx_proj_comments_task ON project_comments(task_id);
CREATE INDEX idx_proj_comments_user ON project_comments(user_id);

-- =============================================================================
-- PHASE 11: Create Views for Analytics
-- =============================================================================

-- Project health dashboard view
CREATE OR REPLACE VIEW v_project_health AS
SELECT
    p.id as project_id,
    p.company_id,
    p.name as project_name,
    p.health_status,
    p.completion_percentage,
    p.start_date,
    p.end_date,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
    COUNT(DISTINCT CASE WHEN t.due_date < CURRENT_DATE AND t.status != 'completed' THEN t.id END) as overdue_tasks,
    COUNT(DISTINCT ra.user_id) as team_members,
    COALESCE(SUM(te.duration_seconds) / 3600.0, 0) as actual_hours,
    p.budget,
    COALESCE(SUM(te.billable_amount), 0) as total_cost
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
LEFT JOIN resource_allocations ra ON ra.project_id = p.id AND ra.is_active = true
LEFT JOIN time_entries te ON te.project_id = p.id
WHERE p.archived = false
GROUP BY p.id, p.company_id, p.name, p.health_status, p.completion_percentage,
         p.start_date, p.end_date, p.budget;

-- Task workload view
CREATE OR REPLACE VIEW v_task_workload AS
SELECT
    t.id as task_id,
    t.project_id,
    t.name as task_name,
    t.assigned_to,
    u.first_name || ' ' || u.last_name as assigned_to_name,
    t.status,
    t.priority,
    t.due_date,
    t.estimated_hours,
    COALESCE(SUM(te.duration_seconds) / 3600.0, 0) as actual_hours,
    t.progress_percentage,
    CASE
        WHEN t.due_date < CURRENT_DATE AND t.status != 'completed' THEN 'overdue'
        WHEN t.due_date <= CURRENT_DATE + INTERVAL '3 days' AND t.status != 'completed' THEN 'due_soon'
        ELSE 'on_track'
    END as urgency_status
FROM tasks t
LEFT JOIN users u ON t.assigned_to = u.id
LEFT JOIN time_entries te ON te.task_id = t.id
GROUP BY t.id, t.project_id, t.name, t.assigned_to, u.first_name, u.last_name,
         t.status, t.priority, t.due_date, t.estimated_hours, t.progress_percentage;

-- Resource capacity view
CREATE OR REPLACE VIEW v_resource_capacity AS
SELECT
    ra.user_id,
    u.first_name || ' ' || u.last_name as user_name,
    ra.company_id,
    COUNT(DISTINCT ra.project_id) as active_projects,
    SUM(ra.allocation_percentage) as total_allocation_pct,
    SUM(ra.estimated_hours) as total_estimated_hours,
    SUM(ra.actual_hours) as total_actual_hours,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'completed') as active_tasks
FROM resource_allocations ra
JOIN users u ON ra.user_id = u.id
LEFT JOIN tasks t ON t.project_id = ra.project_id AND t.assigned_to = ra.user_id
WHERE ra.is_active = true
  AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
GROUP BY ra.user_id, u.first_name, u.last_name, ra.company_id;

-- Critical path analysis view
CREATE OR REPLACE VIEW v_critical_path_tasks AS
SELECT
    t.id as task_id,
    t.project_id,
    p.name as project_name,
    t.name as task_name,
    t.start_date,
    t.due_date,
    t.duration_days,
    t.is_critical_path,
    t.status,
    COUNT(td.id) as dependency_count,
    t.progress_percentage
FROM tasks t
JOIN projects p ON t.project_id = p.id
LEFT JOIN task_dependencies td ON td.successor_task_id = t.id
WHERE t.is_critical_path = true
GROUP BY t.id, t.project_id, p.name, t.name, t.start_date, t.due_date,
         t.duration_days, t.is_critical_path, t.status, t.progress_percentage
ORDER BY t.start_date;

-- =============================================================================
-- PHASE 12: Triggers and Functions
-- =============================================================================

-- Update project completion percentage based on tasks
CREATE OR REPLACE FUNCTION update_project_completion()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects
    SET completion_percentage = (
        SELECT COALESCE(AVG(progress_percentage), 0)
        FROM tasks
        WHERE project_id = NEW.project_id
    ),
    updated_at = NOW()
    WHERE id = NEW.project_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_project_completion ON tasks;
CREATE TRIGGER trg_update_project_completion
    AFTER INSERT OR UPDATE OF progress_percentage ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_project_completion();

-- Calculate risk score
CREATE OR REPLACE FUNCTION calculate_risk_score()
RETURNS TRIGGER AS $$
DECLARE
    prob_value INTEGER;
    impact_value INTEGER;
BEGIN
    -- Map probability to numeric value
    prob_value := CASE NEW.probability
        WHEN 'very_low' THEN 1
        WHEN 'low' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'high' THEN 4
        WHEN 'very_high' THEN 5
        ELSE 3
    END;

    -- Map impact to numeric value
    impact_value := CASE NEW.impact
        WHEN 'very_low' THEN 1
        WHEN 'low' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'high' THEN 4
        WHEN 'very_high' THEN 5
        ELSE 3
    END;

    -- Calculate risk score (1-25)
    NEW.risk_score := prob_value * impact_value;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_risk_score ON project_risks;
CREATE TRIGGER trg_calculate_risk_score
    BEFORE INSERT OR UPDATE ON project_risks
    FOR EACH ROW
    EXECUTE FUNCTION calculate_risk_score();

-- =============================================================================
-- PHASE 13: Default data
-- =============================================================================

-- Create default Kanban columns for existing projects
INSERT INTO kanban_boards (project_id, company_id, name, is_default)
SELECT
    p.id,
    p.company_id,
    p.name || ' - Default Board',
    true
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM kanban_boards kb WHERE kb.project_id = p.id AND kb.is_default = true
);

-- Add default columns to new Kanban boards
INSERT INTO kanban_columns (board_id, name, column_order, color)
SELECT
    kb.id,
    col.name,
    col.order_num,
    col.color
FROM kanban_boards kb
CROSS JOIN (VALUES
    ('Backlog', 1, '#6B7280'),
    ('To Do', 2, '#3B82F6'),
    ('In Progress', 3, '#F59E0B'),
    ('In Review', 4, '#8B5CF6'),
    ('Done', 5, '#10B981')
) AS col(name, order_num, color)
WHERE NOT EXISTS (
    SELECT 1 FROM kanban_columns kc WHERE kc.board_id = kb.id
);

-- =============================================================================
-- Migration complete!
-- =============================================================================

SELECT 'Project Management Module Migration Completed Successfully!' as message;
