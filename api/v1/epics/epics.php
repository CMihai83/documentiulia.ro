<?php
/**
 * Epic API Endpoint
 * Handles CRUD operations for epics
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/EpicService.php';

header('Content-Type: application/json');

try {
    // Authenticate user
    $auth = authenticate();
    $userId = $auth['user_id'];
    $userRole = $auth['role'];

    // Get company ID from header
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    $epicService = new EpicService();
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            handleGet($epicService, $companyId);
            break;

        case 'POST':
            handlePost($epicService, $companyId, $userId);
            break;

        case 'PUT':
            handlePut($epicService, $companyId);
            break;

        case 'DELETE':
            handleDelete($epicService, $companyId);
            break;

        default:
            throw new Exception('Method not allowed', 405);
    }

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Handle GET request - List epics or get single epic
 */
function handleGet($epicService, $companyId) {
    $epicId = $_GET['id'] ?? null;
    $projectId = $_GET['project_id'] ?? null;

    if ($epicId) {
        // Get single epic
        $epic = $epicService->getEpic($epicId, $companyId);

        echo json_encode([
            'success' => true,
            'data' => $epic
        ]);
    } else if ($projectId) {
        // List epics for project
        $filters = [
            'status' => $_GET['status'] ?? null,
            'priority' => $_GET['priority'] ?? null,
            'owner_id' => $_GET['owner_id'] ?? null,
            'limit' => isset($_GET['limit']) ? (int)$_GET['limit'] : 100,
            'offset' => isset($_GET['offset']) ? (int)$_GET['offset'] : 0
        ];

        // Remove null filters
        $filters = array_filter($filters, function($value) {
            return $value !== null;
        });

        $epics = $epicService->listEpics($companyId, $projectId, $filters);

        echo json_encode([
            'success' => true,
            'data' => $epics,
            'count' => count($epics)
        ]);
    } else {
        throw new Exception('Either epic ID or project ID is required', 400);
    }
}

/**
 * Handle POST request - Create new epic
 */
function handlePost($epicService, $companyId, $userId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['project_id'])) {
        throw new Exception('Project ID is required', 400);
    }

    $projectId = $input['project_id'];
    $epicId = $epicService->createEpic($companyId, $projectId, $input, $userId);

    echo json_encode([
        'success' => true,
        'data' => [
            'epic_id' => $epicId,
            'message' => 'Epic created successfully'
        ]
    ]);
}

/**
 * Handle PUT request - Update epic
 */
function handlePut($epicService, $companyId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        throw new Exception('Epic ID is required', 400);
    }

    $epicId = $input['id'];
    $epicService->updateEpic($epicId, $companyId, $input);

    echo json_encode([
        'success' => true,
        'data' => [
            'epic_id' => $epicId,
            'message' => 'Epic updated successfully'
        ]
    ]);
}

/**
 * Handle DELETE request - Delete (archive) epic
 */
function handleDelete($epicService, $companyId) {
    $epicId = $_GET['id'] ?? null;

    if (!$epicId) {
        throw new Exception('Epic ID is required', 400);
    }

    $epicService->deleteEpic($epicId, $companyId);

    echo json_encode([
        'success' => true,
        'data' => [
            'message' => 'Epic archived successfully'
        ]
    ]);
}
