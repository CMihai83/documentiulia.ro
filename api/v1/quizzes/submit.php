<?php
/**
 * Submit Quiz Attempt API Endpoint
 *
 * POST /api/v1/quizzes/submit.php
 *
 * Submits quiz answers and returns graded results
 *
 * Request Body:
 * {
 *   "quiz_id": 123,
 *   "answers": {"1": "A", "2": "B", "3": "True"},
 *   "time_taken": 300
 * }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/QuizService.php';

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

if (!$input || !isset($input['quiz_id']) || !isset($input['answers'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'quiz_id and answers required']);
    exit();
}

$quizId = intval($input['quiz_id']);
$answers = $input['answers'];
$timeTaken = $input['time_taken'] ?? 0;

$quizService = new QuizService();
$result = $quizService->submitQuizAttempt($userId, $quizId, $answers, $timeTaken);

if ($result['success']) {
    http_response_code(200);
} else {
    http_response_code(500);
}

echo json_encode($result);
