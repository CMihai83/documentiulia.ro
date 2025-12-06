<?php
/**
 * Generate Certificate API Endpoint
 *
 * POST /api/v1/courses/generate-certificate.php
 *
 * Generates completion certificate for course
 *
 * Request Body:
 * {
 *   "course_id": 123
 * }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/CertificateService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$auth = authenticate();
if (!$auth['valid']) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => $auth['message']]);
    exit();
}

$userId = $auth['user_id'];
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['course_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'course_id required']);
    exit();
}

$courseId = intval($input['course_id']);

$certificateService = new CertificateService();
$result = $certificateService->generateCertificate($userId, $courseId);

if ($result['success']) {
    http_response_code(200);
} else {
    http_response_code(500);
}

echo json_encode($result);
