<?php
/**
 * Material Usage Tracking API
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

try {
    $materialsService = MaterialsTrackingService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $projectId = $_GET['project_id'] ?? null;
        if (!$projectId) {
            throw new Exception('project_id required');
        }
        $materialId = $_GET['material_id'] ?? null;
        $log = $materialsService->getUsageLog($projectId, $materialId);
        echo json_encode(['success' => true, 'data' => $log, 'count' => count($log)]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['project_id']) || empty($input['material_id'])) {
            throw new Exception('project_id and material_id required');
        }
        if (empty($input['quantity_used']) && empty($input['quantity_wasted'])) {
            throw new Exception('quantity_used or quantity_wasted required');
        }
        $input['recorded_by'] = $auth['user_id'] ?? null;
        $result = $materialsService->recordUsage($input['project_id'], $input);
        echo json_encode(['success' => true, 'data' => $result]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
