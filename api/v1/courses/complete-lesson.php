<?php
/**
 * Complete Lesson API Endpoint
 *
 * POST /api/v1/courses/complete-lesson.php
 *
 * Marks a lesson as completed for the user
 *
 * Request Body (JSON):
 * {
 *   "lesson_id": 123
 * }
 *
 * @category API
 * @package  DocumentIulia
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/ProgressService.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Use POST.'
    ]);
    exit();
}

// Authenticate request
$auth = authenticate();
if (!$auth['valid']) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => $auth['message']
    ]);
    exit();
}

$userId = $auth['user_id'];

// Get request body
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON in request body'
    ]);
    exit();
}

// Validate lesson_id
if (!isset($input['lesson_id']) || empty($input['lesson_id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'lesson_id is required'
    ]);
    exit();
}

$lessonId = intval($input['lesson_id']);

// Complete lesson
$progressService = new ProgressService();
$result = $progressService->completeLesson($userId, $lessonId);

if ($result['success']) {
    http_response_code(200);
    echo json_encode($result);
} else {
    http_response_code(500);
    echo json_encode($result);
}
