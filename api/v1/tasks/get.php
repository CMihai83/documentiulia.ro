<?php
/**
 * Get Task Endpoint
 * GET /api/v1/tasks/get?id={task_id}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company from header
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    // Verify user has access to company
    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied to this company');
    }

    // Get task ID from query string
    $taskId = $_GET['id'] ?? null;
    if (!$taskId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Task ID is required'
        ]);
        exit();
    }

    $db = Database::getInstance();

    // Get task with related info
    $task = $db->fetchOne(
        "SELECT t.*,
                p.name as project_name,
                s.name as sprint_name,
                e.name as epic_name,
                u.first_name || ' ' || u.last_name as assignee_name,
                r.first_name || ' ' || r.last_name as reporter_name,
                rv.first_name || ' ' || rv.last_name as reviewer_name,
                c.first_name || ' ' || c.last_name as created_by_name
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN sprints s ON t.sprint_id = s.id
         LEFT JOIN epics e ON t.epic_id = e.id
         LEFT JOIN users u ON t.assignee_id = u.id
         LEFT JOIN users r ON t.reporter_id = r.id
         LEFT JOIN users rv ON t.reviewer_id = rv.id
         LEFT JOIN users c ON t.created_by = c.id
         WHERE t.id = :id AND t.company_id = :company_id",
        ['id' => $taskId, 'company_id' => $companyId]
    );

    if (!$task) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Task not found'
        ]);
        exit();
    }

    // Get subtasks
    $subtasks = $db->fetchAll(
        "SELECT id, title, status, priority, story_points
         FROM tasks
         WHERE parent_task_id = :task_id
         ORDER BY position, created_at",
        ['task_id' => $taskId]
    );
    $task['subtasks'] = $subtasks;

    // Get comments count
    $commentsCount = $db->fetchOne(
        "SELECT COUNT(*) as count FROM task_comments WHERE task_id = :task_id",
        ['task_id' => $taskId]
    );
    $task['comments_count'] = $commentsCount['count'] ?? 0;

    // Get attachments count
    $attachmentsCount = $db->fetchOne(
        "SELECT COUNT(*) as count FROM task_attachments WHERE task_id = :task_id",
        ['task_id' => $taskId]
    );
    $task['attachments_count'] = $attachmentsCount['count'] ?? 0;

    echo json_encode([
        'success' => true,
        'data' => $task
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
