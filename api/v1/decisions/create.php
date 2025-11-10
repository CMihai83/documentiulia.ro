<?php
/**
 * Create Decision Scenario
 * POST /api/v1/decisions/create
 * Body: { "scenario_type": "hiring", "context": { "salary": 5000 } }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/InsightsService.php';

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

    // Parse request body
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['scenario_type'])) {
        throw new Exception('scenario_type is required');
    }

    $scenarioType = $input['scenario_type'];
    $context = $input['context'] ?? [];

    // Validate scenario type
    $validTypes = ['hiring', 'pricing', 'expansion'];
    if (!in_array($scenarioType, $validTypes)) {
        throw new Exception('Invalid scenario_type. Valid types: ' . implode(', ', $validTypes));
    }

    // Generate decision scenario
    $insightsService = new InsightsService();
    $scenario = $insightsService->generateDecisionScenario($companyId, $scenarioType, $context);

    if (!$scenario) {
        throw new Exception('Could not generate scenario. This scenario type may not be implemented yet.');
    }

    echo json_encode([
        'success' => true,
        'data' => $scenario,
        'message' => 'Decision scenario generated successfully'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
