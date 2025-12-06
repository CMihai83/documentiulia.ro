<?php
/**
 * Activity Statistics API
 * Analytics and statistics for activity data
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Stats are for admins and managers
if (!in_array($user['role'], ['admin', 'manager'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Nu aveți permisiunea de a vizualiza statisticile',
        'error' => 'You do not have permission to view statistics'
    ]);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

try {
    $db = getDbConnection();

    $period = $_GET['period'] ?? '30d'; // 7d, 30d, 90d, 1y
    $userId = $_GET['user_id'] ?? null;

    // Calculate date range
    $dateRanges = [
        '7d' => 7,
        '30d' => 30,
        '90d' => 90,
        '1y' => 365,
    ];
    $days = $dateRanges[$period] ?? 30;
    $startDate = date('Y-m-d', strtotime("-$days days"));

    // Build base query conditions
    $baseCondition = "company_id = :company_id AND created_at >= :start_date";
    $baseParams = ['company_id' => $companyId, 'start_date' => $startDate];

    if ($userId) {
        $baseCondition .= " AND user_id = :user_id";
        $baseParams['user_id'] = $userId;
    }

    // 1. Activity count by type
    $byTypeStmt = $db->prepare("
        SELECT activity_type, COUNT(*) as count
        FROM activity_logs
        WHERE $baseCondition
        GROUP BY activity_type
        ORDER BY count DESC
    ");
    $byTypeStmt->execute($baseParams);
    $byType = $byTypeStmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Activity count by entity
    $byEntityStmt = $db->prepare("
        SELECT entity_type, COUNT(*) as count
        FROM activity_logs
        WHERE $baseCondition
        GROUP BY entity_type
        ORDER BY count DESC
    ");
    $byEntityStmt->execute($baseParams);
    $byEntity = $byEntityStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Activity by day (trend)
    $byDayStmt = $db->prepare("
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM activity_logs
        WHERE $baseCondition
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ");
    $byDayStmt->execute($baseParams);
    $byDay = $byDayStmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Activity by hour (heatmap data)
    $byHourStmt = $db->prepare("
        SELECT HOUR(created_at) as hour, DAYOFWEEK(created_at) as day_of_week, COUNT(*) as count
        FROM activity_logs
        WHERE $baseCondition
        GROUP BY HOUR(created_at), DAYOFWEEK(created_at)
    ");
    $byHourStmt->execute($baseParams);
    $byHour = $byHourStmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Most active users
    $topUsersStmt = $db->prepare("
        SELECT
            a.user_id,
            u.first_name,
            u.last_name,
            u.email,
            u.avatar_url,
            COUNT(*) as activity_count
        FROM activity_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.$baseCondition
        GROUP BY a.user_id, u.first_name, u.last_name, u.email, u.avatar_url
        ORDER BY activity_count DESC
        LIMIT 10
    ");
    $topUsersStmt->execute($baseParams);
    $topUsers = $topUsersStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($topUsers as &$u) {
        $u['name'] = trim(($u['first_name'] ?? '') . ' ' . ($u['last_name'] ?? ''));
    }

    // 6. Recent activity summary
    $recentStmt = $db->prepare("
        SELECT
            activity_type,
            entity_type,
            COUNT(*) as count
        FROM activity_logs
        WHERE company_id = :company_id
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY activity_type, entity_type
        ORDER BY count DESC
        LIMIT 20
    ");
    $recentStmt->execute(['company_id' => $companyId]);
    $recent24h = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    // 7. Calculate totals and comparisons
    $currentTotal = array_sum(array_column($byType, 'count'));

    // Previous period for comparison
    $prevStartDate = date('Y-m-d', strtotime("-" . ($days * 2) . " days"));
    $prevEndDate = date('Y-m-d', strtotime("-$days days"));
    $prevStmt = $db->prepare("
        SELECT COUNT(*) FROM activity_logs
        WHERE company_id = :company_id
        AND created_at >= :start_date AND created_at < :end_date
    ");
    $prevStmt->execute([
        'company_id' => $companyId,
        'start_date' => $prevStartDate,
        'end_date' => $prevEndDate,
    ]);
    $previousTotal = $prevStmt->fetchColumn();

    $percentChange = $previousTotal > 0
        ? round((($currentTotal - $previousTotal) / $previousTotal) * 100, 1)
        : 0;

    // Day names for heatmap
    $dayNames = [
        1 => ['ro' => 'Duminică', 'en' => 'Sunday'],
        2 => ['ro' => 'Luni', 'en' => 'Monday'],
        3 => ['ro' => 'Marți', 'en' => 'Tuesday'],
        4 => ['ro' => 'Miercuri', 'en' => 'Wednesday'],
        5 => ['ro' => 'Joi', 'en' => 'Thursday'],
        6 => ['ro' => 'Vineri', 'en' => 'Friday'],
        7 => ['ro' => 'Sâmbătă', 'en' => 'Saturday'],
    ];

    echo json_encode([
        'success' => true,
        'data' => [
            'period' => $period,
            'start_date' => $startDate,
            'summary' => [
                'total_activities' => $currentTotal,
                'previous_period_total' => $previousTotal,
                'percent_change' => $percentChange,
                'trend' => $percentChange > 0 ? 'up' : ($percentChange < 0 ? 'down' : 'stable'),
            ],
            'by_type' => $byType,
            'by_entity' => $byEntity,
            'by_day' => $byDay,
            'by_hour' => $byHour,
            'top_users' => $topUsers,
            'recent_24h' => $recent24h,
            'day_names' => $dayNames,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
