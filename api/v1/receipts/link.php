<?php
/**
 * Link receipt to expense
 *
 * POST /api/v1/receipts/link
 * Body: { "receipt_id": "uuid", "expense_id": "uuid" }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ReceiptService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['receipt_id']) || empty($input['receipt_id'])) {
        throw new Exception('Receipt ID required');
    }

    if (!isset($input['expense_id']) || empty($input['expense_id'])) {
        throw new Exception('Expense ID required');
    }

    $receiptId = $input['receipt_id'];
    $expenseId = $input['expense_id'];

    // Link receipt to expense
    $receiptService = new ReceiptService();
    $success = $receiptService->linkToExpense($receiptId, $expenseId);

    if (!$success) {
        throw new Exception('Failed to link receipt to expense');
    }

    echo json_encode([
        'success' => true,
        'message' => 'Receipt linked to expense successfully'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
