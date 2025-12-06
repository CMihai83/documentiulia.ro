<?php
/**
 * Create Task Endpoint
 * POST /api/v1/tasks/create
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

// IMPORTANT: Read input BEFORE includes
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Validate JSON input
if ($input === null && !empty($rawInput)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON format'
    ]);
    exit();
}

if (empty($input)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Request body is required'
    ]);
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

    // Validate required fields
    $title = trim($input['title'] ?? '');
    if (empty($title)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Task title is required'
        ]);
        exit();
    }

    $db = Database::getInstance();

    // Generate UUID for new task
    $taskId = $db->fetchOne("SELECT uuid_generate_v4() as id")['id'];

    // Prepare task data
    $taskData = [
        'id' => $taskId,
        'company_id' => $companyId,
        'title' => $title,
        'description' => $input['description'] ?? null,
        'status' => $input['status'] ?? 'todo',
        'priority' => $input['priority'] ?? 'medium',
        'project_id' => $input['project_id'] ?? null,
        'sprint_id' => $input['sprint_id'] ?? null,
        'epic_id' => $input['epic_id'] ?? null,
        'assignee_id' => $input['assignee_id'] ?? null,
        'reporter_id' => $userData['user_id'],
        'created_by' => $userData['user_id'],
        'due_date' => $input['due_date'] ?? null,
        'start_date' => $input['start_date'] ?? null,
        'estimated_hours' => $input['estimated_hours'] ?? null,
        'story_points' => $input['story_points'] ?? null,
        'task_type' => $input['task_type'] ?? 'task',
        'labels' => !empty($input['labels']) ? '{' . implode(',', $input['labels']) . '}' : null,
        'parent_task_id' => $input['parent_task_id'] ?? null
    ];

    // Build INSERT query
    $columns = [];
    $placeholders = [];
    $params = [];

    foreach ($taskData as $key => $value) {
        if ($value !== null) {
            $columns[] = $key;
            $placeholders[] = ":$key";
            $params[$key] = $value;
        }
    }

    $sql = "INSERT INTO tasks (" . implode(', ', $columns) . ")
            VALUES (" . implode(', ', $placeholders) . ")
            RETURNING *";

    $task = $db->fetchOne($sql, $params);

    // Get additional info
    if ($task['project_id']) {
        $project = $db->fetchOne(
            "SELECT name FROM projects WHERE id = :id",
            ['id' => $task['project_id']]
        );
        $task['project_name'] = $project['name'] ?? null;
    }

    if ($task['assignee_id']) {
        $assignee = $db->fetchOne(
            "SELECT first_name || ' ' || last_name as name FROM users WHERE id = :id",
            ['id' => $task['assignee_id']]
        );
        $task['assignee_name'] = $assignee['name'] ?? null;
    }

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Task created successfully',
        'data' => $task
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
