<?php
/**
 * Active Sprint API Endpoint
 * Get the currently active sprint for a project
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/SprintService.php';

header('Content-Type: application/json');

try {
    // Authenticate user
    $auth = authenticate();

    // Get company ID from header
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    // Get project ID from query parameter (optional)
    $projectId = $_GET['project_id'] ?? null;

    $sprintService = new SprintService();

    if ($projectId) {
        $activeSprint = $sprintService->getActiveSprint($companyId, $projectId);
    } else {
        // Get any active sprint for the company
        $activeSprint = $sprintService->getCompanyActiveSprint($companyId);
    }

    if ($activeSprint) {
        // Get detailed metrics for the active sprint
        $sprintDetails = $sprintService->getSprint($activeSprint['id'], $companyId);

        echo json_encode([
            'success' => true,
            'data' => $sprintDetails
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'data' => null,
            'message' => $projectId ? 'No active sprint found for this project' : 'No active sprint found'
        ]);
    }

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
