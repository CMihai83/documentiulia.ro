<?php
/**
 * Create Lesson API Endpoint
 *
 * POST /api/v1/courses/create-lesson.php
 *
 * Creates a new lesson in a module
 *
 * Request Body (JSON):
 * {
 *   "module_id": 123,
 *   "name": "Lesson Name",
 *   "description": "Lesson description",
 *   "lesson_type": "video",
 *   "video_url": "https://vimeo.com/...",
 *   "video_duration_seconds": 600,
 *   "video_provider": "vimeo",
 *   "content_text": "Text content",
 *   "attachments": [...],
 *   "is_preview": false,
 *   "is_required": true
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
require_once __DIR__ . '/../../services/CourseService.php';

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

$userRole = $auth['role'];

// Only admin and instructors can create lessons
if (!in_array($userRole, ['admin', 'instructor'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Only admins and instructors can create lessons'
    ]);
    exit();
}

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

// Validate required fields
if (!isset($input['module_id']) || !isset($input['name'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'module_id and name are required'
    ]);
    exit();
}

$moduleId = intval($input['module_id']);

// Create lesson
$courseService = new CourseService();
$result = $courseService->createLesson($moduleId, $input);

if ($result['success']) {
    http_response_code(201);
    echo json_encode($result);
} else {
    http_response_code(500);
    echo json_encode($result);
}
