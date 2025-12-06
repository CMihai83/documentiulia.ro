<?php
/**
 * AI Task Estimation API Endpoint
 * Automatically estimate story points for tasks using AI analysis
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    // Authenticate user
    $auth = authenticate();

    // Get company ID from header
    $companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
    if (!$companyId) {
        throw new Exception('Company ID is required', 400);
    }

    // Only POST method allowed
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed', 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['title'])) {
        throw new Exception('Task title is required', 400);
    }

    $title = $input['title'];
    $description = $input['description'] ?? '';
    $type = $input['type'] ?? 'task';
    $projectId = $input['project_id'] ?? null;

    // Calculate complexity score based on task attributes
    $complexityScore = 0;

    // 1. Title length and complexity
    $titleWords = str_word_count($title);
    if ($titleWords > 10) $complexityScore += 2;
    elseif ($titleWords > 5) $complexityScore += 1;

    // 2. Description complexity
    $descriptionWords = str_word_count($description);
    if ($descriptionWords > 100) $complexityScore += 3;
    elseif ($descriptionWords > 50) $complexityScore += 2;
    elseif ($descriptionWords > 20) $complexityScore += 1;

    // 3. Technical keywords that indicate complexity
    $technicalKeywords = [
        'api', 'database', 'migration', 'authentication', 'authorization',
        'integration', 'algorithm', 'optimization', 'architecture', 'refactor',
        'security', 'performance', 'scalability', 'testing', 'deployment',
        'microservice', 'async', 'concurrent', 'distributed', 'encryption'
    ];

    $text = strtolower($title . ' ' . $description);
    foreach ($technicalKeywords as $keyword) {
        if (strpos($text, $keyword) !== false) {
            $complexityScore += 1;
        }
    }

    // 4. Type-based baseline
    $typeBaselines = [
        'spike' => 5,
        'story' => 3,
        'bug' => 2,
        'task' => 2,
        'subtask' => 1
    ];
    $baseline = $typeBaselines[$type] ?? 2;

    // 5. Get historical data from similar tasks in the same project
    $db = getDBConnection();
    $historicalAvg = 3; // Default

    if ($projectId) {
        $query = "
            SELECT AVG(story_points) as avg_points
            FROM tasks
            WHERE company_id = $1
            AND project_id = $2
            AND story_points IS NOT NULL
            AND story_points > 0
            AND type = $3
        ";

        $result = pg_query_params($db, $query, [$companyId, $projectId, $type]);
        if ($result && pg_num_rows($result) > 0) {
            $row = pg_fetch_assoc($result);
            if ($row['avg_points']) {
                $historicalAvg = round((float)$row['avg_points']);
            }
        }
    }

    // 6. Calculate final estimation
    // Combine baseline, complexity, and historical data
    $rawEstimate = $baseline + ($complexityScore * 0.5);

    // Weight towards historical data if available
    $finalEstimate = round(($rawEstimate * 0.6) + ($historicalAvg * 0.4));

    // Ensure estimate is within Fibonacci sequence (1, 2, 3, 5, 8, 13, 21)
    $fibonacci = [1, 2, 3, 5, 8, 13, 21];
    $closestFib = 3;
    $minDiff = 999;

    foreach ($fibonacci as $fib) {
        $diff = abs($fib - $finalEstimate);
        if ($diff < $minDiff) {
            $minDiff = $diff;
            $closestFib = $fib;
        }
    }

    // Generate confidence level and reasoning
    $confidence = 'medium';
    $reasoning = [];

    if ($complexityScore > 10) {
        $confidence = 'low';
        $reasoning[] = 'High complexity detected from technical keywords and description length';
    } elseif ($complexityScore < 3) {
        $confidence = 'high';
        $reasoning[] = 'Simple task with clear scope';
    } else {
        $reasoning[] = 'Moderate complexity based on description and technical content';
    }

    if ($projectId && $historicalAvg > 0) {
        $reasoning[] = "Historical average for {$type} tasks: {$historicalAvg} points";
        $confidence = $confidence === 'low' ? 'medium' : 'high';
    }

    $reasoning[] = "Type baseline: {$baseline} points";
    $reasoning[] = "Complexity score: {$complexityScore}";

    // Alternative estimates (one step up and down in Fibonacci)
    $currentIndex = array_search($closestFib, $fibonacci);
    $alternatives = [
        'lower' => $currentIndex > 0 ? $fibonacci[$currentIndex - 1] : null,
        'higher' => $currentIndex < count($fibonacci) - 1 ? $fibonacci[$currentIndex + 1] : null
    ];

    echo json_encode([
        'success' => true,
        'data' => [
            'estimated_points' => $closestFib,
            'confidence' => $confidence,
            'reasoning' => $reasoning,
            'alternatives' => $alternatives,
            'analysis' => [
                'complexity_score' => $complexityScore,
                'type_baseline' => $baseline,
                'historical_average' => $historicalAvg,
                'raw_estimate' => $rawEstimate
            ]
        ]
    ]);

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
