<?php
/**
 * Create Course Module API Endpoint
 *
 * POST /api/v1/courses/create-module.php
 *
 * Creates a new module in a course
 *
 * Request Body (JSON):
 * {
 *   "course_id": 123,
 *   "name": "Module Name",
 *   "description": "Module description",
 *   "duration_minutes": 120,
 *   "learning_outcomes": ["outcome1", "outcome2"],
 *   "is_locked": false
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

// Only admin and instructors can create modules
if (!in_array($userRole, ['admin', 'instructor'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Only admins and instructors can create modules'
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
if (!isset($input['course_id']) || !isset($input['name'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'course_id and name are required'
    ]);
    exit();
}

$courseId = intval($input['course_id']);

// Create module
$courseService = new CourseService();
$result = $courseService->createModule($courseId, $input);

if ($result['success']) {
    http_response_code(201);
    echo json_encode($result);
} else {
    http_response_code(500);
    echo json_encode($result);
}
