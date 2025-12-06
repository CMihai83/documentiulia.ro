<?php
/**
 * Real-Time Timer API
 *
 * Endpoints:
 * POST /timer/start - Start a new timer
 * POST /timer/stop  - Stop active timer
 * GET  /timer/active - Get current active timer
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
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

    $timeEntryService = new TimeEntryService();
    $method = $_SERVER['REQUEST_METHOD'];

    // Determine action from path
    $path = $_SERVER['PATH_INFO'] ?? $_SERVER['REQUEST_URI'] ?? '';
    $action = '';

    if (strpos($path, '/start') !== false) {
        $action = 'start';
    } elseif (strpos($path, '/stop') !== false) {
        $action = 'stop';
    } elseif (strpos($path, '/active') !== false) {
        $action = 'active';
    }

    // GET - Get active timer
    if ($method === 'GET' || $action === 'active') {
        $employeeId = $_GET['employee_id'] ?? null;

        if (!$employeeId) {
            throw new Exception('Employee ID is required');
        }

        // Find active timer for this employee
        $filters = [
            'employee_id' => $employeeId,
            'limit' => 1
        ];

        $entries = $timeEntryService->listTimeEntries($companyId, $filters);

        // Filter to only entries with start_time but no end_time
        $activeTimer = null;
        foreach ($entries as $entry) {
            if (!empty($entry['start_time']) && empty($entry['end_time'])) {
                $activeTimer = $entry;
                break;
            }
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'active_timer' => $activeTimer,
                'is_running' => $activeTimer !== null
            ]
        ]);
    }

    // POST - Start or stop timer
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        // Determine action if not already set from path
        if (!$action && isset($input['action'])) {
            $action = $input['action'];
        }

        if ($action === 'start') {
            // Start new timer
            $employeeId = $input['employee_id'] ?? null;

            if (!$employeeId) {
                throw new Exception('Employee ID is required');
            }

            $timerData = [
                'project_id' => $input['project_id'] ?? null,
                'task_id' => $input['task_id'] ?? null,
                'description' => $input['description'] ?? null,
                'is_billable' => $input['is_billable'] ?? true,
                'tags' => $input['tags'] ?? null,
                'location_lat' => $input['location_lat'] ?? null,
                'location_lng' => $input['location_lng'] ?? null,
                'location_accuracy' => $input['location_accuracy'] ?? null
            ];

            $timerId = $timeEntryService->startTimer($companyId, $employeeId, $timerData);
            $timer = $timeEntryService->getTimeEntry($timerId, $companyId);

            echo json_encode([
                'success' => true,
                'data' => [
                    'timer_id' => $timerId,
                    'timer' => $timer,
                    'started_at' => $timer['start_time']
                ],
                'message' => 'Timer started successfully'
            ]);

        } elseif ($action === 'stop') {
            // Stop active timer
            $timerId = $input['timer_id'] ?? $input['id'] ?? null;
            $employeeId = $input['employee_id'] ?? null;

            if (!$timerId) {
                throw new Exception('Timer ID is required');
            }

            if (!$employeeId) {
                throw new Exception('Employee ID is required');
            }

            $timer = $timeEntryService->stopTimer($timerId, $companyId, $employeeId);

            // Calculate final duration
            $startTime = new DateTime($timer['start_time']);
            $endTime = new DateTime($timer['end_time']);
            $duration = $endTime->getTimestamp() - $startTime->getTimestamp();
            $hours = round($duration / 3600, 2);

            echo json_encode([
                'success' => true,
                'data' => [
                    'timer' => $timer,
                    'duration_seconds' => $duration,
                    'hours' => $hours,
                    'stopped_at' => $timer['end_time']
                ],
                'message' => 'Timer stopped successfully'
            ]);

        } else {
            throw new Exception('Invalid action. Use "start" or "stop"');
        }
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
