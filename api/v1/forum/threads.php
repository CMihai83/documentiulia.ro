<?php
/**
 * Forum Threads API
 *
 * GET /api/v1/forum/threads?category_id=1 - List threads for category
 * POST /api/v1/forum/threads - Create new thread
 * PUT /api/v1/forum/threads - Update thread
 * DELETE /api/v1/forum/threads - Delete thread
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/ForumService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $forumService = new ForumService();

    // GET - List threads
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $categoryId = $_GET['category_id'] ?? null;

        $filters = [
            'tag' => $_GET['tag'] ?? null,
            'is_solved' => isset($_GET['is_solved']) ? filter_var($_GET['is_solved'], FILTER_VALIDATE_BOOLEAN) : null,
            'sort' => $_GET['sort'] ?? 'recent'
        ];

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $threads = $forumService->listThreads($categoryId, $filters, $limit, $offset);

        echo json_encode([
            'success' => true,
            'data' => $threads,
            'count' => count($threads),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset
            ]
        ]);
    }

    // POST - Create thread
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Authentication required
        $authHeader = getHeader('authorization', '') ?? '';
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            throw new Exception('Authorization required');
        }

        $auth = new AuthService();
        $userData = $auth->verifyToken($matches[1]);

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['category_id']) || empty($input['category_id'])) {
            throw new Exception('Category ID required');
        }

        if (!isset($input['title']) || empty($input['title'])) {
            throw new Exception('Title required');
        }

        if (!isset($input['content']) || empty($input['content'])) {
            throw new Exception('Content required');
        }

        $threadData = [
            'category_id' => $input['category_id'],
            'author_id' => $userData['user_id'],
            'title' => $input['title'],
            'content' => $input['content'],
            'tags' => $input['tags'] ?? []
        ];

        $thread = $forumService->createThread($threadData);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'data' => $thread,
            'message' => 'Thread created successfully'
        ]);
    }

    // PUT - Update thread
    elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Authentication required
        $authHeader = getHeader('authorization', '') ?? '';
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            throw new Exception('Authorization required');
        }

        $auth = new AuthService();
        $userData = $auth->verifyToken($matches[1]);

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['thread_id']) || empty($input['thread_id'])) {
            throw new Exception('Thread ID required');
        }

        $updateData = [];
        if (isset($input['title'])) $updateData['title'] = $input['title'];
        if (isset($input['content'])) $updateData['content'] = $input['content'];
        if (isset($input['tags'])) $updateData['tags'] = $input['tags'];

        $thread = $forumService->updateThread($input['thread_id'], $userData['user_id'], $updateData);

        echo json_encode([
            'success' => true,
            'data' => $thread,
            'message' => 'Thread updated successfully'
        ]);
    }

    // DELETE - Delete thread
    elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Authentication required
        $authHeader = getHeader('authorization', '') ?? '';
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            throw new Exception('Authorization required');
        }

        $auth = new AuthService();
        $userData = $auth->verifyToken($matches[1]);

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['thread_id']) || empty($input['thread_id'])) {
            throw new Exception('Thread ID required');
        }

        $forumService->deleteThread($input['thread_id'], $userData['user_id']);

        echo json_encode([
            'success' => true,
            'message' => 'Thread deleted successfully'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
