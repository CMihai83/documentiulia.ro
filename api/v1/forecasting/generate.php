<?php
/**
 * Generate Cash Flow Forecast
 * POST /api/v1/forecasting/generate
 * Body: { "periods": 12, "period_type": "monthly" }
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
require_once __DIR__ . '/../../services/ForecastingService.php';

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

    $periods = $input['periods'] ?? 12;
    $periodType = $input['period_type'] ?? 'monthly';

    // Validate periods
    if ($periods < 1 || $periods > 36) {
        throw new Exception('Periods must be between 1 and 36');
    }

    // Generate forecast
    $forecastingService = new ForecastingService();
    $forecast = $forecastingService->generateForecast($companyId, $periods, $periodType);

    echo json_encode([
        'success' => true,
        'data' => [
            'forecast' => $forecast,
            'periods' => count($forecast),
            'period_type' => $periodType,
            'generated_at' => date('Y-m-d H:i:s')
        ],
        'message' => 'Forecast generated successfully'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
