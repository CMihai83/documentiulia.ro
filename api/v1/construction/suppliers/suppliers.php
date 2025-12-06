<?php
/**
 * Construction Suppliers CRUD API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
        $supplierId = $_GET['id'] ?? null;
        if ($supplierId) {
            $supplier = $supplierService->getSupplier($companyId, $supplierId);
            if (!$supplier) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Supplier not found']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $supplier]);
        } else {
            $filters = [
                'category' => $_GET['category'] ?? null,
                'status' => $_GET['status'] ?? null,
                'search' => $_GET['search'] ?? null,
                'min_rating' => $_GET['min_rating'] ?? null
            ];
            $suppliers = $supplierService->listSuppliers($companyId, $filters);
            echo json_encode(['success' => true, 'data' => $suppliers, 'count' => count($suppliers)]);
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['name'])) {
            throw new Exception('Supplier name required');
        }
        $supplier = $supplierService->createSupplier($companyId, $input);
        echo json_encode(['success' => true, 'data' => $supplier]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $supplierId = $_GET['id'] ?? $input['id'] ?? null;
        if (!$supplierId) {
            throw new Exception('Supplier ID required');
        }
        $supplier = $supplierService->updateSupplier($companyId, $supplierId, $input);
        echo json_encode(['success' => true, 'data' => $supplier]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $supplierId = $_GET['id'] ?? null;
        if (!$supplierId) {
            throw new Exception('Supplier ID required');
        }
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("UPDATE construction_suppliers SET status = 'inactive' WHERE id = ? AND company_id = ?");
        $stmt->execute([$supplierId, $companyId]);
        echo json_encode(['success' => $stmt->rowCount() > 0]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
