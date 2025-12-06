<?php
/**
 * Gantt Chart API
 *
 * Get Gantt chart data with task dependencies and critical path analysis
 * Endpoints:
 * - GET    /gantt.php?project_id=UUID     - Get Gantt data
 * - POST   /gantt.php                      - Add task dependency
 * - DELETE /gantt.php                      - Remove task dependency
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/ProjectService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
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

    if ($method === 'GET') {
        if (empty($_GET['project_id'])) {
            throw new Exception('Project ID is required');
        }

        $ganttData = $projectService->getGanttData($_GET['project_id'], $companyId);

        echo json_encode([
            'success' => true,
            'data' => $ganttData
        ]);
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['project_id'])) {
            throw new Exception('Project ID is required');
        }

        $dependencyId = $projectService->addTaskDependency(
            $input['project_id'],
            $companyId,
            $input
        );

        echo json_encode([
            'success' => true,
            'data' => ['dependency_id' => $dependencyId],
            'message' => 'Task dependency added successfully'
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
