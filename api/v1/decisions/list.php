<?php
/**
 * List Decision Scenarios
 * GET /api/v1/decisions/list
 * Query params: scenario_type (optional), limit (default 10)
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
require_once __DIR__ . '/../../config/database.php';

try {
    // Authenticate
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company context
    $companyId = $headers['X-Company-ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company context required (X-Company-ID header)');
    }

    // Verify user has access to this company
    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied to this company');
    }

    // Get query parameters
    $scenarioType = $_GET['scenario_type'] ?? null;
    $limit = $_GET['limit'] ?? 10;

    // Build query
    $db = Database::getInstance();
    $where = ['company_id = :company_id'];
    $params = ['company_id' => $companyId, 'limit' => $limit];

    if ($scenarioType) {
        $where[] = 'scenario_type = :scenario_type';
        $params['scenario_type'] = $scenarioType;
    }

    $whereClause = implode(' AND ', $where);

    $scenarios = $db->fetchAll("
        SELECT
            id,
            scenario_type,
            title,
            context,
            options,
            ai_recommendation,
            created_at
        FROM decision_scenarios
        WHERE $whereClause
        ORDER BY created_at DESC
        LIMIT :limit
    ", $params);

    // Parse JSON columns
    foreach ($scenarios as &$scenario) {
        $scenario['options'] = json_decode($scenario['options'], true);
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'scenarios' => $scenarios,
            'total' => count($scenarios)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
