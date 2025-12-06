<?php
/**
 * Navigation Search API
 * GET /api/v1/navigation/search.php?q=xxx - Search navigation items
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
require_once __DIR__ . '/../../services/NavigationService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Verify authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $auth->verifyToken($matches[1]);

    // Get company ID
    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    // Get search query
    $query = $_GET['q'] ?? '';
    if (strlen($query) < 2) {
        echo json_encode([
            'success' => true,
            'data' => []
        ]);
        exit();
    }

    // Get language preference
    $language = substr(getHeader('accept-language', 'en') ?? 'en', 0, 2);
    if (!in_array($language, ['ro', 'en'])) {
        $language = 'en';
    }

    $navService = NavigationService::getInstance();
    $results = $navService->search($query, $companyId, $language);

    echo json_encode([
        'success' => true,
        'data' => array_values($results),
        'meta' => [
            'query' => $query,
            'count' => count($results)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
