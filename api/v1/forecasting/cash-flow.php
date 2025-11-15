<?php
/**
 * Get Cash Flow Forecast
 * GET /api/v1/forecasting/cash-flow
 * Query params: from_date, to_date (optional)
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
require_once __DIR__ . '/../../services/ForecastingService.php';
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
    $fromDate = $_GET['from_date'] ?? null;
    $toDate = $_GET['to_date'] ?? null;

    // Get forecast
    $forecastingService = new ForecastingService();
    $forecast = $forecastingService->getForecast($companyId, $fromDate, $toDate);

    echo json_encode([
        'success' => true,
        'data' => [
            'forecast' => $forecast,
            'total_periods' => count($forecast),
            'date_range' => [
                'from' => $fromDate,
                'to' => $toDate
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
