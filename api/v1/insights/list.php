<?php
/**
 * List Active Insights
 * GET /api/v1/insights/list
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/InsightsService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate
    // Use case-insensitive header lookup
    $authHeader = getHeader('authorization', '') ?? '';

    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company context
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required (X-Company-ID header)');
    }

    // Verify user has access to this company
    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied to this company');
    }

    // Get query parameters
    $limit = $_GET['limit'] ?? 10;

    // Get insights
    $insightsService = new InsightsService();
    $insights = $insightsService->getInsights($companyId, $limit);

    echo json_encode([
        'success' => true,
        'data' => [
            'insights' => $insights,
            'total' => count($insights)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
