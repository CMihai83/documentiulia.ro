<?php
/**
 * Forum Bookmarks API
 *
 * GET /api/v1/forum/bookmarks - Get user's bookmarked threads
 * POST /api/v1/forum/bookmarks - Bookmark a thread
 * DELETE /api/v1/forum/bookmarks - Remove bookmark
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once '/var/www/documentiulia.ro/api/config/database.php';
require_once '/var/www/documentiulia.ro/api/services/ForumService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $forumService = new ForumService();

    // Authentication required for all operations
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // GET - List user's bookmarks
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $bookmarks = $forumService->getUserBookmarks($userData['user_id'], $limit, $offset);

        echo json_encode([
            'success' => true,
            'data' => $bookmarks,
            'count' => count($bookmarks),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset
            ]
        ]);
    }

    // POST - Add bookmark
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['thread_id']) || empty($input['thread_id'])) {
            throw new Exception('Thread ID required');
        }

        $result = $forumService->addBookmark($userData['user_id'], $input['thread_id']);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'data' => $result,
            'message' => 'Thread bookmarked successfully'
        ]);
    }

    // DELETE - Remove bookmark
    elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['thread_id']) || empty($input['thread_id'])) {
            throw new Exception('Thread ID required');
        }

        $forumService->removeBookmark($userData['user_id'], $input['thread_id']);

        echo json_encode([
            'success' => true,
            'message' => 'Bookmark removed successfully'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
