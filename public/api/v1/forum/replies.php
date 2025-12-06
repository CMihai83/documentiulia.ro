<?php
/**
 * Forum Replies API
 *
 * GET /api/v1/forum/replies?thread_id=xxx - List replies for thread
 * POST /api/v1/forum/replies - Create new reply
 * PUT /api/v1/forum/replies - Update reply
 * DELETE /api/v1/forum/replies - Delete reply
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
require_once '/var/www/documentiulia.ro/api/config/database.php';
require_once '/var/www/documentiulia.ro/api/services/ForumService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $forumService = new ForumService();

    // GET - List replies for thread
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $threadId = $_GET['thread_id'] ?? null;

        if (!$threadId) {
            throw new Exception('Thread ID required');
        }

        $sort = $_GET['sort'] ?? 'oldest'; // oldest, newest, votes
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $replies = $forumService->listReplies($threadId, $sort, $limit, $offset);

        echo json_encode([
            'success' => true,
            'data' => $replies,
            'count' => count($replies),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset
            ]
        ]);
    }

    // POST - Create reply
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Authentication required
        $authHeader = getHeader('authorization', '') ?? '';
        if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
            throw new Exception('Authorization required');
        }

        $auth = new AuthService();
        $userData = $auth->verifyToken($matches[1]);

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['thread_id']) || empty($input['thread_id'])) {
            throw new Exception('Thread ID required');
        }

        if (!isset($input['content']) || empty($input['content'])) {
            throw new Exception('Content required');
        }

        $replyData = [
            'thread_id' => $input['thread_id'],
            'author_id' => $userData['user_id'],
            'content' => $input['content'],
            'parent_reply_id' => $input['parent_reply_id'] ?? null // For nested replies
        ];

        $reply = $forumService->createReply($replyData);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'data' => $reply,
            'message' => 'Reply created successfully'
        ]);
    }

    // PUT - Update reply
    elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Authentication required
        $authHeader = getHeader('authorization', '') ?? '';
        if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
            throw new Exception('Authorization required');
        }

        $auth = new AuthService();
        $userData = $auth->verifyToken($matches[1]);

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['reply_id']) || empty($input['reply_id'])) {
            throw new Exception('Reply ID required');
        }

        if (!isset($input['content']) || empty($input['content'])) {
            throw new Exception('Content required');
        }

        $reply = $forumService->updateReply(
            $input['reply_id'],
            $userData['user_id'],
            $input['content']
        );

        echo json_encode([
            'success' => true,
            'data' => $reply,
            'message' => 'Reply updated successfully'
        ]);
    }

    // DELETE - Delete reply
    elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Authentication required
        $authHeader = getHeader('authorization', '') ?? '';
        if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
            throw new Exception('Authorization required');
        }

        $auth = new AuthService();
        $userData = $auth->verifyToken($matches[1]);

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['reply_id']) || empty($input['reply_id'])) {
            throw new Exception('Reply ID required');
        }

        $forumService->deleteReply($input['reply_id'], $userData['user_id']);

        echo json_encode([
            'success' => true,
            'message' => 'Reply deleted successfully'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
