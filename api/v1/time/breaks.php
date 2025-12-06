<?php
/**
 * Break Time Management API
 *
 * Endpoints:
 * GET  /breaks?time_entry_id=xxx - List breaks for time entry
 * POST /breaks                    - Add break to time entry
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

    // GET - List breaks for a time entry
    if ($method === 'GET') {
        $timeEntryId = $_GET['time_entry_id'] ?? $_GET['id'] ?? null;

        if (!$timeEntryId) {
            throw new Exception('Time entry ID is required');
        }

        $breaks = $timeEntryService->getTimeEntryBreaks($timeEntryId);

        // Calculate total break time
        $totalBreakSeconds = array_reduce($breaks, function($sum, $break) {
            return $sum + ($break['duration_seconds'] ?? 0);
        }, 0);

        echo json_encode([
            'success' => true,
            'data' => [
                'breaks' => $breaks,
                'count' => count($breaks),
                'total_break_seconds' => $totalBreakSeconds,
                'total_break_hours' => round($totalBreakSeconds / 3600, 2)
            ]
        ]);
    }

    // POST - Add break to time entry
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        $timeEntryId = $input['time_entry_id'] ?? null;

        if (!$timeEntryId) {
            throw new Exception('Time entry ID is required');
        }

        if (empty($input['break_start'])) {
            throw new Exception('Break start time is required');
        }

        $breakData = [
            'break_start' => $input['break_start'],
            'break_end' => $input['break_end'] ?? null,
            'break_type' => $input['break_type'] ?? 'regular',
            'notes' => $input['notes'] ?? null
        ];

        $breakId = $timeEntryService->addBreak($timeEntryId, $breakData);

        // Get all breaks for this time entry
        $breaks = $timeEntryService->getTimeEntryBreaks($timeEntryId);

        echo json_encode([
            'success' => true,
            'data' => [
                'break_id' => $breakId,
                'breaks' => $breaks
            ],
            'message' => 'Break added successfully'
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
