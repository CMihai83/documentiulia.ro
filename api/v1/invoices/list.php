<?php
/**
 * List Invoices Endpoint
 * GET /api/v1/invoices/list
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/InvoiceService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Use case-insensitive header lookup
    $authHeader = getHeader('authorization', '');

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authorization required']);
        exit();
    }

    $auth = new AuthService();
    try {
        $userData = $auth->verifyToken($matches[1]);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit();
    }

    $companyId = getHeader('x-company-id');
    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Company ID required']);
        exit();
    }

    // Get filters from query string
    $filters = [
        'status' => $_GET['status'] ?? null,
        'customer_id' => $_GET['customer_id'] ?? null,
        'from_date' => $_GET['from_date'] ?? null,
        'to_date' => $_GET['to_date'] ?? null,
        'limit' => isset($_GET['limit']) ? intval($_GET['limit']) : 50,
        'offset' => isset($_GET['offset']) ? intval($_GET['offset']) : 0
    ];

    $invoiceService = new InvoiceService();
    $invoices = $invoiceService->listInvoices($companyId, $filters);
    $stats = $invoiceService->getStats($companyId, $filters['from_date'], $filters['to_date']);

    echo json_encode([
        'success' => true,
        'data' => $invoices,
        'stats' => $stats,
        'filters' => $filters
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
