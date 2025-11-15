<?php
/**
 * Unanswered Questions Queue Manager
 * Admin interface for reviewing and approving AI-generated trees
 *
 * GET /api/v1/admin/queue-manager?action=list&status=pending
 * GET /api/v1/admin/queue-manager?action=stats
 * POST /api/v1/admin/queue-manager (action=approve|reject|generate_tree)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/UnansweredQueueService.php';
require_once __DIR__ . '/../../services/TreeGeneratorService.php';

try {
    $queueService = new UnansweredQueueService();
    $treeGenerator = new TreeGeneratorService();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? 'list';

        switch ($action) {
            case 'list':
                $status = $_GET['status'] ?? null;
                $limit = (int)($_GET['limit'] ?? 50);
                $result = $queueService->getPendingQuestions($limit, $status);
                break;

            case 'stats':
                $result = $queueService->getQueueStats();
                break;

            case 'get':
                $questionId = $_GET['question_id'] ?? null;
                if (!$questionId) {
                    throw new Exception('question_id is required');
                }
                $result = $queueService->getAnswer($questionId);
                break;

            default:
                $result = [
                    'success' => false,
                    'message' => 'Invalid action. Use: list, stats, get'
                ];
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? null;

        switch ($action) {
            case 'generate_tree':
                // Generate decision tree for a queued question
                $questionId = $input['question_id'] ?? null;
                $question = $input['question'] ?? null;
                $context = $input['context'] ?? null;

                if (!$question) {
                    throw new Exception('question is required');
                }

                $treeResult = $treeGenerator->generateTree($question, $context);

                if ($treeResult['success'] && $questionId) {
                    // Save generated tree to queue
                    $queueService->saveAIGeneratedTree(
                        $questionId,
                        $treeResult['tree_structure'],
                        $treeResult['confidence']
                    );
                }

                $result = $treeResult;
                break;

            case 'approve':
                // Approve AI-generated tree and integrate
                $questionId = $input['question_id'] ?? null;
                $reviewerId = $input['reviewer_id'] ?? null;
                $notes = $input['notes'] ?? null;
                $modifiedTree = $input['modified_tree'] ?? null;

                if (!$questionId || !$reviewerId) {
                    throw new Exception('question_id and reviewer_id are required');
                }

                $result = $queueService->approveQuestion($questionId, $reviewerId, $notes, $modifiedTree);
                break;

            case 'reject':
                // Reject AI-generated tree
                // TODO: Implement rejection logic
                $result = [
                    'success' => false,
                    'message' => 'Rejection not yet implemented'
                ];
                break;

            default:
                $result = [
                    'success' => false,
                    'message' => 'Invalid action. Use: generate_tree, approve, reject'
                ];
        }
    } else {
        $result = [
            'success' => false,
            'message' => 'Invalid request method'
        ];
    }

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
