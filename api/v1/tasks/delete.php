<?php
/**
 * Delete Task Endpoint
 * DELETE /api/v1/tasks/delete?id={task_id}
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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

    // Get task ID from query string or body
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    $taskId = $_GET['id'] ?? $input['id'] ?? null;

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
        "SELECT id, title FROM tasks WHERE id = :id AND company_id = :company_id",
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

    // Check for subtasks
    $subtaskCount = $db->fetchOne(
        "SELECT COUNT(*) as count FROM tasks WHERE parent_task_id = :task_id",
        ['task_id' => $taskId]
    );

    if ($subtaskCount['count'] > 0) {
        // Option 1: Delete subtasks as well (cascade)
        // Option 2: Prevent deletion if subtasks exist
        // We'll cascade delete for now

        $db->query(
            "DELETE FROM tasks WHERE parent_task_id = :task_id",
            ['task_id' => $taskId]
        );
    }

    // Delete the task (this will cascade delete related records like comments, attachments, etc.)
    $db->query(
        "DELETE FROM tasks WHERE id = :id AND company_id = :company_id",
        ['id' => $taskId, 'company_id' => $companyId]
    );

    echo json_encode([
        'success' => true,
        'message' => 'Task deleted successfully',
        'data' => [
            'id' => $taskId,
            'title' => $existingTask['title']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
