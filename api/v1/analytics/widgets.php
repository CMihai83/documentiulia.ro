<?php
/**
 * Dashboard Widgets API
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

    if ($method === 'GET' && isset($_GET['widget_id'])) {
        // Get widget data
        $data = $analyticsService->getWidgetData($_GET['widget_id'], $companyId);

        echo json_encode([
            'success' => true,
            'data' => $data
        ]);
    }

    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['dashboard_id']) || empty($input['title'])) {
            throw new Exception('Dashboard ID and title are required');
        }

        $widgetId = $analyticsService->addWidget($input['dashboard_id'], $companyId, $input);

        echo json_encode([
            'success' => true,
            'data' => ['widget_id' => $widgetId],
            'message' => 'Widget added successfully'
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
