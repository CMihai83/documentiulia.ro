<?php
/**
 * Forum Moderation API
 *
 * POST /api/v1/forum/moderation/flag - Flag thread or reply for moderation
 * GET /api/v1/forum/moderation/flags - Get flagged content (moderator only)
 * POST /api/v1/forum/moderation/resolve - Resolve flag (moderator only)
 * POST /api/v1/forum/moderation/warn - Warn user (moderator only)
 * POST /api/v1/forum/moderation/ban - Ban user (admin only)
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

    // GET - Get flagged content (moderators only)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!in_array($userData['role'], ['admin', 'moderator'])) {
            http_response_code(403);
            throw new Exception('Insufficient permissions. Moderator role required.');
        }

        $status = $_GET['status'] ?? 'pending'; // pending, resolved, dismissed
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $flags = $forumService->getFlaggedContent($status, $limit, $offset);

        echo json_encode([
            'success' => true,
            'data' => $flags,
            'count' => count($flags),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset
            ]
        ]);
    }

    // POST - Moderation actions
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? null;

        if (!$action) {
            throw new Exception('Action required (flag, resolve, warn, ban)');
        }

        switch ($action) {
            case 'flag':
                // Any authenticated user can flag content
                if (!isset($input['flaggable_type']) || !isset($input['flaggable_id']) || !isset($input['reason'])) {
                    throw new Exception('Flaggable type, ID, and reason required');
                }

                if (!in_array($input['flaggable_type'], ['thread', 'reply'])) {
                    throw new Exception('Invalid flaggable type. Must be thread or reply');
                }

                $flagData = [
                    'flagger_id' => $userData['user_id'],
                    'flaggable_type' => $input['flaggable_type'],
                    'flaggable_id' => $input['flaggable_id'],
                    'reason' => $input['reason'],
                    'description' => $input['description'] ?? null
                ];

                $result = $forumService->flagContent($flagData);

                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'data' => $result,
                    'message' => 'Content flagged for review'
                ]);
                break;

            case 'resolve':
                // Moderators only
                if (!in_array($userData['role'], ['admin', 'moderator'])) {
                    http_response_code(403);
                    throw new Exception('Insufficient permissions. Moderator role required.');
                }

                if (!isset($input['flag_id']) || !isset($input['resolution'])) {
                    throw new Exception('Flag ID and resolution required');
                }

                $result = $forumService->resolveFlag(
                    $input['flag_id'],
                    $userData['user_id'],
                    $input['resolution'],
                    $input['moderator_notes'] ?? null
                );

                echo json_encode([
                    'success' => true,
                    'data' => $result,
                    'message' => 'Flag resolved'
                ]);
                break;

            case 'warn':
                // Moderators only
                if (!in_array($userData['role'], ['admin', 'moderator'])) {
                    http_response_code(403);
                    throw new Exception('Insufficient permissions. Moderator role required.');
                }

                if (!isset($input['user_id']) || !isset($input['reason'])) {
                    throw new Exception('User ID and reason required');
                }

                $warningData = [
                    'user_id' => $input['user_id'],
                    'moderator_id' => $userData['user_id'],
                    'reason' => $input['reason'],
                    'description' => $input['description'] ?? null
                ];

                $result = $forumService->warnUser($warningData);

                echo json_encode([
                    'success' => true,
                    'data' => $result,
                    'message' => 'User warning issued'
                ]);
                break;

            case 'ban':
                // Admin only
                if ($userData['role'] !== 'admin') {
                    http_response_code(403);
                    throw new Exception('Insufficient permissions. Admin role required.');
                }

                if (!isset($input['user_id']) || !isset($input['duration_days'])) {
                    throw new Exception('User ID and duration_days required');
                }

                $banData = [
                    'user_id' => $input['user_id'],
                    'banned_by' => $userData['user_id'],
                    'reason' => $input['reason'] ?? 'Violation of community guidelines',
                    'duration_days' => (int)$input['duration_days'],
                    'is_permanent' => $input['is_permanent'] ?? false
                ];

                $result = $forumService->banUser($banData);

                echo json_encode([
                    'success' => true,
                    'data' => $result,
                    'message' => 'User banned successfully'
                ]);
                break;

            default:
                throw new Exception('Invalid action. Must be flag, resolve, warn, or ban');
        }
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
