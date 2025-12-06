<?php
/**
 * Forum Categories API
 *
 * GET /api/v1/forum/categories - List all categories with stats
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/ForumService.php';

try {
    $forumService = new ForumService();
    $categories = $forumService->getCategories();

    echo json_encode([
        'success' => true,
        'data' => $categories,
        'count' => count($categories)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
