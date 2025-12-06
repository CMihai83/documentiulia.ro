<?php
/**
 * Supplier Prices API
 * GET - Get/compare prices
 * POST - Track new price
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/RomanianSupplierService.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Authenticate
$authHeader = getHeader('authorization', '') ?? '';
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authorization required']);
    exit;
}

$authService = new AuthService();
try {
    $auth = $authService->verifyToken($matches[1]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = getHeader('x-company-id', '');
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $supplierService = RomanianSupplierService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? 'compare';
        $productName = $_GET['product'] ?? '';
        $supplierId = $_GET['supplier_id'] ?? null;

        if (empty($productName)) {
            throw new Exception('Product name required');
        }

        if ($action === 'history' && $supplierId) {
            $prices = $supplierService->getPriceHistory($companyId, $supplierId, $productName);
        } else {
            $prices = $supplierService->comparePrices($companyId, $productName);
        }

        echo json_encode([
            'success' => true,
            'data' => $prices,
            'count' => count($prices)
        ]);

    } else {
        // POST - Track new price
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || empty($input['supplier_id']) || empty($input['product_name']) || !isset($input['price'])) {
            throw new Exception('supplier_id, product_name, and price required');
        }

        $price = $supplierService->trackPrice($companyId, $input['supplier_id'], $input);

        echo json_encode([
            'success' => true,
            'data' => $price
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
