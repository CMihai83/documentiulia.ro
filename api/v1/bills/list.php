<?php
/**
 * List Bills Endpoint
 * GET /api/v1/bills/list
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/BillService.php';
require_once __DIR__ . '/../../helpers/headers.php';

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

    // Get query parameters
    $filters = [
        'status' => $_GET['status'] ?? null,
        'vendor_id' => $_GET['vendor_id'] ?? null,
        'from_date' => $_GET['from_date'] ?? null,
        'to_date' => $_GET['to_date'] ?? null,
        'limit' => $_GET['limit'] ?? 50,
        'offset' => $_GET['offset'] ?? 0,
    ];

    $billService = new BillService();
    $bills = $billService->listBills($companyId, $filters);
    $stats = $billService->getStats($companyId, $filters['from_date'], $filters['to_date']);

    echo json_encode([
        'success' => true,
        'data' => $bills,
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
