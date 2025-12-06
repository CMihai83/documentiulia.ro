<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/TimeEntryService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate user
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied');
    }

    // Get database connection for employee lookup
    $db = Database::getInstance()->getConnection();

    $timeEntryService = new TimeEntryService();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET - List time entries or get single entry
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            // Get single entry with all related data
            $entry = $timeEntryService->getTimeEntry($_GET['id'], $companyId);
            if (!$entry) {
                throw new Exception('Time entry not found');
            }

            echo json_encode([
                'success' => true,
                'data' => ['entry' => $entry]
            ]);
        } elseif (isset($_GET['employee_summary'])) {
            // Employee summary report
            $summary = $timeEntryService->getEmployeeSummary(
                $companyId,
                $_GET['employee_id'],
                $_GET['start_date'] ?? date('Y-m-01'),
                $_GET['end_date'] ?? date('Y-m-t')
            );

            echo json_encode([
                'success' => true,
                'data' => ['summary' => $summary]
            ]);
        } elseif (isset($_GET['customer_summary'])) {
            // Customer summary report
            $summary = $timeEntryService->getCustomerSummary(
                $companyId,
                $_GET['customer_id'],
                $_GET['start_date'] ?? date('Y-m-01'),
                $_GET['end_date'] ?? date('Y-m-t')
            );

            echo json_encode([
                'success' => true,
                'data' => ['summary' => $summary]
            ]);
        } elseif (isset($_GET['productivity_metrics'])) {
            // Productivity metrics
            $metrics = $timeEntryService->getProductivityMetrics(
                $companyId,
                $_GET['employee_id'],
                $_GET['start_date'] ?? date('Y-m-01'),
                $_GET['end_date'] ?? date('Y-m-t')
            );

            echo json_encode([
                'success' => true,
                'data' => ['metrics' => $metrics]
            ]);
        } else {
            // List time entries with filters
            $filters = [
                'employee_id' => $_GET['employee_id'] ?? null,
                'project_id' => $_GET['project_id'] ?? null,
                'task_id' => $_GET['task_id'] ?? null,
                'customer_id' => $_GET['customer_id'] ?? null,
                'status' => $_GET['status'] ?? null,
                'is_billable' => $_GET['is_billable'] ?? null,
                'activity_level' => $_GET['activity_level'] ?? null,
                'start_date' => $_GET['start_date'] ?? null,
                'end_date' => $_GET['end_date'] ?? null,
                'search' => $_GET['search'] ?? null,
                'tags' => isset($_GET['tags']) ? explode(',', $_GET['tags']) : null,
                'limit' => $_GET['limit'] ?? 100,
                'offset' => $_GET['offset'] ?? 0
            ];

            $entries = $timeEntryService->listTimeEntries($companyId, $filters);

            echo json_encode([
                'success' => true,
                'data' => [
                    'entries' => $entries,
                    'count' => count($entries),
                    'filters' => array_filter($filters, fn($v) => $v !== null)
                ]
            ]);
        }
    }

    // POST - Create new time entry
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        // Auto-detect employee from logged-in user if not provided
        // Note: employees table doesn't have user_id column, so we allow time entries without employee_id
        // TimeEntryService will handle this by using the authenticated user's ID
        if (empty($input['employee_id'])) {
            // Allow time entry without employee_id - will be associated with user directly
            $input['employee_id'] = null;
        }

        // Accept 'duration' as alias for 'duration_seconds'
        if (isset($input['duration']) && !isset($input['duration_seconds'])) {
            $input['duration_seconds'] = $input['duration'];
        }

        // Handle "null" string for project_id
        if (isset($input['project_id']) && ($input['project_id'] === 'null' || $input['project_id'] === '')) {
            $input['project_id'] = null;
        }

        // Validate based on entry type
        if (!isset($input['start_time']) && !isset($input['end_time'])) {
            // Manual entry - require hours or duration
            if (empty($input['hours']) && empty($input['duration_seconds'])) {
                throw new Exception('Hours or duration is required for manual entries');
            }
        }

        $entryId = $timeEntryService->createTimeEntry($companyId, $input);

        // Fetch the created entry to return full data
        $entry = $timeEntryService->getTimeEntry($entryId, $companyId);

        echo json_encode([
            'success' => true,
            'data' => [
                'entry_id' => $entryId,
                'entry' => $entry
            ],
            'message' => 'Time entry created successfully'
        ]);
    }

    // PUT - Update time entry
    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Time entry ID is required');
        }

        $timeEntryService->updateTimeEntry($input['id'], $companyId, $input);

        // Fetch updated entry
        $entry = $timeEntryService->getTimeEntry($input['id'], $companyId);

        echo json_encode([
            'success' => true,
            'data' => ['entry' => $entry],
            'message' => 'Time entry updated successfully'
        ]);
    }

    // DELETE - Delete time entry
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Time entry ID is required');
        }

        $timeEntryService->deleteTimeEntry($input['id'], $companyId);

        echo json_encode([
            'success' => true,
            'message' => 'Time entry deleted successfully'
        ]);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
