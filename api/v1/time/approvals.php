<?php
/**
 * Time Entry Approval Workflow API
 *
 * Endpoints:
 * POST /approvals/approve     - Approve time entry
 * POST /approvals/reject      - Reject time entry
 * GET  /approvals/history/:id - Get approval history for entry
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

    // Check if user has approval permissions
    // TODO: Implement role-based access control
    // For now, we'll allow any authenticated user in the company

    $timeEntryService = new TimeEntryService();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET - Get approval history
    if ($method === 'GET') {
        $timeEntryId = $_GET['time_entry_id'] ?? $_GET['id'] ?? null;

        if (!$timeEntryId) {
            throw new Exception('Time entry ID is required');
        }

        $history = $timeEntryService->getApprovalHistory($timeEntryId);

        echo json_encode([
            'success' => true,
            'data' => [
                'history' => $history,
                'count' => count($history)
            ]
        ]);
    }

    // POST - Approve or reject
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        $timeEntryId = $input['time_entry_id'] ?? $input['id'] ?? null;
        $action = $input['action'] ?? null;

        if (!$timeEntryId) {
            throw new Exception('Time entry ID is required');
        }

        if (!$action) {
            throw new Exception('Action is required (approve or reject)');
        }

        $approverId = $userData['user_id'];

        if ($action === 'approve') {
            $comments = $input['comments'] ?? null;

            $timeEntryService->approveTimeEntry($timeEntryId, $companyId, $approverId, $comments);

            $entry = $timeEntryService->getTimeEntry($timeEntryId, $companyId);

            echo json_encode([
                'success' => true,
                'data' => ['entry' => $entry],
                'message' => 'Time entry approved successfully'
            ]);

        } elseif ($action === 'reject') {
            $reason = $input['reason'] ?? null;

            if (!$reason) {
                throw new Exception('Rejection reason is required');
            }

            $timeEntryService->rejectTimeEntry($timeEntryId, $companyId, $approverId, $reason);

            $entry = $timeEntryService->getTimeEntry($timeEntryId, $companyId);

            echo json_encode([
                'success' => true,
                'data' => ['entry' => $entry],
                'message' => 'Time entry rejected'
            ]);

        } else {
            throw new Exception('Invalid action. Use "approve" or "reject"');
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
