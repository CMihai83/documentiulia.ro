<?php
/**
 * Update Course API Endpoint
 *
 * PUT /api/v1/courses/update.php
 *
 * Updates an existing course
 *
 * Request Body (JSON):
 * {
 *   "course_id": 123,
 *   "title": "Updated Title",
 *   "description": "Updated description",
 *   ...
 * }
 *
 * @category API
 * @package  DocumentIulia
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/CourseService.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Allow both PUT and POST
if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'])) {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Use PUT or POST.'
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

// Only admin and instructors can update courses
if (!in_array($userRole, ['admin', 'instructor'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Only admins and instructors can update courses'
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

// Validate course_id
if (!isset($input['course_id']) || empty($input['course_id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'course_id is required'
    ]);
    exit();
}

$courseId = intval($input['course_id']);
unset($input['course_id']);

// Update course
$courseService = new CourseService();
$result = $courseService->updateCourse($courseId, $input);

if ($result['success']) {
    http_response_code(200);
    echo json_encode($result);
} else {
    http_response_code(500);
    echo json_encode($result);
}
