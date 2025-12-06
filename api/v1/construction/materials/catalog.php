<?php
/**
 * Material Catalog CRUD API
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
require_once __DIR__ . '/../../../services/MaterialsTrackingService.php';
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
    $materialsService = MaterialsTrackingService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $materialId = $_GET['id'] ?? null;
        if ($materialId) {
            $material = $materialsService->getMaterial($companyId, $materialId);
            if (!$material) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Material not found']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $material]);
        } else {
            $filters = [
                'category' => $_GET['category'] ?? null,
                'search' => $_GET['search'] ?? null,
                'low_stock' => isset($_GET['low_stock'])
            ];
            $materials = $materialsService->listMaterials($companyId, $filters);
            echo json_encode(['success' => true, 'data' => $materials, 'count' => count($materials)]);
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['name'])) {
            throw new Exception('Material name required');
        }
        $material = $materialsService->createMaterial($companyId, $input);
        echo json_encode(['success' => true, 'data' => $material]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $materialId = $_GET['id'] ?? $input['id'] ?? null;
        if (!$materialId) {
            throw new Exception('Material ID required');
        }
        $material = $materialsService->updateMaterial($companyId, $materialId, $input);
        echo json_encode(['success' => true, 'data' => $material]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $materialId = $_GET['id'] ?? null;
        if (!$materialId) {
            throw new Exception('Material ID required');
        }
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("DELETE FROM material_catalog WHERE id = ? AND company_id = ?");
        $stmt->execute([$materialId, $companyId]);
        echo json_encode(['success' => $stmt->rowCount() > 0]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
