<?php
/**
 * e-Factura Code Lists Endpoint
 * GET /api/v1/efactura/code-lists.php?type=VAT_CATEGORY
 * Returns UBL code lists for Romanian e-Factura
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/EFacturaService.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $auth = authenticate();
    $service = EFacturaService::getInstance();

    $listType = $_GET['type'] ?? null;

    if ($listType) {
        // Get specific code list
        $codes = $service->getCodeList(strtoupper($listType));

        echo json_encode([
            'success' => true,
            'data' => $codes
        ]);

    } else {
        // Get all available code lists
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->query("SELECT DISTINCT list_type FROM efactura_code_lists ORDER BY list_type");
        $types = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $allLists = [];
        foreach ($types as $type) {
            $allLists[$type] = $service->getCodeList($type);
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'available_types' => $types,
                'lists' => $allLists
            ]
        ]);
    }

} catch (Exception $e) {
    $code = $e->getCode() ?: 500;
    http_response_code($code > 99 && $code < 600 ? $code : 500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
