<?php

require_once __DIR__ . '/../config/database.php';

class TaskService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * List tasks with optional filters (Scrum-enhanced)
     */
    public function listTasks($companyId, $filters = []) {
        $conditions = ['t.company_id = $1'];
        $params = [$companyId];
        $paramCount = 1;

        if (!empty($filters['project_id'])) {
            $paramCount++;
            $conditions[] = "t.project_id = $$paramCount";
            $params[] = $filters['project_id'];
        }

        // Scrum filters
        if (!empty($filters['sprint_id'])) {
            $paramCount++;
            $conditions[] = "t.sprint_id = $$paramCount";
            $params[] = $filters['sprint_id'];
        }

        if (!empty($filters['epic_id'])) {
            $paramCount++;
            $conditions[] = "t.epic_id = $$paramCount";
            $params[] = $filters['epic_id'];
        }

        // Support both 'assigned_to' (legacy) and 'assignee_id' (Scrum)
        if (!empty($filters['assigned_to'])) {
            $paramCount++;
            $conditions[] = "t.assignee_id = $$paramCount";
            $params[] = $filters['assigned_to'];
        }

        if (!empty($filters['assignee_id'])) {
            $paramCount++;
            $conditions[] = "t.assignee_id = $$paramCount";
            $params[] = $filters['assignee_id'];
        }

        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "t.status = $$paramCount";
            $params[] = $filters['status'];
        }

        if (!empty($filters['priority'])) {
            $paramCount++;
            $conditions[] = "t.priority = $$paramCount";
            $params[] = $filters['priority'];
        }

        if (!empty($filters['type']) || !empty($filters['task_type'])) {
            $paramCount++;
            $conditions[] = "t.task_type = $$paramCount";
            $params[] = $filters['task_type'] ?? $filters['type'];
        }

        if (!empty($filters['search'])) {
            $paramCount++;
            $conditions[] = "(t.title ILIKE $$paramCount OR t.description ILIKE $$paramCount)";
            $params[] = '%' . $filters['search'] . '%';
        }

        $whereClause = implode(' AND ', $conditions);

        $query = "
            SELECT
                t.*,
                t.title as task_title,
                p.name as project_name,
                p.color as project_color,
                s.name as sprint_name,
                s.status as sprint_status,
                e.name as epic_name,
                e.color as epic_color,
                u.first_name || ' ' || u.last_name as assignee_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN sprints s ON t.sprint_id = s.id
            LEFT JOIN epics e ON t.epic_id = e.id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE $whereClause
            ORDER BY
                t.position ASC,
                CASE t.priority
                    WHEN 'critical' THEN 1
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                t.due_date ASC NULLS LAST,
                t.created_at DESC
        ";

        return $this->db->fetchAll($query, $params);
    }

    /**
     * Get single task by ID
     */
    public function getTask($id, $companyId) {
        return $this->db->fetchOne(
            "SELECT
                t.*,
                p.name as project_name,
                p.color as project_color,
                u.first_name || ' ' || u.last_name as assigned_to_name
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             LEFT JOIN users u ON t.assignee_id = u.id
             WHERE t.id = $1 AND t.company_id = $2",
            [$id, $companyId]
        );
    }

    /**
     * Create new task (Scrum-enhanced)
     */
    public function createTask($companyId, $data, $userId = null) {
        $query = "
            INSERT INTO tasks (
                company_id, project_id, title, description, status,
                priority, task_type, assignee_id,
                sprint_id, epic_id, story_points,
                estimated_hours, due_date, position, labels,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id
        ";

        $title = $data['title'] ?? $data['name'] ?? 'Untitled Task';

        $result = $this->db->fetchOne($query, [
            $companyId,
            $data['project_id'] ?? null,
            $title,
            $data['description'] ?? null,
            $data['status'] ?? 'backlog',
            $data['priority'] ?? 'medium',
            $data['task_type'] ?? $data['type'] ?? 'task',
            $data['assignee_id'] ?? $data['assigned_to'] ?? null,
            $data['sprint_id'] ?? null,
            $data['epic_id'] ?? null,
            isset($data['story_points']) ? (int)$data['story_points'] : null,
            $data['estimated_hours'] ?? null,
            $data['due_date'] ?? null,
            $data['position'] ?? 0,
            isset($data['labels']) && is_array($data['labels']) ? '{' . implode(',', $data['labels']) . '}' : null,
            $userId
        ]);

        return $result['id'];
    }

    /**
     * Update task (Scrum-enhanced)
     */
    public function updateTask($id, $companyId, $data) {
        $fields = [];
        $params = [];
        $paramCount = 0;

        $allowedFields = [
            'project_id', 'title', 'description', 'status', 'priority', 'task_type',
            'assignee_id', 'reporter_id', 'reviewer_id',
            'sprint_id', 'epic_id', 'story_points',
            'estimated_hours', 'actual_hours', 'due_date', 'start_date',
            'position', 'labels'
        ];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $paramCount++;
                if ($field === 'labels' && is_array($data[$field])) {
                    $fields[] = "$field = $$paramCount";
                    $params[] = '{' . implode(',', $data[$field]) . '}';
                } else {
                    $fields[] = "$field = $$paramCount";
                    $params[] = $data[$field];
                }
            }
        }

        // Support 'name' for backward compatibility (map to title)
        if (isset($data['name']) && !isset($data['title'])) {
            $paramCount++;
            $fields[] = "title = $$paramCount";
            $params[] = $data['name'];
        }

        // Support 'assigned_to' for backward compatibility (map to assignee_id)
        if (isset($data['assigned_to']) && !isset($data['assignee_id'])) {
            $paramCount++;
            $fields[] = "assignee_id = $$paramCount";
            $params[] = $data['assigned_to'];
        }

        // Support 'type' for backward compatibility (map to task_type)
        if (isset($data['type']) && !isset($data['task_type'])) {
            $paramCount++;
            $fields[] = "task_type = $$paramCount";
            $params[] = $data['type'];
        }

        // Auto-set completed_date when status changes to done
        if (isset($data['status']) && $data['status'] === 'done') {
            $paramCount++;
            $fields[] = "completed_date = $$paramCount";
            $params[] = date('Y-m-d H:i:s');
        } elseif (isset($data['status']) && $data['status'] !== 'done') {
            $fields[] = "completed_date = NULL";
        }

        if (empty($fields)) {
            return;
        }

        $paramCount++;
        $params[] = $id;
        $idParam = $paramCount;

        $paramCount++;
        $params[] = $companyId;
        $companyParam = $paramCount;

        $setClause = implode(', ', $fields);
        $query = "UPDATE tasks SET $setClause, updated_at = NOW() WHERE id = $$idParam AND company_id = $$companyParam";

        $this->db->query($query, $params);
    }

    /**
     * Delete task
     */
    public function deleteTask($id, $companyId) {
        $this->db->query(
            "DELETE FROM tasks WHERE id = $1 AND company_id = $2",
            [$id, $companyId]
        );
    }

    /**
     * Get task board (Kanban view)
     */
    public function getTaskBoard($companyId, $projectId = null) {
        $conditions = ['company_id = $1'];
        $params = [$companyId];

        if ($projectId) {
            $conditions[] = 'project_id = $2';
            $params[] = $projectId;
        }

        $whereClause = implode(' AND ', $conditions);

        $tasks = $this->db->fetchAll(
            "SELECT
                t.*,
                p.name as project_name,
                p.color as project_color,
                u.first_name || ' ' || u.last_name as assigned_to_name
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             LEFT JOIN users u ON t.assignee_id = u.id
             WHERE $whereClause
             ORDER BY t.created_at DESC",
            $params
        );

        // Group by status
        $board = [
            'todo' => [],
            'in_progress' => [],
            'review' => [],
            'done' => []
        ];

        foreach ($tasks as $task) {
            $status = $task['status'] ?? 'todo';
            if (!isset($board[$status])) {
                $board[$status] = [];
            }
            $board[$status][] = $task;
        }

        return $board;
    }

    /**
     * Get user's tasks
     */
    public function getUserTasks($companyId, $userId) {
        return $this->db->fetchAll(
            "SELECT
                t.*,
                p.name as project_name,
                p.color as project_color
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             WHERE t.company_id = $1 AND t.assignee_id = $2
             ORDER BY
                CASE t.status
                    WHEN 'in_progress' THEN 1
                    WHEN 'review' THEN 2
                    WHEN 'todo' THEN 3
                    ELSE 4
                END,
                t.due_date ASC NULLS LAST",
            [$companyId, $userId]
        );
    }

    /**
     * Get Sprint Board (Kanban view for a sprint)
     */
    public function getSprintBoard($companyId, $sprintId) {
        $tasks = $this->db->fetchAll(
            "SELECT
                t.*,
                t.title as task_title,
                p.name as project_name,
                e.name as epic_name,
                e.color as epic_color,
                u.first_name || ' ' || u.last_name as assignee_name
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             LEFT JOIN epics e ON t.epic_id = e.id
             LEFT JOIN users u ON t.assignee_id = u.id
             WHERE t.company_id = $1 AND t.sprint_id = $2
             ORDER BY t.position ASC, t.created_at DESC",
            [$companyId, $sprintId]
        );

        // Group by status for Kanban board
        $board = [
            'backlog' => [],
            'todo' => [],
            'in_progress' => [],
            'in_review' => [],
            'testing' => [],
            'blocked' => [],
            'done' => []
        ];

        foreach ($tasks as $task) {
            $status = $task['status'] ?? 'backlog';
            if (!isset($board[$status])) {
                $board[$status] = [];
            }
            $board[$status][] = $task;
        }

        return $board;
    }

    /**
     * Get Active Sprint Board (Company-wide view of tasks in active sprints)
     */
    public function getActiveSprintBoard($companyId) {
        $tasks = $this->db->fetchAll(
            "SELECT
                t.*,
                t.title as task_title,
                p.name as project_name,
                s.name as sprint_name,
                e.name as epic_name,
                e.color as epic_color,
                u.first_name || ' ' || u.last_name as assignee_name
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             LEFT JOIN sprints s ON t.sprint_id = s.id
             LEFT JOIN epics e ON t.epic_id = e.id
             LEFT JOIN users u ON t.assignee_id = u.id
             WHERE t.company_id = $1
             AND s.status = 'active'
             ORDER BY t.position ASC, t.created_at DESC",
            [$companyId]
        );

        // Group by status for Kanban board
        $board = [
            'backlog' => [],
            'todo' => [],
            'in_progress' => [],
            'in_review' => [],
            'testing' => [],
            'blocked' => [],
            'done' => []
        ];

        foreach ($tasks as $task) {
            $status = $task['status'] ?? 'backlog';
            if (!isset($board[$status])) {
                $board[$status] = [];
            }
            $board[$status][] = $task;
        }

        return $board;
    }

    /**
     * Get Product Backlog (unassigned tasks for a project)
     */
    public function getProductBacklog($companyId, $projectId) {
        return $this->db->fetchAll(
            "SELECT
                t.*,
                t.title as task_title,
                e.name as epic_name,
                e.color as epic_color,
                u.first_name || ' ' || u.last_name as assignee_name
             FROM tasks t
             LEFT JOIN epics e ON t.epic_id = e.id
             LEFT JOIN users u ON t.assignee_id = u.id
             WHERE t.company_id = $1
             AND t.project_id = $2
             AND t.sprint_id IS NULL
             AND t.status != 'done'
             ORDER BY
                CASE t.priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                t.position ASC,
                t.created_at DESC",
            [$companyId, $projectId]
        );
    }

    /**
     * Get Company-wide Backlog (unassigned tasks across all projects)
     */
    public function getCompanyBacklog($companyId) {
        return $this->db->fetchAll(
            "SELECT
                t.*,
                t.title as task_title,
                p.name as project_name,
                e.name as epic_name,
                e.color as epic_color,
                u.first_name || ' ' || u.last_name as assignee_name
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             LEFT JOIN epics e ON t.epic_id = e.id
             LEFT JOIN users u ON t.assignee_id = u.id
             WHERE t.company_id = $1
             AND t.sprint_id IS NULL
             AND t.status != 'done'
             ORDER BY
                CASE t.priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                t.position ASC,
                t.created_at DESC
             LIMIT 100",
            [$companyId]
        );
    }

    /**
     * Update task position (for Kanban drag-and-drop)
     */
    public function updateTaskPosition($id, $companyId, $newPosition, $newStatus = null) {
        $fields = ['position = $1'];
        $params = [$newPosition];
        $paramCount = 1;

        if ($newStatus !== null) {
            $paramCount++;
            $fields[] = "status = $$paramCount";
            $params[] = $newStatus;

            // Auto-set completed_date if moving to 'done'
            if ($newStatus === 'done') {
                $fields[] = "completed_date = NOW()";
            } elseif ($newStatus !== 'done') {
                $fields[] = "completed_date = NULL";
            }
        }

        $paramCount++;
        $params[] = $id;
        $paramCount++;
        $params[] = $companyId;

        $setClause = implode(', ', $fields);
        $this->db->query(
            "UPDATE tasks SET $setClause, updated_at = NOW() WHERE id = $$paramCount AND company_id = $" . ($paramCount + 1),
            $params
        );
    }

    /**
     * Bulk update tasks (e.g., assign multiple tasks to a sprint)
     */
    public function bulkUpdateTasks($companyId, $taskIds, $data) {
        if (empty($taskIds)) {
            return;
        }

        $fields = [];
        $params = [$companyId];
        $paramCount = 1;

        $allowedFields = ['sprint_id', 'epic_id', 'assignee_id', 'status', 'priority'];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $paramCount++;
                $fields[] = "$field = $$paramCount";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return;
        }

        // Build IN clause for task IDs
        $idPlaceholders = [];
        foreach ($taskIds as $taskId) {
            $paramCount++;
            $idPlaceholders[] = "$$paramCount";
            $params[] = $taskId;
        }
        $inClause = implode(', ', $idPlaceholders);

        $setClause = implode(', ', $fields);
        $query = "UPDATE tasks SET $setClause, updated_at = NOW() WHERE company_id = $1 AND id IN ($inClause)";

        $this->db->query($query, $params);
    }
}
