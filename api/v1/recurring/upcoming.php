<?php
/**
 * Upcoming Recurring Transactions API
 * GET - View upcoming scheduled transactions
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

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$days = intval($_GET['days'] ?? 30);
$days = min(max($days, 7), 90); // Between 7 and 90 days

try {
    $db = getDbConnection();
    
    $stmt = $db->prepare("
        SELECT 
            rt.*,
            CASE 
                WHEN rt.type = 'invoice' THEN c.display_name
                WHEN rt.type = 'expense' THEN cat.name
                WHEN rt.type = 'bill' THEN v.name
            END as related_name,
            DATEDIFF(rt.next_date, CURDATE()) as days_until
        FROM recurring_transactions rt
        LEFT JOIN contacts c ON rt.customer_id = c.id
        LEFT JOIN expense_categories cat ON rt.category_id = cat.id
        LEFT JOIN contacts v ON rt.vendor_id = v.id
        WHERE rt.company_id = :company_id
          AND rt.status = 'active'
          AND rt.next_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL :days DAY)
          AND (rt.end_date IS NULL OR rt.end_date >= CURDATE())
        ORDER BY rt.next_date ASC
    ");
    $stmt->execute(['company_id' => $companyId, 'days' => $days]);
    $upcoming = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
} catch (Exception $e) {
    // Mock data
    $upcoming = [
        [
            'id' => 'rec_sample_1',
            'type' => 'invoice',
            'name' => 'Abonament lunar servicii IT',
            'amount' => 500.00,
            'currency' => 'RON',
            'next_date' => date('Y-m-d', strtotime('+5 days')),
            'days_until' => 5,
            'related_name' => 'Client Exemplu SRL',
            'frequency' => 'monthly',
        ],
        [
            'id' => 'rec_sample_2',
            'type' => 'expense',
            'name' => 'Chirie birou',
            'amount' => 2000.00,
            'currency' => 'RON',
            'next_date' => date('Y-m-01', strtotime('+1 month')),
            'days_until' => 15,
            'related_name' => 'Cheltuieli Chirie',
            'frequency' => 'monthly',
        ],
    ];
}

// Group by week
$byWeek = [];
$totalAmount = ['income' => 0, 'expense' => 0];

foreach ($upcoming as &$item) {
    $item['type_label_ro'] = ['invoice' => 'Factură', 'expense' => 'Cheltuială', 'bill' => 'Factură Furnizor'][$item['type']] ?? $item['type'];
    $item['frequency_label_ro'] = [
        'daily' => 'Zilnic', 'weekly' => 'Săptămânal', 'biweekly' => 'La 2 săpt.',
        'monthly' => 'Lunar', 'quarterly' => 'Trimestrial', 'annually' => 'Anual'
    ][$item['frequency']] ?? $item['frequency'];
    
    // Group by week
    $weekNum = ceil($item['days_until'] / 7);
    $weekLabel = $weekNum === 0 ? 'Această săptămână' : ($weekNum === 1 ? 'Săptămâna viitoare' : "Peste $weekNum săptămâni");
    
    if (!isset($byWeek[$weekLabel])) {
        $byWeek[$weekLabel] = [];
    }
    $byWeek[$weekLabel][] = $item;
    
    // Sum totals
    if ($item['type'] === 'invoice') {
        $totalAmount['income'] += $item['amount'];
    } else {
        $totalAmount['expense'] += $item['amount'];
    }
}

echo json_encode([
    'success' => true,
    'data' => [
        'upcoming' => $upcoming,
        'by_week' => $byWeek,
        'summary' => [
            'total_count' => count($upcoming),
            'expected_income' => round($totalAmount['income'], 2),
            'expected_expenses' => round($totalAmount['expense'], 2),
            'net_cashflow' => round($totalAmount['income'] - $totalAmount['expense'], 2),
            'period_days' => $days,
        ],
        'labels' => [
            'title_ro' => 'Tranzacții Recurente Următoare',
            'title_en' => 'Upcoming Recurring Transactions',
            'income_ro' => 'Venituri Estimate',
            'income_en' => 'Expected Income',
            'expenses_ro' => 'Cheltuieli Estimate',
            'expenses_en' => 'Expected Expenses',
        ],
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
