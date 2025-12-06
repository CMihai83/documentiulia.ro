<?php
/**
 * Driver Performance History API
 * GET /api/v1/delivery/performance/history.php?driver_id=xxx
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

$driverId = $_GET['driver_id'] ?? null;
if (!$driverId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Driver ID required']);
    exit;
}

$dateFrom = $_GET['date_from'] ?? null;
$dateTo = $_GET['date_to'] ?? null;

try {
    $deliveryService = DeliveryService::getInstance();

    $history = $deliveryService->getDriverPerformanceHistory($driverId, $dateFrom, $dateTo);

    echo json_encode([
        'success' => true,
        'data' => $history,
        'filters' => [
            'driver_id' => $driverId,
            'date_from' => $dateFrom,
            'date_to' => $dateTo
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
