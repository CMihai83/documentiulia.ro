<?php
/**
 * Product Backlog API Endpoint
 * Get product backlog (unassigned tasks) for a project
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/TaskService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate user
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company ID from header
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID is required');
    }

    // Get project ID from query parameter (optional - for company-wide backlog)
    $projectId = $_GET['project_id'] ?? null;

    $taskService = new TaskService();
    $backlog = $projectId
        ? $taskService->getProductBacklog($companyId, $projectId)
        : $taskService->getCompanyBacklog($companyId);

    // Calculate summary
    $totalPoints = 0;
    foreach ($backlog as $task) {
        if (!empty($task['story_points'])) {
            $totalPoints += (int)$task['story_points'];
        }
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'tasks' => $backlog,
            'summary' => [
                'total_tasks' => count($backlog),
                'total_story_points' => $totalPoints
            ]
        ]
    ]);

} catch (Exception $e) {
    $statusCode = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
