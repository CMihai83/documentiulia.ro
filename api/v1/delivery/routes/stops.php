<?php
/**
 * Route Stops API
 * GET/POST /api/v1/delivery/routes/stops.php?route_id=xxx
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

$routeId = $_GET['route_id'] ?? null;
$stopId = $_GET['stop_id'] ?? null;

try {
    $deliveryService = DeliveryService::getInstance();

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            if ($stopId) {
                $stop = $deliveryService->getRouteStop($stopId);
                if (!$stop) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Stop not found']);
                    exit;
                }
                echo json_encode(['success' => true, 'data' => $stop]);
            } else {
                if (!$routeId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Route ID required']);
                    exit;
                }
                $stops = $deliveryService->getRouteStops($routeId);
                echo json_encode(['success' => true, 'data' => $stops]);
            }
            break;

        case 'POST':
            if (!$routeId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Route ID required']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['address'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Address is required']);
                exit;
            }

            $stop = $deliveryService->addRouteStop($routeId, $input);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'data' => $stop,
                'message' => 'Stop added successfully'
            ]);
            break;

        case 'PUT':
            if (!$stopId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Stop ID required']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $stop = $deliveryService->updateRouteStop($stopId, $input);

            echo json_encode([
                'success' => true,
                'data' => $stop,
                'message' => 'Stop updated successfully'
            ]);
            break;

        case 'DELETE':
            if (!$stopId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Stop ID required']);
                exit;
            }

            $deleted = $deliveryService->deleteRouteStop($stopId);

            if (!$deleted) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Stop not found']);
                exit;
            }

            echo json_encode([
                'success' => true,
                'message' => 'Stop deleted successfully'
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
