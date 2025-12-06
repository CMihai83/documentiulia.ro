<?php
/**
 * Team Velocity Tracking API Endpoint
 * Provides historical velocity data across sprints for predictive analytics
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

    // Only GET method allowed
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Method not allowed', 405);
    }

    $projectId = $_GET['project_id'] ?? null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;

    $db = Database::getInstance()->getConnection();

    // Build query for sprint velocity history
    $query = "
        SELECT
            s.id,
            s.name,
            s.start_date,
            s.end_date,
            COALESCE(s.velocity_points, 0) as capacity,
            s.status,
            (s.end_date - s.start_date + 1) as duration_days,
            COALESCE(SUM(CASE WHEN t.status = 'done' AND t.story_points IS NOT NULL
                THEN t.story_points ELSE 0 END), 0) as completed_points,
            COALESCE(SUM(CASE WHEN t.story_points IS NOT NULL
                THEN t.story_points ELSE 0 END), 0) as committed_points,
            COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
            COUNT(t.id) as total_tasks
        FROM sprints s
        LEFT JOIN tasks t ON t.sprint_id = s.id AND t.company_id = s.company_id
        WHERE s.company_id = $1
    ";

    $params = [$companyId];
    $paramCount = 1;

    if ($projectId) {
        $paramCount++;
        $query .= " AND s.project_id = \$$paramCount";
        $params[] = $projectId;
    }

    $query .= "
        GROUP BY s.id, s.name, s.start_date, s.end_date, s.velocity_points, s.status
        HAVING s.status IN ('completed', 'cancelled')
        ORDER BY s.end_date DESC
        LIMIT " . intval($limit);

    // Convert PostgreSQL $N placeholders to PDO :param style
    $pdoParams = [];
    foreach ($params as $i => $value) {
        $pdoParams['p' . ($i + 1)] = $value;
        $query = str_replace('$' . ($i + 1), ':p' . ($i + 1), $query);
    }

    $stmt = $db->prepare($query);
    $stmt->execute($pdoParams);

    $sprints = [];
    $totalCompleted = 0;
    $totalCommitted = 0;
    $totalDays = 0;
    $sprintCount = 0;

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $durationDays = (int)$row['duration_days'];
        $completedPoints = (int)$row['completed_points'];
        $committedPoints = (int)$row['committed_points'];
        $velocity = $durationDays > 0 ? round($completedPoints / $durationDays, 2) : 0;
        $commitmentAccuracy = $committedPoints > 0 ? round(($completedPoints / $committedPoints) * 100, 1) : 0;

        $sprints[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'start_date' => $row['start_date'],
            'end_date' => $row['end_date'],
            'duration_days' => $durationDays,
            'capacity' => (int)$row['capacity'],
            'status' => $row['status'],
            'completed_points' => $completedPoints,
            'committed_points' => $committedPoints,
            'completed_tasks' => (int)$row['completed_tasks'],
            'total_tasks' => (int)$row['total_tasks'],
            'velocity' => $velocity,
            'commitment_accuracy' => $commitmentAccuracy
        ];

        if ($row['status'] === 'completed') {
            $totalCompleted += $completedPoints;
            $totalCommitted += $committedPoints;
            $totalDays += $durationDays;
            $sprintCount++;
        }
    }

    // Calculate aggregate metrics
    $averageVelocity = $totalDays > 0 ? round($totalCompleted / $totalDays, 2) : 0;
    $averageCompletedPoints = $sprintCount > 0 ? round($totalCompleted / $sprintCount, 1) : 0;
    $averageCommitmentAccuracy = $totalCommitted > 0 ? round(($totalCompleted / $totalCommitted) * 100, 1) : 0;

    // Calculate trend (increasing/stable/decreasing)
    $trend = 'stable';
    if (count($sprints) >= 3) {
        $recent3 = array_slice($sprints, 0, 3);
        $older3 = array_slice($sprints, 3, 3);

        if (count($older3) >= 2) {
            $recentAvg = array_sum(array_column($recent3, 'completed_points')) / count($recent3);
            $olderAvg = array_sum(array_column($older3, 'completed_points')) / count($older3);

            $change = $olderAvg > 0 ? (($recentAvg - $olderAvg) / $olderAvg) * 100 : 0;

            if ($change > 10) {
                $trend = 'increasing';
            } elseif ($change < -10) {
                $trend = 'decreasing';
            }
        }
    }

    // Calculate predictability score (lower standard deviation = more predictable)
    $stdDev = 0;
    if ($sprintCount > 1) {
        $velocities = array_column(array_filter($sprints, function($s) {
            return $s['status'] === 'completed';
        }), 'completed_points');

        $mean = $averageCompletedPoints;
        $variance = array_sum(array_map(function($v) use ($mean) {
            return pow($v - $mean, 2);
        }, $velocities)) / count($velocities);

        $stdDev = sqrt($variance);
    }

    $predictabilityScore = $averageCompletedPoints > 0
        ? max(0, min(100, 100 - (($stdDev / $averageCompletedPoints) * 100)))
        : 0;

    // Predict next sprint capacity
    $suggestedCapacity = round($averageCompletedPoints);
    $conservativeCapacity = round($averageCompletedPoints * 0.8);
    $aggressiveCapacity = round($averageCompletedPoints * 1.2);

    echo json_encode([
        'success' => true,
        'data' => [
            'sprints' => $sprints,
            'metrics' => [
                'total_sprints' => $sprintCount,
                'average_velocity' => $averageVelocity,
                'average_completed_points' => $averageCompletedPoints,
                'average_commitment_accuracy' => $averageCommitmentAccuracy,
                'trend' => $trend,
                'predictability_score' => round($predictabilityScore, 1),
                'standard_deviation' => round($stdDev, 2)
            ],
            'predictions' => [
                'suggested_capacity' => $suggestedCapacity,
                'conservative_estimate' => $conservativeCapacity,
                'aggressive_estimate' => $aggressiveCapacity,
                'confidence' => $predictabilityScore > 70 ? 'high' : ($predictabilityScore > 40 ? 'medium' : 'low')
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
