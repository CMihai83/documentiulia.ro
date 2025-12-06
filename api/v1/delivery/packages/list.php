<?php
/**
 * List Packages API
 * GET /api/v1/delivery/packages/list.php
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

$companyId = getHeader('x-company-id', '');
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $deliveryService = DeliveryService::getInstance();

    $filters = [
        'status' => $_GET['status'] ?? null,
        'route_id' => $_GET['route_id'] ?? null,
        'delivery_date' => $_GET['delivery_date'] ?? null,
        'priority' => $_GET['priority'] ?? null,
        'search' => $_GET['search'] ?? null,
        'unassigned' => isset($_GET['unassigned']),
        'limit' => $_GET['limit'] ?? 50,
        'offset' => $_GET['offset'] ?? 0
    ];

    $packages = $deliveryService->listPackages($companyId, array_filter($filters, function($v) { return $v !== null; }));

    echo json_encode([
        'success' => true,
        'data' => $packages
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
