<?php
/**
 * Get Single Course API Endpoint
 *
 * GET /api/v1/courses/get.php?id={course_id}
 *
 * Returns detailed information about a specific course
 *
 * Query Parameters:
 * - id (required): Course ID
 *
 * @category API
 * @package  DocumentIulia
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/CourseService.php';

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

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

// Validate course ID
if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Course ID is required'
    ]);
    exit();
}

$courseId = intval($_GET['id']);

// Get course
$courseService = new CourseService();
$course = $courseService->getCourse($courseId, $companyId);

if ($course) {
    // Get course modules with lessons
    $modulesResult = $courseService->getCourseModules($courseId);

    if ($modulesResult['success']) {
        foreach ($modulesResult['modules'] as &$module) {
            $lessonsResult = $courseService->getModuleLessons($module['id']);
            $module['lessons'] = $lessonsResult['success'] ? $lessonsResult['lessons'] : [];
        }
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => [
            'course' => $course,
            'modules' => $modulesResult['modules'] ?? []
        ]
    ]);
} else {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Course not found'
    ]);
}
