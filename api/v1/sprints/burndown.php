<?php
/**
 * Sprint Burndown Chart API Endpoint
 * Provides burndown data for visualizing sprint progress
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

    $sprintId = $_GET['sprint_id'] ?? null;

    $db = Database::getInstance()->getConnection();

    // If no sprint_id provided, try to get active sprint
    if (!$sprintId) {
        $activeQuery = "
            SELECT id FROM sprints
            WHERE company_id = :company_id
            AND status = 'active'
            AND CURRENT_DATE BETWEEN start_date AND end_date
            ORDER BY start_date DESC
            LIMIT 1
        ";
        $activeStmt = $db->prepare($activeQuery);
        $activeStmt->execute(['company_id' => $companyId]);
        $activeSprint = $activeStmt->fetch(PDO::FETCH_ASSOC);

        if ($activeSprint) {
            $sprintId = $activeSprint['id'];
        } else {
            // Return empty burndown if no active sprint
            echo json_encode([
                'success' => true,
                'data' => null,
                'message' => 'No active sprint found'
            ]);
            exit();
        }
    }

    // Get sprint details
    $sprintQuery = "
        SELECT id, name, start_date, end_date, velocity_points as capacity, status
        FROM sprints
        WHERE id = :sprint_id AND company_id = :company_id
    ";

    $sprintStmt = $db->prepare($sprintQuery);
    $sprintStmt->execute(['sprint_id' => $sprintId, 'company_id' => $companyId]);
    $sprint = $sprintStmt->fetch(PDO::FETCH_ASSOC);

    if (!$sprint) {
        throw new Exception('Sprint not found', 404);
    }

    $startDate = new DateTime($sprint['start_date']);
    $endDate = new DateTime($sprint['end_date']);
    $today = new DateTime();

    // Calculate sprint duration in days
    $sprintDays = $startDate->diff($endDate)->days + 1;

    // Get total story points committed at sprint start
    $totalPointsQuery = "
        SELECT COALESCE(SUM(story_points), 0) as total_points
        FROM tasks
        WHERE company_id = :company_id
        AND sprint_id = :sprint_id
        AND story_points IS NOT NULL
    ";

    $totalStmt = $db->prepare($totalPointsQuery);
    $totalStmt->execute(['company_id' => $companyId, 'sprint_id' => $sprintId]);
    $totalRow = $totalStmt->fetch(PDO::FETCH_ASSOC);
    $totalPoints = (int)$totalRow['total_points'];

    // Generate ideal burndown line
    $idealBurndown = [];
    $pointsPerDay = $sprintDays > 0 ? $totalPoints / $sprintDays : 0;

    for ($day = 0; $day <= $sprintDays; $day++) {
        $date = clone $startDate;
        $date->modify("+{$day} days");

        $idealBurndown[] = [
            'date' => $date->format('Y-m-d'),
            'remaining' => max(0, round($totalPoints - ($pointsPerDay * $day), 2)),
            'day_number' => $day
        ];
    }

    // Get actual burndown data
    $actualBurndown = [];

    // Get tasks completed during the sprint
    $completedQuery = "
        SELECT
            DATE(completed_date) as completion_date,
            SUM(story_points) as points_completed
        FROM tasks
        WHERE company_id = :company_id
        AND sprint_id = :sprint_id
        AND status = 'done'
        AND completed_date IS NOT NULL
        AND story_points IS NOT NULL
        GROUP BY DATE(completed_date)
        ORDER BY completion_date
    ";

    $completedStmt = $db->prepare($completedQuery);
    $completedStmt->execute(['company_id' => $companyId, 'sprint_id' => $sprintId]);

    // Build actual burndown from completed tasks
    $remainingPoints = $totalPoints;
    $completedByDate = [];

    while ($row = $completedStmt->fetch(PDO::FETCH_ASSOC)) {
        $completedByDate[$row['completion_date']] = (int)$row['points_completed'];
    }

    for ($day = 0; $day <= $sprintDays; $day++) {
        $date = clone $startDate;
        $date->modify("+{$day} days");
        $dateStr = $date->format('Y-m-d');

        // Deduct points completed on this date
        if (isset($completedByDate[$dateStr])) {
            $remainingPoints -= $completedByDate[$dateStr];
        }

        // Only show actual data up to today
        if ($date <= $today) {
            $actualBurndown[] = [
                'date' => $dateStr,
                'remaining' => max(0, $remainingPoints),
                'day_number' => $day,
                'points_completed' => $completedByDate[$dateStr] ?? 0
            ];
        }
    }

    // Get current sprint metrics
    $currentPointsQuery = "
        SELECT
            COALESCE(SUM(CASE WHEN status = 'done' THEN story_points ELSE 0 END), 0) as completed_points,
            COALESCE(SUM(CASE WHEN status != 'done' THEN story_points ELSE 0 END), 0) as remaining_points
        FROM tasks
        WHERE company_id = :company_id
        AND sprint_id = :sprint_id
        AND story_points IS NOT NULL
    ";

    $currentStmt = $db->prepare($currentPointsQuery);
    $currentStmt->execute(['company_id' => $companyId, 'sprint_id' => $sprintId]);
    $currentRow = $currentStmt->fetch(PDO::FETCH_ASSOC);

    // Calculate projection
    $daysElapsed = max(0, $startDate->diff($today)->days);
    $daysRemaining = max(0, $today->diff($endDate)->days);

    $completedPoints = (int)$currentRow['completed_points'];
    $remainingPointsCurrent = (int)$currentRow['remaining_points'];

    // Calculate velocity (points per day)
    $velocity = $daysElapsed > 0 ? $completedPoints / $daysElapsed : 0;

    // Project when sprint will be completed at current velocity
    $projectedCompletionDays = $velocity > 0 ? $daysElapsed + ($remainingPointsCurrent / $velocity) : null;

    $onTrack = true;
    $status = 'on_track';

    if ($remainingPointsCurrent > 0) {
        if ($projectedCompletionDays && $projectedCompletionDays > $sprintDays) {
            $onTrack = false;
            $status = 'behind';
        } elseif ($pointsPerDay > 0 && $velocity > $pointsPerDay * 1.2) {
            $status = 'ahead';
        }
    } else {
        $status = 'completed';
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'sprint' => [
                'id' => $sprint['id'],
                'name' => $sprint['name'],
                'start_date' => $sprint['start_date'],
                'end_date' => $sprint['end_date'],
                'capacity' => (int)$sprint['capacity'],
                'total_points' => $totalPoints,
                'duration_days' => $sprintDays
            ],
            'burndown' => [
                'ideal' => $idealBurndown,
                'actual' => $actualBurndown
            ],
            'metrics' => [
                'completed_points' => $completedPoints,
                'remaining_points' => $remainingPointsCurrent,
                'total_points' => $totalPoints,
                'completion_percentage' => $totalPoints > 0 ? round(($completedPoints / $totalPoints) * 100, 1) : 0,
                'velocity' => round($velocity, 2),
                'ideal_velocity' => round($pointsPerDay, 2),
                'days_elapsed' => $daysElapsed,
                'days_remaining' => $daysRemaining,
                'projected_completion_days' => $projectedCompletionDays ? round($projectedCompletionDays, 1) : null,
                'on_track' => $onTrack,
                'status' => $status
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
