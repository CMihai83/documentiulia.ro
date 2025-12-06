<?php
/**
 * My Course Enrollments API Endpoint
 *
 * GET /api/v1/courses/my-enrollments.php
 *
 * Returns list of courses the authenticated user is enrolled in
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

// Authenticate request - returns user data or exits with 401
$auth = authenticate();
$userId = $auth['user_id'];

// Get user enrollments
$courseService = new CourseService();
$result = $courseService->getUserEnrollments($userId);

if ($result['success']) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $result['enrollments']
    ]);
} else {
    http_response_code(500);
    echo json_encode($result);
}
