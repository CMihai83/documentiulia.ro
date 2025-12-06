<?php
/**
 * Get Course Progress API Endpoint
 *
 * GET /api/v1/courses/get-progress.php?course_id={course_id}
 *
 * Returns student's progress for all lessons in a course
 *
 * Query Parameters:
 * - course_id (required): Course ID
 *
 * @category API
 * @package  DocumentIulia
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/ProgressService.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Use GET.'
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

// Validate course_id
if (!isset($_GET['course_id']) || empty($_GET['course_id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'course_id is required'
    ]);
    exit();
}

$courseId = intval($_GET['course_id']);

// Get course progress
$progressService = new ProgressService();
$result = $progressService->getCourseProgress($userId, $courseId);

if ($result['success']) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => [
            'lessons' => $result['lessons'],
            'stats' => $result['stats']
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode($result);
}
