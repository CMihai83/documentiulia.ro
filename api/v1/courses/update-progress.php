<?php
/**
 * Update Lesson Progress API Endpoint
 *
 * POST /api/v1/courses/update-progress.php
 *
 * Updates student progress for a lesson (video position, completion)
 *
 * Request Body (JSON):
 * {
 *   "lesson_id": 123,
 *   "progress_percentage": 45.5,
 *   "last_position": 270,
 *   "time_spent_seconds": 30,
 *   "video_watch_percentage": 45.0,
 *   "completed": false
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

// Build progress data
$progressData = [];

if (isset($input['progress_percentage'])) {
    $progressData['progress_percentage'] = floatval($input['progress_percentage']);
}

if (isset($input['last_position'])) {
    $progressData['last_position'] = intval($input['last_position']);
}

if (isset($input['time_spent_seconds'])) {
    $progressData['time_spent_seconds'] = intval($input['time_spent_seconds']);
}

if (isset($input['video_watch_percentage'])) {
    $progressData['video_watch_percentage'] = floatval($input['video_watch_percentage']);
}

if (isset($input['completed'])) {
    $progressData['completed'] = filter_var($input['completed'], FILTER_VALIDATE_BOOLEAN);
}

// Update progress
$progressService = new ProgressService();
$result = $progressService->updateLessonProgress($userId, $lessonId, $progressData);

if ($result['success']) {
    http_response_code(200);
    echo json_encode($result);
} else {
    http_response_code(500);
    echo json_encode($result);
}
