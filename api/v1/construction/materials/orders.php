<?php
/**
 * Material Orders API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../services/MaterialsTrackingService.php';
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
    $materialsService = MaterialsTrackingService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $orderId = $_GET['id'] ?? null;
        if ($orderId) {
            $order = $materialsService->getOrder($companyId, $orderId);
            if (!$order) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Order not found']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $order]);
        } else {
            $filters = [
                'status' => $_GET['status'] ?? null,
                'project_id' => $_GET['project_id'] ?? null
            ];
            $orders = $materialsService->listOrders($companyId, $filters);
            echo json_encode(['success' => true, 'data' => $orders, 'count' => count($orders)]);
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['items'])) {
            throw new Exception('Order items required');
        }
        $input['created_by'] = $auth['user_id'] ?? null;
        $order = $materialsService->createOrder($companyId, $input);
        echo json_encode(['success' => true, 'data' => $order]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $orderId = $_GET['id'] ?? $input['id'] ?? null;
        if (!$orderId) {
            throw new Exception('Order ID required');
        }
        if (empty($input['status'])) {
            throw new Exception('Status required');
        }
        $order = $materialsService->updateOrderStatus($companyId, $orderId, $input['status']);
        echo json_encode(['success' => true, 'data' => $order]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
