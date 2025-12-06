<?php
/**
 * Price Comparison API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/Database.php';
require_once __DIR__ . '/../../../auth/AuthService.php';
require_once __DIR__ . '/../../../services/ConstructionSupplierService.php';
require_once __DIR__ . '/../../../helpers/headers.php';

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
    $supplierService = ConstructionSupplierService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $materialId = $_GET['material_id'] ?? null;
        if (!$materialId) {
            throw new Exception('material_id required');
        }
        $prices = $supplierService->comparePrices($companyId, $materialId);
        echo json_encode(['success' => true, 'data' => $prices, 'count' => count($prices)]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['supplier_id']) || empty($input['material_id']) || !isset($input['price'])) {
            throw new Exception('supplier_id, material_id and price required');
        }
        $price = $supplierService->updatePrice(
            $input['supplier_id'],
            $input['material_id'],
            floatval($input['price']),
            isset($input['min_quantity']) ? intval($input['min_quantity']) : null
        );
        echo json_encode(['success' => true, 'data' => $price]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
