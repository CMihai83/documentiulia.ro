<?php
/**
 * Predictive Cash Flow Forecast API
 * AI-powered cash flow predictions with scenario modeling
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$forecastDays = intval($_GET['days'] ?? 90);
$scenario = $_GET['scenario'] ?? 'baseline'; // baseline, optimistic, pessimistic
$includeRecurring = filter_var($_GET['include_recurring'] ?? true, FILTER_VALIDATE_BOOLEAN);

$db = getDbConnection();

try {
    // Get current cash position
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(balance), 0) as current_balance
        FROM bank_accounts
        WHERE company_id = :company_id
    ");
    $stmt->execute(['company_id' => $companyId]);
    $currentBalance = floatval($stmt->fetch(PDO::FETCH_ASSOC)['current_balance']);

    // Get historical data for trend analysis (last 6 months)
    $stmt = $db->prepare("
        SELECT
            DATE_TRUNC('week', issue_date) as week,
            SUM(total_amount) as revenue
        FROM invoices
        WHERE company_id = :company_id
        AND issue_date >= NOW() - INTERVAL '6 months'
        AND status IN ('paid', 'sent')
        GROUP BY DATE_TRUNC('week', issue_date)
        ORDER BY week
    ");
    $stmt->execute(['company_id' => $companyId]);
    $revenueHistory = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt = $db->prepare("
        SELECT
            DATE_TRUNC('week', expense_date) as week,
            SUM(amount) as expenses
        FROM expenses
        WHERE company_id = :company_id
        AND expense_date >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('week', expense_date)
        ORDER BY week
    ");
    $stmt->execute(['company_id' => $companyId]);
    $expenseHistory = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate averages and trends
    $avgWeeklyRevenue = count($revenueHistory) > 0
        ? array_sum(array_column($revenueHistory, 'revenue')) / count($revenueHistory)
        : 0;
    $avgWeeklyExpenses = count($expenseHistory) > 0
        ? array_sum(array_column($expenseHistory, 'expenses')) / count($expenseHistory)
        : 0;

    // Calculate revenue trend (linear regression slope)
    $revenueTrend = calculateTrend($revenueHistory, 'revenue');
    $expenseTrend = calculateTrend($expenseHistory, 'expenses');

    // Get pending receivables (expected inflows)
    $stmt = $db->prepare("
        SELECT
            id,
            customer_id,
            invoice_number,
            total_amount,
            due_date,
            CASE
                WHEN due_date <= CURRENT_DATE THEN 0.5  -- Overdue: 50% probability
                WHEN due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 0.8  -- Due soon: 80%
                WHEN due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 0.9  -- Due in month: 90%
                ELSE 0.95  -- Future: 95%
            END as collection_probability
        FROM invoices
        WHERE company_id = :company_id
        AND status = 'pending'
        AND due_date <= CURRENT_DATE + :days * INTERVAL '1 day'
        ORDER BY due_date
    ");
    $stmt->execute(['company_id' => $companyId, 'days' => $forecastDays]);
    $pendingReceivables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get pending payables (expected outflows)
    $stmt = $db->prepare("
        SELECT
            id,
            vendor,
            bill_number,
            amount,
            due_date
        FROM bills
        WHERE company_id = :company_id
        AND status = 'pending'
        AND due_date <= CURRENT_DATE + :days * INTERVAL '1 day'
        ORDER BY due_date
    ");
    $stmt->execute(['company_id' => $companyId, 'days' => $forecastDays]);
    $pendingPayables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get recurring transactions
    $recurringInflows = [];
    $recurringOutflows = [];

    if ($includeRecurring) {
        // Recurring invoices
        $stmt = $db->prepare("
            SELECT
                id,
                customer_id,
                frequency,
                next_date,
                CAST((items::json->0->>'total') AS DECIMAL) as amount
            FROM recurring_invoices
            WHERE company_id = :company_id
            AND status = 'active'
            AND next_date <= CURRENT_DATE + :days * INTERVAL '1 day'
        ");
        $stmt->execute(['company_id' => $companyId, 'days' => $forecastDays]);
        $recurringInflows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Recurring expenses (subscriptions, rent, etc.)
        $stmt = $db->prepare("
            SELECT
                category,
                vendor,
                AVG(amount) as avg_amount,
                MODE() WITHIN GROUP (ORDER BY EXTRACT(DAY FROM expense_date)) as typical_day
            FROM expenses
            WHERE company_id = :company_id
            AND expense_date >= NOW() - INTERVAL '3 months'
            AND category IN ('rent', 'utilities', 'software', 'insurance')
            GROUP BY category, vendor
            HAVING COUNT(*) >= 2
        ");
        $stmt->execute(['company_id' => $companyId]);
        $recurringOutflows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Apply scenario adjustments
    $scenarioMultipliers = [
        'optimistic' => ['revenue' => 1.15, 'expenses' => 0.95, 'collection' => 1.1],
        'baseline' => ['revenue' => 1.0, 'expenses' => 1.0, 'collection' => 1.0],
        'pessimistic' => ['revenue' => 0.85, 'expenses' => 1.1, 'collection' => 0.8],
    ];
    $multiplier = $scenarioMultipliers[$scenario] ?? $scenarioMultipliers['baseline'];

    // Generate daily forecast
    $forecast = [];
    $balance = $currentBalance;
    $today = new DateTime();

    for ($day = 0; $day <= $forecastDays; $day++) {
        $date = (clone $today)->modify("+$day days");
        $dateStr = $date->format('Y-m-d');

        $dayInflows = 0;
        $dayOutflows = 0;
        $events = [];

        // Expected collections
        foreach ($pendingReceivables as $inv) {
            if ($inv['due_date'] === $dateStr) {
                $expectedAmount = floatval($inv['total_amount']) * floatval($inv['collection_probability']) * $multiplier['collection'];
                $dayInflows += $expectedAmount;
                $events[] = [
                    'type' => 'receivable',
                    'description' => 'Factură ' . $inv['invoice_number'],
                    'amount' => round($expectedAmount, 2),
                    'probability' => floatval($inv['collection_probability']) * 100,
                ];
            }
        }

        // Expected payments
        foreach ($pendingPayables as $bill) {
            if ($bill['due_date'] === $dateStr) {
                $dayOutflows += floatval($bill['amount']) * $multiplier['expenses'];
                $events[] = [
                    'type' => 'payable',
                    'description' => $bill['vendor'] . ' - ' . $bill['bill_number'],
                    'amount' => -floatval($bill['amount']),
                ];
            }
        }

        // Projected regular business (based on trends)
        if ($day % 7 === 0 && $day > 0) { // Weekly projections
            $projectedRevenue = ($avgWeeklyRevenue + $revenueTrend * ($day / 7)) * $multiplier['revenue'];
            $projectedExpenses = ($avgWeeklyExpenses + $expenseTrend * ($day / 7)) * $multiplier['expenses'];

            $dayInflows += $projectedRevenue / 7;
            $dayOutflows += $projectedExpenses / 7;
        }

        $balance += $dayInflows - $dayOutflows;

        $forecast[] = [
            'date' => $dateStr,
            'day_of_week' => $date->format('l'),
            'inflows' => round($dayInflows, 2),
            'outflows' => round($dayOutflows, 2),
            'net' => round($dayInflows - $dayOutflows, 2),
            'balance' => round($balance, 2),
            'events' => $events,
        ];
    }

    // Calculate summary metrics
    $totalInflows = array_sum(array_column($forecast, 'inflows'));
    $totalOutflows = array_sum(array_column($forecast, 'outflows'));
    $minBalance = min(array_column($forecast, 'balance'));
    $maxBalance = max(array_column($forecast, 'balance'));
    $endBalance = $forecast[count($forecast) - 1]['balance'];

    // Generate alerts
    $alerts = [];
    $lowBalanceThreshold = $avgWeeklyExpenses * 2; // 2 weeks of expenses

    foreach ($forecast as $f) {
        if ($f['balance'] < 0) {
            $alerts[] = [
                'type' => 'critical',
                'date' => $f['date'],
                'message_ro' => 'Sold negativ prevăzut: ' . number_format($f['balance'], 2) . ' lei',
                'message_en' => 'Negative balance predicted: ' . number_format($f['balance'], 2) . ' lei',
            ];
            break; // Only first critical alert
        } elseif ($f['balance'] < $lowBalanceThreshold && empty(array_filter($alerts, fn($a) => $a['type'] === 'warning'))) {
            $alerts[] = [
                'type' => 'warning',
                'date' => $f['date'],
                'message_ro' => 'Sold scăzut prevăzut: ' . number_format($f['balance'], 2) . ' lei',
                'message_en' => 'Low balance predicted: ' . number_format($f['balance'], 2) . ' lei',
            ];
        }
    }

    // Generate recommendations
    $recommendations = generateCashFlowRecommendations($forecast, $pendingReceivables, $avgWeeklyExpenses);

    echo json_encode([
        'success' => true,
        'data' => [
            'forecast_period' => [
                'start' => $today->format('Y-m-d'),
                'end' => (clone $today)->modify("+$forecastDays days")->format('Y-m-d'),
                'days' => $forecastDays,
            ],
            'scenario' => $scenario,
            'current_balance' => round($currentBalance, 2),
            'summary' => [
                'total_inflows' => round($totalInflows, 2),
                'total_outflows' => round($totalOutflows, 2),
                'net_change' => round($totalInflows - $totalOutflows, 2),
                'min_balance' => round($minBalance, 2),
                'max_balance' => round($maxBalance, 2),
                'end_balance' => round($endBalance, 2),
            ],
            'daily_forecast' => $forecast,
            'pending_receivables' => $pendingReceivables,
            'pending_payables' => $pendingPayables,
            'alerts' => $alerts,
            'recommendations' => $recommendations,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Forecast generation failed: ' . $e->getMessage()]);
}

// Helper functions
function calculateTrend(array $data, string $field): float {
    if (count($data) < 3) return 0;

    $n = count($data);
    $sumX = 0;
    $sumY = 0;
    $sumXY = 0;
    $sumX2 = 0;

    foreach ($data as $i => $row) {
        $x = $i;
        $y = floatval($row[$field]);
        $sumX += $x;
        $sumY += $y;
        $sumXY += $x * $y;
        $sumX2 += $x * $x;
    }

    $denominator = ($n * $sumX2 - $sumX * $sumX);
    if ($denominator == 0) return 0;

    return ($n * $sumXY - $sumX * $sumY) / $denominator;
}

function generateCashFlowRecommendations(array $forecast, array $receivables, float $avgExpenses): array {
    $recommendations = [];

    // Check for overdue receivables
    $overdueReceivables = array_filter($receivables, function($r) {
        return $r['due_date'] < date('Y-m-d');
    });

    if (count($overdueReceivables) > 0) {
        $overdueTotal = array_sum(array_column($overdueReceivables, 'total_amount'));
        $recommendations[] = [
            'type' => 'collection',
            'priority' => 'high',
            'message_ro' => 'Aveți ' . count($overdueReceivables) . ' facturi restante în valoare de ' . number_format($overdueTotal, 2) . ' lei. Contactați clienții pentru încasare.',
            'message_en' => 'You have ' . count($overdueReceivables) . ' overdue invoices worth ' . number_format($overdueTotal, 2) . ' lei. Contact clients for collection.',
        ];
    }

    // Check if balance will drop significantly
    $minBalance = min(array_column($forecast, 'balance'));
    if ($minBalance < $avgExpenses) {
        $recommendations[] = [
            'type' => 'liquidity',
            'priority' => 'high',
            'message_ro' => 'Lichiditatea prevăzută este scăzută. Considerați o linie de credit sau accelerarea încasărilor.',
            'message_en' => 'Predicted liquidity is low. Consider a credit line or accelerating collections.',
        ];
    }

    // Expense optimization
    $totalOutflows = array_sum(array_column($forecast, 'outflows'));
    if ($totalOutflows > array_sum(array_column($forecast, 'inflows')) * 0.9) {
        $recommendations[] = [
            'type' => 'expense',
            'priority' => 'medium',
            'message_ro' => 'Cheltuielile sunt aproape de nivelul veniturilor. Revizuiți costurile pentru a îmbunătăți marja.',
            'message_en' => 'Expenses are close to revenue level. Review costs to improve margin.',
        ];
    }

    return $recommendations;
}
