<?php
/**
 * Epic Tasks API Endpoint
 * Get all tasks for a specific epic
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/EpicService.php';

header('Content-Type: application/json');

try {
    // Authenticate user
    $auth = authenticate();

    // Get company ID from header
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    // Get epic ID from query parameter
    $epicId = $_GET['epic_id'] ?? null;
    if (!$epicId) {
        throw new Exception('Epic ID is required', 400);
    }

    $epicService = new EpicService();

    // Build filters from query parameters
    $filters = [
        'status' => $_GET['status'] ?? null,
        'sprint_id' => $_GET['sprint_id'] ?? null,
        'assignee_id' => $_GET['assignee_id'] ?? null
    ];

    // Remove null filters
    $filters = array_filter($filters, function($value) {
        return $value !== null;
    });

    $tasks = $epicService->getEpicTasks($epicId, $companyId, $filters);

    echo json_encode([
        'success' => true,
        'data' => $tasks,
        'count' => count($tasks)
    ]);

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
