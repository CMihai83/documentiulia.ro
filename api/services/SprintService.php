<?php
/**
 * Sprint Service
 * Handles all sprint-related business logic
 */

require_once __DIR__ . '/../config/database.php';

class SprintService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * List all sprints for a project with optional filters
     */
    public function listSprints($companyId, $projectId, $filters = []) {
        $conditions = ['s.company_id = $1', 's.project_id = $2'];
        $params = [$companyId, $projectId];
        $paramCount = 2;

        // Filter by status
        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "s.status = $$paramCount";
            $params[] = $filters['status'];
        }

        // Filter by date range
        if (!empty($filters['start_date'])) {
            $paramCount++;
            $conditions[] = "s.start_date >= $$paramCount";
            $params[] = $filters['start_date'];
        }

        if (!empty($filters['end_date'])) {
            $paramCount++;
            $conditions[] = "s.end_date <= $$paramCount";
            $params[] = $filters['end_date'];
        }

        $whereClause = implode(' AND ', $conditions);

        $sql = "
            SELECT
                s.*,
                s.velocity_points as capacity,
                COALESCE(COUNT(DISTINCT t.id), 0) as task_count,
                COALESCE(SUM(t.story_points), 0) as total_story_points,
                COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) as completed_story_points,
                ROUND(
                    COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0)::DECIMAL /
                    NULLIF(COALESCE(SUM(t.story_points), 0), 0) * 100,
                    2
                ) as completion_percentage,
                CURRENT_DATE - s.start_date as days_elapsed,
                s.end_date - CURRENT_DATE as days_remaining,
                CASE
                    WHEN s.end_date < CURRENT_DATE AND s.status != 'completed' THEN 'overdue'
                    WHEN CURRENT_DATE >= s.start_date AND CURRENT_DATE <= s.end_date THEN 'active'
                    WHEN CURRENT_DATE < s.start_date THEN 'upcoming'
                    ELSE 'completed'
                END as sprint_phase
            FROM sprints s
            LEFT JOIN tasks t ON t.sprint_id = s.id
            WHERE $whereClause
            GROUP BY s.id
            ORDER BY s.start_date DESC
            LIMIT " . ($filters['limit'] ?? 100) . "
            OFFSET " . ($filters['offset'] ?? 0);

        $result = $this->db->query($sql, $params);
        return $result->fetchAll();
    }

    /**
     * List all sprints for a company (across all projects)
     */
    public function listAllSprints($companyId, $filters = []) {
        $conditions = ['s.company_id = $1'];
        $params = [$companyId];
        $paramCount = 1;

        // Filter by status
        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "s.status = $$paramCount";
            $params[] = $filters['status'];
        }

        // Filter by date range
        if (!empty($filters['start_date'])) {
            $paramCount++;
            $conditions[] = "s.start_date >= $$paramCount";
            $params[] = $filters['start_date'];
        }

        if (!empty($filters['end_date'])) {
            $paramCount++;
            $conditions[] = "s.end_date <= $$paramCount";
            $params[] = $filters['end_date'];
        }

        $whereClause = implode(' AND ', $conditions);

        $sql = "
            SELECT
                s.*,
                p.name as project_name,
                s.velocity_points as capacity,
                COALESCE(COUNT(DISTINCT t.id), 0) as task_count,
                COALESCE(SUM(t.story_points), 0) as total_story_points,
                COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) as completed_story_points,
                ROUND(
                    COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0)::DECIMAL /
                    NULLIF(COALESCE(SUM(t.story_points), 0), 0) * 100,
                    2
                ) as completion_percentage
            FROM sprints s
            LEFT JOIN projects p ON s.project_id = p.id
            LEFT JOIN tasks t ON t.sprint_id = s.id
            WHERE $whereClause
            GROUP BY s.id, p.name
            ORDER BY s.start_date DESC
            LIMIT " . ($filters['limit'] ?? 100) . "
            OFFSET " . ($filters['offset'] ?? 0);

        $result = $this->db->query($sql, $params);
        return $result->fetchAll();
    }

    /**
     * Get single sprint with detailed metrics
     */
    public function getSprint($sprintId, $companyId) {
        $sql = "
            SELECT
                s.*,
                p.name as project_name,
                COALESCE(COUNT(DISTINCT t.id), 0) as task_count,
                COALESCE(COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END), 0) as completed_tasks,
                COALESCE(SUM(t.story_points), 0) as total_story_points,
                COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) as completed_story_points,
                COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
                COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
                ROUND(
                    COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0)::DECIMAL /
                    NULLIF(COALESCE(SUM(t.story_points), 0), 0) * 100,
                    2
                ) as completion_percentage,
                CURRENT_DATE - s.start_date as days_elapsed,
                s.end_date - CURRENT_DATE as days_remaining,
                CASE
                    WHEN s.end_date < CURRENT_DATE AND s.status != 'completed' THEN 'overdue'
                    WHEN CURRENT_DATE >= s.start_date AND CURRENT_DATE <= s.end_date THEN 'active'
                    WHEN CURRENT_DATE < s.start_date THEN 'upcoming'
                    ELSE 'completed'
                END as sprint_phase
            FROM sprints s
            LEFT JOIN projects p ON p.id = s.project_id
            LEFT JOIN tasks t ON t.sprint_id = s.id
            WHERE s.id = $1 AND s.company_id = $2
            GROUP BY s.id, p.name";

        $result = $this->db->query($sql, [$sprintId, $companyId]);
        $sprint = $result->fetch();

        if (!$sprint) {
            throw new Exception('Sprint not found', 404);
        }

        // Get task breakdown by status
        $taskBreakdown = $this->getTaskBreakdown($sprintId);
        $sprint['task_breakdown'] = $taskBreakdown;

        // Get burndown data
        $sprint['burndown_data'] = $this->getBurndownData($sprintId);

        return $sprint;
    }

    /**
     * Create a new sprint
     */
    public function createSprint($companyId, $projectId, $data, $userId) {
        // Validate required fields
        if (empty($data['name'])) {
            throw new Exception('Sprint name is required');
        }

        if (empty($data['start_date']) || empty($data['end_date'])) {
            throw new Exception('Start date and end date are required');
        }

        // Validate dates
        if (strtotime($data['end_date']) <= strtotime($data['start_date'])) {
            throw new Exception('End date must be after start date');
        }

        $sprintData = [
            'id' => $this->db->getConnection()->query("SELECT uuid_generate_v4()")->fetchColumn(),
            'company_id' => $companyId,
            'project_id' => $projectId,
            'name' => $data['name'],
            'goal' => $data['goal'] ?? null,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'status' => $data['status'] ?? 'planned',
            'capacity' => isset($data['capacity']) ? (int)$data['capacity'] : null
        ];

        $sql = "
            INSERT INTO sprints (
                id, company_id, project_id, name, goal, start_date, end_date, status, velocity_points, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
            ) RETURNING id";

        $params = array_values($sprintData);
        $result = $this->db->query($sql, $params);

        return $result->fetchColumn();
    }

    /**
     * Update sprint
     */
    public function updateSprint($sprintId, $companyId, $data) {
        $fields = [];
        $params = [];
        $paramCount = 0;

        $allowedFields = [
            'name', 'goal', 'start_date', 'end_date', 'status', 'capacity'
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

        $fields[] = 'updated_at = NOW()';
        $paramCount++;
        $params[] = $sprintId;
        $idParam = $paramCount;
        $paramCount++;
        $params[] = $companyId;
        $companyParam = $paramCount;

        $setClause = implode(', ', $fields);
        $sql = "UPDATE sprints SET $setClause WHERE id = $$idParam AND company_id = $$companyParam";

        $this->db->query($sql, $params);
    }

    /**
     * Delete (archive) sprint
     */
    public function deleteSprint($sprintId, $companyId) {
        // Don't actually delete, just mark as cancelled
        $sql = "UPDATE sprints SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND company_id = $2";
        $this->db->query($sql, [$sprintId, $companyId]);
    }

    /**
     * Get active sprint for a project
     */
    public function getActiveSprint($companyId, $projectId) {
        $sql = "
            SELECT s.*
            FROM sprints s
            WHERE s.company_id = $1
            AND s.project_id = $2
            AND s.status = 'active'
            AND CURRENT_DATE BETWEEN s.start_date AND s.end_date
            LIMIT 1";

        $result = $this->db->query($sql, [$companyId, $projectId]);
        return $result->fetch();
    }

    /**
     * Get any active sprint for the company (across all projects)
     */
    public function getCompanyActiveSprint($companyId) {
        $sql = "
            SELECT s.*, p.name as project_name
            FROM sprints s
            LEFT JOIN projects p ON s.project_id = p.id
            WHERE s.company_id = $1
            AND s.status = 'active'
            AND CURRENT_DATE BETWEEN s.start_date AND s.end_date
            ORDER BY s.start_date DESC
            LIMIT 1";

        $result = $this->db->query($sql, [$companyId]);
        return $result->fetch();
    }

    /**
     * Get task breakdown by status for a sprint
     */
    private function getTaskBreakdown($sprintId) {
        $sql = "
            SELECT
                status,
                COUNT(*) as count,
                COALESCE(SUM(story_points), 0) as total_points
            FROM tasks
            WHERE sprint_id = $1
            GROUP BY status";

        $result = $this->db->query($sql, [$sprintId]);
        return $result->fetchAll();
    }

    /**
     * Get burndown chart data
     */
    private function getBurndownData($sprintId) {
        // Get sprint dates
        $sprint = $this->db->query("SELECT start_date, end_date FROM sprints WHERE id = $1", [$sprintId])->fetch();

        if (!$sprint) {
            return [];
        }

        // Calculate ideal burndown line
        $totalPoints = $this->db->query(
            "SELECT COALESCE(SUM(story_points), 0) FROM tasks WHERE sprint_id = $1",
            [$sprintId]
        )->fetchColumn();

        $startDate = new DateTime($sprint['start_date']);
        $endDate = new DateTime($sprint['end_date']);
        $totalDays = $startDate->diff($endDate)->days;

        $burndownData = [];
        $currentDate = clone $startDate;

        for ($day = 0; $day <= $totalDays; $day++) {
            $dateStr = $currentDate->format('Y-m-d');

            // Ideal remaining (linear decrease)
            $idealRemaining = $totalPoints * (1 - ($day / $totalDays));

            // Actual remaining (tasks completed by this date)
            $actualCompleted = $this->db->query(
                "SELECT COALESCE(SUM(story_points), 0)
                FROM tasks
                WHERE sprint_id = $1
                AND status = 'done'
                AND completed_date::date <= $2",
                [$sprintId, $dateStr]
            )->fetchColumn();

            $actualRemaining = $totalPoints - $actualCompleted;

            $burndownData[] = [
                'date' => $dateStr,
                'ideal_remaining' => round($idealRemaining, 2),
                'actual_remaining' => $actualRemaining,
                'completed' => $actualCompleted
            ];

            $currentDate->modify('+1 day');
        }

        return $burndownData;
    }

    /**
     * Get velocity history for a project (last N sprints)
     */
    public function getVelocityHistory($companyId, $projectId, $limit = 6) {
        $sql = "
            SELECT
                s.name,
                s.start_date,
                s.end_date,
                COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END), 0) as completed_points,
                COALESCE(SUM(t.story_points), 0) as committed_points
            FROM sprints s
            LEFT JOIN tasks t ON t.sprint_id = s.id
            WHERE s.company_id = $1
            AND s.project_id = $2
            AND s.status = 'completed'
            GROUP BY s.id, s.name, s.start_date, s.end_date
            ORDER BY s.end_date DESC
            LIMIT $3";

        $result = $this->db->query($sql, [$companyId, $projectId, $limit]);
        return array_reverse($result->fetchAll()); // Oldest first
    }
}
