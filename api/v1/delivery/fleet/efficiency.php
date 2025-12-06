<?php
/**
 * Vehicle Fuel Efficiency API
 * GET /api/v1/delivery/fleet/efficiency.php?vehicle_id=xxx
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

$vehicleId = $_GET['vehicle_id'] ?? null;
if (!$vehicleId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Vehicle ID required']);
    exit;
}

try {
    $deliveryService = DeliveryService::getInstance();

    $efficiency = $deliveryService->getVehicleFuelEfficiency($vehicleId);

    echo json_encode([
        'success' => true,
        'data' => $efficiency
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
