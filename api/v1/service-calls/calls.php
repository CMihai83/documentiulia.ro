<?php
/**
 * Service Calls CRUD API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ServiceCallService.php';
require_once __DIR__ . '/../../helpers/headers.php';

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
    $serviceCallService = ServiceCallService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $callId = $_GET['id'] ?? null;
        if ($callId) {
            $call = $serviceCallService->getServiceCall($companyId, $callId);
            if (!$call) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Service call not found']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $call]);
        } else {
            $filters = [
                'status' => $_GET['status'] ?? null,
                'technician_id' => $_GET['technician_id'] ?? null,
                'service_type' => $_GET['service_type'] ?? null,
                'date_from' => $_GET['date_from'] ?? null,
                'date_to' => $_GET['date_to'] ?? null,
                'priority' => $_GET['priority'] ?? null,
                'search' => $_GET['search'] ?? null
            ];
            $calls = $serviceCallService->listServiceCalls($companyId, $filters);
            echo json_encode(['success' => true, 'data' => $calls, 'count' => count($calls)]);
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['customer_name']) || empty($input['customer_phone']) || empty($input['service_address'])) {
            throw new Exception('customer_name, customer_phone and service_address required');
        }
        $input['created_by'] = $auth['user_id'] ?? null;
        $call = $serviceCallService->createServiceCall($companyId, $input);
        echo json_encode(['success' => true, 'data' => $call]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $callId = $_GET['id'] ?? $input['id'] ?? null;
        if (!$callId) {
            throw new Exception('Service call ID required');
        }

        // Handle status update
        if (!empty($input['status'])) {
            $call = $serviceCallService->updateStatus(
                $companyId,
                $callId,
                $input['status'],
                $input['notes'] ?? null,
                $auth['user_id'] ?? null
            );
            echo json_encode(['success' => true, 'data' => $call]);
        } else {
            throw new Exception('Status required for update');
        }
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
