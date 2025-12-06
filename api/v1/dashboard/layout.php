<?php
/**
 * Dashboard Layout API
 * GET /api/v1/dashboard/layout.php - Get user's dashboard layout
 * POST /api/v1/dashboard/layout.php - Save user's custom layout
 * DELETE /api/v1/dashboard/layout.php - Reset to persona default
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
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
    $userId = $userData['user_id'];

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

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // Get layout
            $layout = $dashboardService->getLayout($userId, $companyId, $language);

            echo json_encode([
                'success' => true,
                'data' => [
                    'widgets' => $layout,
                    'has_custom_layout' => !empty($layout) && count($layout) > 0
                ]
            ]);
            break;

        case 'POST':
            // Save layout
            $input = json_decode(file_get_contents('php://input'), true);
            $widgets = $input['widgets'] ?? [];

            if (empty($widgets)) {
                throw new Exception('Widgets array required');
            }

            // Validate widget structure
            foreach ($widgets as $widget) {
                if (!isset($widget['widget_id'], $widget['x'], $widget['y'], $widget['w'], $widget['h'])) {
                    throw new Exception('Invalid widget structure. Required: widget_id, x, y, w, h');
                }
            }

            $success = $dashboardService->saveLayout($userId, $companyId, $widgets);

            echo json_encode([
                'success' => $success,
                'message' => $success ? 'Layout saved' : 'Failed to save layout'
            ]);
            break;

        case 'DELETE':
            // Reset to default
            $success = $dashboardService->resetToDefault($userId, $companyId);

            echo json_encode([
                'success' => $success,
                'message' => $success ? 'Layout reset to default' : 'Failed to reset layout'
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
