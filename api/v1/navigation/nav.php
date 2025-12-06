<?php
/**
 * Navigation API
 * E1-US05: Get persona-specific navigation with favorites and recent items
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/NavigationService.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Authenticate
$authHeader = getHeader('authorization', '') ?? '';
if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authorization required']);
    exit;
}

$authService = new AuthService();
try {
    $auth = $authService->verifyToken($matches[1]);
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$language = substr($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'en', 0, 2);
if (!in_array($language, ['ro', 'en'])) {
    $language = 'en';
}

try {
    $navService = NavigationService::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get full navigation with favorites and recent
        $main = $navService->getNavigation($auth['user_id'], $companyId, $language);
        $favorites = $navService->getFavorites($auth['user_id'], $companyId, $language);
        $recent = $navService->getRecentItems($auth['user_id'], $companyId, $language);

        echo json_encode([
            'success' => true,
            'data' => [
                'main' => $main,
                'favorites' => $favorites,
                'recent' => $recent
            ]
        ]);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';

        switch ($action) {
            case 'add_favorite':
                $success = $navService->addFavorite($auth['user_id'], $companyId, $input['item_id']);
                echo json_encode(['success' => $success]);
                break;

            case 'remove_favorite':
                $success = $navService->removeFavorite($auth['user_id'], $companyId, $input['item_id']);
                echo json_encode(['success' => $success]);
                break;

            case 'record_visit':
                $success = $navService->recordVisit($auth['user_id'], $companyId, $input['item_id']);
                echo json_encode(['success' => $success]);
                break;

            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Unknown action']);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Navigation error: ' . $e->getMessage()
    ]);
}
