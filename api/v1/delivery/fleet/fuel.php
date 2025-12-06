<?php
/**
 * Vehicle Fuel Log API
 * GET/POST /api/v1/delivery/fleet/fuel.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

$vehicleId = $_GET['vehicle_id'] ?? null;

try {
    $deliveryService = DeliveryService::getInstance();

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            if (!$vehicleId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Vehicle ID required']);
                exit;
            }

            $dateFrom = $_GET['date_from'] ?? null;
            $dateTo = $_GET['date_to'] ?? null;

            $logs = $deliveryService->getVehicleFuelHistory($vehicleId, $dateFrom, $dateTo);
            echo json_encode(['success' => true, 'data' => $logs]);
            break;

        case 'POST':
            if (!$vehicleId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Vehicle ID required']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['date']) || empty($input['quantity_liters'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Date and quantity are required']);
                exit;
            }

            $log = $deliveryService->addFuelLog($vehicleId, $input);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'data' => $log,
                'message' => 'Fuel log added'
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
