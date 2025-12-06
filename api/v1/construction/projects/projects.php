<?php
/**
 * Construction Projects CRUD API
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

$companyId = getHeader('x-company-id', '');
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $projectService = ConstructionProjectService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $projectId = $_GET['id'] ?? null;
        if ($projectId) {
            $project = $projectService->getProject($companyId, $projectId);
            if (!$project) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Project not found']);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $project]);
        } else {
            $filters = [
                'status' => $_GET['status'] ?? null,
                'search' => $_GET['search'] ?? null
            ];
            $projects = $projectService->listProjects($companyId, $filters);
            echo json_encode(['success' => true, 'data' => $projects, 'count' => count($projects)]);
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['name'])) {
            throw new Exception('Project name required');
        }
        $project = $projectService->createProject($companyId, $input);
        echo json_encode(['success' => true, 'data' => $project]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $projectId = $_GET['id'] ?? $input['id'] ?? null;
        if (!$projectId) {
            throw new Exception('Project ID required');
        }
        $project = $projectService->updateProject($companyId, $projectId, $input);
        echo json_encode(['success' => true, 'data' => $project]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $projectId = $_GET['id'] ?? null;
        if (!$projectId) {
            throw new Exception('Project ID required');
        }
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("DELETE FROM construction_projects WHERE id = ? AND company_id = ?");
        $stmt->execute([$projectId, $companyId]);
        echo json_encode(['success' => $stmt->rowCount() > 0]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
