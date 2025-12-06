<?php
/**
 * Project Daily Logs API
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
require_once __DIR__ . '/../../../services/ConstructionProjectService.php';
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
    $projectService = ConstructionProjectService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $projectId = $_GET['project_id'] ?? null;
        if (!$projectId) {
            throw new Exception('project_id required');
        }
        $logs = $projectService->getDailyLogs(
            $projectId,
            $_GET['date_from'] ?? null,
            $_GET['date_to'] ?? null
        );
        echo json_encode(['success' => true, 'data' => $logs, 'count' => count($logs)]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['project_id']) || empty($input['work_description'])) {
            throw new Exception('project_id and work_description required');
        }
        $input['created_by'] = $auth['user_id'] ?? null;
        $log = $projectService->addDailyLog($input['project_id'], $input);
        echo json_encode(['success' => true, 'data' => $log]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
