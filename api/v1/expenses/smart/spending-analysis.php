<?php
/**
 * Spending Analysis API
 * Provides intelligent spending insights and trends
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$period = $_GET['period'] ?? 'month'; // month, quarter, year
$compareWith = $_GET['compare'] ?? 'previous'; // previous, same_last_year

$db = getDbConnection();

try {
    // Calculate date ranges
    $now = new DateTime();
    switch ($period) {
        case 'quarter':
            $startDate = (clone $now)->modify('first day of -3 months')->format('Y-m-d');
            $prevStart = (clone $now)->modify('first day of -6 months')->format('Y-m-d');
            $prevEnd = (clone $now)->modify('first day of -3 months')->modify('-1 day')->format('Y-m-d');
            break;
        case 'year':
            $startDate = (clone $now)->modify('first day of January')->format('Y-m-d');
            $prevStart = (clone $now)->modify('-1 year')->modify('first day of January')->format('Y-m-d');
            $prevEnd = (clone $now)->modify('-1 year')->modify('last day of December')->format('Y-m-d');
            break;
        default: // month
            $startDate = (clone $now)->modify('first day of this month')->format('Y-m-d');
            $prevStart = (clone $now)->modify('first day of last month')->format('Y-m-d');
            $prevEnd = (clone $now)->modify('last day of last month')->format('Y-m-d');
    }
    $endDate = $now->format('Y-m-d');

    // 1. Total spending current vs previous
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE company_id = :company_id AND expense_date BETWEEN :start AND :end
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $startDate, 'end' => $endDate]);
    $currentTotal = floatval($stmt->fetch(PDO::FETCH_ASSOC)['total']);

    $stmt->execute(['company_id' => $companyId, 'start' => $prevStart, 'end' => $prevEnd]);
    $previousTotal = floatval($stmt->fetch(PDO::FETCH_ASSOC)['total']);

    $changePercent = $previousTotal > 0 ? (($currentTotal - $previousTotal) / $previousTotal) * 100 : 0;

    // 2. Spending by category
    $stmt = $db->prepare("
        SELECT
            category,
            SUM(amount) as total,
            COUNT(*) as count,
            AVG(amount) as average
        FROM expenses
        WHERE company_id = :company_id AND expense_date BETWEEN :start AND :end
        GROUP BY category
        ORDER BY total DESC
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $startDate, 'end' => $endDate]);
    $byCategory = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Top vendors
    $stmt = $db->prepare("
        SELECT
            vendor,
            SUM(amount) as total,
            COUNT(*) as count
        FROM expenses
        WHERE company_id = :company_id AND expense_date BETWEEN :start AND :end AND vendor IS NOT NULL
        GROUP BY vendor
        ORDER BY total DESC
        LIMIT 10
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $startDate, 'end' => $endDate]);
    $topVendors = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Daily spending trend
    $stmt = $db->prepare("
        SELECT
            expense_date as date,
            SUM(amount) as total,
            COUNT(*) as count
        FROM expenses
        WHERE company_id = :company_id AND expense_date BETWEEN :start AND :end
        GROUP BY expense_date
        ORDER BY expense_date
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $startDate, 'end' => $endDate]);
    $dailyTrend = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Unusual expenses (anomalies)
    $stmt = $db->prepare("
        SELECT AVG(amount) as avg_amount FROM expenses
        WHERE company_id = :company_id AND expense_date >= :start
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => date('Y-m-d', strtotime('-6 months'))]);
    $avgAmount = floatval($stmt->fetch(PDO::FETCH_ASSOC)['avg_amount']);

    $stmt = $db->prepare("
        SELECT id, description, vendor, amount, expense_date, category
        FROM expenses
        WHERE company_id = :company_id
        AND expense_date BETWEEN :start AND :end
        AND amount > :threshold
        ORDER BY amount DESC
        LIMIT 5
    ");
    $stmt->execute([
        'company_id' => $companyId,
        'start' => $startDate,
        'end' => $endDate,
        'threshold' => $avgAmount * 3,
    ]);
    $anomalies = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. Budget alerts (if budgets are set)
    $budgetAlerts = [];
    $stmt = $db->prepare("
        SELECT category, budget_amount
        FROM category_budgets
        WHERE company_id = :company_id AND period = :period
    ");
    $stmt->execute(['company_id' => $companyId, 'period' => $period]);
    $budgets = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($budgets as $budget) {
        foreach ($byCategory as $cat) {
            if ($cat['category'] === $budget['category']) {
                $spent = floatval($cat['total']);
                $budgetAmount = floatval($budget['budget_amount']);
                if ($spent > $budgetAmount * 0.8) {
                    $budgetAlerts[] = [
                        'category' => $budget['category'],
                        'budget' => $budgetAmount,
                        'spent' => $spent,
                        'percent' => round(($spent / $budgetAmount) * 100, 1),
                        'status' => $spent > $budgetAmount ? 'exceeded' : 'warning',
                    ];
                }
            }
        }
    }

    // Generate insights
    $insights = generateSpendingInsights($currentTotal, $previousTotal, $byCategory, $anomalies, $budgetAlerts);

    echo json_encode([
        'success' => true,
        'data' => [
            'period' => [
                'type' => $period,
                'start' => $startDate,
                'end' => $endDate,
            ],
            'summary' => [
                'current_total' => round($currentTotal, 2),
                'previous_total' => round($previousTotal, 2),
                'change_percent' => round($changePercent, 1),
                'change_direction' => $changePercent >= 0 ? 'up' : 'down',
            ],
            'by_category' => $byCategory,
            'top_vendors' => $topVendors,
            'daily_trend' => $dailyTrend,
            'anomalies' => $anomalies,
            'budget_alerts' => $budgetAlerts,
            'insights' => $insights,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function generateSpendingInsights(float $current, float $previous, array $categories, array $anomalies, array $budgetAlerts): array {
    $insights = [];

    // Spending change insight
    $changePercent = $previous > 0 ? (($current - $previous) / $previous) * 100 : 0;
    if (abs($changePercent) > 20) {
        $direction = $changePercent > 0 ? 'crescut' : 'scăzut';
        $insights[] = [
            'type' => 'spending_change',
            'priority' => abs($changePercent) > 50 ? 'high' : 'medium',
            'message_ro' => "Cheltuielile au $direction cu " . abs(round($changePercent, 1)) . "% față de perioada anterioară.",
            'message_en' => "Spending has " . ($changePercent > 0 ? 'increased' : 'decreased') . " by " . abs(round($changePercent, 1)) . "% compared to the previous period.",
        ];
    }

    // Top category insight
    if (!empty($categories)) {
        $topCat = $categories[0];
        $totalSpent = array_sum(array_column($categories, 'total'));
        $topPercent = $totalSpent > 0 ? (floatval($topCat['total']) / $totalSpent) * 100 : 0;
        if ($topPercent > 40) {
            $insights[] = [
                'type' => 'category_concentration',
                'priority' => 'medium',
                'message_ro' => "Categoria \"{$topCat['category']}\" reprezintă " . round($topPercent, 1) . "% din cheltuieli. Considerați diversificarea.",
                'message_en' => "Category \"{$topCat['category']}\" accounts for " . round($topPercent, 1) . "% of expenses. Consider diversifying.",
            ];
        }
    }

    // Anomaly insight
    if (count($anomalies) > 0) {
        $insights[] = [
            'type' => 'anomalies',
            'priority' => 'medium',
            'message_ro' => "S-au detectat " . count($anomalies) . " cheltuieli neobișnuit de mari. Verificați dacă sunt corecte.",
            'message_en' => count($anomalies) . " unusually large expenses detected. Please verify they are correct.",
        ];
    }

    // Budget alerts insight
    foreach ($budgetAlerts as $alert) {
        $insights[] = [
            'type' => 'budget_alert',
            'priority' => $alert['status'] === 'exceeded' ? 'high' : 'medium',
            'message_ro' => $alert['status'] === 'exceeded'
                ? "Bugetul pentru \"{$alert['category']}\" a fost depășit ({$alert['percent']}%)."
                : "Bugetul pentru \"{$alert['category']}\" este aproape de limită ({$alert['percent']}%).",
            'message_en' => $alert['status'] === 'exceeded'
                ? "Budget for \"{$alert['category']}\" has been exceeded ({$alert['percent']}%)."
                : "Budget for \"{$alert['category']}\" is nearing the limit ({$alert['percent']}%).",
        ];
    }

    // Sort by priority
    usort($insights, function($a, $b) {
        $priority = ['high' => 0, 'medium' => 1, 'low' => 2];
        return ($priority[$a['priority']] ?? 2) - ($priority[$b['priority']] ?? 2);
    });

    return $insights;
}
