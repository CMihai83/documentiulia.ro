<?php
/**
 * Convert PO to Invoice API Endpoint
 *
 * Converts a received purchase order to an invoice (expense)
 *
 * @endpoint /api/v1/purchase-orders/convert-to-invoice.php
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

if (empty($input['purchase_order_id'])) {
    sendError('Purchase order ID is required', 400);
}

// Initialize service
$poService = new PurchaseOrderService($pdo);

try {
    // Get PO details
    $po = $poService->getPurchaseOrder($companyId, $input['purchase_order_id']);

    if (!$po) {
        sendError('Purchase order not found', 404);
    }

    if ($po['status'] !== 'received') {
        sendError('Purchase order must be fully received before converting to invoice', 400);
    }

    // Create expense/invoice record
    // This would typically create an entry in the expenses/invoices table
    // For now, we'll return the PO data to be used for invoice creation

    $invoiceData = [
        'vendor_name' => $po['vendor_name'],
        'vendor_email' => $po['vendor_email'],
        'vendor_phone' => $po['vendor_phone'],
        'invoice_number' => $po['po_number'], // Can be modified by user
        'invoice_date' => date('Y-m-d'),
        'due_date' => date('Y-m-d', strtotime('+30 days')),
        'subtotal' => $po['subtotal'],
        'tax_amount' => $po['tax_amount'],
        'discount_amount' => $po['discount_amount'],
        'total_amount' => $po['total_amount'],
        'currency' => $po['currency'],
        'notes' => 'Converted from Purchase Order: ' . $po['po_number'],
        'items' => $po['items']
    ];

    sendSuccess([
        'purchase_order' => $po,
        'invoice_data' => $invoiceData
    ], 'Purchase order ready to be converted to invoice');

} catch (Exception $e) {
    error_log('Convert PO to invoice error: ' . $e->getMessage());
    sendError('Failed to convert purchase order to invoice', 500);
}
