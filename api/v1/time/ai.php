<?php
/**
 * AI-Powered Time Tracking Features API
 *
 * Endpoints:
 * POST /ai/predict-task        - Get AI task prediction
 * POST /ai/estimate-duration   - Estimate task duration
 * POST /ai/feedback            - Provide feedback on AI prediction
 * GET  /ai/patterns            - Get user activity patterns
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/TimeEntryService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate user
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization token required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company context required');
    }

    if (!$auth->userHasAccessToCompany($userData['user_id'], $companyId)) {
        throw new Exception('Access denied');
    }

    $timeEntryService = new TimeEntryService();
    $method = $_SERVER['REQUEST_METHOD'];

    // Determine action from path or input
    $path = $_SERVER['PATH_INFO'] ?? $_SERVER['REQUEST_URI'] ?? '';
    $action = '';

    if (strpos($path, '/predict-task') !== false) {
        $action = 'predict-task';
    } elseif (strpos($path, '/estimate-duration') !== false) {
        $action = 'estimate-duration';
    } elseif (strpos($path, '/feedback') !== false) {
        $action = 'feedback';
    } elseif (strpos($path, '/patterns') !== false) {
        $action = 'patterns';
    }

    // GET - Get activity patterns
    if ($method === 'GET' || $action === 'patterns') {
        $userId = $_GET['user_id'] ?? $userData['user_id'];

        $patterns = $timeEntryService->getActivityPatterns($userId, $companyId);

        // Group by day and hour for easier visualization
        $patternsByDay = [];
        foreach ($patterns as $pattern) {
            $day = $pattern['day_of_week'];
            if (!isset($patternsByDay[$day])) {
                $patternsByDay[$day] = [];
            }
            $patternsByDay[$day][] = $pattern;
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'patterns' => $patterns,
                'patterns_by_day' => $patternsByDay,
                'total_patterns' => count($patterns)
            ]
        ]);
    }

    // POST - AI operations
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        // Determine action if not already set
        if (!$action && isset($input['action'])) {
            $action = $input['action'];
        }

        if ($action === 'predict-task') {
            // Predict most likely task
            $userId = $input['user_id'] ?? $userData['user_id'];

            $context = [
                'project_id' => $input['project_id'] ?? null,
                'description' => $input['description'] ?? null,
                'time_of_day' => $input['time_of_day'] ?? date('H'),
                'day_of_week' => $input['day_of_week'] ?? date('w')
            ];

            $prediction = $timeEntryService->predictTask($companyId, $userId, $context);

            if (!$prediction) {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'prediction' => null,
                        'message' => 'Not enough data to make a prediction. Keep tracking time to improve AI suggestions!'
                    ]
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'prediction' => $prediction,
                        'task_id' => $prediction['task_id'],
                        'confidence' => $prediction['confidence_score'],
                        'reason' => $prediction['reason']
                    ]
                ]);
            }

        } elseif ($action === 'estimate-duration') {
            // Estimate task duration
            $taskId = $input['task_id'] ?? null;

            if (!$taskId) {
                throw new Exception('Task ID is required');
            }

            $estimation = $timeEntryService->estimateTaskDuration($taskId);

            if (!$estimation) {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'estimation' => null,
                        'message' => 'No historical data available for this task'
                    ]
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'estimation' => $estimation,
                        'estimated_hours' => $estimation['estimated_hours'],
                        'confidence' => $estimation['confidence'],
                        'based_on' => $estimation['based_on']
                    ]
                ]);
            }

        } elseif ($action === 'feedback') {
            // Provide feedback on AI prediction
            $predictionId = $input['prediction_id'] ?? null;
            $actualTaskId = $input['actual_task_id'] ?? null;
            $feedback = $input['feedback'] ?? null;

            if (!$predictionId) {
                throw new Exception('Prediction ID is required');
            }

            if (!$actualTaskId) {
                throw new Exception('Actual task ID is required');
            }

            if (!$feedback || !in_array($feedback, ['correct', 'incorrect', 'adjusted'])) {
                throw new Exception('Valid feedback is required (correct, incorrect, or adjusted)');
            }

            $timeEntryService->provideFeedback($predictionId, $actualTaskId, $feedback);

            echo json_encode([
                'success' => true,
                'message' => 'Thank you for your feedback! This helps improve AI accuracy.'
            ]);

        } else {
            throw new Exception('Invalid action. Use predict-task, estimate-duration, feedback, or patterns');
        }
    }

} catch (Exception $e) {
    $code = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
