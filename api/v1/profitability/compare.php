<?php
/**
 * Project Comparison API
 * E3-US09: Compare profitability across projects
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
require_once __DIR__ . '/../../services/ProjectProfitabilityService.php';
require_once __DIR__ . '/../../helpers/headers.php';

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
    $profitService = ProjectProfitabilityService::getInstance();

    // Get project IDs from query string or POST body
    $projectIds = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $projectIds = $input['project_ids'] ?? [];
    } else {
        $projectIds = isset($_GET['project_ids']) ? explode(',', $_GET['project_ids']) : [];
    }

    if (empty($projectIds)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Project IDs required']);
        exit;
    }

    // Limit to 10 projects for comparison
    $projectIds = array_slice($projectIds, 0, 10);

    $comparison = $profitService->compareProjects($companyId, $projectIds);

    echo json_encode([
        'success' => true,
        'data' => $comparison
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
