<?php
/**
 * Navigation Menu API
 * GET /api/v1/navigation/menu.php - Get full navigation menu
 * POST /api/v1/navigation/menu.php - Record item visit or manage favorites
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
require_once __DIR__ . '/../../services/NavigationService.php';
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

    $navService = NavigationService::getInstance();

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // Get full navigation
            $navigation = $navService->getNavigation($userId, $companyId, $language);

            echo json_encode([
                'success' => true,
                'data' => $navigation
            ]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? '';
            $itemId = $input['item_id'] ?? '';

            if (empty($itemId)) {
                throw new Exception('Item ID required');
            }

            switch ($action) {
                case 'visit':
                    // Record visit for recent items
                    $success = $navService->recordVisit($userId, $companyId, $itemId);
                    echo json_encode([
                        'success' => $success,
                        'message' => 'Visit recorded'
                    ]);
                    break;

                case 'add_favorite':
                    $success = $navService->addFavorite($userId, $companyId, $itemId);
                    echo json_encode([
                        'success' => $success,
                        'message' => 'Added to favorites'
                    ]);
                    break;

                case 'remove_favorite':
                    $success = $navService->removeFavorite($userId, $companyId, $itemId);
                    echo json_encode([
                        'success' => $success,
                        'message' => 'Removed from favorites'
                    ]);
                    break;

                default:
                    throw new Exception('Invalid action. Use: visit, add_favorite, remove_favorite');
            }
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
