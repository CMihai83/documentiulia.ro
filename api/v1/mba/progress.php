<?php
/**
 * MBA Progress Tracking API Endpoint
 * Track user's reading progress through MBA books
 *
 * GET /api/v1/mba/progress - Get user's progress (uses JWT)
 * POST /api/v1/mba/progress - Update reading status
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../services/MBAKnowledgeService.php';

try {
    // Authenticate and get user_id from JWT
    $authHeader = getHeader('authorization', '') ?? '';
    $userId = null;
    if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $auth = new AuthService();
        $userData = $auth->verifyToken($matches[1]);
        $userId = $userData['user_id'] ?? null;
    }

    // Fall back to query param
    if (!$userId) {
        $userId = $_GET['user_id'] ?? null;
    }

    $mbaService = new MBAKnowledgeService();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get user progress
        if (!$userId) {
            throw new Exception('user_id is required');
        }

        $result = $mbaService->getUserProgress($userId);
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Update reading status
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['user_id']) || empty($input['book_id']) || empty($input['status'])) {
            throw new Exception('user_id, book_id, and status are required');
        }

        $result = $mbaService->updateReadingStatus(
            $input['user_id'],
            $input['book_id'],
            $input['status'],
            $input['rating'] ?? null
        );

        echo json_encode($result, JSON_PRETTY_PRINT);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
