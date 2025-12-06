<?php
/**
 * Project Phases API
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
        $phases = $projectService->getProjectPhases($projectId);
        echo json_encode(['success' => true, 'data' => $phases]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['project_id']) || empty($input['name'])) {
            throw new Exception('project_id and name required');
        }
        $phase = $projectService->createPhase($input['project_id'], $input);
        echo json_encode(['success' => true, 'data' => $phase]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $phaseId = $_GET['id'] ?? $input['id'] ?? null;
        if (!$phaseId) {
            throw new Exception('Phase ID required');
        }
        $phase = $projectService->updatePhase($phaseId, $input);
        echo json_encode(['success' => true, 'data' => $phase]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $phaseId = $_GET['id'] ?? null;
        if (!$phaseId) {
            throw new Exception('Phase ID required');
        }
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("DELETE FROM project_phases WHERE id = ?");
        $stmt->execute([$phaseId]);
        echo json_encode(['success' => $stmt->rowCount() > 0]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
