<?php
/**
 * List receipts for a company
 *
 * GET /api/v1/receipts/list
 * Query params: status, date_from, date_to, merchant, linked, limit, offset
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

    // Get company ID
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    // Parse filters
    $filters = [];

    if (isset($_GET['status']) && !empty($_GET['status'])) {
        $filters['status'] = $_GET['status'];
    }

    if (isset($_GET['date_from']) && !empty($_GET['date_from'])) {
        $filters['date_from'] = $_GET['date_from'];
    }

    if (isset($_GET['date_to']) && !empty($_GET['date_to'])) {
        $filters['date_to'] = $_GET['date_to'];
    }

    if (isset($_GET['merchant']) && !empty($_GET['merchant'])) {
        $filters['merchant'] = $_GET['merchant'];
    }

    if (isset($_GET['linked'])) {
        $filters['linked'] = $_GET['linked'] === 'true';
    }

    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

    // Get receipts
    $receiptService = new ReceiptService();
    $receipts = $receiptService->listReceipts($companyId, $filters, $limit, $offset);

    // Get stats
    $stats = $receiptService->getReceiptStats($companyId);

    echo json_encode([
        'success' => true,
        'data' => $receipts,
        'count' => count($receipts),
        'stats' => $stats,
        'filters' => $filters,
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
