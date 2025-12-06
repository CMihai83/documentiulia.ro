<?php

require_once __DIR__ . '/../config/database.php';

/**
 * Enhanced Time Entry Service with AI Features
 *
 * Features:
 * - AI-powered task prediction and duration estimation
 * - GPS/Geofencing validation
 * - Screenshot and activity tracking
 * - Approval workflows
 * - Break time management
 * - Activity pattern learning
 * - Real-time timer support
 */
class TimeEntryService {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    // ==========================================================================
    // CORE TIME ENTRY OPERATIONS
    // ==========================================================================

    /**
     * List time entries with optional filters and advanced search
     */
    public function listTimeEntries($companyId, $filters = []) {
        $conditions = ['te.company_id = $1'];
        $params = [$companyId];
        $paramCount = 1;

        // Basic filters
        if (!empty($filters['employee_id'])) {
            $paramCount++;
            $conditions[] = "te.employee_id = $$paramCount";
            $params[] = $filters['employee_id'];
        }

        if (!empty($filters['project_id'])) {
            $paramCount++;
            $conditions[] = "te.project_id = $$paramCount";
            $params[] = $filters['project_id'];
        }

        if (!empty($filters['task_id'])) {
            $paramCount++;
            $conditions[] = "te.task_id = $$paramCount";
            $params[] = $filters['task_id'];
        }

        if (!empty($filters['customer_id'])) {
            $paramCount++;
            $conditions[] = "te.customer_id = $$paramCount";
            $params[] = $filters['customer_id'];
        }

        if (!empty($filters['status'])) {
            $paramCount++;
            $conditions[] = "te.status = $$paramCount";
            $params[] = $filters['status'];
        }

        if (!empty($filters['is_billable'])) {
            $paramCount++;
            $conditions[] = "te.is_billable = $$paramCount";
            $params[] = $filters['is_billable'] === 'true';
        }

        if (!empty($filters['activity_level'])) {
            $paramCount++;
            $conditions[] = "te.activity_level = $$paramCount";
            $params[] = $filters['activity_level'];
        }

        // Date range filters
        if (!empty($filters['start_date'])) {
            $paramCount++;
            $conditions[] = "te.entry_date >= $$paramCount";
            $params[] = $filters['start_date'];
        }

        if (!empty($filters['end_date'])) {
            $paramCount++;
            $conditions[] = "te.entry_date <= $$paramCount";
            $params[] = $filters['end_date'];
        }

        // Search by description
        if (!empty($filters['search'])) {
            $paramCount++;
            $conditions[] = "te.description ILIKE $$paramCount";
            $params[] = '%' . $filters['search'] . '%';
        }

        // Filter by tags
        if (!empty($filters['tags'])) {
            $paramCount++;
            $conditions[] = "te.tags && $$paramCount";
            $params[] = '{' . implode(',', (array)$filters['tags']) . '}';
        }

        $whereClause = implode(' AND ', $conditions);

        $query = "
            SELECT
                te.*,
                ec.display_name as employee_name,
                c.display_name as customer_name,
                p.name as project_name,
                t.title as task_name,
                (te.duration_seconds / 3600.0) as hours_calculated,
                u.email as approved_by_email,
                u.first_name || ' ' || u.last_name as approved_by_name
            FROM time_entries te
            LEFT JOIN employees e ON te.employee_id = e.id
            LEFT JOIN contacts ec ON e.contact_id = ec.id
            LEFT JOIN contacts c ON te.customer_id = c.id
            LEFT JOIN projects p ON te.project_id = p.id
            LEFT JOIN tasks t ON te.task_id = t.id
            LEFT JOIN users u ON te.approved_by = u.id
            WHERE $whereClause
            ORDER BY te.entry_date DESC, te.created_at DESC
        ";

        $limit = $filters['limit'] ?? 100;
        $offset = $filters['offset'] ?? 0;
        $query .= " LIMIT $limit OFFSET $offset";

        return $this->db->fetchAll($query, $params);
    }

    /**
     * Get single time entry by ID with all related data
     */
    public function getTimeEntry($id, $companyId) {
        $timeEntry = $this->db->fetchOne(
            "SELECT
                te.*,
                ec.display_name as employee_name,
                c.display_name as customer_name,
                p.name as project_name,
                t.title as task_name,
                (te.duration_seconds / 3600.0) as hours_calculated,
                u.email as approved_by_email,
                u.first_name || ' ' || u.last_name as approved_by_name
             FROM time_entries te
             LEFT JOIN employees e ON te.employee_id = e.id
             LEFT JOIN contacts ec ON e.contact_id = ec.id
             LEFT JOIN contacts c ON te.customer_id = c.id
             LEFT JOIN projects p ON te.project_id = p.id
             LEFT JOIN tasks t ON te.task_id = t.id
             LEFT JOIN users u ON te.approved_by = u.id
             WHERE te.id = $1 AND te.company_id = $2",
            [$id, $companyId]
        );

        if ($timeEntry) {
            // Fetch breaks
            $timeEntry['breaks'] = $this->getTimeEntryBreaks($id);

            // Fetch screenshots
            $timeEntry['screenshots'] = $this->getTimeEntryScreenshots($id);

            // Fetch approval history
            $timeEntry['approval_history'] = $this->getApprovalHistory($id);
        }

        return $timeEntry;
    }

    /**
     * Create new time entry with advanced features
     */
    public function createTimeEntry($companyId, $data) {
        // Allow time entries without employee_id - will be associated with authenticated user
        // No longer require employee_id since not all users have employee records

        // Calculate duration from start/end times if provided
        $durationSeconds = null;
        $hours = $data['hours'] ?? null;

        if (!empty($data['start_time']) && !empty($data['end_time'])) {
            $start = new DateTime($data['start_time']);
            $end = new DateTime($data['end_time']);
            $durationSeconds = $end->getTimestamp() - $start->getTimestamp();
            $hours = $durationSeconds / 3600.0;
        } elseif (isset($data['duration_seconds'])) {
            $durationSeconds = $data['duration_seconds'];
            $hours = $durationSeconds / 3600.0;
        }

        // Get AI task prediction if not specified (only if employee_id is provided)
        $taskId = $data['task_id'] ?? null;
        $aiSuggestedTaskId = null;
        $aiConfidenceScore = null;

        if (empty($taskId) && !empty($data['employee_id'])) {
            $prediction = $this->predictTask($companyId, $data['employee_id'], [
                'project_id' => $data['project_id'] ?? null,
                'description' => $data['description'] ?? null,
                'time_of_day' => isset($data['start_time']) ? date('H', strtotime($data['start_time'])) : date('H'),
                'day_of_week' => isset($data['start_time']) ? date('w', strtotime($data['start_time'])) : date('w')
            ]);

            if ($prediction && $prediction['confidence_score'] > 0.7) {
                $aiSuggestedTaskId = $prediction['task_id'];
                $aiConfidenceScore = $prediction['confidence_score'];
            }
        }

        // Validate geofence if required (only if employee_id is provided)
        $geofenceId = null;
        $locationVerified = false;
        if (!empty($data['location_lat']) && !empty($data['location_lng']) && !empty($data['employee_id'])) {
            $geofenceValidation = $this->validateGeofence(
                $companyId,
                $data['employee_id'],
                $data['location_lat'],
                $data['location_lng']
            );
            $geofenceId = $geofenceValidation['geofence_id'] ?? null;
            $locationVerified = $geofenceValidation['verified'] ?? false;
        }

        $query = "
            INSERT INTO time_entries (
                company_id, employee_id, customer_id, project_id, task_id,
                entry_date, start_time, end_time, duration_seconds, hours,
                hourly_rate, description, is_billable,
                ai_suggested_task_id, ai_confidence_score,
                location_lat, location_lng, location_accuracy, location_captured_at,
                geofence_id, location_verified,
                activity_level, keyboard_strokes, mouse_clicks,
                active_window_title, active_application,
                status, tags, time_entry_type, billable_amount, currency,
                timezone, device_info, ip_address, notes
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                $31, $32, $33, $34, $35
            )
            RETURNING id
        ";

        // Sanitize boolean fields - convert to explicit 't'/'f' for PostgreSQL
        $isBillable = false;
        if (isset($data['is_billable']) && $data['is_billable'] !== '') {
            $isBillable = filter_var($data['is_billable'], FILTER_VALIDATE_BOOLEAN);
        }
        // PostgreSQL needs explicit boolean values, not PHP false which can become empty string
        $isBillable = $isBillable ? true : false;
        $locVerified = ($locationVerified === true || $locationVerified === 'true') ? true : false;

        $result = $this->db->fetchOne($query, [
            $companyId,
            $data['employee_id'],
            $data['customer_id'] ?? null,
            $data['project_id'] ?? null,
            $taskId ?? $aiSuggestedTaskId,
            $data['entry_date'] ?? date('Y-m-d'),
            $data['start_time'] ?? null,
            $data['end_time'] ?? null,
            $durationSeconds,
            $hours,
            $data['hourly_rate'] ?? null,
            $data['description'] ?? null,
            $isBillable,
            $aiSuggestedTaskId,
            $aiConfidenceScore,
            $data['location_lat'] ?? null,
            $data['location_lng'] ?? null,
            $data['location_accuracy'] ?? null,
            $data['location_captured_at'] ?? null,
            $geofenceId,
            $locVerified,
            $data['activity_level'] ?? 'normal',
            $data['keyboard_strokes'] ?? 0,
            $data['mouse_clicks'] ?? 0,
            $data['active_window_title'] ?? null,
            $data['active_application'] ?? null,
            $data['status'] ?? 'pending',
            isset($data['tags']) ? '{' . implode(',', (array)$data['tags']) . '}' : null,
            $data['time_entry_type'] ?? 'regular',
            $data['billable_amount'] ?? null,
            $data['currency'] ?? 'RON',
            $data['timezone'] ?? null,
            isset($data['device_info']) ? json_encode($data['device_info']) : null,
            $data['ip_address'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
            $data['notes'] ?? null
        ]);

        return $result['id'];
    }

    /**
     * Start a timer for a time entry
     */
    public function startTimer($companyId, $employeeId, $data) {
        // Check if there's already an active timer for this employee
        $activeTimer = $this->db->fetchOne(
            "SELECT id FROM time_entries
             WHERE company_id = $1 AND employee_id = $2
               AND start_time IS NOT NULL AND end_time IS NULL
             ORDER BY start_time DESC
             LIMIT 1",
            [$companyId, $employeeId]
        );

        if ($activeTimer) {
            throw new Exception('There is already an active timer for this employee');
        }

        $data['start_time'] = date('Y-m-d H:i:s');
        $data['entry_date'] = date('Y-m-d');
        $data['employee_id'] = $employeeId;

        return $this->createTimeEntry($companyId, $data);
    }

    /**
     * Stop a running timer
     */
    public function stopTimer($id, $companyId, $employeeId) {
        $timeEntry = $this->db->fetchOne(
            "SELECT * FROM time_entries
             WHERE id = $1 AND company_id = $2 AND employee_id = $3
               AND start_time IS NOT NULL AND end_time IS NULL",
            [$id, $companyId, $employeeId]
        );

        if (!$timeEntry) {
            throw new Exception('Active timer not found');
        }

        $endTime = date('Y-m-d H:i:s');

        $this->db->query(
            "UPDATE time_entries
             SET end_time = $1, updated_at = NOW()
             WHERE id = $2 AND company_id = $3",
            [$endTime, $id, $companyId]
        );

        return $this->getTimeEntry($id, $companyId);
    }

    /**
     * Update time entry
     */
    public function updateTimeEntry($id, $companyId, $data) {
        $fields = [];
        $params = [];
        $paramCount = 0;

        $allowedFields = [
            'employee_id', 'customer_id', 'project_id', 'task_id', 'entry_date',
            'start_time', 'end_time', 'duration_seconds', 'hours', 'hourly_rate',
            'description', 'is_billable', 'activity_level', 'status', 'tags',
            'time_entry_type', 'billable_amount', 'currency', 'notes',
            'location_lat', 'location_lng', 'location_accuracy',
            'keyboard_strokes', 'mouse_clicks', 'active_window_title', 'active_application'
        ];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $paramCount++;
                if ($field === 'tags' && is_array($data[$field])) {
                    $fields[] = "$field = $$paramCount";
                    $params[] = '{' . implode(',', $data[$field]) . '}';
                } else {
                    $fields[] = "$field = $$paramCount";
                    $params[] = $data[$field];
                }
            }
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

        $fields[] = 'updated_at = NOW()';
        $setClause = implode(', ', $fields);
        $query = "UPDATE time_entries SET $setClause WHERE id = $$idParam AND company_id = $$companyParam";

        $this->db->query($query, $params);
    }

    /**
     * Delete time entry
     */
    public function deleteTimeEntry($id, $companyId) {
        $this->db->query(
            "DELETE FROM time_entries WHERE id = $1 AND company_id = $2",
            [$id, $companyId]
        );
    }

    // ==========================================================================
    // BREAK TIME MANAGEMENT
    // ==========================================================================

    /**
     * Add break to time entry
     */
    public function addBreak($timeEntryId, $data) {
        $query = "
            INSERT INTO time_entry_breaks (
                time_entry_id, break_start, break_end, duration_seconds,
                break_type, notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        ";

        $durationSeconds = null;
        if (!empty($data['break_start']) && !empty($data['break_end'])) {
            $start = new DateTime($data['break_start']);
            $end = new DateTime($data['break_end']);
            $durationSeconds = $end->getTimestamp() - $start->getTimestamp();
        }

        $result = $this->db->fetchOne($query, [
            $timeEntryId,
            $data['break_start'],
            $data['break_end'] ?? null,
            $durationSeconds,
            $data['break_type'] ?? 'regular',
            $data['notes'] ?? null
        ]);

        // Update time entry with break totals
        $this->updateTimeEntryBreakTotals($timeEntryId);

        return $result['id'];
    }

    /**
     * Get breaks for a time entry
     */
    public function getTimeEntryBreaks($timeEntryId) {
        return $this->db->fetchAll(
            "SELECT * FROM time_entry_breaks
             WHERE time_entry_id = $1
             ORDER BY break_start ASC",
            [$timeEntryId]
        );
    }

    /**
     * Update break totals on time entry
     */
    private function updateTimeEntryBreakTotals($timeEntryId) {
        $this->db->query(
            "UPDATE time_entries
             SET break_duration_seconds = (
                 SELECT COALESCE(SUM(duration_seconds), 0)
                 FROM time_entry_breaks
                 WHERE time_entry_id = $1
             ),
             breaks_count = (
                 SELECT COUNT(*)
                 FROM time_entry_breaks
                 WHERE time_entry_id = $1
             )
             WHERE id = $1",
            [$timeEntryId]
        );
    }

    // ==========================================================================
    // SCREENSHOT & ACTIVITY TRACKING
    // ==========================================================================

    /**
     * Add screenshot to time entry
     */
    public function addScreenshot($timeEntryId, $data) {
        $query = "
            INSERT INTO time_entry_screenshots (
                time_entry_id, screenshot_url, thumbnail_url, captured_at,
                blur_level, activity_level, file_size_bytes, width, height
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        ";

        $result = $this->db->fetchOne($query, [
            $timeEntryId,
            $data['screenshot_url'],
            $data['thumbnail_url'] ?? null,
            $data['captured_at'] ?? date('Y-m-d H:i:s'),
            $data['blur_level'] ?? 0,
            $data['activity_level'] ?? null,
            $data['file_size_bytes'] ?? null,
            $data['width'] ?? null,
            $data['height'] ?? null
        ]);

        // Update screenshot count
        $this->db->query(
            "UPDATE time_entries
             SET screenshot_count = (
                 SELECT COUNT(*) FROM time_entry_screenshots WHERE time_entry_id = $1
             )
             WHERE id = $1",
            [$timeEntryId]
        );

        return $result['id'];
    }

    /**
     * Get screenshots for a time entry
     */
    public function getTimeEntryScreenshots($timeEntryId) {
        return $this->db->fetchAll(
            "SELECT * FROM time_entry_screenshots
             WHERE time_entry_id = $1
             ORDER BY captured_at ASC",
            [$timeEntryId]
        );
    }

    // ==========================================================================
    // APPROVAL WORKFLOW
    // ==========================================================================

    /**
     * Approve time entry
     */
    public function approveTimeEntry($id, $companyId, $approverId, $comments = null) {
        $timeEntry = $this->getTimeEntry($id, $companyId);
        if (!$timeEntry) {
            throw new Exception('Time entry not found');
        }

        $previousStatus = $timeEntry['status'];

        // Update time entry status
        $this->db->query(
            "UPDATE time_entries
             SET status = 'approved', approved_by = $1, approved_at = NOW()
             WHERE id = $2 AND company_id = $3",
            [$approverId, $id, $companyId]
        );

        // Log approval
        $this->db->query(
            "INSERT INTO time_entry_approvals (
                time_entry_id, approver_id, action, comments,
                previous_status, new_status
            ) VALUES ($1, $2, 'approved', $3, $4, 'approved')",
            [$id, $approverId, $comments, $previousStatus]
        );

        return true;
    }

    /**
     * Reject time entry
     */
    public function rejectTimeEntry($id, $companyId, $approverId, $reason) {
        $timeEntry = $this->getTimeEntry($id, $companyId);
        if (!$timeEntry) {
            throw new Exception('Time entry not found');
        }

        $previousStatus = $timeEntry['status'];

        // Update time entry status
        $this->db->query(
            "UPDATE time_entries
             SET status = 'rejected', rejection_reason = $1
             WHERE id = $2 AND company_id = $3",
            [$reason, $id, $companyId]
        );

        // Log rejection
        $this->db->query(
            "INSERT INTO time_entry_approvals (
                time_entry_id, approver_id, action, comments,
                previous_status, new_status
            ) VALUES ($1, $2, 'rejected', $3, $4, 'rejected')",
            [$id, $approverId, $reason, $previousStatus]
        );

        return true;
    }

    /**
     * Get approval history
     */
    public function getApprovalHistory($timeEntryId) {
        return $this->db->fetchAll(
            "SELECT
                tea.*,
                u.first_name || ' ' || u.last_name as approver_name,
                u.email as approver_email
             FROM time_entry_approvals tea
             JOIN users u ON tea.approver_id = u.id
             WHERE tea.time_entry_id = $1
             ORDER BY tea.created_at DESC",
            [$timeEntryId]
        );
    }

    // ==========================================================================
    // AI-POWERED FEATURES
    // ==========================================================================

    /**
     * Predict task based on user activity patterns
     */
    public function predictTask($companyId, $userId, $context = []) {
        $hour = $context['time_of_day'] ?? date('H');
        $day = $context['day_of_week'] ?? date('w');

        // Get user's activity patterns
        $pattern = $this->db->fetchOne(
            "SELECT * FROM user_activity_patterns
             WHERE user_id = $1 AND company_id = $2
               AND hour_of_day = $3 AND day_of_week = $4
             ORDER BY pattern_confidence DESC
             LIMIT 1",
            [$userId, $companyId, $hour, $day]
        );

        if (!$pattern || empty($pattern['common_tasks'])) {
            return null;
        }

        // Get the most likely task
        $commonTasks = explode(',', trim($pattern['common_tasks'], '{}'));
        $mostLikelyTaskId = $commonTasks[0];

        // Calculate confidence score
        $confidenceScore = $pattern['pattern_confidence'] ?? 0.5;

        // Adjust confidence based on context matching
        if (!empty($context['project_id']) && !empty($pattern['common_projects'])) {
            $commonProjects = explode(',', trim($pattern['common_projects'], '{}'));
            if (in_array($context['project_id'], $commonProjects)) {
                $confidenceScore = min(1.0, $confidenceScore + 0.2);
            }
        }

        // Log prediction
        $this->db->query(
            "INSERT INTO ai_task_predictions (
                user_id, company_id, predicted_task_id, confidence_score,
                prediction_factors, context_data, model_version
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pattern_based_v1')",
            [
                $userId,
                $companyId,
                $mostLikelyTaskId,
                $confidenceScore,
                json_encode(['hour' => $hour, 'day' => $day]),
                json_encode($context)
            ]
        );

        return [
            'task_id' => $mostLikelyTaskId,
            'confidence_score' => $confidenceScore,
            'reason' => 'Based on your activity patterns at this time'
        ];
    }

    /**
     * Estimate task duration using AI
     */
    public function estimateTaskDuration($taskId) {
        // Get historical data for similar tasks
        $historicalData = $this->db->fetchAll(
            "SELECT duration_seconds / 3600.0 as hours
             FROM time_entries
             WHERE task_id = $1 AND end_time IS NOT NULL
             ORDER BY entry_date DESC
             LIMIT 10",
            [$taskId]
        );

        if (empty($historicalData)) {
            return null;
        }

        // Calculate average duration
        $totalHours = array_sum(array_column($historicalData, 'hours'));
        $avgHours = $totalHours / count($historicalData);

        // Log estimation
        $this->db->query(
            "INSERT INTO ai_task_duration_estimates (
                task_id, estimated_hours, estimation_factors, model_version
            ) VALUES ($1, $2, $3, 'historical_average_v1')",
            [
                $taskId,
                $avgHours,
                json_encode(['sample_size' => count($historicalData)])
            ]
        );

        return [
            'estimated_hours' => round($avgHours, 2),
            'confidence' => min(1.0, count($historicalData) / 10),
            'based_on' => count($historicalData) . ' previous entries'
        ];
    }

    /**
     * Provide AI feedback on task prediction
     */
    public function provideFeedback($predictionId, $actualTaskId, $feedback) {
        $this->db->query(
            "UPDATE ai_task_predictions
             SET actual_task_id = $1, feedback = $2, feedback_time = NOW()
             WHERE id = $3",
            [$actualTaskId, $feedback, $predictionId]
        );
    }

    // ==========================================================================
    // GEOFENCING
    // ==========================================================================

    /**
     * Validate location against geofences
     */
    private function validateGeofence($companyId, $employeeId, $lat, $lng) {
        // Check if geofencing is required
        $policy = $this->db->fetchOne(
            "SELECT * FROM time_tracking_policies
             WHERE company_id = $1 AND require_geofence = true AND is_active = true
               AND (applies_to_all_users = true OR $2 = ANY(applies_to_users))
             LIMIT 1",
            [$companyId, $employeeId]
        );

        if (!$policy) {
            return ['verified' => true];
        }

        // Find matching geofence using Haversine formula
        $geofences = $this->db->fetchAll(
            "SELECT
                *,
                (6371000 * acos(
                    cos(radians($1)) *
                    cos(radians(center_lat)) *
                    cos(radians(center_lng) - radians($2)) +
                    sin(radians($1)) *
                    sin(radians(center_lat))
                )) as distance
             FROM geofences
             WHERE company_id = $3 AND is_active = true
             ORDER BY distance ASC",
            [$lat, $lng, $companyId]
        );

        foreach ($geofences as $geofence) {
            if ($geofence['distance'] <= $geofence['radius_meters']) {
                return [
                    'verified' => true,
                    'geofence_id' => $geofence['id'],
                    'geofence_name' => $geofence['name'],
                    'distance' => round($geofence['distance'], 2)
                ];
            }
        }

        return [
            'verified' => false,
            'error' => 'Location is outside allowed geofences'
        ];
    }

    // ==========================================================================
    // ANALYTICS & REPORTING
    // ==========================================================================

    /**
     * Get time summary for employee
     */
    public function getEmployeeSummary($companyId, $employeeId, $startDate, $endDate) {
        return $this->db->fetchOne(
            "SELECT
                COUNT(*) as total_entries,
                COALESCE(SUM(duration_seconds) / 3600.0, 0) as total_hours,
                COALESCE(SUM(CASE WHEN is_billable THEN duration_seconds ELSE 0 END) / 3600.0, 0) as billable_hours,
                COALESCE(SUM(CASE WHEN NOT is_billable THEN duration_seconds ELSE 0 END) / 3600.0, 0) as non_billable_hours,
                COALESCE(SUM(billable_amount), 0) as total_amount,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_entries,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_entries
             FROM time_entries
             WHERE company_id = $1
               AND employee_id = $2
               AND entry_date BETWEEN $3 AND $4",
            [$companyId, $employeeId, $startDate, $endDate]
        );
    }

    /**
     * Get time summary by customer
     */
    public function getCustomerSummary($companyId, $customerId, $startDate, $endDate) {
        return $this->db->fetchAll(
            "SELECT
                ec.display_name as employee_name,
                SUM(te.duration_seconds) / 3600.0 as total_hours,
                SUM(CASE WHEN te.is_billable THEN te.duration_seconds ELSE 0 END) / 3600.0 as billable_hours,
                SUM(te.billable_amount) as total_amount
             FROM time_entries te
             JOIN employees e ON te.employee_id = e.id
             LEFT JOIN contacts ec ON e.contact_id = ec.id
             WHERE te.company_id = $1
               AND te.customer_id = $2
               AND te.entry_date BETWEEN $3 AND $4
             GROUP BY ec.id, ec.display_name
             ORDER BY total_hours DESC",
            [$companyId, $customerId, $startDate, $endDate]
        );
    }

    /**
     * Get productivity metrics
     */
    public function getProductivityMetrics($companyId, $employeeId, $startDate, $endDate) {
        return $this->db->fetchOne(
            "SELECT
                COUNT(*) as total_entries,
                SUM(duration_seconds) / 3600.0 as total_hours,
                AVG(CASE
                    WHEN activity_level = 'very_high' THEN 5
                    WHEN activity_level = 'high' THEN 4
                    WHEN activity_level = 'normal' THEN 3
                    WHEN activity_level = 'low' THEN 2
                    WHEN activity_level = 'idle' THEN 1
                END) as avg_activity_score,
                COUNT(DISTINCT project_id) as projects_worked,
                COUNT(DISTINCT task_id) as tasks_worked,
                SUM(billable_amount) as revenue_generated,
                (SUM(CASE WHEN is_billable THEN duration_seconds ELSE 0 END)::DECIMAL /
                 NULLIF(SUM(duration_seconds), 0)) * 100 as billable_percentage
             FROM time_entries
             WHERE company_id = $1
               AND employee_id = $2
               AND entry_date BETWEEN $3 AND $4",
            [$companyId, $employeeId, $startDate, $endDate]
        );
    }

    /**
     * Get activity patterns for user
     */
    public function getActivityPatterns($userId, $companyId) {
        return $this->db->fetchAll(
            "SELECT
                hour_of_day,
                day_of_week,
                avg_activity_level,
                avg_duration_hours,
                pattern_confidence,
                sample_size
             FROM user_activity_patterns
             WHERE user_id = $1 AND company_id = $2
             ORDER BY hour_of_day, day_of_week",
            [$userId, $companyId]
        );
    }
}
