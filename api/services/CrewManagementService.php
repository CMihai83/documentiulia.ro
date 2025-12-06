<?php
/**
 * Crew Management Service
 * E3-US03: Manage construction crew and assignments
 *
 * Features:
 * - Worker profiles with skills
 * - Availability calendar
 * - Assignment to projects/tasks
 * - Time tracking per project
 * - Performance metrics
 */

require_once __DIR__ . '/../config/database.php';

class CrewManagementService {
    private static ?CrewManagementService $instance = null;
    private PDO $pdo;

    // Worker trades
    private array $trades = [
        'electrician' => 'Electrician',
        'plumber' => 'Instalator',
        'carpenter' => 'Tâmplar',
        'mason' => 'Zidar',
        'painter' => 'Zugrav',
        'hvac' => 'Frigorist/HVAC',
        'welder' => 'Sudor',
        'general' => 'Muncitor General',
        'foreman' => 'Șef de Echipă',
        'helper' => 'Ajutor'
    ];

    // Skill levels
    private array $skillLevels = [
        'apprentice' => ['name' => 'Ucenic', 'multiplier' => 0.7],
        'journeyman' => ['name' => 'Calificat', 'multiplier' => 1.0],
        'master' => ['name' => 'Maistru', 'multiplier' => 1.4]
    ];

    private function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function getInstance(): CrewManagementService {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get trades list
     */
    public function getTrades(): array {
        return $this->trades;
    }

    /**
     * Get skill levels
     */
    public function getSkillLevels(): array {
        return $this->skillLevels;
    }

    /**
     * Create worker
     */
    public function createWorker(string $companyId, array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO crew_workers
            (company_id, name, email, phone, trade, skill_level, hourly_rate,
             status, hire_date, certifications, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NOW(), NOW())
            RETURNING *
        ");

        $stmt->execute([
            $companyId,
            $data['name'],
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $data['trade'] ?? 'general',
            $data['skill_level'] ?? 'journeyman',
            $data['hourly_rate'] ?? null,
            $data['hire_date'] ?? date('Y-m-d'),
            json_encode($data['certifications'] ?? []),
            $data['notes'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get worker by ID
     */
    public function getWorker(string $companyId, string $workerId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT w.*,
                   (SELECT COUNT(*) FROM worker_time_entries WHERE worker_id = w.id) as total_entries,
                   (SELECT SUM(hours) FROM worker_time_entries WHERE worker_id = w.id) as total_hours
            FROM crew_workers w
            WHERE w.id = ? AND w.company_id = ?
        ");
        $stmt->execute([$workerId, $companyId]);
        $worker = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($worker) {
            $worker['certifications'] = json_decode($worker['certifications'] ?? '[]', true);
            $worker['current_assignments'] = $this->getWorkerAssignments($workerId);
        }

        return $worker ?: null;
    }

    /**
     * List workers
     */
    public function listWorkers(string $companyId, array $filters = []): array {
        $sql = "
            SELECT w.*,
                   (SELECT SUM(hours) FROM worker_time_entries WHERE worker_id = w.id) as total_hours
            FROM crew_workers w
            WHERE w.company_id = ?
        ";
        $params = [$companyId];

        if (!empty($filters['trade'])) {
            $sql .= " AND w.trade = ?";
            $params[] = $filters['trade'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND w.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (w.name ILIKE ? OR w.email ILIKE ? OR w.phone ILIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        $sql .= " ORDER BY w.name";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $workers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($workers as &$worker) {
            $worker['certifications'] = json_decode($worker['certifications'] ?? '[]', true);
        }

        return $workers;
    }

    /**
     * Update worker
     */
    public function updateWorker(string $companyId, string $workerId, array $data): ?array {
        $stmt = $this->pdo->prepare("
            UPDATE crew_workers SET
                name = COALESCE(?, name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                trade = COALESCE(?, trade),
                skill_level = COALESCE(?, skill_level),
                hourly_rate = COALESCE(?, hourly_rate),
                status = COALESCE(?, status),
                certifications = COALESCE(?, certifications),
                notes = COALESCE(?, notes),
                updated_at = NOW()
            WHERE id = ? AND company_id = ?
            RETURNING *
        ");

        $stmt->execute([
            $data['name'] ?? null,
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $data['trade'] ?? null,
            $data['skill_level'] ?? null,
            isset($data['hourly_rate']) ? floatval($data['hourly_rate']) : null,
            $data['status'] ?? null,
            isset($data['certifications']) ? json_encode($data['certifications']) : null,
            $data['notes'] ?? null,
            $workerId,
            $companyId
        ]);

        $worker = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($worker) {
            $worker['certifications'] = json_decode($worker['certifications'] ?? '[]', true);
        }

        return $worker ?: null;
    }

    /**
     * Set worker availability
     */
    public function setAvailability(string $workerId, string $date, string $status, ?string $projectId = null, ?string $notes = null): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO worker_availability (worker_id, date, status, project_id, notes)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (worker_id, date) DO UPDATE SET
                status = EXCLUDED.status,
                project_id = EXCLUDED.project_id,
                notes = EXCLUDED.notes
            RETURNING *
        ");

        $stmt->execute([$workerId, $date, $status, $projectId, $notes]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get worker availability for date range
     */
    public function getAvailability(string $workerId, string $dateFrom, string $dateTo): array {
        $stmt = $this->pdo->prepare("
            SELECT wa.*, p.name as project_name
            FROM worker_availability wa
            LEFT JOIN construction_projects p ON wa.project_id = p.id
            WHERE wa.worker_id = ?
              AND wa.date BETWEEN ? AND ?
            ORDER BY wa.date
        ");
        $stmt->execute([$workerId, $dateFrom, $dateTo]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get available workers for a date
     */
    public function getAvailableWorkers(string $companyId, string $date, ?string $trade = null): array {
        $sql = "
            SELECT w.*
            FROM crew_workers w
            WHERE w.company_id = ?
              AND w.status = 'active'
              AND w.id NOT IN (
                  SELECT worker_id FROM worker_availability
                  WHERE date = ? AND status IN ('unavailable', 'vacation', 'sick')
              )
        ";
        $params = [$companyId, $date];

        if ($trade) {
            $sql .= " AND w.trade = ?";
            $params[] = $trade;
        }

        $sql .= " ORDER BY w.name";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record time entry
     */
    public function recordTime(array $data): array {
        $stmt = $this->pdo->prepare("
            INSERT INTO worker_time_entries
            (worker_id, project_id, task_id, work_date, hours, hourly_rate, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            RETURNING *
        ");

        // Get worker's hourly rate if not provided
        $hourlyRate = $data['hourly_rate'] ?? null;
        if (!$hourlyRate) {
            $stmt2 = $this->pdo->prepare("SELECT hourly_rate FROM crew_workers WHERE id = ?");
            $stmt2->execute([$data['worker_id']]);
            $hourlyRate = $stmt2->fetchColumn() ?: 0;
        }

        $stmt->execute([
            $data['worker_id'],
            $data['project_id'],
            $data['task_id'] ?? null,
            $data['work_date'] ?? date('Y-m-d'),
            floatval($data['hours']),
            $hourlyRate,
            $data['description'] ?? null
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get time entries for worker
     */
    public function getWorkerTimeEntries(string $workerId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $sql = "
            SELECT te.*, p.name as project_name, t.name as task_name
            FROM worker_time_entries te
            JOIN construction_projects p ON te.project_id = p.id
            LEFT JOIN project_tasks t ON te.task_id = t.id
            WHERE te.worker_id = ?
        ";
        $params = [$workerId];

        if ($dateFrom) {
            $sql .= " AND te.work_date >= ?";
            $params[] = $dateFrom;
        }
        if ($dateTo) {
            $sql .= " AND te.work_date <= ?";
            $params[] = $dateTo;
        }

        $sql .= " ORDER BY te.work_date DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get time entries for project
     */
    public function getProjectTimeEntries(string $projectId): array {
        $stmt = $this->pdo->prepare("
            SELECT te.*, w.name as worker_name, w.trade, t.name as task_name
            FROM worker_time_entries te
            JOIN crew_workers w ON te.worker_id = w.id
            LEFT JOIN project_tasks t ON te.task_id = t.id
            WHERE te.project_id = ?
            ORDER BY te.work_date DESC
        ");
        $stmt->execute([$projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get worker assignments
     */
    public function getWorkerAssignments(string $workerId): array {
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT p.id, p.project_number, p.name, p.status
            FROM construction_projects p
            JOIN project_tasks t ON t.project_id = p.id
            WHERE t.assigned_to = ?
              AND t.status != 'completed'
              AND p.status IN ('planning', 'in_progress')
            ORDER BY p.name
        ");
        $stmt->execute([$workerId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get worker performance metrics
     */
    public function getWorkerMetrics(string $companyId, string $workerId, ?string $dateFrom = null, ?string $dateTo = null): array {
        $dateFrom = $dateFrom ?? date('Y-m-01');
        $dateTo = $dateTo ?? date('Y-m-t');

        // Total hours worked
        $stmt = $this->pdo->prepare("
            SELECT
                SUM(hours) as total_hours,
                COUNT(DISTINCT work_date) as days_worked,
                COUNT(DISTINCT project_id) as projects_worked,
                SUM(hours * hourly_rate) as total_earnings
            FROM worker_time_entries
            WHERE worker_id = ?
              AND work_date BETWEEN ? AND ?
        ");
        $stmt->execute([$workerId, $dateFrom, $dateTo]);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        // Tasks completed
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as completed_tasks
            FROM project_tasks
            WHERE assigned_to = ?
              AND status = 'completed'
              AND completed_date BETWEEN ? AND ?
        ");
        $stmt->execute([$workerId, $dateFrom, $dateTo]);
        $tasks = $stmt->fetch(PDO::FETCH_ASSOC);

        // Hours by project
        $stmt = $this->pdo->prepare("
            SELECT p.name as project_name, SUM(te.hours) as hours
            FROM worker_time_entries te
            JOIN construction_projects p ON te.project_id = p.id
            WHERE te.worker_id = ?
              AND te.work_date BETWEEN ? AND ?
            GROUP BY p.id, p.name
            ORDER BY hours DESC
        ");
        $stmt->execute([$workerId, $dateFrom, $dateTo]);
        $byProject = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'period' => ['from' => $dateFrom, 'to' => $dateTo],
            'summary' => array_merge($summary, $tasks),
            'by_project' => $byProject
        ];
    }

    /**
     * Get crew overview for company
     */
    public function getCrewOverview(string $companyId): array {
        // Workers by status
        $stmt = $this->pdo->prepare("
            SELECT status, COUNT(*) as count
            FROM crew_workers
            WHERE company_id = ?
            GROUP BY status
        ");
        $stmt->execute([$companyId]);
        $byStatus = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Workers by trade
        $stmt = $this->pdo->prepare("
            SELECT trade, COUNT(*) as count
            FROM crew_workers
            WHERE company_id = ? AND status = 'active'
            GROUP BY trade
        ");
        $stmt->execute([$companyId]);
        $byTrade = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Total hours this month
        $stmt = $this->pdo->prepare("
            SELECT
                SUM(te.hours) as total_hours,
                SUM(te.hours * te.hourly_rate) as total_labor_cost
            FROM worker_time_entries te
            JOIN crew_workers w ON te.worker_id = w.id
            WHERE w.company_id = ?
              AND te.work_date >= DATE_TRUNC('month', CURRENT_DATE)
        ");
        $stmt->execute([$companyId]);
        $monthlyStats = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'by_status' => $byStatus,
            'by_trade' => $byTrade,
            'monthly_hours' => floatval($monthlyStats['total_hours'] ?? 0),
            'monthly_labor_cost' => floatval($monthlyStats['total_labor_cost'] ?? 0)
        ];
    }
}
