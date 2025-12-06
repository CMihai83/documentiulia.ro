<?php
/**
 * Projects Management API
 *
 * Core CRUD operations for projects with advanced filtering
 * Endpoints:
 * - GET    /projects.php              - List projects
 * - GET    /projects.php?id=UUID      - Get single project with details
 * - POST   /projects.php              - Create project
 * - PUT    /projects.php              - Update project
 * - DELETE /projects.php              - Delete (archive) project
 */

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
    // Authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    if (!$userData) {
        http_response_code(401);
        throw new Exception('Invalid or expired token');
    }

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        http_response_code(400);
        error_log("Missing X-Company-ID header. Headers: " . print_r(getAllHeadersCaseInsensitive(), true));
        throw new Exception('Company context required (X-Company-ID header missing)');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        http_response_code(403);
        error_log("User {$userData['user_id']} does not have access to company $companyId");
        throw new Exception('Access denied to this company');
    }

    $projectService = new ProjectService();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET - List projects or get single project
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            // Get single project with full details
            $project = $projectService->getProject($_GET['id'], $companyId);

            echo json_encode([
                'success' => true,
                'data' => ['project' => $project]
            ]);
        } else {
            // List projects with filters
            $filters = [
                'status' => $_GET['status'] ?? null,
                'health_status' => $_GET['health_status'] ?? null,
                'methodology' => $_GET['methodology'] ?? null,
                'manager_id' => $_GET['manager_id'] ?? null,
                'client_id' => $_GET['client_id'] ?? null,
                'search' => $_GET['search'] ?? null,
                'limit' => $_GET['limit'] ?? 100,
                'offset' => $_GET['offset'] ?? 0
            ];

            // Tags filter (comma-separated)
            if (isset($_GET['tags'])) {
                $filters['tags'] = explode(',', $_GET['tags']);
            }

            $projects = $projectService->listProjects($companyId, $filters);

            echo json_encode([
                'success' => true,
                'data' => [
                    'projects' => $projects,
                    'count' => count($projects)
                ]
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

        // Return simple response without full project details (getProject has issues)
        echo json_encode([
            'success' => true,
            'data' => [
                'project_id' => $projectId,
                'project' => [
                    'id' => $projectId,
                    'name' => $input['name'],
                    'description' => $input['description'] ?? null,
                    'status' => $input['status'] ?? 'planning'
                ]
            ],
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

        // Return simple response without full project details (getProject has issues)
        echo json_encode([
            'success' => true,
            'data' => [
                'project_id' => $input['id'],
                'project' => [
                    'id' => $input['id'],
                    'name' => $input['name'] ?? null,
                    'description' => $input['description'] ?? null,
                    'status' => $input['status'] ?? null
                ]
            ],
            'message' => 'Project updated successfully'
        ]);
    }

    // DELETE - Archive project
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Project ID is required');
        }

        $projectService->deleteProject($input['id'], $companyId);

        echo json_encode([
            'success' => true,
            'message' => 'Project archived successfully'
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
