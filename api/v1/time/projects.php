<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ProjectService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate user
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied');
    }

    $projectService = new ProjectService();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET - List projects or get single project
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $project = $projectService->getProject($_GET['id'], $companyId);
            if (!$project) {
                throw new Exception('Project not found');
            }

            // Get project stats
            $stats = $projectService->getProjectStats($companyId, $_GET['id']);
            $budgetStatus = $projectService->getProjectBudgetStatus($companyId, $_GET['id']);

            echo json_encode([
                'success' => true,
                'data' => [
                    'project' => $project,
                    'stats' => $stats,
                    'budget_status' => $budgetStatus
                ]
            ]);
        } else {
            $filters = [
                'status' => $_GET['status'] ?? null,
                'client_id' => $_GET['client_id'] ?? null,
                'search' => $_GET['search'] ?? null
            ];

            $projects = $projectService->listProjects($companyId, $filters);

            echo json_encode([
                'success' => true,
                'data' => ['projects' => $projects]
            ]);
        }
    }

    // POST - Create new project
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['name'])) {
            throw new Exception('Project name is required');
        }

        $projectId = $projectService->createProject($companyId, $input, $userData['user_id']);

        echo json_encode([
            'success' => true,
            'data' => ['project_id' => $projectId],
            'message' => 'Project created successfully'
        ]);
    }

    // PUT - Update project
    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Project ID is required');
        }

        $projectService->updateProject($input['id'], $companyId, $input);

        echo json_encode([
            'success' => true,
            'message' => 'Project updated successfully'
        ]);
    }

    // DELETE - Delete project
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Project ID is required');
        }

        $projectService->deleteProject($input['id'], $companyId);

        echo json_encode([
            'success' => true,
            'message' => 'Project deleted successfully'
        ]);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
