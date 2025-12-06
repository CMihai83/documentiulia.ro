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
require_once __DIR__ . '/../../services/TaskService.php';
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

    $taskService = new TaskService();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET - List tasks or get single task
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $task = $taskService->getTask($_GET['id'], $companyId);
            if (!$task) {
                throw new Exception('Task not found');
            }

            echo json_encode([
                'success' => true,
                'data' => ['task' => $task]
            ]);
        } elseif (isset($_GET['board'])) {
            // Get Kanban board view
            $projectId = $_GET['project_id'] ?? null;
            $board = $taskService->getTaskBoard($companyId, $projectId);

            echo json_encode([
                'success' => true,
                'data' => ['board' => $board]
            ]);
        } elseif (isset($_GET['my_tasks'])) {
            // Get current user's tasks
            $tasks = $taskService->getUserTasks($companyId, $userData['user_id']);

            echo json_encode([
                'success' => true,
                'data' => ['tasks' => $tasks]
            ]);
        } else {
            $filters = [
                'project_id' => $_GET['project_id'] ?? null,
                'assigned_to' => $_GET['assigned_to'] ?? null,
                'status' => $_GET['status'] ?? null,
                'priority' => $_GET['priority'] ?? null,
                'search' => $_GET['search'] ?? null
            ];

            $tasks = $taskService->listTasks($companyId, $filters);

            echo json_encode([
                'success' => true,
                'data' => ['tasks' => $tasks]
            ]);
        }
    }

    // POST - Create new task
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['name'])) {
            throw new Exception('Task name is required');
        }

        $taskId = $taskService->createTask($companyId, $input);

        echo json_encode([
            'success' => true,
            'data' => ['task_id' => $taskId],
            'message' => 'Task created successfully'
        ]);
    }

    // PUT - Update task
    elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Task ID is required');
        }

        $taskService->updateTask($input['id'], $companyId, $input);

        echo json_encode([
            'success' => true,
            'message' => 'Task updated successfully'
        ]);
    }

    // DELETE - Delete task
    elseif ($method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['id'])) {
            throw new Exception('Task ID is required');
        }

        $taskService->deleteTask($input['id'], $companyId);

        echo json_encode([
            'success' => true,
            'message' => 'Task deleted successfully'
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
