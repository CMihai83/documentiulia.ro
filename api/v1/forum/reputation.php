<?php
/**
 * Forum Reputation API
 *
 * GET /api/v1/forum/reputation?user_id=xxx - Get user's reputation details
 * GET /api/v1/forum/reputation/leaderboard - Get reputation leaderboard
 * GET /api/v1/forum/reputation/badges - Get available badges
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/ReputationService.php';

try {
    $reputationService = new ReputationService();

    // GET - User reputation or leaderboard
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $endpoint = $_GET['endpoint'] ?? 'user';

        switch ($endpoint) {
            case 'user':
                $userId = $_GET['user_id'] ?? null;

                if (!$userId) {
                    throw new Exception('User ID required');
                }

                $reputation = $reputationService->getUserReputation($userId);

                echo json_encode([
                    'success' => true,
                    'data' => $reputation
                ]);
                break;

            case 'leaderboard':
                $period = $_GET['period'] ?? 'all-time'; // all-time, monthly, weekly
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
                $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

                if (!in_array($period, ['all-time', 'monthly', 'weekly'])) {
                    throw new Exception('Invalid period. Must be all-time, monthly, or weekly');
                }

                $leaderboard = $reputationService->getLeaderboard($period, $limit, $offset);

                echo json_encode([
                    'success' => true,
                    'data' => $leaderboard,
                    'count' => count($leaderboard),
                    'pagination' => [
                        'limit' => $limit,
                        'offset' => $offset
                    ]
                ]);
                break;

            case 'badges':
                $badges = $reputationService->getAllBadges();

                echo json_encode([
                    'success' => true,
                    'data' => $badges,
                    'count' => count($badges)
                ]);
                break;

            default:
                throw new Exception('Invalid endpoint. Must be user, leaderboard, or badges');
        }
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
