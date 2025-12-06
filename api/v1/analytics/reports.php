<?php
/**
 * Custom Reports API
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/AnalyticsService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied');
    }

    $analyticsService = new AnalyticsService();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $filters = [
            'category' => $_GET['category'] ?? null
        ];

        $reports = $analyticsService->listCustomReports($companyId, $filters);

        echo json_encode([
            'success' => true,
            'data' => [
                'reports' => $reports,
                'count' => count($reports)
            ]
        ]);
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['name']) || empty($input['data_source'])) {
            throw new Exception('Name and data source are required');
        }

        $reportId = $analyticsService->createCustomReport($companyId, $userData['user_id'], $input);

        echo json_encode([
            'success' => true,
            'data' => ['report_id' => $reportId],
            'message' => 'Custom report created successfully'
        ]);
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
