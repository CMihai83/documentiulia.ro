<?php
/**
 * Create Course API Endpoint
 *
 * POST /api/v1/courses/create.php
 *
 * Creates a new course
 *
 * Request Body (JSON):
 * {
 *   "title": "Course Title",
 *   "short_description": "Brief description",
 *   "description": "Full description",
 *   "price_ron": 99.00,
 *   "instructor_id": "uuid",
 *   "instructor_name": "Name",
 *   "category": "Business",
 *   "level": "beginner",
 *   "duration_hours": 10,
 *   "learning_objectives": ["obj1", "obj2"],
 *   "prerequisites": ["prereq1"],
 *   "tags": ["excel", "business"],
 *   "thumbnail_url": "url",
 *   "promo_video_url": "url"
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

$userId = $auth['user_id'];
$userRole = $auth['role'];
$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

// Only admin and instructors can create courses
if (!in_array($userRole, ['admin', 'instructor'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Only admins and instructors can create courses'
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
$requiredFields = ['title', 'description'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || empty($input[$field])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Field '$field' is required"
        ]);
        exit();
    }
}

// Set company_id
$input['company_id'] = $companyId;

// Set instructor_id to current user if not provided
if (!isset($input['instructor_id'])) {
    $input['instructor_id'] = $userId;
}

// Create course
$courseService = new CourseService();
$result = $courseService->createCourse($input);

if ($result['success']) {
    http_response_code(201);
    echo json_encode($result);
} else {
    http_response_code(500);
    echo json_encode($result);
}
