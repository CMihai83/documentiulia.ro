<?php
/**
 * Delivery Estimate API (Public)
 * GET /api/v1/delivery/portal/estimate.php?package_id=xxx OR ?tracking=xxx
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

$packageId = $_GET['package_id'] ?? null;
$tracking = $_GET['tracking'] ?? null;

if (!$packageId && !$tracking) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Package ID or tracking number required']);
    exit;
}

try {
    $deliveryService = DeliveryService::getInstance();

    // If tracking number provided, convert to package ID
    if ($tracking && !$packageId) {
        $package = $deliveryService->getPackageByTracking($tracking);
        if ($package) {
            $packageId = $package['id'];
        } else {
            throw new Exception('Package not found');
        }
    }

    $estimate = $deliveryService->getDeliveryEstimate($packageId);

    echo json_encode([
        'success' => true,
        'data' => $estimate
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
