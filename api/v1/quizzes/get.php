<?php
/**
 * Get Quiz API Endpoint
 *
 * GET /api/v1/quizzes/get.php?id={quiz_id}
 *
 * Returns quiz with questions (without correct answers for students)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../services/QuizService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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

$userRole = $auth['role'];

if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Quiz ID required']);
    exit();
}

$quizId = intval($_GET['id']);
$quizService = new QuizService();

// Instructors/admins can see correct answers
$includeAnswers = in_array($userRole, ['admin', 'instructor']);

$quiz = $quizService->getQuiz($quizId, $includeAnswers);

if ($quiz) {
    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $quiz]);
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Quiz not found']);
}
