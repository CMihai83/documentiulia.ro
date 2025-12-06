<?php
/**
 * Sprint API Endpoint
 * Handles CRUD operations for sprints
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/SprintService.php';

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

    $sprintService = new SprintService();
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            handleGet($sprintService, $companyId);
            break;

        case 'POST':
            handlePost($sprintService, $companyId, $userId);
            break;

        case 'PUT':
            handlePut($sprintService, $companyId);
            break;

        case 'DELETE':
            handleDelete($sprintService, $companyId);
            break;

        default:
            throw new Exception('Method not allowed', 405);
    }

} catch (Exception $e) {
    $statusCode = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Handle GET request - List sprints or get single sprint
 */
function handleGet($sprintService, $companyId) {
    $sprintId = $_GET['id'] ?? null;
    $projectId = $_GET['project_id'] ?? null;

    if ($sprintId) {
        // Get single sprint with detailed metrics
        $sprint = $sprintService->getSprint($sprintId, $companyId);

        echo json_encode([
            'success' => true,
            'data' => $sprint
        ]);
    } else if ($projectId) {
        // List sprints for project
        $filters = [
            'status' => $_GET['status'] ?? null,
            'start_date' => $_GET['start_date'] ?? null,
            'end_date' => $_GET['end_date'] ?? null,
            'limit' => isset($_GET['limit']) ? (int)$_GET['limit'] : 100,
            'offset' => isset($_GET['offset']) ? (int)$_GET['offset'] : 0
        ];

        // Remove null filters
        $filters = array_filter($filters, function($value) {
            return $value !== null;
        });

        $sprints = $sprintService->listSprints($companyId, $projectId, $filters);

        echo json_encode([
            'success' => true,
            'data' => $sprints,
            'count' => count($sprints)
        ]);
    } else {
        throw new Exception('Either sprint ID or project ID is required', 400);
    }
}

/**
 * Handle POST request - Create new sprint
 */
function handlePost($sprintService, $companyId, $userId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['project_id'])) {
        throw new Exception('Project ID is required', 400);
    }

    $projectId = $input['project_id'];
    $sprintId = $sprintService->createSprint($companyId, $projectId, $input, $userId);

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $sprintId,
            'sprint_id' => $sprintId, // Backward compatibility
            'message' => 'Sprint created successfully'
        ]
    ]);
}

/**
 * Handle PUT request - Update sprint
 */
function handlePut($sprintService, $companyId) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        throw new Exception('Sprint ID is required', 400);
    }

    $sprintId = $input['id'];
    $sprintService->updateSprint($sprintId, $companyId, $input);

    echo json_encode([
        'success' => true,
        'data' => [
            'sprint_id' => $sprintId,
            'message' => 'Sprint updated successfully'
        ]
    ]);
}

/**
 * Handle DELETE request - Delete (archive) sprint
 */
function handleDelete($sprintService, $companyId) {
    $sprintId = $_GET['id'] ?? null;

    if (!$sprintId) {
        throw new Exception('Sprint ID is required', 400);
    }

    $sprintService->deleteSprint($sprintId, $companyId);

    echo json_encode([
        'success' => true,
        'data' => [
            'message' => 'Sprint archived successfully'
        ]
    ]);
}
