<?php
/**
 * Enroll in Course API Endpoint
 *
 * POST /api/v1/courses/enroll.php
 *
 * Enrolls a user in a course (for manual enrollments, admin grants, etc.)
 * For payment-based enrollments, use the payment webhook
 *
 * Request Body (JSON):
 * {
 *   "course_id": 123,
 *   "user_id": "uuid" (optional, defaults to authenticated user),
 *   "payment_status": "free|paid",
 *   "payment_amount": 99.00,
 *   "payment_reference": "stripe_session_id",
 *   "enrollment_source": "purchase|gift|admin|subscription",
 *   "expires_at": "2025-12-31" (optional)
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

// Determine target user (admin can enroll others)
$targetUserId = $input['user_id'] ?? $userId;
if ($targetUserId !== $userId && $userRole !== 'admin') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Only admins can enroll other users'
    ]);
    exit();
}

// Build enrollment data
$enrollmentData = [
    'company_id' => $companyId,
    'payment_status' => $input['payment_status'] ?? 'free',
    'payment_amount' => $input['payment_amount'] ?? null,
    'payment_reference' => $input['payment_reference'] ?? null,
    'enrollment_source' => $input['enrollment_source'] ?? 'admin',
    'stripe_checkout_session_id' => $input['stripe_checkout_session_id'] ?? null,
    'expires_at' => $input['expires_at'] ?? null,
    'status' => $input['status'] ?? 'active'
];

// Enroll user
$courseService = new CourseService();
$result = $courseService->enrollUser($targetUserId, $courseId, $enrollmentData);

if ($result['success']) {
    http_response_code(201);
    echo json_encode($result);
} else {
    http_response_code(500);
    echo json_encode($result);
}
