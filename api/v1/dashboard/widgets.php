<?php
/**
 * Dashboard Widgets API
 * GET /api/v1/dashboard/widgets.php - Get all available widgets for company
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID, Accept-Language');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/DashboardService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Verify authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company ID
    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    // Get language preference
    $language = substr(getHeader('accept-language', 'en') ?? 'en', 0, 2);
    if (!in_array($language, ['ro', 'en'])) {
        $language = 'en';
    }

    $dashboardService = DashboardService::getInstance();
    $widgets = $dashboardService->getAvailableWidgets($companyId, $language);

    // Group by category
    $groupByCategory = isset($_GET['group_by_category']);

    if ($groupByCategory) {
        $grouped = [];
        foreach ($widgets as $widget) {
            $category = $widget['category'];
            if (!isset($grouped[$category])) {
                $grouped[$category] = [
                    'category' => $category,
                    'widgets' => []
                ];
            }
            $grouped[$category]['widgets'][] = $widget;
        }
        $widgets = array_values($grouped);
    }

    echo json_encode([
        'success' => true,
        'data' => $widgets,
        'meta' => [
            'total' => $groupByCategory
                ? array_sum(array_map(fn($g) => count($g['widgets']), $widgets))
                : count($widgets),
            'language' => $language
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
