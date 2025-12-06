<?php
/**
 * Sprint Board API Endpoint
 * Get Kanban board view for a sprint
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

    // Get sprint ID from query parameter (optional - will use active sprint if not provided)
    $sprintId = $_GET['sprint_id'] ?? null;

    $taskService = new TaskService();
    if ($sprintId) {
        $board = $taskService->getSprintBoard($companyId, $sprintId);
    } else {
        // Get board for active sprint if no sprint specified
        $board = $taskService->getActiveSprintBoard($companyId);
    }

    // Calculate summary metrics
    $totalTasks = 0;
    $totalPoints = 0;
    $completedPoints = 0;

    foreach ($board as $column => $tasks) {
        foreach ($tasks as $task) {
            $totalTasks++;
            if (!empty($task['story_points'])) {
                $totalPoints += (int)$task['story_points'];
                if ($task['status'] === 'done') {
                    $completedPoints += (int)$task['story_points'];
                }
            }
        }
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'board' => $board,
            'summary' => [
                'total_tasks' => $totalTasks,
                'total_story_points' => $totalPoints,
                'completed_story_points' => $completedPoints,
                'completion_percentage' => $totalPoints > 0
                    ? round(($completedPoints / $totalPoints) * 100, 2)
                    : 0
            ]
        ]
    ]);

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
