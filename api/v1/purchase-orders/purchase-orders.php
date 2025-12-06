<?php
/**
 * Purchase Orders API Endpoint
 *
 * Handles CRUD operations for purchase orders
 * - GET: List all POs or get single PO
 * - POST: Create new PO
 * - PUT: Update existing PO
 * - DELETE: Delete PO
 *
 * @endpoint /api/v1/purchase-orders/purchase-orders.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/PurchaseOrderService.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company from header
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    // Initialize database and service
    $db = Database::getInstance()->getConnection();
    $poService = new PurchaseOrderService($db);
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Get single PO or list all
            if (isset($_GET['id'])) {
                $po = $poService->getPurchaseOrder($companyId, $_GET['id']);
                if (!$po) {
                    throw new Exception('Purchase order not found');
                }
                echo json_encode([
                    'success' => true,
                    'data' => ['purchase_order' => $po]
                ]);
            } else {
                // List with filters
                $filters = [
                    'status' => $_GET['status'] ?? null,
                    'vendor_id' => $_GET['vendor_id'] ?? null,
                    'from_date' => $_GET['from_date'] ?? null,
                    'to_date' => $_GET['to_date'] ?? null,
                    'search' => $_GET['search'] ?? null
                ];

                $purchaseOrders = $poService->listPurchaseOrders($companyId, $filters);
                echo json_encode([
                    'success' => true,
                    'data' => ['purchase_orders' => $purchaseOrders]
                ]);
            }
            break;

        case 'POST':
            // Create new PO
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['vendor_id'])) {
                throw new Exception('Vendor ID is required');
            }

            if (empty($input['items']) || !is_array($input['items'])) {
                throw new Exception('At least one item is required');
            }

            $po = $poService->createPurchaseOrder($companyId, $userData['user_id'], $input);
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'data' => ['purchase_order' => $po],
                'message' => 'Purchase order created successfully'
            ]);
            break;

        case 'PUT':
            // Update PO
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['id'])) {
                throw new Exception('Purchase order ID is required');
            }

            $po = $poService->updatePurchaseOrder($companyId, $input['id'], $userData['user_id'], $input);
            echo json_encode([
                'success' => true,
                'data' => ['purchase_order' => $po],
                'message' => 'Purchase order updated successfully'
            ]);
            break;

        case 'DELETE':
            // Delete PO
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['id'])) {
                throw new Exception('Purchase order ID is required');
            }

            $poService->deletePurchaseOrder($companyId, $input['id']);
            echo json_encode([
                'success' => true,
                'message' => 'Purchase order deleted successfully'
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
