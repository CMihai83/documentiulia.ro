<?php
/**
 * Single Forum Thread API
 *
 * GET /api/v1/forum/thread?id=xxx - Get single thread details with replies
 * POST /api/v1/forum/thread/pin - Pin/unpin thread (moderator only)
 * POST /api/v1/forum/thread/lock - Lock/unlock thread (moderator only)
 * POST /api/v1/forum/thread/solve - Mark thread as solved (author only)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

    // GET - Get single thread with details
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $threadId = $_GET['id'] ?? null;

        if (!$threadId) {
            throw new Exception('Thread ID required');
        }

        // Increment view count
        $forumService->incrementThreadViews($threadId);

        $thread = $forumService->getThreadById($threadId);

        if (!$thread) {
            http_response_code(404);
            throw new Exception('Thread not found');
        }

        echo json_encode([
            'success' => true,
            'data' => $thread
        ]);
    }

    // POST - Moderation actions
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
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

        $action = $input['action'] ?? null;

        if (!$action) {
            throw new Exception('Action required (pin, lock, solve)');
        }

        switch ($action) {
            case 'pin':
                // Moderator only
                if (!in_array($userData['role'], ['admin', 'moderator'])) {
                    http_response_code(403);
                    throw new Exception('Insufficient permissions. Moderator role required.');
                }

                $isPinned = $input['is_pinned'] ?? true;
                $result = $forumService->togglePin($input['thread_id'], $isPinned);

                echo json_encode([
                    'success' => true,
                    'data' => $result,
                    'message' => $isPinned ? 'Thread pinned' : 'Thread unpinned'
                ]);
                break;

            case 'lock':
                // Moderator only
                if (!in_array($userData['role'], ['admin', 'moderator'])) {
                    http_response_code(403);
                    throw new Exception('Insufficient permissions. Moderator role required.');
                }

                $isLocked = $input['is_locked'] ?? true;
                $result = $forumService->toggleLock($input['thread_id'], $isLocked);

                echo json_encode([
                    'success' => true,
                    'data' => $result,
                    'message' => $isLocked ? 'Thread locked' : 'Thread unlocked'
                ]);
                break;

            case 'solve':
                // Author or moderator only
                $thread = $forumService->getThreadById($input['thread_id']);

                if (!$thread) {
                    http_response_code(404);
                    throw new Exception('Thread not found');
                }

                if ($thread['author_id'] !== $userData['user_id'] && !in_array($userData['role'], ['admin', 'moderator'])) {
                    http_response_code(403);
                    throw new Exception('Only thread author or moderators can mark as solved');
                }

                $isSolved = $input['is_solved'] ?? true;
                $acceptedReplyId = $input['accepted_reply_id'] ?? null;

                $result = $forumService->markSolved($input['thread_id'], $isSolved, $acceptedReplyId);

                echo json_encode([
                    'success' => true,
                    'data' => $result,
                    'message' => $isSolved ? 'Thread marked as solved' : 'Thread marked as unsolved'
                ]);
                break;

            default:
                throw new Exception('Invalid action. Must be pin, lock, or solve');
        }
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
