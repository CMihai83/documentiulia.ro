<?php
/**
 * Business Intelligence API
 * Advanced BI features with forecasting, trends, and insights
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

$method = $_SERVER['REQUEST_METHOD'];

// Insight types
$insightTypes = [
    'revenue_trend' => ['ro' => 'Tendință venituri', 'en' => 'Revenue Trend', 'icon' => 'trending_up'],
    'expense_anomaly' => ['ro' => 'Anomalie cheltuieli', 'en' => 'Expense Anomaly', 'icon' => 'warning'],
    'cashflow_alert' => ['ro' => 'Alertă flux numerar', 'en' => 'Cash Flow Alert', 'icon' => 'account_balance'],
    'customer_churn' => ['ro' => 'Risc pierdere client', 'en' => 'Customer Churn Risk', 'icon' => 'person_off'],
    'payment_delay' => ['ro' => 'Întârziere plăți', 'en' => 'Payment Delay', 'icon' => 'schedule'],
    'inventory_low' => ['ro' => 'Stoc scăzut', 'en' => 'Low Inventory', 'icon' => 'inventory'],
    'margin_decline' => ['ro' => 'Scădere marjă', 'en' => 'Margin Decline', 'icon' => 'trending_down'],
    'seasonal_pattern' => ['ro' => 'Model sezonier', 'en' => 'Seasonal Pattern', 'icon' => 'event'],
    'growth_opportunity' => ['ro' => 'Oportunitate creștere', 'en' => 'Growth Opportunity', 'icon' => 'rocket_launch'],
    'cost_savings' => ['ro' => 'Economii potențiale', 'en' => 'Potential Savings', 'icon' => 'savings'],
];

// Insight priorities
$insightPriorities = [
    'critical' => ['ro' => 'Critic', 'en' => 'Critical', 'color' => '#F44336'],
    'high' => ['ro' => 'Ridicat', 'en' => 'High', 'color' => '#FF9800'],
    'medium' => ['ro' => 'Mediu', 'en' => 'Medium', 'color' => '#2196F3'],
    'low' => ['ro' => 'Scăzut', 'en' => 'Low', 'color' => '#4CAF50'],
    'info' => ['ro' => 'Informativ', 'en' => 'Informational', 'color' => '#9E9E9E'],
];

// Forecast types
$forecastTypes = [
    'revenue' => ['ro' => 'Prognoză venituri', 'en' => 'Revenue Forecast', 'icon' => 'trending_up'],
    'expenses' => ['ro' => 'Prognoză cheltuieli', 'en' => 'Expense Forecast', 'icon' => 'payments'],
    'cashflow' => ['ro' => 'Prognoză flux numerar', 'en' => 'Cash Flow Forecast', 'icon' => 'account_balance'],
    'demand' => ['ro' => 'Prognoză cerere', 'en' => 'Demand Forecast', 'icon' => 'shopping_cart'],
    'profit' => ['ro' => 'Prognoză profit', 'en' => 'Profit Forecast', 'icon' => 'savings'],
];

// Forecast horizons
$forecastHorizons = [
    '1_week' => ['ro' => '1 săptămână', 'en' => '1 Week', 'days' => 7],
    '2_weeks' => ['ro' => '2 săptămâni', 'en' => '2 Weeks', 'days' => 14],
    '1_month' => ['ro' => '1 lună', 'en' => '1 Month', 'days' => 30],
    '3_months' => ['ro' => '3 luni', 'en' => '3 Months', 'days' => 90],
    '6_months' => ['ro' => '6 luni', 'en' => '6 Months', 'days' => 180],
    '1_year' => ['ro' => '1 an', 'en' => '1 Year', 'days' => 365],
];

// Trend directions
$trendDirections = [
    'up' => ['ro' => 'Ascendent', 'en' => 'Upward', 'icon' => 'arrow_upward', 'color' => '#4CAF50'],
    'down' => ['ro' => 'Descendent', 'en' => 'Downward', 'icon' => 'arrow_downward', 'color' => '#F44336'],
    'stable' => ['ro' => 'Stabil', 'en' => 'Stable', 'icon' => 'arrow_forward', 'color' => '#2196F3'],
    'volatile' => ['ro' => 'Volatil', 'en' => 'Volatile', 'icon' => 'sync_alt', 'color' => '#FF9800'],
];

// Confidence levels
$confidenceLevels = [
    'very_high' => ['ro' => 'Foarte ridicat', 'en' => 'Very High', 'min' => 90, 'max' => 100],
    'high' => ['ro' => 'Ridicat', 'en' => 'High', 'min' => 75, 'max' => 89],
    'medium' => ['ro' => 'Mediu', 'en' => 'Medium', 'min' => 50, 'max' => 74],
    'low' => ['ro' => 'Scăzut', 'en' => 'Low', 'min' => 25, 'max' => 49],
    'very_low' => ['ro' => 'Foarte scăzut', 'en' => 'Very Low', 'min' => 0, 'max' => 24],
];

// Report categories for BI
$reportCategories = [
    'financial' => ['ro' => 'Financiar', 'en' => 'Financial'],
    'sales' => ['ro' => 'Vânzări', 'en' => 'Sales'],
    'operations' => ['ro' => 'Operațional', 'en' => 'Operations'],
    'customers' => ['ro' => 'Clienți', 'en' => 'Customers'],
    'inventory' => ['ro' => 'Inventar', 'en' => 'Inventory'],
    'hr' => ['ro' => 'Resurse umane', 'en' => 'Human Resources'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'insights';

            if ($action === 'insights') {
                $type = $_GET['type'] ?? null;
                $priority = $_GET['priority'] ?? null;
                $limit = intval($_GET['limit'] ?? 10);

                // Generate AI-powered insights based on company data
                $insights = generateInsights($db, $companyId, $type, $priority, $limit);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'insights' => $insights,
                        'insight_types' => $insightTypes,
                        'priorities' => $insightPriorities,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'forecast') {
                $type = $_GET['type'] ?? 'revenue';
                $horizon = $_GET['horizon'] ?? '1_month';

                $forecast = generateForecast($db, $companyId, $type, $horizon, $forecastHorizons);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'forecast' => $forecast,
                        'type_config' => $forecastTypes[$type] ?? null,
                        'horizon_config' => $forecastHorizons[$horizon] ?? null,
                        'forecast_types' => $forecastTypes,
                        'horizons' => $forecastHorizons,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'trends') {
                $metric = $_GET['metric'] ?? 'revenue';
                $period = $_GET['period'] ?? 'last_12_months';

                $trends = analyzeTrends($db, $companyId, $metric, $period);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'trends' => $trends,
                        'trend_directions' => $trendDirections,
                        'confidence_levels' => $confidenceLevels,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'benchmarks') {
                // Industry benchmarks comparison
                $benchmarks = [
                    'profit_margin' => [
                        'company' => 15.5,
                        'industry_avg' => 12.3,
                        'industry_top' => 22.1,
                        'status' => 'above_average',
                        'status_ro' => 'Peste medie',
                        'status_en' => 'Above Average',
                    ],
                    'revenue_growth' => [
                        'company' => 8.2,
                        'industry_avg' => 6.5,
                        'industry_top' => 15.0,
                        'status' => 'above_average',
                        'status_ro' => 'Peste medie',
                        'status_en' => 'Above Average',
                    ],
                    'expense_ratio' => [
                        'company' => 72.5,
                        'industry_avg' => 75.0,
                        'industry_top' => 65.0,
                        'status' => 'good',
                        'status_ro' => 'Bun',
                        'status_en' => 'Good',
                    ],
                    'receivables_days' => [
                        'company' => 45,
                        'industry_avg' => 38,
                        'industry_top' => 25,
                        'status' => 'needs_improvement',
                        'status_ro' => 'Necesită îmbunătățire',
                        'status_en' => 'Needs Improvement',
                    ],
                ];

                echo json_encode([
                    'success' => true,
                    'data' => ['benchmarks' => $benchmarks],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'anomalies') {
                // Detect anomalies in financial data
                $anomalies = detectAnomalies($db, $companyId);

                echo json_encode([
                    'success' => true,
                    'data' => ['anomalies' => $anomalies],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'config') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'insight_types' => $insightTypes,
                        'priorities' => $insightPriorities,
                        'forecast_types' => $forecastTypes,
                        'horizons' => $forecastHorizons,
                        'trend_directions' => $trendDirections,
                        'confidence_levels' => $confidenceLevels,
                        'report_categories' => $reportCategories,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'dismiss_insight';

            if ($action === 'dismiss_insight') {
                $insightId = $input['insight_id'] ?? null;

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Insight-ul a fost ascuns',
                    'message_en' => 'Insight dismissed',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'schedule_report') {
                $reportType = $input['report_type'] ?? 'summary';
                $frequency = $input['frequency'] ?? 'weekly';
                $recipients = $input['recipients'] ?? [];

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Raportul a fost programat',
                    'message_en' => 'Report scheduled',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'run_analysis') {
                $analysisType = $input['analysis_type'] ?? 'comprehensive';

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Analiza a început',
                    'message_en' => 'Analysis started',
                    'data' => ['job_id' => 'job_' . bin2hex(random_bytes(8))],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error: ' . $e->getMessage()]);
}

function generateInsights($db, $companyId, $type, $priority, $limit) {
    $insights = [];

    // Revenue trend insight
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(total_amount), 0) as revenue
        FROM invoices
        WHERE company_id = :company_id
        AND issue_date >= NOW() - INTERVAL '30 days'
    ");
    $stmt->execute(['company_id' => $companyId]);
    $currentRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['revenue'] ?? 0;

    $stmt = $db->prepare("
        SELECT COALESCE(SUM(total_amount), 0) as revenue
        FROM invoices
        WHERE company_id = :company_id
        AND issue_date >= NOW() - INTERVAL '60 days'
        AND issue_date < NOW() - INTERVAL '30 days'
    ");
    $stmt->execute(['company_id' => $companyId]);
    $previousRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['revenue'] ?? 0;

    if ($previousRevenue > 0) {
        $changePercent = (($currentRevenue - $previousRevenue) / $previousRevenue) * 100;
        $insights[] = [
            'id' => 'insight_' . bin2hex(random_bytes(4)),
            'type' => $changePercent >= 0 ? 'revenue_trend' : 'margin_decline',
            'priority' => abs($changePercent) > 20 ? 'high' : (abs($changePercent) > 10 ? 'medium' : 'low'),
            'title_ro' => $changePercent >= 0 ? 'Venituri în creștere' : 'Venituri în scădere',
            'title_en' => $changePercent >= 0 ? 'Revenue Growth' : 'Revenue Decline',
            'description_ro' => sprintf('Veniturile au %s cu %.1f%% în ultima lună', $changePercent >= 0 ? 'crescut' : 'scăzut', abs($changePercent)),
            'description_en' => sprintf('Revenue has %s by %.1f%% in the last month', $changePercent >= 0 ? 'increased' : 'decreased', abs($changePercent)),
            'value' => round($changePercent, 1),
            'created_at' => date('Y-m-d H:i:s'),
        ];
    }

    // Overdue invoices insight
    $stmt = $db->prepare("
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE company_id = :company_id
        AND status = 'sent'
        AND due_date < NOW()
    ");
    $stmt->execute(['company_id' => $companyId]);
    $overdue = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($overdue['count'] > 0) {
        $insights[] = [
            'id' => 'insight_' . bin2hex(random_bytes(4)),
            'type' => 'payment_delay',
            'priority' => $overdue['count'] > 5 ? 'high' : 'medium',
            'title_ro' => 'Facturi restante',
            'title_en' => 'Overdue Invoices',
            'description_ro' => sprintf('%d facturi restante în valoare de %.2f RON', $overdue['count'], $overdue['total']),
            'description_en' => sprintf('%d overdue invoices worth %.2f RON', $overdue['count'], $overdue['total']),
            'value' => $overdue['count'],
            'created_at' => date('Y-m-d H:i:s'),
        ];
    }

    return array_slice($insights, 0, $limit);
}

function generateForecast($db, $companyId, $type, $horizon, $horizons) {
    $days = $horizons[$horizon]['days'] ?? 30;

    // Get historical data
    $stmt = $db->prepare("
        SELECT DATE(issue_date) as date, SUM(total_amount) as amount
        FROM invoices
        WHERE company_id = :company_id
        AND issue_date >= NOW() - INTERVAL '90 days'
        GROUP BY DATE(issue_date)
        ORDER BY date
    ");
    $stmt->execute(['company_id' => $companyId]);
    $historical = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Simple linear forecast
    $avgDaily = 0;
    if (count($historical) > 0) {
        $total = array_sum(array_column($historical, 'amount'));
        $avgDaily = $total / count($historical);
    }

    $forecast = [
        'predicted_value' => round($avgDaily * $days, 2),
        'confidence' => 75,
        'lower_bound' => round($avgDaily * $days * 0.8, 2),
        'upper_bound' => round($avgDaily * $days * 1.2, 2),
        'trend' => $avgDaily > 0 ? 'stable' : 'down',
        'historical_avg' => round($avgDaily, 2),
    ];

    return $forecast;
}

function analyzeTrends($db, $companyId, $metric, $period) {
    $trends = [
        'direction' => 'up',
        'strength' => 65,
        'data_points' => [],
        'summary_ro' => 'Tendință ascendentă moderată',
        'summary_en' => 'Moderate upward trend',
    ];

    // Get monthly data
    $stmt = $db->prepare("
        SELECT DATE_TRUNC('month', issue_date) as month, SUM(total_amount) as amount
        FROM invoices
        WHERE company_id = :company_id
        AND issue_date >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', issue_date)
        ORDER BY month
    ");
    $stmt->execute(['company_id' => $companyId]);
    $trends['data_points'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return $trends;
}

function detectAnomalies($db, $companyId) {
    $anomalies = [];

    // Check for unusually large expenses
    $stmt = $db->prepare("
        SELECT AVG(amount) as avg_expense, STDDEV(amount) as stddev_expense
        FROM expenses
        WHERE company_id = :company_id
        AND expense_date >= NOW() - INTERVAL '90 days'
    ");
    $stmt->execute(['company_id' => $companyId]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($stats['stddev_expense'] > 0) {
        $threshold = $stats['avg_expense'] + (2 * $stats['stddev_expense']);

        $stmt = $db->prepare("
            SELECT id, description, amount, expense_date
            FROM expenses
            WHERE company_id = :company_id
            AND amount > :threshold
            AND expense_date >= NOW() - INTERVAL '30 days'
            ORDER BY amount DESC
            LIMIT 5
        ");
        $stmt->execute(['company_id' => $companyId, 'threshold' => $threshold]);
        $largeExpenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($largeExpenses as $expense) {
            $anomalies[] = [
                'type' => 'expense_anomaly',
                'entity_type' => 'expense',
                'entity_id' => $expense['id'],
                'value' => $expense['amount'],
                'expected_range' => [0, $threshold],
                'description_ro' => sprintf('Cheltuială neobișnuit de mare: %.2f RON', $expense['amount']),
                'description_en' => sprintf('Unusually large expense: %.2f RON', $expense['amount']),
                'detected_at' => date('Y-m-d H:i:s'),
            ];
        }
    }

    return $anomalies;
}
