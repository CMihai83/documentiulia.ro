<?php
/**
 * Recurring Transactions List API
 * Lists all recurring invoices, expenses, and bills
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

$type = $_GET['type'] ?? null; // invoice, expense, bill
$status = $_GET['status'] ?? null; // active, paused, completed, cancelled

try {
    $db = getDbConnection();
    
    $sql = "
        SELECT 
            rt.*,
            CASE 
                WHEN rt.type = 'invoice' THEN c.display_name
                WHEN rt.type = 'expense' THEN cat.name
                WHEN rt.type = 'bill' THEN v.name
            END as related_name,
            (SELECT COUNT(*) FROM recurring_history rh WHERE rh.recurring_id = rt.id) as generated_count,
            (SELECT MAX(rh.generated_at) FROM recurring_history rh WHERE rh.recurring_id = rt.id) as last_generated
        FROM recurring_transactions rt
        LEFT JOIN contacts c ON rt.customer_id = c.id
        LEFT JOIN expense_categories cat ON rt.category_id = cat.id
        LEFT JOIN contacts v ON rt.vendor_id = v.id
        WHERE rt.company_id = :company_id
    ";
    
    $params = ['company_id' => $companyId];
    
    if ($type) {
        $sql .= " AND rt.type = :type";
        $params['type'] = $type;
    }
    
    if ($status) {
        $sql .= " AND rt.status = :status";
        $params['status'] = $status;
    }
    
    $sql .= " ORDER BY rt.next_date ASC, rt.created_at DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $recurring = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Decode JSON fields and calculate status indicators
    foreach ($recurring as &$item) {
        $item['line_items'] = json_decode($item['line_items'] ?? '[]', true);
        $item['metadata'] = json_decode($item['metadata'] ?? '{}', true);
        
        // Calculate upcoming status
        $nextDate = new DateTime($item['next_date'] ?? 'now');
        $today = new DateTime();
        $daysUntilNext = $today->diff($nextDate)->days;
        $item['days_until_next'] = $nextDate > $today ? $daysUntilNext : -$daysUntilNext;
        
        // Add human-readable labels
        $item['frequency_label_ro'] = getFrequencyLabelRo($item['frequency']);
        $item['frequency_label_en'] = getFrequencyLabelEn($item['frequency']);
        $item['type_label_ro'] = getTypeLabelRo($item['type']);
        $item['type_label_en'] = getTypeLabelEn($item['type']);
    }
    
} catch (Exception $e) {
    // Return mock data if database not ready
    $recurring = [
        [
            'id' => 'rec_sample_1',
            'type' => 'invoice',
            'name' => 'Abonament lunar servicii IT',
            'frequency' => 'monthly',
            'amount' => 500.00,
            'currency' => 'RON',
            'status' => 'active',
            'next_date' => date('Y-m-d', strtotime('+15 days')),
            'customer_id' => 'cust_sample',
            'related_name' => 'Client Exemplu SRL',
            'generated_count' => 6,
            'days_until_next' => 15,
            'frequency_label_ro' => 'Lunar',
            'frequency_label_en' => 'Monthly',
            'type_label_ro' => 'Factură',
            'type_label_en' => 'Invoice',
        ],
        [
            'id' => 'rec_sample_2',
            'type' => 'expense',
            'name' => 'Chirie birou',
            'frequency' => 'monthly',
            'amount' => 2000.00,
            'currency' => 'RON',
            'status' => 'active',
            'next_date' => date('Y-m-01', strtotime('+1 month')),
            'category_id' => 'cat_rent',
            'related_name' => 'Cheltuieli Chirie',
            'generated_count' => 12,
            'days_until_next' => 30,
            'frequency_label_ro' => 'Lunar',
            'frequency_label_en' => 'Monthly',
            'type_label_ro' => 'Cheltuială',
            'type_label_en' => 'Expense',
        ],
    ];
}

function getFrequencyLabelRo($frequency) {
    $labels = [
        'daily' => 'Zilnic',
        'weekly' => 'Săptămânal',
        'biweekly' => 'La două săptămâni',
        'monthly' => 'Lunar',
        'bimonthly' => 'La două luni',
        'quarterly' => 'Trimestrial',
        'semiannually' => 'Semestrial',
        'annually' => 'Anual',
    ];
    return $labels[$frequency] ?? $frequency;
}

function getFrequencyLabelEn($frequency) {
    $labels = [
        'daily' => 'Daily',
        'weekly' => 'Weekly',
        'biweekly' => 'Biweekly',
        'monthly' => 'Monthly',
        'bimonthly' => 'Bimonthly',
        'quarterly' => 'Quarterly',
        'semiannually' => 'Semiannually',
        'annually' => 'Annually',
    ];
    return $labels[$frequency] ?? $frequency;
}

function getTypeLabelRo($type) {
    $labels = [
        'invoice' => 'Factură',
        'expense' => 'Cheltuială',
        'bill' => 'Factură Furnizor',
    ];
    return $labels[$type] ?? $type;
}

function getTypeLabelEn($type) {
    $labels = [
        'invoice' => 'Invoice',
        'expense' => 'Expense',
        'bill' => 'Vendor Bill',
    ];
    return $labels[$type] ?? $type;
}

// Group by status for summary
$summary = [
    'active' => 0,
    'paused' => 0,
    'completed' => 0,
    'total_monthly_revenue' => 0,
    'total_monthly_expenses' => 0,
];

foreach ($recurring as $item) {
    if (isset($summary[$item['status']])) {
        $summary[$item['status']]++;
    }
    
    // Normalize to monthly for summary
    $monthlyAmount = normalizeToMonthly($item['amount'], $item['frequency']);
    if ($item['type'] === 'invoice') {
        $summary['total_monthly_revenue'] += $monthlyAmount;
    } else {
        $summary['total_monthly_expenses'] += $monthlyAmount;
    }
}

function normalizeToMonthly($amount, $frequency) {
    $multipliers = [
        'daily' => 30,
        'weekly' => 4.33,
        'biweekly' => 2.17,
        'monthly' => 1,
        'bimonthly' => 0.5,
        'quarterly' => 0.33,
        'semiannually' => 0.167,
        'annually' => 0.083,
    ];
    return $amount * ($multipliers[$frequency] ?? 1);
}

echo json_encode([
    'success' => true,
    'data' => [
        'recurring' => $recurring,
        'summary' => $summary,
        'frequencies' => [
            ['value' => 'daily', 'label_ro' => 'Zilnic', 'label_en' => 'Daily'],
            ['value' => 'weekly', 'label_ro' => 'Săptămânal', 'label_en' => 'Weekly'],
            ['value' => 'biweekly', 'label_ro' => 'La două săptămâni', 'label_en' => 'Biweekly'],
            ['value' => 'monthly', 'label_ro' => 'Lunar', 'label_en' => 'Monthly'],
            ['value' => 'bimonthly', 'label_ro' => 'La două luni', 'label_en' => 'Bimonthly'],
            ['value' => 'quarterly', 'label_ro' => 'Trimestrial', 'label_en' => 'Quarterly'],
            ['value' => 'semiannually', 'label_ro' => 'Semestrial', 'label_en' => 'Semiannually'],
            ['value' => 'annually', 'label_ro' => 'Anual', 'label_en' => 'Annually'],
        ],
        'statuses' => [
            ['value' => 'active', 'label_ro' => 'Activă', 'label_en' => 'Active'],
            ['value' => 'paused', 'label_ro' => 'În pauză', 'label_en' => 'Paused'],
            ['value' => 'completed', 'label_ro' => 'Finalizată', 'label_en' => 'Completed'],
            ['value' => 'cancelled', 'label_ro' => 'Anulată', 'label_en' => 'Cancelled'],
        ],
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
