<?php
/**
 * Epic Service
 * Handles all epic-related business logic
 * Epics are large initiatives that span multiple sprints
 */

require_once __DIR__ . '/../config/database.php';

class EpicService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Get summary of all epics for a company
     */
    public function getCompanyEpicsSummary($companyId) {
        $sql = "
            SELECT
                COUNT(*) as total_epics,
                COUNT(CASE WHEN status = 'backlog' THEN 1 END) as backlog_count,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                COALESCE(SUM(story_points_completed), 0) as total_points_completed,
                COALESCE(SUM(story_points_total), 0) as total_points,
                ROUND(
                    COALESCE(SUM(story_points_completed), 0)::DECIMAL /
                    NULLIF(COALESCE(SUM(story_points_total), 0), 0) * 100,
                    2
                ) as overall_completion_percentage
            FROM epics
            WHERE company_id = $1
        ";

        $summary = $this->db->fetchOne($sql, [$companyId]);

        // Get recent epics
        $recentSql = "
            SELECT
                e.id,
                e.name,
                e.status,
                e.priority,
                p.name as project_name,
                e.story_points_completed,
                e.story_points_total,
                CASE
                    WHEN e.story_points_total > 0 THEN
                        ROUND((e.story_points_completed::DECIMAL / e.story_points_total) * 100, 2)
                    ELSE 0
                END as completion_percentage
            FROM epics e
            LEFT JOIN projects p ON e.project_id = p.id
            WHERE e.company_id = $1
            ORDER BY e.updated_at DESC
            LIMIT 10
        ";

        $recentEpics = $this->db->fetchAll($recentSql, [$companyId]);

        return [
            'summary' => $summary,
            'recent_epics' => $recentEpics
        ];
    }

    /**
     * List all epics for a project with optional filters
     */
    public function listEpics($companyId, $projectId, $filters = []) {
        $conditions = ['e.company_id = $1', 'e.project_id = $2'];
        $params = [$companyId, $projectId];
        $paramCount = 2;

        // Filter by status
        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "e.status = $$paramCount";
            $params[] = $filters['status'];
        }

        // Filter by priority
        if (!empty($filters['priority'])) {
            $paramCount++;
            $conditions[] = "e.priority = $$paramCount";
            $params[] = $filters['priority'];
        }

        // Filter by owner
        if (!empty($filters['owner_id'])) {
            $paramCount++;
            $conditions[] = "e.owner_id = $$paramCount";
            $params[] = $filters['owner_id'];
        }

        $whereClause = implode(' AND ', $conditions);

        $sql = "
            SELECT
                e.*,
                u.first_name || ' ' || u.last_name as owner_name,
                COALESCE(COUNT(DISTINCT t.id), 0) as task_count,
                COALESCE(COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END), 0) as completed_tasks,
                COALESCE(SUM(t.story_points), 0) as total_story_points,
                COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) as completed_story_points,
                ROUND(
                    COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0)::DECIMAL /
                    NULLIF(COALESCE(SUM(t.story_points), 0), 0) * 100,
                    2
                ) as completion_percentage,
                CASE
                    WHEN e.target_date IS NOT NULL AND e.target_date < CURRENT_DATE AND e.status != 'completed' THEN 'at_risk'
                    WHEN e.status = 'completed' THEN 'completed'
                    WHEN e.status = 'in_progress' THEN 'on_track'
                    ELSE 'not_started'
                END as health_status
            FROM epics e
            LEFT JOIN users u ON u.id = e.owner_id
            LEFT JOIN tasks t ON t.epic_id = e.id
            WHERE $whereClause
            GROUP BY e.id, u.first_name, u.last_name
            ORDER BY
                CASE e.priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END,
                e.created_at DESC
            LIMIT " . ($filters['limit'] ?? 100) . "
            OFFSET " . ($filters['offset'] ?? 0);

        $result = $this->db->query($sql, $params);
        return $result->fetchAll();
    }

    /**
     * Get single epic with detailed metrics and task breakdown
     */
    public function getEpic($epicId, $companyId) {
        $sql = "
            SELECT
                e.*,
                p.name as project_name,
                u.first_name || ' ' || u.last_name as owner_name,
                COALESCE(COUNT(DISTINCT t.id), 0) as task_count,
                COALESCE(COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END), 0) as completed_tasks,
                COALESCE(COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END), 0) as in_progress_tasks,
                COALESCE(COUNT(DISTINCT CASE WHEN t.status = 'blocked' THEN t.id END), 0) as blocked_tasks,
                COALESCE(SUM(t.story_points), 0) as total_story_points,
                COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) as completed_story_points,
                COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
                COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
                ROUND(
                    COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0)::DECIMAL /
                    NULLIF(COALESCE(SUM(t.story_points), 0), 0) * 100,
                    2
                ) as completion_percentage,
                CASE
                    WHEN e.target_date IS NOT NULL THEN e.target_date - CURRENT_DATE
                    ELSE NULL
                END as days_until_target,
                CASE
                    WHEN e.target_date IS NOT NULL AND e.target_date < CURRENT_DATE AND e.status != 'completed' THEN 'at_risk'
                    WHEN e.status = 'completed' THEN 'completed'
                    WHEN e.status = 'in_progress' THEN 'on_track'
                    ELSE 'not_started'
                END as health_status
            FROM epics e
            LEFT JOIN projects p ON p.id = e.project_id
            LEFT JOIN users u ON u.id = e.owner_id
            LEFT JOIN tasks t ON t.epic_id = e.id
            WHERE e.id = $1 AND e.company_id = $2
            GROUP BY e.id, p.name, u.first_name, u.last_name";

        $result = $this->db->query($sql, [$epicId, $companyId]);
        $epic = $result->fetch();

        if (!$epic) {
            throw new Exception('Epic not found', 404);
        }

        // Get task breakdown by status
        $epic['task_breakdown'] = $this->getTaskBreakdown($epicId);

        // Get sprint distribution
        $epic['sprint_distribution'] = $this->getSprintDistribution($epicId);

        return $epic;
    }

    /**
     * Create a new epic
     */
    public function createEpic($companyId, $projectId, $data, $userId) {
        // Validate required fields
        if (empty($data['name'])) {
            throw new Exception('Epic name is required');
        }

        // Validate dates if provided
        if (!empty($data['start_date']) && !empty($data['target_date'])) {
            if (strtotime($data['target_date']) <= strtotime($data['start_date'])) {
                throw new Exception('Target date must be after start date');
            }
        }

        $epicData = [
            'id' => $this->db->getConnection()->query("SELECT uuid_generate_v4()")->fetchColumn(),
            'company_id' => $companyId,
            'project_id' => $projectId,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'priority' => $data['priority'] ?? 'medium',
            'status' => $data['status'] ?? 'backlog',
            'start_date' => $data['start_date'] ?? null,
            'target_date' => $data['target_date'] ?? null,
            'owner_id' => $data['owner_id'] ?? null,
            'color' => $data['color'] ?? '#6366f1',
            'created_by' => $userId
        ];

        $sql = "
            INSERT INTO epics (
                id, company_id, project_id, name, description, priority, status,
                start_date, target_date, owner_id, color, created_by, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
            ) RETURNING id";

        $params = array_values($epicData);
        $result = $this->db->query($sql, $params);

        return $result->fetchColumn();
    }

    /**
     * Update epic
     */
    public function updateEpic($epicId, $companyId, $data) {
        $fields = [];
        $params = [];
        $paramCount = 0;

        $allowedFields = [
            'name', 'description', 'priority', 'status',
            'start_date', 'target_date', 'owner_id', 'color',
            'completed_date'
        ];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $paramCount++;
                $fields[] = "$field = $$paramCount";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return; // Nothing to update
        }

        // Auto-set completed_date if status changes to completed
        if (isset($data['status']) && $data['status'] === 'completed' && !isset($data['completed_date'])) {
            $paramCount++;
            $fields[] = "completed_date = NOW()";
        }

        $fields[] = 'updated_at = NOW()';
        $paramCount++;
        $params[] = $epicId;
        $idParam = $paramCount;
        $paramCount++;
        $params[] = $companyId;
        $companyParam = $paramCount;

        $setClause = implode(', ', $fields);
        $sql = "UPDATE epics SET $setClause WHERE id = $$idParam AND company_id = $$companyParam";

        $this->db->query($sql, $params);
    }

    /**
     * Delete (archive) epic
     */
    public function deleteEpic($epicId, $companyId) {
        // Don't actually delete, just mark as cancelled
        $sql = "UPDATE epics SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND company_id = $2";
        $this->db->query($sql, [$epicId, $companyId]);
    }

    /**
     * Get all tasks for an epic
     */
    public function getEpicTasks($epicId, $companyId, $filters = []) {
        $conditions = ['t.epic_id = $1', 't.company_id = $2'];
        $params = [$epicId, $companyId];
        $paramCount = 2;

        // Filter by status
        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "t.status = $$paramCount";
            $params[] = $filters['status'];
        }

        // Filter by sprint
        if (!empty($filters['sprint_id'])) {
            $paramCount++;
            $conditions[] = "t.sprint_id = $$paramCount";
            $params[] = $filters['sprint_id'];
        }

        // Filter by assignee
        if (!empty($filters['assignee_id'])) {
            $paramCount++;
            $conditions[] = "t.assignee_id = $$paramCount";
            $params[] = $filters['assignee_id'];
        }

        $whereClause = implode(' AND ', $conditions);

        $sql = "
            SELECT
                t.*,
                s.name as sprint_name,
                u.first_name || ' ' || u.last_name as assignee_name
            FROM tasks t
            LEFT JOIN sprints s ON s.id = t.sprint_id
            LEFT JOIN users u ON u.id = t.assignee_id
            WHERE $whereClause
            ORDER BY
                CASE t.priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END,
                t.position ASC,
                t.created_at DESC";

        $result = $this->db->query($sql, $params);
        return $result->fetchAll();
    }

    /**
     * Get task breakdown by status for an epic
     */
    private function getTaskBreakdown($epicId) {
        $sql = "
            SELECT
                status,
                COUNT(*) as count,
                COALESCE(SUM(story_points), 0) as total_points
            FROM tasks
            WHERE epic_id = $1
            GROUP BY status
            ORDER BY
                CASE status
                    WHEN 'done' THEN 1
                    WHEN 'in_review' THEN 2
                    WHEN 'in_progress' THEN 3
                    WHEN 'todo' THEN 4
                    WHEN 'blocked' THEN 5
                    WHEN 'backlog' THEN 6
                    ELSE 7
                END";

        $result = $this->db->query($sql, [$epicId]);
        return $result->fetchAll();
    }

    /**
     * Get sprint distribution for an epic
     */
    private function getSprintDistribution($epicId) {
        $sql = "
            SELECT
                s.id as sprint_id,
                s.name as sprint_name,
                s.status as sprint_status,
                COUNT(t.id) as task_count,
                COALESCE(SUM(t.story_points), 0) as total_points,
                COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) as completed_points
            FROM sprints s
            LEFT JOIN tasks t ON t.sprint_id = s.id AND t.epic_id = $1
            WHERE EXISTS (SELECT 1 FROM tasks WHERE sprint_id = s.id AND epic_id = $1)
            GROUP BY s.id, s.name, s.status
            ORDER BY s.start_date DESC";

        $result = $this->db->query($sql, [$epicId]);
        return $result->fetchAll();
    }

    /**
     * Get epic progress over time (for trend charts)
     */
    public function getEpicProgress($epicId, $companyId) {
        // Get epic creation date
        $epic = $this->db->query(
            "SELECT created_at FROM epics WHERE id = $1 AND company_id = $2",
            [$epicId, $companyId]
        )->fetch();

        if (!$epic) {
            throw new Exception('Epic not found', 404);
        }

        // Get cumulative progress by week
        $sql = "
            SELECT
                DATE_TRUNC('week', ta.created_at) as week_start,
                COUNT(DISTINCT CASE WHEN ta.action = 'status_changed' AND ta.new_value = 'done' THEN ta.task_id END) as tasks_completed,
                SUM(
                    CASE
                        WHEN ta.action = 'status_changed' AND ta.new_value = 'done'
                        THEN (SELECT story_points FROM tasks WHERE id = ta.task_id)
                        ELSE 0
                    END
                ) as points_completed
            FROM task_activity ta
            JOIN tasks t ON t.id = ta.task_id
            WHERE t.epic_id = $1
            AND ta.action = 'status_changed'
            AND ta.new_value = 'done'
            GROUP BY DATE_TRUNC('week', ta.created_at)
            ORDER BY week_start ASC";

        $result = $this->db->query($sql, [$epicId]);
        return $result->fetchAll();
    }

    /**
     * Get epic velocity (completion rate)
     */
    public function getEpicVelocity($epicId, $companyId) {
        $sql = "
            SELECT
                COUNT(CASE WHEN status = 'done' THEN 1 END)::DECIMAL /
                NULLIF(COUNT(*), 0) as task_completion_rate,
                COALESCE(SUM(CASE WHEN status = 'done' THEN story_points ELSE 0 END), 0)::DECIMAL /
                NULLIF(COALESCE(SUM(story_points), 0), 0) as story_point_completion_rate,
                AVG(
                    CASE
                        WHEN status = 'done' AND completed_date IS NOT NULL AND created_at IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (completed_date - created_at)) / 86400
                    END
                ) as avg_completion_days
            FROM tasks
            WHERE epic_id = $1
            AND company_id = $2";

        $result = $this->db->query($sql, [$epicId, $companyId]);
        return $result->fetch();
    }
}
