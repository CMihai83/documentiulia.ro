<?php
/**
 * Record Driver Performance API
 * POST /api/v1/delivery/performance/record.php?driver_id=xxx&route_id=xxx
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../services/DeliveryService.php';
require_once __DIR__ . '/../../../helpers/headers.php';

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$driverId = $_GET['driver_id'] ?? null;
$routeId = $_GET['route_id'] ?? null;

if (!$driverId || !$routeId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Driver ID and Route ID are required']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

try {
    $deliveryService = DeliveryService::getInstance();

    $record = $deliveryService->recordDeliveryPerformance($driverId, $routeId, $input);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'data' => $record,
        'message' => 'Performance record created'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
