<?php
/**
 * Project Management Service - Enterprise Edition
 *
 * Comprehensive service for managing projects with:
 * - Gantt chart calculations (critical path, dependencies)
 * - Kanban board operations
 * - Resource allocation
 * - Milestone tracking
 * - Risk management
 * - Sprint management (Agile/Scrum)
 * - Document handling
 * - Advanced analytics
 *
 * @version 2.0.0
 * @author DocumentiUlia Enterprise Suite
 */

require_once __DIR__ . '/../config/database.php';

class ProjectService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    // ==================== CORE PROJECT CRUD ====================

    /**
     * List projects with advanced filtering
     *
     * @param string $companyId Company UUID
     * @param array $filters Optional filters (status, health_status, methodology, created_by, tags, search, limit, offset)
     * @return array List of projects with metadata
     */
    public function listProjects($companyId, $filters = []) {
        $conditions = ['p.company_id = $1'];
        $params = [$companyId];
        $paramCount = 1;

        // Status filter
        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "p.status = $$paramCount";
            $params[] = $filters['status'];
        }

        // Health status filter
        if (!empty($filters['health_status'])) {
            $paramCount++;
            $conditions[] = "p.health_status = $$paramCount";
            $params[] = $filters['health_status'];
        }

        // Methodology filter (agile, scrum, kanban, waterfall, hybrid)
        if (!empty($filters['methodology'])) {
            $paramCount++;
            $conditions[] = "p.methodology = $$paramCount";
            $params[] = $filters['methodology'];
        }

        // Creator/Manager filter
        if (!empty($filters['created_by'])) {
            $paramCount++;
            $conditions[] = "p.created_by = $$paramCount";
            $params[] = $filters['created_by'];
        }

        // Client/customer filter (backward compatibility)
        if (!empty($filters['client_id'])) {
            $paramCount++;
            $conditions[] = "p.client_id = $$paramCount";
            $params[] = $filters['client_id'];
        }

        // Tags filter (array contains)
        if (!empty($filters['tags'])) {
            $paramCount++;
            $conditions[] = "p.tags @> $$paramCount";
            $params[] = '{' . implode(',', $filters['tags']) . '}';
        }

        // Search filter
        if (!empty($filters['search'])) {
            $paramCount++;
            $conditions[] = "(p.name ILIKE $$paramCount OR p.description ILIKE $$paramCount)";
            $params[] = '%' . $filters['search'] . '%';
        }

        $whereClause = implode(' AND ', $conditions);
        $limit = $filters['limit'] ?? 100;
        $offset = $filters['offset'] ?? 0;

        $paramCount++;
        $params[] = $limit;
        $limitParam = $paramCount;

        $paramCount++;
        $params[] = $offset;
        $offsetParam = $paramCount;

        $query = "
            SELECT
                p.*,
                u.first_name || ' ' || u.last_name as creator_name,
                COALESCE(ct.display_name, cust.name) as client_name,
                (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
                (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') as completed_task_count,
                (SELECT SUM(actual_hours) FROM tasks WHERE project_id = p.id) as total_hours,
                (SELECT SUM(estimated_hours) FROM tasks WHERE project_id = p.id) as estimated_hours
            FROM projects p
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN contacts ct ON p.client_id = ct.id
            LEFT JOIN customers cust ON p.client_id = cust.id
            WHERE $whereClause
            ORDER BY p.created_at DESC
            LIMIT $$limitParam OFFSET $$offsetParam
        ";

        return $this->db->fetchAll($query, $params);
    }

    /**
     * Get single project with full details including team, milestones, and activity
     *
     * @param string $projectId Project UUID
     * @param string $companyId Company UUID
     * @return array Project details with related data
     * @throws Exception if project not found
     */
    public function getProject($projectId, $companyId) {
        $project = $this->db->fetchOne(
            "SELECT p.*,
                    u.first_name || ' ' || u.last_name as manager_name,
                    c.name as customer_name,
                    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
                    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') as completed_task_count,
                    (SELECT COUNT(*) FROM project_risks WHERE project_id = p.id AND status = 'open') as open_risks_count,
                    (SELECT SUM(allocated_percentage) FROM resource_allocations WHERE project_id = p.id) as total_allocation,
                    (SELECT SUM(actual_hours) FROM tasks WHERE project_id = p.id) as total_hours,
                    (SELECT SUM(estimated_hours) FROM tasks WHERE project_id = p.id) as estimated_hours
             FROM projects p
             LEFT JOIN users u ON p.created_by = u.id
             LEFT JOIN contacts c ON p.client_id = c.id
             WHERE p.id = $1 AND p.company_id = $2",
            [$projectId, $companyId]
        );

        if (!$project) {
            throw new Exception('Project not found');
        }

        // Get milestones
        $project['milestones'] = $this->getProjectMilestones($projectId);

        // Get team members
        $project['team'] = $this->getProjectTeam($projectId);

        // Get recent activity
        $project['recent_comments'] = $this->db->fetchAll(
            "SELECT pc.*, u.first_name || ' ' || u.last_name as author_name
             FROM project_comments pc
             LEFT JOIN users u ON pc.user_id = u.id
             WHERE pc.project_id = $1
             ORDER BY pc.created_at DESC
             LIMIT 5",
            [$projectId]
        );

        return $project;
    }

    /**
     * Create new project with default Kanban board
     *
     * @param string $companyId Company UUID
     * @param array $data Project data
     * @param string|null $userId Optional user ID for audit
     * @return string New project ID
     * @throws Exception if name is missing
     */
    public function createProject($companyId, $data, $userId = null) {
        // Validate required fields
        if (empty($data['name'])) {
            throw new Exception('Project name is required');
        }

        // Prepare parameters array
        $params = [
            $companyId,                                                      // $1 - company_id
            $data['name'],                                                   // $2 - name
            $data['description'] ?? null,                                    // $3 - description
            $data['status'] ?? 'planning',                                   // $4 - status
            $data['health_status'] ?? 'on_track',                           // $5 - health_status
            $data['customer_id'] ?? $data['client_id'] ?? null,             // $6 - client_id
            $userId,                                                         // $7 - created_by
            $data['start_date'] ?? null,                                     // $8 - start_date
            $data['end_date'] ?? null,                                       // $9 - end_date
            $data['budget'] ?? null,                                         // $10 - budget
            $data['methodology'] ?? 'agile',                                 // $11 - methodology
            $data['priority'] ?? 'medium',                                   // $12 - priority
            isset($data['tags']) ? '{' . implode(',', $data['tags']) . '}' : null,  // $13 - tags
            isset($data['custom_fields']) ? json_encode($data['custom_fields']) : null  // $14 - custom_fields
        ];

        $result = $this->db->fetchOne(
            "INSERT INTO projects (
                company_id, name, description, status, health_status,
                client_id, created_by, start_date, end_date, budget,
                methodology, priority, tags, custom_fields
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id",
            $params
        );

        $projectId = $result['id'];

        // Temporarily disabled - causing crashes
        // $this->createDefaultKanbanBoard($projectId, $companyId);
        // $this->addProjectComment($projectId, $userId, 'Project created', 'system');

        return $projectId;
    }

    /**
     * Update project
     *
     * @param string $projectId Project UUID
     * @param string $companyId Company UUID
     * @param array $data Update data
     */
    public function updateProject($projectId, $companyId, $data) {
        $fields = [];
        $params = [];
        $paramCount = 0;

        $allowedFields = [
            'name', 'description', 'status', 'health_status', 'customer_id',
            'manager_id', 'start_date', 'end_date', 'budget', 'methodology',
            'priority', 'completion_percentage', 'color', 'is_billable',
            'default_hourly_rate', 'budget_type', 'currency'
        ];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $paramCount++;
                $fields[] = "$field = $$paramCount";
                $params[] = $data[$field];
            }
        }

        // Handle client_id as alias for customer_id (backward compatibility)
        if (isset($data['client_id']) && !isset($data['customer_id'])) {
            $paramCount++;
            $fields[] = "customer_id = $$paramCount";
            $params[] = $data['client_id'];
        }

        if (isset($data['tags'])) {
            $paramCount++;
            $fields[] = "tags = $$paramCount";
            $params[] = '{' . implode(',', $data['tags']) . '}';
        }

        if (isset($data['custom_fields'])) {
            $paramCount++;
            $fields[] = "custom_fields = $$paramCount";
            $params[] = json_encode($data['custom_fields']);
        }

        if (empty($fields)) {
            return;
        }

        $fields[] = 'updated_at = NOW()';
        $paramCount++;
        $params[] = $projectId;
        $idParam = $paramCount;
        $paramCount++;
        $params[] = $companyId;
        $companyParam = $paramCount;

        $setClause = implode(', ', $fields);
        $this->db->query(
            "UPDATE projects SET $setClause WHERE id = $$idParam AND company_id = $$companyParam",
            $params
        );
    }

    /**
     * Delete project (soft delete by archiving)
     *
     * @param string $projectId Project UUID
     * @param string $companyId Company UUID
     */
    public function deleteProject($projectId, $companyId) {
        $this->db->query(
            "UPDATE projects SET status = 'archived', updated_at = NOW()
             WHERE id = $1 AND company_id = $2",
            [$projectId, $companyId]
        );
    }

    // ==================== GANTT CHART & DEPENDENCIES ====================

    /**
     * Get Gantt chart data with dependencies and critical path
     *
     * @param string $projectId Project UUID
     * @param string $companyId Company UUID
     * @return array Gantt data with tasks, links, and critical path
     * @throws Exception if project not found
     */
    public function getGanttData($projectId, $companyId) {
        // Verify project access
        $project = $this->db->fetchOne(
            "SELECT id FROM projects WHERE id = $1 AND company_id = $2",
            [$projectId, $companyId]
        );

        if (!$project) {
            throw new Exception('Project not found');
        }

        // Get all tasks
        $tasks = $this->db->fetchAll(
            "SELECT t.*,
                    u.first_name || ' ' || u.last_name as assignee_name,
                    COALESCE(t.estimated_hours, 0) as duration
             FROM tasks t
             LEFT JOIN users u ON t.assigned_to = u.id
             WHERE t.project_id = $1
             ORDER BY t.start_date, t.created_at",
            [$projectId]
        );

        // Get dependencies
        $dependencies = $this->db->fetchAll(
            "SELECT * FROM task_dependencies WHERE project_id = $1",
            [$projectId]
        );

        // Format for Gantt library (DHTMLX Gantt compatible)
        $ganttTasks = [];
        foreach ($tasks as $task) {
            $ganttTasks[] = [
                'id' => $task['id'],
                'text' => $task['title'],
                'start_date' => $task['start_date'],
                'end_date' => $task['due_date'],
                'duration' => $task['duration'] ?? 0,
                'progress' => ($task['status'] === 'completed' ? 1.0 : 0.5),
                'priority' => $task['priority'],
                'assignee' => $task['assignee_name'],
                'status' => $task['status']
            ];
        }

        $ganttLinks = [];
        foreach ($dependencies as $dep) {
            $ganttLinks[] = [
                'id' => $dep['id'],
                'source' => $dep['predecessor_task_id'],
                'target' => $dep['successor_task_id'],
                'type' => $this->mapDependencyType($dep['dependency_type']),
                'lag' => $dep['lag_days']
            ];
        }

        return [
            'tasks' => $ganttTasks,
            'links' => $ganttLinks,
            'critical_path' => $this->calculateCriticalPath($projectId)
        ];
    }

    /**
     * Calculate critical path using forward/backward pass algorithm
     *
     * @param string $projectId Project UUID
     * @return array Critical path analysis
     */
    public function calculateCriticalPath($projectId) {
        // Get all tasks and dependencies
        $tasks = $this->db->fetchAll(
            "SELECT id, title, estimated_hours, start_date, due_date
             FROM tasks
             WHERE project_id = $1",
            [$projectId]
        );

        $dependencies = $this->db->fetchAll(
            "SELECT predecessor_task_id, successor_task_id, lag_days
             FROM task_dependencies
             WHERE project_id = $1",
            [$projectId]
        );

        // Build adjacency list
        $graph = [];
        $taskMap = [];
        foreach ($tasks as $task) {
            $taskMap[$task['id']] = $task;
            $graph[$task['id']] = [];
        }

        foreach ($dependencies as $dep) {
            $graph[$dep['predecessor_task_id']][] = [
                'target' => $dep['successor_task_id'],
                'lag' => $dep['lag_days']
            ];
        }

        // Forward pass - calculate earliest start/finish
        $earliestStart = [];
        $earliestFinish = [];

        foreach ($tasks as $task) {
            $taskId = $task['id'];
            $duration = $task['estimated_hours'] ?? 0;

            // Find max earliest finish of predecessors
            $maxPredFinish = 0;
            foreach ($dependencies as $dep) {
                if ($dep['successor_task_id'] === $taskId) {
                    $predId = $dep['predecessor_task_id'];
                    if (isset($earliestFinish[$predId])) {
                        $maxPredFinish = max($maxPredFinish, $earliestFinish[$predId] + $dep['lag_days']);
                    }
                }
            }

            $earliestStart[$taskId] = $maxPredFinish;
            $earliestFinish[$taskId] = $maxPredFinish + $duration;
        }

        // Backward pass - calculate latest start/finish
        $projectFinish = !empty($earliestFinish) ? max($earliestFinish) : 0;
        $latestFinish = [];
        $latestStart = [];

        foreach (array_reverse($tasks) as $task) {
            $taskId = $task['id'];
            $duration = $task['estimated_hours'] ?? 0;

            // Find min latest start of successors
            $minSuccStart = $projectFinish;
            foreach ($dependencies as $dep) {
                if ($dep['predecessor_task_id'] === $taskId) {
                    $succId = $dep['successor_task_id'];
                    if (isset($latestStart[$succId])) {
                        $minSuccStart = min($minSuccStart, $latestStart[$succId] - $dep['lag_days']);
                    }
                }
            }

            $latestFinish[$taskId] = $minSuccStart;
            $latestStart[$taskId] = $minSuccStart - $duration;
        }

        // Identify critical path (tasks with zero slack)
        $criticalPath = [];
        foreach ($tasks as $task) {
            $taskId = $task['id'];
            $slack = ($latestStart[$taskId] ?? 0) - ($earliestStart[$taskId] ?? 0);

            if (abs($slack) <= 0.1) { // Allow small floating point error
                $criticalPath[] = [
                    'task_id' => $taskId,
                    'title' => $task['title'],
                    'earliest_start' => $earliestStart[$taskId] ?? 0,
                    'latest_start' => $latestStart[$taskId] ?? 0,
                    'slack' => $slack
                ];
            }
        }

        return [
            'critical_tasks' => $criticalPath,
            'project_duration' => $projectFinish,
            'total_tasks' => count($tasks),
            'critical_task_count' => count($criticalPath)
        ];
    }

    /**
     * Add task dependency with circular detection
     *
     * @param string $projectId Project UUID
     * @param string $companyId Company UUID
     * @param array $data Dependency data (predecessor_task_id, successor_task_id, dependency_type, lag_days)
     * @return string New dependency ID
     * @throws Exception if validation fails
     */
    public function addTaskDependency($projectId, $companyId, $data) {
        if (empty($data['predecessor_task_id']) || empty($data['successor_task_id'])) {
            throw new Exception('Both predecessor and successor task IDs are required');
        }

        // Check for circular dependencies
        if ($this->hasCircularDependency($data['predecessor_task_id'], $data['successor_task_id'], $projectId)) {
            throw new Exception('Circular dependency detected');
        }

        $result = $this->db->fetchOne(
            "INSERT INTO task_dependencies (
                project_id, predecessor_task_id, successor_task_id,
                dependency_type, lag_days
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING id",
            [
                $projectId,
                $data['predecessor_task_id'],
                $data['successor_task_id'],
                $data['dependency_type'] ?? 'FS',
                $data['lag_days'] ?? 0
            ]
        );

        return $result['id'];
    }

    /**
     * Check for circular dependencies using DFS
     *
     * @param string $fromTaskId Starting task
     * @param string $toTaskId Target task
     * @param string $projectId Project UUID
     * @param array $visited Visited tasks
     * @return bool True if circular dependency exists
     */
    private function hasCircularDependency($fromTaskId, $toTaskId, $projectId, $visited = []) {
        if ($fromTaskId === $toTaskId) {
            return true;
        }

        if (in_array($fromTaskId, $visited)) {
            return false;
        }

        $visited[] = $fromTaskId;

        $successors = $this->db->fetchAll(
            "SELECT successor_task_id FROM task_dependencies
             WHERE project_id = $1 AND predecessor_task_id = $2",
            [$projectId, $fromTaskId]
        );

        foreach ($successors as $successor) {
            if ($this->hasCircularDependency($successor['successor_task_id'], $toTaskId, $projectId, $visited)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Map dependency type to Gantt library format
     * FS (Finish-to-Start) = 0, SS (Start-to-Start) = 1,
     * FF (Finish-to-Finish) = 2, SF (Start-to-Finish) = 3
     */
    private function mapDependencyType($type) {
        $map = [
            'FS' => 0,
            'SS' => 1,
            'FF' => 2,
            'SF' => 3
        ];
        return $map[$type] ?? 0;
    }

    // ==================== KANBAN BOARD OPERATIONS ====================

    /**
     * Get Kanban board with columns and cards
     *
     * @param string $projectId Project UUID
     * @param string $companyId Company UUID
     * @return array Kanban board with columns and cards
     * @throws Exception if board not found
     */
    public function getKanbanBoard($projectId, $companyId) {
        $board = $this->db->fetchOne(
            "SELECT kb.*, p.name as project_name
             FROM kanban_boards kb
             LEFT JOIN projects p ON kb.project_id = p.id
             WHERE kb.project_id = $1 AND p.company_id = $2
             LIMIT 1",
            [$projectId, $companyId]
        );

        if (!$board) {
            throw new Exception('Kanban board not found');
        }

        // Get columns with cards
        $columns = $this->db->fetchAll(
            "SELECT kc.*,
                    (SELECT COUNT(*) FROM kanban_cards WHERE column_id = kc.id) as card_count
             FROM kanban_columns kc
             WHERE kc.board_id = $1
             ORDER BY kc.position",
            [$board['id']]
        );

        foreach ($columns as &$column) {
            $column['cards'] = $this->db->fetchAll(
                "SELECT kca.*,
                        t.title, t.description, t.priority, t.due_date,
                        u.first_name || ' ' || u.last_name as assignee_name
                 FROM kanban_cards kca
                 LEFT JOIN tasks t ON kca.task_id = t.id
                 LEFT JOIN users u ON t.assigned_to = u.id
                 WHERE kca.column_id = $1
                 ORDER BY kca.position",
                [$column['id']]
            );
        }

        $board['columns'] = $columns;

        return $board;
    }

    /**
     * Get all Kanban boards for a company across all projects
     */
    public function getAllKanbanBoards($companyId) {
        $boards = $this->db->fetchAll(
            "SELECT kb.*, p.name as project_name,
                    (SELECT COUNT(*) FROM kanban_columns WHERE board_id = kb.id) as column_count
             FROM kanban_boards kb
             LEFT JOIN projects p ON kb.project_id = p.id
             WHERE p.company_id = $1
             ORDER BY p.name, kb.name",
            [$companyId]
        );

        return $boards;
    }

    /**
     * Move Kanban card to different column
     *
     * @param string $cardId Card UUID
     * @param string $newColumnId New column UUID
     * @param int $newPosition New position in column
     * @param string $companyId Company UUID
     * @throws Exception if card not found or access denied
     */
    public function moveKanbanCard($cardId, $newColumnId, $newPosition, $companyId) {
        // Verify access
        $card = $this->db->fetchOne(
            "SELECT kca.*, kb.project_id, p.company_id
             FROM kanban_cards kca
             LEFT JOIN kanban_columns kc ON kca.column_id = kc.id
             LEFT JOIN kanban_boards kb ON kc.board_id = kb.id
             LEFT JOIN projects p ON kb.project_id = p.id
             WHERE kca.id = $1",
            [$cardId]
        );

        if (!$card || $card['company_id'] !== $companyId) {
            throw new Exception('Card not found or access denied');
        }

        // Update card position
        $this->db->query(
            "UPDATE kanban_cards
             SET column_id = $1, position = $2, updated_at = NOW()
             WHERE id = $3",
            [$newColumnId, $newPosition, $cardId]
        );

        // Update task status based on column
        $newColumn = $this->db->fetchOne(
            "SELECT status_mapping FROM kanban_columns WHERE id = $1",
            [$newColumnId]
        );

        if ($newColumn && !empty($newColumn['status_mapping'])) {
            $this->db->query(
                "UPDATE tasks SET status = $1 WHERE id = $2",
                [$newColumn['status_mapping'], $card['task_id']]
            );
        }
    }

    /**
     * Create default Kanban board for new project
     */
    private function createDefaultKanbanBoard($projectId, $companyId) {
        $board = $this->db->fetchOne(
            "INSERT INTO kanban_boards (project_id, company_id, name, description)
             VALUES ($1, $2, $3, $4)
             RETURNING id",
            [$projectId, $companyId, 'Main Board', 'Default Kanban board']
        );

        $boardId = $board['id'];

        // Create default columns
        $defaultColumns = [
            ['name' => 'Backlog', 'status' => 'pending', 'wip_limit' => null, 'position' => 0],
            ['name' => 'To Do', 'status' => 'pending', 'wip_limit' => 10, 'position' => 1],
            ['name' => 'In Progress', 'status' => 'in_progress', 'wip_limit' => 5, 'position' => 2],
            ['name' => 'Review', 'status' => 'in_review', 'wip_limit' => 3, 'position' => 3],
            ['name' => 'Done', 'status' => 'completed', 'wip_limit' => null, 'position' => 4]
        ];

        foreach ($defaultColumns as $col) {
            $this->db->query(
                "INSERT INTO kanban_columns (board_id, name, status_mapping, wip_limit, position)
                 VALUES ($1, $2, $3, $4, $5)",
                [$boardId, $col['name'], $col['status'], $col['wip_limit'], $col['position']]
            );
        }
    }

    // ==================== RESOURCE ALLOCATION ====================

    /**
     * Get project resource allocations
     */
    public function getResourceAllocations($projectId, $companyId) {
        return $this->db->fetchAll(
            "SELECT ra.*,
                    u.first_name || ' ' || u.last_name as user_name,
                    e.job_title,
                    r.name as role_name
             FROM resource_allocations ra
             LEFT JOIN users u ON ra.user_id = u.id
             LEFT JOIN employees e ON ra.user_id = e.user_id
             LEFT JOIN roles r ON ra.role_id = r.id
             LEFT JOIN projects p ON ra.project_id = p.id
             WHERE ra.project_id = $1 AND p.company_id = $2
             ORDER BY ra.allocated_percentage DESC",
            [$projectId, $companyId]
        );
    }

    /**
     * Allocate resource to project
     */
    public function allocateResource($projectId, $companyId, $data) {
        if (empty($data['user_id'])) {
            throw new Exception('User ID is required');
        }

        // Check if user is already allocated
        $existing = $this->db->fetchOne(
            "SELECT id, allocated_percentage FROM resource_allocations
             WHERE project_id = $1 AND user_id = $2",
            [$projectId, $data['user_id']]
        );

        if ($existing) {
            // Update existing allocation
            $this->db->query(
                "UPDATE resource_allocations
                 SET allocated_percentage = $1, role_id = $2, start_date = $3, end_date = $4, updated_at = NOW()
                 WHERE id = $5",
                [
                    $data['allocated_percentage'] ?? $existing['allocated_percentage'],
                    $data['role_id'] ?? null,
                    $data['start_date'] ?? null,
                    $data['end_date'] ?? null,
                    $existing['id']
                ]
            );
            return $existing['id'];
        } else {
            // Create new allocation
            $result = $this->db->fetchOne(
                "INSERT INTO resource_allocations (
                    project_id, user_id, role_id, allocated_percentage,
                    start_date, end_date
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id",
                [
                    $projectId,
                    $data['user_id'],
                    $data['role_id'] ?? null,
                    $data['allocated_percentage'] ?? 100,
                    $data['start_date'] ?? null,
                    $data['end_date'] ?? null
                ]
            );
            return $result['id'];
        }
    }

    /**
     * Get project team members
     */
    private function getProjectTeam($projectId) {
        return $this->db->fetchAll(
            "SELECT ra.*,
                    u.first_name || ' ' || u.last_name as user_name,
                    u.email,
                    e.job_title
             FROM resource_allocations ra
             LEFT JOIN users u ON ra.user_id = u.id
             LEFT JOIN employees e ON ra.user_id = e.user_id
             WHERE ra.project_id = $1
             ORDER BY ra.allocated_percentage DESC",
            [$projectId]
        );
    }

    // ==================== MILESTONES ====================

    /**
     * Get project milestones
     */
    public function getProjectMilestones($projectId) {
        return $this->db->fetchAll(
            "SELECT * FROM project_milestones
             WHERE project_id = $1
             ORDER BY due_date",
            [$projectId]
        );
    }

    /**
     * Get all milestones for a company across all projects
     */
    public function getAllMilestones($companyId) {
        return $this->db->fetchAll(
            "SELECT pm.*, p.name as project_name
             FROM project_milestones pm
             LEFT JOIN projects p ON pm.project_id = p.id
             WHERE p.company_id = $1
             ORDER BY pm.due_date, p.name",
            [$companyId]
        );
    }

    /**
     * Create milestone
     */
    public function createMilestone($projectId, $companyId, $data) {
        if (empty($data['title'])) {
            throw new Exception('Milestone title is required');
        }

        $result = $this->db->fetchOne(
            "INSERT INTO project_milestones (
                project_id, title, description, due_date, status
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING id",
            [
                $projectId,
                $data['title'],
                $data['description'] ?? null,
                $data['due_date'] ?? null,
                $data['status'] ?? 'pending'
            ]
        );

        return $result['id'];
    }

    /**
     * Update milestone
     */
    public function updateMilestone($milestoneId, $projectId, $companyId, $data) {
        $fields = [];
        $params = [];
        $paramCount = 0;

        $allowedFields = ['title', 'description', 'due_date', 'status', 'completion_date'];

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

        $paramCount++;
        $params[] = $milestoneId;
        $idParam = $paramCount;
        $paramCount++;
        $params[] = $projectId;
        $projectParam = $paramCount;

        $setClause = implode(', ', $fields);
        $this->db->query(
            "UPDATE project_milestones SET $setClause
             WHERE id = $$idParam AND project_id = $$projectParam",
            $params
        );
    }

    // ==================== RISK MANAGEMENT ====================

    /**
     * Get project risks
     */
    public function getProjectRisks($projectId, $companyId) {
        return $this->db->fetchAll(
            "SELECT pr.*,
                    u.first_name || ' ' || u.last_name as owner_name
             FROM project_risks pr
             LEFT JOIN users u ON pr.owner_id = u.id
             LEFT JOIN projects p ON pr.project_id = p.id
             WHERE pr.project_id = $1 AND p.company_id = $2
             ORDER BY pr.risk_score DESC, pr.created_at DESC",
            [$projectId, $companyId]
        );
    }

    /**
     * Create risk
     */
    public function createRisk($projectId, $companyId, $data) {
        if (empty($data['title'])) {
            throw new Exception('Risk title is required');
        }

        $result = $this->db->fetchOne(
            "INSERT INTO project_risks (
                project_id, title, description, probability, impact,
                mitigation_plan, owner_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id",
            [
                $projectId,
                $data['title'],
                $data['description'] ?? null,
                $data['probability'] ?? 'medium',
                $data['impact'] ?? 'medium',
                $data['mitigation_plan'] ?? null,
                $data['owner_id'] ?? null,
                $data['status'] ?? 'open'
            ]
        );

        return $result['id'];
    }

    // ==================== SPRINT MANAGEMENT ====================

    /**
     * Get project sprints
     */
    public function getProjectSprints($projectId, $companyId) {
        return $this->db->fetchAll(
            "SELECT s.*,
                    (SELECT COUNT(*) FROM sprint_tasks WHERE sprint_id = s.id) as total_tasks,
                    (SELECT COUNT(*) FROM sprint_tasks st
                     LEFT JOIN tasks t ON st.task_id = t.id
                     WHERE st.sprint_id = s.id AND t.status = 'completed') as completed_tasks
             FROM sprints s
             LEFT JOIN projects p ON s.project_id = p.id
             WHERE s.project_id = $1 AND p.company_id = $2
             ORDER BY s.start_date DESC",
            [$projectId, $companyId]
        );
    }

    /**
     * Create sprint
     */
    public function createSprint($projectId, $companyId, $data) {
        if (empty($data['name'])) {
            throw new Exception('Sprint name is required');
        }

        $result = $this->db->fetchOne(
            "INSERT INTO sprints (
                project_id, name, goal, start_date, end_date,
                status, velocity_target
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id",
            [
                $projectId,
                $data['name'],
                $data['goal'] ?? null,
                $data['start_date'] ?? null,
                $data['end_date'] ?? null,
                $data['status'] ?? 'planning',
                $data['velocity_target'] ?? null
            ]
        );

        return $result['id'];
    }

    /**
     * Add task to sprint
     */
    public function addTaskToSprint($sprintId, $taskId, $companyId) {
        // Verify access
        $sprint = $this->db->fetchOne(
            "SELECT s.id FROM sprints s
             LEFT JOIN projects p ON s.project_id = p.id
             WHERE s.id = $1 AND p.company_id = $2",
            [$sprintId, $companyId]
        );

        if (!$sprint) {
            throw new Exception('Sprint not found');
        }

        $this->db->query(
            "INSERT INTO sprint_tasks (sprint_id, task_id)
             VALUES ($1, $2)
             ON CONFLICT (sprint_id, task_id) DO NOTHING",
            [$sprintId, $taskId]
        );
    }

    // ==================== DOCUMENT MANAGEMENT ====================

    /**
     * Get project documents
     */
    public function getProjectDocuments($projectId, $companyId) {
        return $this->db->fetchAll(
            "SELECT pd.*,
                    u.first_name || ' ' || u.last_name as uploaded_by_name
             FROM project_documents pd
             LEFT JOIN users u ON pd.uploaded_by = u.id
             LEFT JOIN projects p ON pd.project_id = p.id
             WHERE pd.project_id = $1 AND p.company_id = $2
             ORDER BY pd.created_at DESC",
            [$projectId, $companyId]
        );
    }

    /**
     * Upload document
     */
    public function uploadDocument($projectId, $companyId, $userId, $data) {
        if (empty($data['file_name']) || empty($data['file_path'])) {
            throw new Exception('File name and path are required');
        }

        $result = $this->db->fetchOne(
            "INSERT INTO project_documents (
                project_id, file_name, file_path, file_size,
                mime_type, uploaded_by, category, description
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id",
            [
                $projectId,
                $data['file_name'],
                $data['file_path'],
                $data['file_size'] ?? null,
                $data['mime_type'] ?? null,
                $userId,
                $data['category'] ?? 'general',
                $data['description'] ?? null
            ]
        );

        return $result['id'];
    }

    // ==================== COMMENTS & ACTIVITY ====================

    /**
     * Add project comment
     */
    public function addProjectComment($projectId, $userId, $content, $type = 'comment') {
        $this->db->query(
            "INSERT INTO project_comments (project_id, user_id, content, comment_type)
             VALUES ($1, $2, $3, $4)",
            [$projectId, $userId, $content, $type]
        );
    }

    /**
     * Get project activity feed
     */
    public function getProjectActivity($projectId, $companyId, $limit = 50) {
        return $this->db->fetchAll(
            "SELECT pc.*,
                    u.first_name || ' ' || u.last_name as author_name,
                    u.email as author_email
             FROM project_comments pc
             LEFT JOIN users u ON pc.user_id = u.id
             LEFT JOIN projects p ON pc.project_id = p.id
             WHERE pc.project_id = $1 AND p.company_id = $2
             ORDER BY pc.created_at DESC
             LIMIT $3",
            [$projectId, $companyId, $limit]
        );
    }

    // ==================== ANALYTICS ====================

    /**
     * Get project dashboard analytics
     */
    public function getProjectAnalytics($projectId, $companyId) {
        $project = $this->db->fetchOne(
            "SELECT * FROM projects WHERE id = $1 AND company_id = $2",
            [$projectId, $companyId]
        );

        if (!$project) {
            throw new Exception('Project not found');
        }

        // Task statistics
        $taskStats = $this->db->fetchOne(
            "SELECT
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
                COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed') as overdue_tasks
             FROM tasks
             WHERE project_id = $1",
            [$projectId]
        );

        // Time tracking
        $timeStats = $this->db->fetchOne(
            "SELECT
                SUM(hours) as total_hours,
                SUM(CASE WHEN is_billable THEN hours ELSE 0 END) as billable_hours
             FROM time_entries
             WHERE project_id = $1",
            [$projectId]
        );

        // Budget analysis
        $budgetStats = [
            'total_budget' => $project['budget'] ?? 0,
            'hours_spent' => $timeStats['total_hours'] ?? 0,
            'estimated_hours' => $this->db->fetchOne(
                "SELECT SUM(estimated_hours) as total FROM tasks WHERE project_id = $1",
                [$projectId]
            )['total'] ?? 0
        ];

        // Risk summary
        $riskStats = $this->db->fetchOne(
            "SELECT
                COUNT(*) as total_risks,
                COUNT(*) FILTER (WHERE status = 'open') as open_risks,
                AVG(risk_score) as avg_risk_score
             FROM project_risks
             WHERE project_id = $1",
            [$projectId]
        );

        return [
            'project' => $project,
            'tasks' => $taskStats,
            'time' => $timeStats,
            'budget' => $budgetStats,
            'risks' => $riskStats
        ];
    }

    // ==================== BACKWARD COMPATIBILITY ====================

    /**
     * Get project statistics (legacy method)
     */
    public function getProjectStats($companyId, $projectId) {
        return $this->db->fetchOne(
            "SELECT
                COUNT(DISTINCT t.id) as total_tasks,
                COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
                COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
                SUM(t.estimated_hours) as total_estimated_hours,
                SUM(t.actual_hours) as total_actual_hours,
                (SELECT COUNT(*) FROM time_entries te WHERE te.project_id = $2) as total_time_entries
             FROM tasks t
             WHERE t.project_id = $2 AND t.company_id = $1",
            [$companyId, $projectId]
        );
    }

    /**
     * Get project budget status (legacy method)
     */
    public function getProjectBudgetStatus($companyId, $projectId) {
        $project = $this->getProject($projectId, $companyId);

        if (!$project || !$project['budget']) {
            return null;
        }

        $spent = 0;
        if (isset($project['budget_type']) && $project['budget_type'] === 'hourly') {
            $hours = $project['total_hours'] ?? 0;
            $rate = $project['default_hourly_rate'] ?? 0;
            $spent = $hours * $rate;
        }

        return [
            'budget' => $project['budget'],
            'spent' => $spent,
            'remaining' => $project['budget'] - $spent,
            'percentage_used' => $project['budget'] > 0 ? ($spent / $project['budget']) * 100 : 0
        ];
    }
}
