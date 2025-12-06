<?php
/**
 * Add Delivery Feedback API
 * POST /api/v1/delivery/feedback/create.php?route_id=xxx&package_id=xxx
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

// Note: Feedback can be submitted without authentication (public API for customers)
// or with authentication for internal staff

$driverId = $_GET['driver_id'] ?? null;
$packageId = $_GET['package_id'] ?? null;

if (!$driverId || !$packageId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Driver ID and Package ID are required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['rating']) || $input['rating'] < 1 || $input['rating'] > 5) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Rating (1-5) is required']);
    exit;
}

try {
    $deliveryService = DeliveryService::getInstance();

    $feedback = $deliveryService->addDeliveryFeedback($driverId, $packageId, $input);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'data' => $feedback,
        'message' => 'Thank you for your feedback!'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
