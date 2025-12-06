<?php
/**
 * Delivery Preferences API (Public)
 * PUT /api/v1/delivery/portal/preferences.php?package_id=xxx
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../services/DeliveryService.php';

$packageId = $_GET['package_id'] ?? null;
if (!$packageId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Package ID required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (empty($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Preferences data required']);
    exit;
}

try {
    $deliveryService = DeliveryService::getInstance();

    $updated = $deliveryService->updateDeliveryPreferences($packageId, $input);

    echo json_encode([
        'success' => true,
        'data' => $updated,
        'message' => 'Delivery preferences updated'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
