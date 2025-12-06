<?php
/**
 * Bulk Task Update API Endpoint
 * Update multiple tasks at once (e.g., assign to sprint, change status)
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

    if (!isset($input['task_ids']) || !is_array($input['task_ids'])) {
        throw new Exception('Task IDs array is required', 400);
    }

    if (empty($input['task_ids'])) {
        throw new Exception('At least one task ID is required', 400);
    }

    // Extract update data
    $updates = [];
    $allowedFields = ['sprint_id', 'epic_id', 'assignee_id', 'status', 'priority'];

    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates[$field] = $input[$field];
        }
    }

    if (empty($updates)) {
        throw new Exception('No valid update fields provided', 400);
    }

    $taskService = new TaskService();
    $taskService->bulkUpdateTasks($companyId, $input['task_ids'], $updates);

    echo json_encode([
        'success' => true,
        'data' => [
            'message' => count($input['task_ids']) . ' tasks updated successfully',
            'updated_count' => count($input['task_ids'])
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
