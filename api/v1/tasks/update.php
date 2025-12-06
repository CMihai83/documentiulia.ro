<?php
/**
 * Update Task Endpoint
 * PUT /api/v1/tasks/update
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, PATCH, OPTIONS');
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

if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'PATCH'])) {
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

    // Validate task ID
    $taskId = $input['id'] ?? $_GET['id'] ?? null;
    if (!$taskId) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Task ID is required'
        ]);
        exit();
    }

    $db = Database::getInstance();

    // Verify task exists and belongs to company
    $existingTask = $db->fetchOne(
        "SELECT id FROM tasks WHERE id = :id AND company_id = :company_id",
        ['id' => $taskId, 'company_id' => $companyId]
    );

    if (!$existingTask) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Task not found'
        ]);
        exit();
    }

    // Allowed fields to update
    $allowedFields = [
        'title', 'description', 'status', 'priority', 'project_id', 'sprint_id',
        'epic_id', 'assignee_id', 'reviewer_id', 'due_date', 'start_date',
        'estimated_hours', 'actual_hours', 'story_points', 'task_type',
        'progress_percentage', 'labels', 'parent_task_id', 'position',
        'is_critical_path', 'is_milestone', 'duration_days', 'effort_hours'
    ];

    // Build UPDATE query
    $updates = [];
    $params = ['id' => $taskId, 'company_id' => $companyId];

    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $input)) {
            $value = $input[$field];

            // Handle labels array
            if ($field === 'labels' && is_array($value)) {
                $value = '{' . implode(',', $value) . '}';
            }

            // Handle empty strings as null for nullable fields
            if ($value === '' && in_array($field, ['project_id', 'sprint_id', 'epic_id', 'assignee_id', 'reviewer_id', 'parent_task_id', 'due_date', 'start_date'])) {
                $value = null;
            }

            $updates[] = "$field = :$field";
            $params[$field] = $value;
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'No valid fields to update'
        ]);
        exit();
    }

    // Add updated_at
    $updates[] = "updated_at = NOW()";

    // Handle status change to done
    if (isset($input['status']) && $input['status'] === 'done') {
        $updates[] = "completed_date = NOW()";
    }

    $sql = "UPDATE tasks SET " . implode(', ', $updates) . "
            WHERE id = :id AND company_id = :company_id
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

    echo json_encode([
        'success' => true,
        'message' => 'Task updated successfully',
        'data' => $task
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
