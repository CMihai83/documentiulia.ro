<?php
/**
 * Customer Delivery History API (Public)
 * GET /api/v1/delivery/portal/history.php?phone=xxx OR ?email=xxx
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

$identifier = $_GET['phone'] ?? $_GET['email'] ?? null;
if (!$identifier) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Phone or email required']);
    exit;
}

$limit = intval($_GET['limit'] ?? 20);

try {
    $deliveryService = DeliveryService::getInstance();

    $history = $deliveryService->getCustomerDeliveryHistory($identifier, $limit);

    echo json_encode([
        'success' => true,
        'data' => $history,
        'count' => count($history)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
