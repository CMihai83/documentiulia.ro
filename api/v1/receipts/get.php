<?php
/**
 * Get single receipt by ID
 *
 * GET /api/v1/receipts/get?receipt_id=uuid
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

    // Get receipt ID
    if (!isset($_GET['receipt_id']) || empty($_GET['receipt_id'])) {
        throw new Exception('Receipt ID required');
    }

    $receiptId = $_GET['receipt_id'];

    // Get receipt
    $receiptService = new ReceiptService();
    $receipt = $receiptService->getReceipt($receiptId);

    echo json_encode([
        'success' => true,
        'data' => $receipt
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
