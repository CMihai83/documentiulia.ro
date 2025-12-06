<?php
/**
 * Epic Progress API Endpoint
 * Get progress metrics and trends for an epic
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

    // Get epic ID from query parameter (optional)
    $epicId = $_GET['epic_id'] ?? null;

    $epicService = new EpicService();

    if ($epicId) {
        // Get progress for specific epic
        $progressData = $epicService->getEpicProgress($epicId, $companyId);
        $velocity = $epicService->getEpicVelocity($epicId, $companyId);

        echo json_encode([
            'success' => true,
            'data' => [
                'progress_timeline' => $progressData,
                'velocity' => $velocity
            ]
        ]);
    } else {
        // Get progress summary for all epics
        $summary = $epicService->getCompanyEpicsSummary($companyId);

        echo json_encode([
            'success' => true,
            'data' => $summary
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
