<?php
/**
 * Forum Voting API
 *
 * POST /api/v1/forum/vote - Vote on thread or reply (upvote/downvote)
 * GET /api/v1/forum/vote - Get user's vote on specific item
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

    // GET - Get user's vote on specific item
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $voteableType = $_GET['voteable_type'] ?? null; // thread or reply
        $voteableId = $_GET['voteable_id'] ?? null;

        if (!$voteableType || !$voteableId) {
            throw new Exception('Voteable type and ID required');
        }

        $vote = $forumService->getUserVote($userData['user_id'], $voteableType, (int)$voteableId);

        echo json_encode([
            'success' => true,
            'data' => $vote
        ]);
    }

    // POST - Vote on thread or reply
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['voteable_type']) || empty($input['voteable_type'])) {
            throw new Exception('Voteable type required (thread or reply)');
        }

        if (!isset($input['voteable_id']) || empty($input['voteable_id'])) {
            throw new Exception('Voteable ID required');
        }

        if (!isset($input['vote_type']) || empty($input['vote_type'])) {
            throw new Exception('Vote type required (upvote or downvote)');
        }

        if (!in_array($input['voteable_type'], ['thread', 'reply'])) {
            throw new Exception('Invalid voteable type. Must be thread or reply');
        }

        if (!in_array($input['vote_type'], ['upvote', 'downvote'])) {
            throw new Exception('Invalid vote type. Must be upvote or downvote');
        }

        $result = $forumService->vote(
            $userData['user_id'],
            $input['voteable_type'],
            (int)$input['voteable_id'],
            $input['vote_type']
        );

        echo json_encode([
            'success' => true,
            'data' => $result,
            'message' => 'Vote recorded successfully'
        ]);
    }

    // DELETE - Remove vote (unvote)
    elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['voteable_type']) || empty($input['voteable_type'])) {
            throw new Exception('Voteable type required (thread or reply)');
        }

        if (!isset($input['voteable_id']) || empty($input['voteable_id'])) {
            throw new Exception('Voteable ID required');
        }

        $result = $forumService->removeVote(
            $userData['user_id'],
            $input['voteable_type'],
            (int)$input['voteable_id']
        );

        echo json_encode([
            'success' => true,
            'data' => $result,
            'message' => 'Vote removed successfully'
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
