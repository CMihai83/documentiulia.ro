<?php
/**
 * Construction Project Management Service
 * E3-US02: Track construction projects from start to finish
 *
 * Features:
 * - Project creation from estimate
 * - Phase/milestone breakdown
 * - Task assignment to workers
 * - Progress tracking
 * - Photo documentation
 * - Daily log entries
 * - Budget vs actual tracking
 */

require_once __DIR__ . '/../config/database.php';

class ConstructionProjectService {
    private static ?ConstructionProjectService $instance = null;
    private PDO $pdo;

    // Project statuses
    public const STATUS_PLANNING = 'planning';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_ON_HOLD = 'on_hold';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    // Task statuses
    public const TASK_PENDING = 'pending';
    public const TASK_IN_PROGRESS = 'in_progress';
    public const TASK_COMPLETED = 'completed';
    public const TASK_BLOCKED = 'blocked';

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): ConstructionProjectService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Create new project
     */
    public function createProject(string $companyId, array $data): array {
        $projectNumber = $this->generateProjectNumber($companyId);

        $stmt = $this->pdo->prepare("
            INSERT INTO construction_projects
            (company_id, estimate_id, project_number, name, description, customer_id,
             customer_name, address, budget, status, start_date, end_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planning', ?, ?, NOW(), NOW())
            RETURNING *
        ");

        $stmt->execute([
            $companyId,
            $data['estimate_id'] ?? null,
            $projectNumber,
            $data['name'],
            $data['description'] ?? null,
            $data['customer_id'] ?? null,
            $data['customer_name'] ?? null,
            $data['address'] ?? null,
            $data['budget'] ?? 0,
            $data['start_date'] ?? null,
            $data['end_date'] ?? null
        ]);

        $project = $stmt->fetch(PDO::FETCH_ASSOC);

        // Create default phases if not from estimate
        if (empty($data['estimate_id'])) {
            $this->createDefaultPhases($project['id']);
        }

        return $project;
    }

    /**
     * Get project by ID
     */
    public function getProject(string $companyId, string $projectId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT p.*,
                   e.estimate_number,
                   (SELECT COUNT(*) FROM project_phases WHERE project_id = p.id) as phase_count,
                   (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.id) as task_count,
                   (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.id AND status = 'completed') as completed_tasks
            FROM construction_projects p
            LEFT JOIN estimates e ON p.estimate_id = e.id
            WHERE p.id = ? AND p.company_id = ?
        ");
        $stmt->execute([$projectId, $companyId]);
        $project = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($project) {
            $project['phases'] = $this->getProjectPhases($projectId);
            $project['budget_summary'] = $this->getBudgetSummary($projectId);
        }

        return $project ?: null;
    }

    /**
     * List projects
     */
    public function listProjects(string $companyId, array $filters = []): array {
        $sql = "
            SELECT p.*,
                   e.estimate_number,
                   (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.id) as task_count,
                   (SELECT COUNT(*) FROM project_tasks WHERE project_id = p.id AND status = 'completed') as completed_tasks
            FROM construction_projects p
            LEFT JOIN estimates e ON p.estimate_id = e.id
            WHERE p.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['status'])) {
            $sql .= " AND p.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (p.project_number ILIKE ? OR p.name ILIKE ? OR p.customer_name ILIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        $sql .= " ORDER BY p.created_at DESC LIMIT 100";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update project
     */
    public function updateProject(string $companyId, string $projectId, array $data): ?array {
        $stmt = $this->pdo->prepare("
            UPDATE construction_projects SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                address = COALESCE(?, address),
                budget = COALESCE(?, budget),
                status = COALESCE(?, status),
                start_date = COALESCE(?, start_date),
                end_date = COALESCE(?, end_date),
                actual_start_date = COALESCE(?, actual_start_date),
                actual_end_date = COALESCE(?, actual_end_date),
                progress_percentage = COALESCE(?, progress_percentage),
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
            RETURNING *
        ");

        $stmt->execute([
            $data['name'] ?? null,
            $data['description'] ?? null,
            $data['address'] ?? null,
            isset($data['budget']) ? floatval($data['budget']) : null,
            $data['status'] ?? null,
            $data['start_date'] ?? null,
            $data['end_date'] ?? null,
            $data['actual_start_date'] ?? null,
            $data['actual_end_date'] ?? null,
            isset($data['progress_percentage']) ? intval($data['progress_percentage']) : null,
            $projectId,
            $companyId
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Create project phase
     */
    public function createPhase(string $projectId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO project_phases
            (project_id, name, description, sort_order, start_date, end_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
            RETURNING *
        ");

        $sortOrder = $data['sort_order'] ?? $this->getNextPhaseSortOrder($projectId);

        $stmt->execute([
            $projectId,
            $data['name'],
            $data['description'] ?? null,
            $sortOrder,
            $data['start_date'] ?? null,
            $data['end_date'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get project phases
     */
    public function getProjectPhases(string $projectId): array {
        $stmt = $this->pdo->prepare("
            SELECT ph.*,
                   (SELECT COUNT(*) FROM project_tasks WHERE phase_id = ph.id) as task_count,
                   (SELECT COUNT(*) FROM project_tasks WHERE phase_id = ph.id AND status = 'completed') as completed_tasks
            FROM project_phases ph
            WHERE ph.project_id = ?
            ORDER BY ph.sort_order
        ");
        $stmt->execute([$projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update phase
     */
    public function updatePhase(string $phaseId, array $data): ?array {
        $stmt = $this->pdo->prepare("
            UPDATE project_phases SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                start_date = COALESCE(?, start_date),
                end_date = COALESCE(?, end_date),
                status = COALESCE(?, status),
                progress_percentage = COALESCE(?, progress_percentage)
            WHERE id = ?
            RETURNING *
        ");

        $stmt->execute([
            $data['name'] ?? null,
            $data['description'] ?? null,
            $data['start_date'] ?? null,
            $data['end_date'] ?? null,
            $data['status'] ?? null,
            isset($data['progress_percentage']) ? intval($data['progress_percentage']) : null,
            $phaseId
        ]);

        $phase = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($phase) {
            $this->recalculateProjectProgress($phase['project_id']);
        }

        return $phase ?: null;
    }

    /**
     * Create project task
     */
    public function createTask(string $projectId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO project_tasks
            (project_id, phase_id, name, description, assigned_to, estimated_hours,
             start_date, due_date, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
            RETURNING *
        ");

        $stmt->execute([
            $projectId,
            $data['phase_id'] ?? null,
            $data['name'],
            $data['description'] ?? null,
            $data['assigned_to'] ?? null,
            $data['estimated_hours'] ?? null,
            $data['start_date'] ?? null,
            $data['due_date'] ?? null,
            $data['priority'] ?? 'medium'
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get project tasks
     */
    public function getProjectTasks(string $projectId, ?string $phaseId = null): array {
        $sql = "
            SELECT t.*, w.name as worker_name, ph.name as phase_name
            FROM project_tasks t
            LEFT JOIN crew_workers w ON t.assigned_to = w.id
            LEFT JOIN project_phases ph ON t.phase_id = ph.id
            WHERE t.project_id = ?
        ";
        $params = [$projectId];

        if ($phaseId) {
            $sql .= " AND t.phase_id = ?";
            $params[] = $phaseId;
        }

        $sql .= " ORDER BY t.due_date, t.priority DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update task
     */
    public function updateTask(string $taskId, array $data): ?array {
        $stmt = $this->pdo->prepare("
            UPDATE project_tasks SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                phase_id = COALESCE(?, phase_id),
                assigned_to = COALESCE(?, assigned_to),
                estimated_hours = COALESCE(?, estimated_hours),
                actual_hours = COALESCE(?, actual_hours),
                start_date = COALESCE(?, start_date),
                due_date = COALESCE(?, due_date),
                completed_date = CASE WHEN ? = 'completed' THEN NOW() ELSE completed_date END,
                priority = COALESCE(?, priority),
                status = COALESCE(?, status)
            WHERE id = ?
            RETURNING *
        ");

        $stmt->execute([
            $data['name'] ?? null,
            $data['description'] ?? null,
            $data['phase_id'] ?? null,
            $data['assigned_to'] ?? null,
            isset($data['estimated_hours']) ? floatval($data['estimated_hours']) : null,
            isset($data['actual_hours']) ? floatval($data['actual_hours']) : null,
            $data['start_date'] ?? null,
            $data['due_date'] ?? null,
            $data['status'] ?? null,
            $data['priority'] ?? null,
            $data['status'] ?? null,
            $taskId
        ]);

        $task = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($task) {
            $this->recalculateProjectProgress($task['project_id']);
        }

        return $task ?: null;
    }

    /**
     * Add daily log entry
     */
    public function addDailyLog(string $projectId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO project_daily_logs
            (project_id, log_date, weather, temperature, work_description,
             workers_present, equipment_used, materials_used, issues, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING *
        ");

        $stmt->execute([
            $projectId,
            $data['log_date'] ?? date('Y-m-d'),
            $data['weather'] ?? null,
            $data['temperature'] ?? null,
            $data['work_description'],
            json_encode($data['workers_present'] ?? []),
            json_encode($data['equipment_used'] ?? []),
            json_encode($data['materials_used'] ?? []),
            $data['issues'] ?? null,
            $data['notes'] ?? null,
            $data['created_by'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get daily logs
     */
    public function getDailyLogs(string $projectId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $sql = "SELECT * FROM project_daily_logs WHERE project_id = ?";
        $params = [$projectId];

        if ($dateFrom) {
            $sql .= " AND log_date >= ?";
            $params[] = $dateFrom;
        }
        if ($dateTo) {
            $sql .= " AND log_date <= ?";
            $params[] = $dateTo;
        }

        $sql .= " ORDER BY log_date DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Add photo to project
     */
    public function addPhoto(string $projectId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO project_photos
            (project_id, phase_id, task_id, file_path, filename, caption, taken_at, uploaded_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING *
        ");

        $stmt->execute([
            $projectId,
            $data['phase_id'] ?? null,
            $data['task_id'] ?? null,
            $data['file_path'],
            $data['filename'],
            $data['caption'] ?? null,
            $data['taken_at'] ?? date('Y-m-d H:i:s'),
            $data['uploaded_by'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get project photos
     */
    public function getPhotos(string $projectId, ?string $phaseId = null): array {
        $sql = "SELECT * FROM project_photos WHERE project_id = ?";
        $params = [$projectId];

        if ($phaseId) {
            $sql .= " AND phase_id = ?";
            $params[] = $phaseId;
        }

        $sql .= " ORDER BY taken_at DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record expense
     */
    public function recordExpense(string $projectId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO project_expenses
            (project_id, phase_id, category, description, amount, vendor, receipt_path, expense_date, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING *
        ");

        $stmt->execute([
            $projectId,
            $data['phase_id'] ?? null,
            $data['category'] ?? 'other',
            $data['description'],
            floatval($data['amount']),
            $data['vendor'] ?? null,
            $data['receipt_path'] ?? null,
            $data['expense_date'] ?? date('Y-m-d'),
            $data['created_by'] ?? null
        ]);

        $expense = $stmt->fetch(PDO::FETCH_ASSOC);

        // Update actual cost
        $this->updateActualCost($projectId);

        return $expense;
    }

    /**
     * Get budget summary
     */
    public function getBudgetSummary(string $projectId): array {
        // Get total expenses by category
        $stmt = $this->pdo->prepare("
            SELECT
                category,
                COUNT(*) as expense_count,
                SUM(amount) as total
            FROM project_expenses
            WHERE project_id = ?
            GROUP BY category
        ");
        $stmt->execute([$projectId]);
        $byCategory = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get project budget and actual
        $stmt = $this->pdo->prepare("
            SELECT budget, actual_cost FROM construction_projects WHERE id = ?
        ");
        $stmt->execute([$projectId]);
        $project = $stmt->fetch(PDO::FETCH_ASSOC);

        $totalExpenses = array_sum(array_column($byCategory, 'total'));

        return [
            'budget' => floatval($project['budget'] ?? 0),
            'actual_cost' => floatval($project['actual_cost'] ?? 0),
            'total_expenses' => $totalExpenses,
            'variance' => floatval($project['budget'] ?? 0) - $totalExpenses,
            'variance_percentage' => $project['budget'] > 0
                ? round(($totalExpenses / $project['budget']) * 100, 1)
                : 0,
            'by_category' => $byCategory
        ];
    }

    /**
     * Create default phases for a project
     */
    private function createDefaultPhases(string $projectId): void {
        $defaultPhases = [
            ['name' => 'Pregătire & Planificare', 'description' => 'Obținere autorizații, planificare'],
            ['name' => 'Demolare & Curățenie', 'description' => 'Demolare structuri existente'],
            ['name' => 'Structură', 'description' => 'Lucrări structurale'],
            ['name' => 'Instalații', 'description' => 'Instalații electrice, sanitare, HVAC'],
            ['name' => 'Finisaje', 'description' => 'Zugrăveli, pardoseli, tâmplărie'],
            ['name' => 'Curățenie & Predare', 'description' => 'Curățenie finală și predare']
        ];

        foreach ($defaultPhases as $index => $phase) {
            $phase['sort_order'] = $index + 1;
            $this->createPhase($projectId, $phase);
        }
    }

    /**
     * Recalculate project progress
     */
    private function recalculateProjectProgress(string $projectId): void {
        $stmt = $this->pdo->prepare("
            SELECT
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
            FROM project_tasks
            WHERE project_id = ?
        ");
        $stmt->execute([$projectId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        $progress = $result['total_tasks'] > 0
            ? round(($result['completed_tasks'] / $result['total_tasks']) * 100)
            : 0;

        $stmt = $this->pdo->prepare("
            UPDATE construction_projects SET progress_percentage = ? WHERE id = ?
        ");
        $stmt->execute([$progress, $projectId]);
    }

    /**
     * Update actual cost
     */
    private function updateActualCost(string $projectId): void {
        $stmt = $this->pdo->prepare("
            SELECT COALESCE(SUM(amount), 0) as total FROM project_expenses WHERE project_id = ?
        ");
        $stmt->execute([$projectId]);
        $total = $stmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            UPDATE construction_projects SET actual_cost = ? WHERE id = ?
        ");
        $stmt->execute([$total, $projectId]);
    }

    /**
     * Get next phase sort order
     */
    private function getNextPhaseSortOrder(string $projectId): int {
        $stmt = $this->pdo->prepare("
            SELECT COALESCE(MAX(sort_order), 0) + 1 FROM project_phases WHERE project_id = ?
        ");
        $stmt->execute([$projectId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Generate project number
     */
    private function generateProjectNumber(string $companyId): string {
        $year = date('Y');
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) + 1 FROM construction_projects
            WHERE company_id = ? AND EXTRACT(YEAR FROM created_at) = ?
        ");
        $stmt->execute([$companyId, $year]);
        $nextNum = $stmt->fetchColumn();

        return sprintf('PRJ-%s-%05d', $year, $nextNum);
    }
}
