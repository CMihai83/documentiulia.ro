<?php
/**
 * Task Position Update API Endpoint
 * Update task position for Kanban drag-and-drop
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/TaskService.php';

header('Content-Type: application/json');

try {
    // Authenticate user
    $auth = authenticate();

    // Get company ID from header
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    // Only PUT method allowed
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
        throw new Exception('Method not allowed', 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        throw new Exception('Task ID is required', 400);
    }

    if (!isset($input['position'])) {
        throw new Exception('Position is required', 400);
    }

    $taskService = new TaskService();
    $taskService->updateTaskPosition(
        $input['id'],
        $companyId,
        (int)$input['position'],
        $input['status'] ?? null
    );

    echo json_encode([
        'success' => true,
        'data' => [
            'message' => 'Task position updated successfully'
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
