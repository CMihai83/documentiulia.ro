<?php
/**
 * MBA Progress Tracking API Endpoint
 * Track user's reading progress through MBA books
 *
 * GET /api/v1/mba/progress?user_id=xxx - Get user's progress
 * POST /api/v1/mba/progress - Update reading status
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/MBAKnowledgeService.php';

try {
    $mbaService = new MBAKnowledgeService();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get user progress
        $userId = $_GET['user_id'] ?? null;

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
