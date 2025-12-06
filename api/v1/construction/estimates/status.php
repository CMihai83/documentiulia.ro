<?php
/**
 * Estimate Status API
 * PUT - Update estimate status (accept, reject, etc.)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../services/ConstructionEstimateService.php';
require_once __DIR__ . '/../../../helpers/headers.php';

// Authenticate
$authHeader = getHeader('authorization', '') ?? '';
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authorization required']);
    exit;
}

$authService = new AuthService();
try {
    $auth = $authService->verifyToken($matches[1]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $estimateId = $input['estimate_id'] ?? $_GET['id'] ?? null;
    $status = $input['status'] ?? null;
    $reason = $input['reason'] ?? null;

    if (!$estimateId || !$status) {
        throw new Exception('estimate_id and status required');
    }

    $estimateService = ConstructionEstimateService::getInstance();
    $success = $estimateService->updateStatus($estimateId, $status, $reason);

    echo json_encode([
        'success' => $success,
        'message' => $success ? "Status updated to $status" : 'Failed to update status'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
