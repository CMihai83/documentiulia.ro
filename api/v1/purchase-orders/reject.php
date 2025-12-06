<?php
/**
 * Reject Purchase Order API Endpoint
 *
 * Rejects a purchase order with reason
 *
 * @endpoint /api/v1/purchase-orders/reject.php
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

if (empty($input['id'])) {
    sendError('Purchase order ID is required', 400);
}

if (empty($input['reason'])) {
    sendError('Rejection reason is required', 400);
}

// Initialize service
$poService = new PurchaseOrderService($pdo);

try {
    $po = $poService->rejectPurchaseOrder($companyId, $input['id'], $userData['user_id'], $input['reason']);
    sendSuccess(['purchase_order' => $po], 'Purchase order rejected');
} catch (Exception $e) {
    error_log('Reject PO error: ' . $e->getMessage());
    sendError('Failed to reject purchase order', 500);
}
