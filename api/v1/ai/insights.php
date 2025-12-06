<?php
/**
 * AI Financial Insights API
 * Provides intelligent analysis and recommendations
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

$insightType = $_GET['type'] ?? 'all';
$period = $_GET['period'] ?? 'month'; // month, quarter, year

$db = getDbConnection();
$insights = [];

// Get date ranges
$now = new DateTime();
switch ($period) {
    case 'quarter':
        $startDate = (clone $now)->modify('first day of -3 months')->format('Y-m-d');
        $previousStart = (clone $now)->modify('first day of -6 months')->format('Y-m-d');
        $previousEnd = (clone $now)->modify('first day of -3 months')->modify('-1 day')->format('Y-m-d');
        break;
    case 'year':
        $startDate = (clone $now)->modify('first day of January')->format('Y-m-d');
        $previousStart = (clone $now)->modify('-1 year')->modify('first day of January')->format('Y-m-d');
        $previousEnd = (clone $now)->modify('-1 year')->modify('last day of December')->format('Y-m-d');
        break;
    default: // month
        $startDate = (clone $now)->modify('first day of this month')->format('Y-m-d');
        $previousStart = (clone $now)->modify('first day of last month')->format('Y-m-d');
        $previousEnd = (clone $now)->modify('last day of last month')->format('Y-m-d');
}

try {
    // 1. Cash Flow Analysis
    if ($insightType === 'all' || $insightType === 'cashflow') {
        // Current period income
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(total_amount), 0) as income
            FROM invoices
            WHERE company_id = :company_id AND status = 'paid' AND issue_date >= :start_date
        ");
        $stmt->execute(['company_id' => $companyId, 'start_date' => $startDate]);
        $currentIncome = floatval($stmt->fetch(PDO::FETCH_ASSOC)['income']);

        // Current period expenses
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(amount), 0) as expenses
            FROM expenses
            WHERE company_id = :company_id AND expense_date >= :start_date
        ");
        $stmt->execute(['company_id' => $companyId, 'start_date' => $startDate]);
        $currentExpenses = floatval($stmt->fetch(PDO::FETCH_ASSOC)['expenses']);

        $netCashFlow = $currentIncome - $currentExpenses;
        $profitMargin = $currentIncome > 0 ? ($netCashFlow / $currentIncome) * 100 : 0;

        $cashFlowInsight = [
            'type' => 'cashflow',
            'title_ro' => 'Analiză Flux de Numerar',
            'title_en' => 'Cash Flow Analysis',
            'data' => [
                'income' => $currentIncome,
                'expenses' => $currentExpenses,
                'net_cashflow' => $netCashFlow,
                'profit_margin' => round($profitMargin, 1),
            ],
            'recommendation_ro' => $netCashFlow < 0
                ? 'Atenție! Cheltuielile depășesc veniturile. Revizuiți costurile și încercați să accelerați încasările.'
                : ($profitMargin < 10
                    ? 'Marja de profit este scăzută. Căutați modalități de optimizare a costurilor.'
                    : 'Flux de numerar pozitiv. Afacerea este sănătoasă financiar.'),
            'priority' => $netCashFlow < 0 ? 'high' : ($profitMargin < 10 ? 'medium' : 'low'),
        ];
        $insights[] = $cashFlowInsight;
    }

    // 2. Expense Trends
    if ($insightType === 'all' || $insightType === 'expenses') {
        $stmt = $db->prepare("
            SELECT category, SUM(amount) as total, COUNT(*) as count
            FROM expenses
            WHERE company_id = :company_id AND expense_date >= :start_date AND category IS NOT NULL
            GROUP BY category
            ORDER BY total DESC
            LIMIT 5
        ");
        $stmt->execute(['company_id' => $companyId, 'start_date' => $startDate]);
        $topExpenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $insights[] = [
            'type' => 'expense_trends',
            'title_ro' => 'Principalele Cheltuieli',
            'title_en' => 'Top Expenses',
            'data' => $topExpenses,
            'recommendation_ro' => count($topExpenses) > 0
                ? 'Categoria "' . ($topExpenses[0]['category'] ?? 'Necategorisit') . '" reprezintă cea mai mare cheltuială.'
                : 'Nu există suficiente date pentru analiză.',
            'priority' => 'low',
        ];
    }

    // 3. Invoice Status / Receivables
    if ($insightType === 'all' || $insightType === 'receivables') {
        $stmt = $db->prepare("
            SELECT
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount END), 0) as pending_amount,
                COUNT(CASE WHEN status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE) THEN 1 END) as overdue_count,
                COALESCE(SUM(CASE WHEN status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE) THEN total_amount END), 0) as overdue_amount
            FROM invoices
            WHERE company_id = :company_id
        ");
        $stmt->execute(['company_id' => $companyId]);
        $receivables = $stmt->fetch(PDO::FETCH_ASSOC);

        $overdueCount = intval($receivables['overdue_count']);
        $overdueAmount = floatval($receivables['overdue_amount']);

        $insights[] = [
            'type' => 'receivables',
            'title_ro' => 'Creanțe și Facturi',
            'title_en' => 'Receivables & Invoices',
            'data' => [
                'pending_count' => intval($receivables['pending_count']),
                'pending_amount' => floatval($receivables['pending_amount']),
                'overdue_count' => $overdueCount,
                'overdue_amount' => $overdueAmount,
            ],
            'recommendation_ro' => $overdueCount > 0
                ? "Aveți $overdueCount facturi restante în valoare de " . number_format($overdueAmount, 2) . " lei. Contactați clienții pentru încasare."
                : 'Toate facturile sunt în termen. Gestionare excelentă!',
            'priority' => $overdueCount > 0 ? 'high' : 'low',
        ];
    }

    // 4. VAT Estimate
    if ($insightType === 'all' || $insightType === 'vat') {
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(vat_amount), 0) as vat_collected
            FROM invoices
            WHERE company_id = :company_id AND issue_date >= :start_date
        ");
        $stmt->execute(['company_id' => $companyId, 'start_date' => $startDate]);
        $vatCollected = floatval($stmt->fetch(PDO::FETCH_ASSOC)['vat_collected']);

        $stmt = $db->prepare("
            SELECT COALESCE(SUM(vat_amount), 0) as vat_paid
            FROM expenses
            WHERE company_id = :company_id AND expense_date >= :start_date AND vat_deductible = true
        ");
        $stmt->execute(['company_id' => $companyId, 'start_date' => $startDate]);
        $vatPaid = floatval($stmt->fetch(PDO::FETCH_ASSOC)['vat_paid']);

        $vatDue = $vatCollected - $vatPaid;

        $insights[] = [
            'type' => 'vat_estimate',
            'title_ro' => 'Estimare TVA',
            'title_en' => 'VAT Estimate',
            'data' => [
                'vat_collected' => $vatCollected,
                'vat_paid' => $vatPaid,
                'vat_due' => $vatDue,
            ],
            'recommendation_ro' => $vatDue > 0
                ? 'TVA estimat de plată: ' . number_format($vatDue, 2) . ' lei. Asigurați-vă că aveți lichidități.'
                : 'TVA estimat de recuperat: ' . number_format(abs($vatDue), 2) . ' lei.',
            'priority' => $vatDue > 1000 ? 'medium' : 'low',
        ];
    }

    // 5. Savings Opportunities
    if ($insightType === 'all' || $insightType === 'savings') {
        // Look for recurring expenses that could be optimized
        $stmt = $db->prepare("
            SELECT vendor, COUNT(*) as frequency, AVG(amount) as avg_amount, SUM(amount) as total
            FROM expenses
            WHERE company_id = :company_id AND expense_date >= :start_date
            GROUP BY vendor
            HAVING COUNT(*) >= 3
            ORDER BY total DESC
            LIMIT 5
        ");
        $stmt->execute(['company_id' => $companyId, 'start_date' => $startDate]);
        $recurringExpenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $insights[] = [
            'type' => 'savings_opportunities',
            'title_ro' => 'Oportunități de Economisire',
            'title_en' => 'Savings Opportunities',
            'data' => $recurringExpenses,
            'recommendation_ro' => count($recurringExpenses) > 0
                ? 'Aveți ' . count($recurringExpenses) . ' furnizori cu cheltuieli recurente. Negociați reduceri pentru contracte pe termen lung.'
                : 'Nu s-au identificat cheltuieli recurente semnificative.',
            'priority' => 'low',
        ];
    }

    // 6. Anomaly Detection
    if ($insightType === 'all' || $insightType === 'anomalies') {
        // Find expenses that are significantly higher than average
        $stmt = $db->prepare("
            SELECT e.*,
                (SELECT AVG(amount) FROM expenses WHERE company_id = :company_id AND category = e.category) as category_avg
            FROM expenses e
            WHERE e.company_id = :company_id
            AND e.expense_date >= :start_date
            AND e.amount > (SELECT AVG(amount) * 3 FROM expenses WHERE company_id = :company_id AND category = e.category)
            ORDER BY e.amount DESC
            LIMIT 5
        ");
        $stmt->execute(['company_id' => $companyId, 'start_date' => $startDate]);
        $anomalies = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($anomalies) > 0) {
            $insights[] = [
                'type' => 'anomalies',
                'title_ro' => 'Tranzacții Neobișnuite',
                'title_en' => 'Unusual Transactions',
                'data' => $anomalies,
                'recommendation_ro' => 'S-au detectat ' . count($anomalies) . ' tranzacții cu valori neobișnuit de mari. Verificați dacă sunt corecte.',
                'priority' => 'medium',
            ];
        }
    }

} catch (Exception $e) {
    // Return generic insights if database queries fail
    $insights[] = [
        'type' => 'info',
        'title_ro' => 'Analiză în curs',
        'title_en' => 'Analysis in Progress',
        'recommendation_ro' => 'Adăugați mai multe tranzacții pentru analize personalizate.',
        'priority' => 'low',
    ];
}

// Sort by priority
usort($insights, function($a, $b) {
    $priorityOrder = ['high' => 0, 'medium' => 1, 'low' => 2];
    return ($priorityOrder[$a['priority']] ?? 2) - ($priorityOrder[$b['priority']] ?? 2);
});

echo json_encode([
    'success' => true,
    'data' => [
        'period' => $period,
        'generated_at' => date('c'),
        'insights' => $insights,
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
