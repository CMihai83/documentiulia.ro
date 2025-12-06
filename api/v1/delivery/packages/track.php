<?php
/**
 * Public Package Tracking API
 * GET /api/v1/delivery/packages/track.php?tracking=xxx
 * No authentication required - public tracking
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../services/DeliveryService.php';

$trackingNumber = $_GET['tracking'] ?? null;
if (!$trackingNumber) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Tracking number required']);
    exit;
}

try {
    $deliveryService = DeliveryService::getInstance();

    $package = $deliveryService->getPackageByTracking($trackingNumber);

    if (!$package) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Package not found']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'data' => $package
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
