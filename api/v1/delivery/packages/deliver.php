<?php
/**
 * Mark Package Delivered API
 * POST /api/v1/delivery/packages/deliver.php?id=xxx
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

$packageId = $_GET['id'] ?? null;
if (!$packageId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Package ID required']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    $deliveryService = DeliveryService::getInstance();

    $package = $deliveryService->markPackageDelivered($packageId, $input);

    echo json_encode([
        'success' => true,
        'data' => $package,
        'message' => 'Package marked as delivered'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
