<?php
/**
 * Receive Goods API Endpoint
 *
 * Records goods receipt against a purchase order item
 *
 * @endpoint /api/v1/purchase-orders/receive-goods.php
 * @method POST
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/PurchaseOrderService.php';
require_once __DIR__ . '/../../utils/response.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

// Authentication
$authHeader = getHeader('authorization', '') ?? '';
if (empty($authHeader)) {
    sendError('Authorization header missing', 401);
}

$auth = new AuthMiddleware($pdo);
$matches = [];
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    sendError('Invalid authorization format', 401);
}

try {
    $userData = $auth->verifyToken($matches[1]);
} catch (Exception $e) {
    sendError($e->getMessage(), 401);
}

// Get company ID
$companyId = getHeader('x-company-id') ?? null;
if (empty($companyId)) {
    sendError('Company ID header missing', 400);
}

// Get input
$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['purchase_order_item_id'])) {
    sendError('Purchase order item ID is required', 400);
}

if (!isset($input['quantity_received']) || $input['quantity_received'] <= 0) {
    sendError('Quantity received must be greater than 0', 400);
}

// Initialize service
$poService = new PurchaseOrderService($pdo);

try {
    $po = $poService->receiveGoods(
        $companyId,
        $input['purchase_order_item_id'],
        $userData['user_id'],
        $input
    );
    sendSuccess(['purchase_order' => $po], 'Goods received successfully');
} catch (Exception $e) {
    error_log('Receive goods error: ' . $e->getMessage());
    sendError($e->getMessage(), 500);
}
