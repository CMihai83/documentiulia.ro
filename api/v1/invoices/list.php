<?php
/**
 * List Invoices Endpoint
 * GET /api/v1/invoices/list
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

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
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = $headers['X-Company-ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
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
