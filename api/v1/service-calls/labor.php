<?php
/**
 * Service Call Labor API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ServiceCallService.php';
require_once __DIR__ . '/../../helpers/headers.php';

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
    $serviceCallService = ServiceCallService::getInstance();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['call_id']) || !isset($input['hours']) || !isset($input['hourly_rate'])) {
        throw new Exception('call_id, hours and hourly_rate required');
    }

    $call = $serviceCallService->setLabor(
        $input['call_id'],
        floatval($input['hours']),
        floatval($input['hourly_rate'])
    );
    echo json_encode(['success' => true, 'data' => $call]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
