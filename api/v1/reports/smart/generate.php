<?php
/**
 * Smart Report Generation API
 * Generates customizable financial reports with AI insights
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
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

$input = json_decode(file_get_contents('php://input'), true);

$reportType = $input['type'] ?? 'profit_loss';
$startDate = $input['start_date'] ?? date('Y-m-01');
$endDate = $input['end_date'] ?? date('Y-m-d');
$format = $input['format'] ?? 'json'; // json, pdf, xlsx, csv
$language = $input['language'] ?? 'ro'; // ro, en
$includeCharts = $input['include_charts'] ?? true;
$includeInsights = $input['include_insights'] ?? true;

$db = getDbConnection();

try {
    $reportData = [];

    switch ($reportType) {
        case 'profit_loss':
            $reportData = generateProfitLossReport($db, $companyId, $startDate, $endDate, $language);
            break;
        case 'balance_sheet':
            $reportData = generateBalanceSheetReport($db, $companyId, $endDate, $language);
            break;
        case 'cash_flow':
            $reportData = generateCashFlowReport($db, $companyId, $startDate, $endDate, $language);
            break;
        case 'vat':
            $reportData = generateVATReport($db, $companyId, $startDate, $endDate, $language);
            break;
        case 'accounts_receivable':
            $reportData = generateARReport($db, $companyId, $endDate, $language);
            break;
        case 'accounts_payable':
            $reportData = generateAPReport($db, $companyId, $endDate, $language);
            break;
        case 'expense_breakdown':
            $reportData = generateExpenseBreakdownReport($db, $companyId, $startDate, $endDate, $language);
            break;
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid report type']);
            exit;
    }

    // Add AI insights if requested
    if ($includeInsights) {
        $reportData['insights'] = generateReportInsights($reportData, $language);
    }

    // Add chart data if requested
    if ($includeCharts) {
        $reportData['charts'] = generateChartData($reportData, $reportType);
    }

    // Format response based on requested format
    if ($format === 'json') {
        echo json_encode([
            'success' => true,
            'data' => [
                'report_type' => $reportType,
                'period' => ['start' => $startDate, 'end' => $endDate],
                'generated_at' => date('c'),
                'language' => $language,
                'report' => $reportData,
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    } else {
        // For other formats, return download URL
        $filename = exportReport($reportData, $reportType, $format, $companyId, $language);
        echo json_encode([
            'success' => true,
            'data' => [
                'download_url' => '/reports/downloads/' . $filename,
                'expires_at' => date('c', strtotime('+24 hours')),
            ],
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Report generation failed: ' . $e->getMessage()]);
}

// Report generation functions
function generateProfitLossReport(PDO $db, string $companyId, string $start, string $end, string $lang): array {
    // Revenue
    $stmt = $db->prepare("
        SELECT
            COALESCE(SUM(total_amount), 0) as total,
            COALESCE(SUM(subtotal), 0) as subtotal,
            COALESCE(SUM(vat_amount), 0) as vat
        FROM invoices
        WHERE company_id = :company_id AND issue_date BETWEEN :start AND :end AND status IN ('paid', 'sent')
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $start, 'end' => $end]);
    $revenue = $stmt->fetch(PDO::FETCH_ASSOC);

    // Expenses by category
    $stmt = $db->prepare("
        SELECT
            category,
            SUM(amount) as total,
            SUM(vat_amount) as vat
        FROM expenses
        WHERE company_id = :company_id AND expense_date BETWEEN :start AND :end
        GROUP BY category
        ORDER BY total DESC
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $start, 'end' => $end]);
    $expensesByCategory = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalExpenses = array_sum(array_column($expensesByCategory, 'total'));
    $totalExpenseVAT = array_sum(array_column($expensesByCategory, 'vat'));

    $grossProfit = floatval($revenue['subtotal']) - $totalExpenses;
    $netProfit = $grossProfit; // Simplified - would include taxes

    return [
        'title' => $lang === 'ro' ? 'Raport Profit și Pierdere' : 'Profit & Loss Statement',
        'revenue' => [
            'label' => $lang === 'ro' ? 'Venituri' : 'Revenue',
            'total' => round(floatval($revenue['total']), 2),
            'subtotal' => round(floatval($revenue['subtotal']), 2),
            'vat_collected' => round(floatval($revenue['vat']), 2),
        ],
        'expenses' => [
            'label' => $lang === 'ro' ? 'Cheltuieli' : 'Expenses',
            'total' => round($totalExpenses, 2),
            'vat_paid' => round($totalExpenseVAT, 2),
            'by_category' => $expensesByCategory,
        ],
        'gross_profit' => [
            'label' => $lang === 'ro' ? 'Profit Brut' : 'Gross Profit',
            'amount' => round($grossProfit, 2),
            'margin_percent' => floatval($revenue['subtotal']) > 0 ? round(($grossProfit / floatval($revenue['subtotal'])) * 100, 1) : 0,
        ],
        'net_profit' => [
            'label' => $lang === 'ro' ? 'Profit Net' : 'Net Profit',
            'amount' => round($netProfit, 2),
        ],
    ];
}

function generateBalanceSheetReport(PDO $db, string $companyId, string $date, string $lang): array {
    // Assets
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(balance), 0) as cash
        FROM bank_accounts
        WHERE company_id = :company_id
    ");
    $stmt->execute(['company_id' => $companyId]);
    $cash = floatval($stmt->fetch(PDO::FETCH_ASSOC)['cash']);

    // Accounts receivable
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(total_amount), 0) as receivables
        FROM invoices
        WHERE company_id = :company_id AND status = 'pending' AND due_date <= :date
    ");
    $stmt->execute(['company_id' => $companyId, 'date' => $date]);
    $receivables = floatval($stmt->fetch(PDO::FETCH_ASSOC)['receivables']);

    // Fixed assets
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(current_value), 0) as fixed_assets
        FROM fixed_assets
        WHERE company_id = :company_id
    ");
    $stmt->execute(['company_id' => $companyId]);
    $fixedAssets = floatval($stmt->fetch(PDO::FETCH_ASSOC)['fixed_assets']);

    // Liabilities - Accounts payable
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(amount), 0) as payables
        FROM bills
        WHERE company_id = :company_id AND status = 'pending'
    ");
    $stmt->execute(['company_id' => $companyId]);
    $payables = floatval($stmt->fetch(PDO::FETCH_ASSOC)['payables']);

    $totalAssets = $cash + $receivables + $fixedAssets;
    $totalLiabilities = $payables;
    $equity = $totalAssets - $totalLiabilities;

    return [
        'title' => $lang === 'ro' ? 'Bilanț Contabil' : 'Balance Sheet',
        'as_of_date' => $date,
        'assets' => [
            'label' => $lang === 'ro' ? 'Active' : 'Assets',
            'current' => [
                'label' => $lang === 'ro' ? 'Active Curente' : 'Current Assets',
                'cash' => round($cash, 2),
                'accounts_receivable' => round($receivables, 2),
                'subtotal' => round($cash + $receivables, 2),
            ],
            'fixed' => [
                'label' => $lang === 'ro' ? 'Active Fixe' : 'Fixed Assets',
                'total' => round($fixedAssets, 2),
            ],
            'total' => round($totalAssets, 2),
        ],
        'liabilities' => [
            'label' => $lang === 'ro' ? 'Datorii' : 'Liabilities',
            'accounts_payable' => round($payables, 2),
            'total' => round($totalLiabilities, 2),
        ],
        'equity' => [
            'label' => $lang === 'ro' ? 'Capitaluri Proprii' : 'Equity',
            'total' => round($equity, 2),
        ],
    ];
}

function generateCashFlowReport(PDO $db, string $companyId, string $start, string $end, string $lang): array {
    // Cash inflows (paid invoices)
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(total_amount), 0) as inflows
        FROM invoices
        WHERE company_id = :company_id AND paid_date BETWEEN :start AND :end AND status = 'paid'
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $start, 'end' => $end]);
    $inflows = floatval($stmt->fetch(PDO::FETCH_ASSOC)['inflows']);

    // Cash outflows (expenses)
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(amount), 0) as outflows
        FROM expenses
        WHERE company_id = :company_id AND expense_date BETWEEN :start AND :end
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $start, 'end' => $end]);
    $outflows = floatval($stmt->fetch(PDO::FETCH_ASSOC)['outflows']);

    $netCashFlow = $inflows - $outflows;

    return [
        'title' => $lang === 'ro' ? 'Raport Flux de Numerar' : 'Cash Flow Statement',
        'operating' => [
            'label' => $lang === 'ro' ? 'Activități Operaționale' : 'Operating Activities',
            'inflows' => round($inflows, 2),
            'outflows' => round($outflows, 2),
            'net' => round($netCashFlow, 2),
        ],
        'net_change' => round($netCashFlow, 2),
    ];
}

function generateVATReport(PDO $db, string $companyId, string $start, string $end, string $lang): array {
    // VAT collected
    $stmt = $db->prepare("
        SELECT
            vat_rate,
            SUM(subtotal) as base,
            SUM(vat_amount) as vat
        FROM invoices
        WHERE company_id = :company_id AND issue_date BETWEEN :start AND :end
        GROUP BY vat_rate
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $start, 'end' => $end]);
    $collected = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // VAT deductible
    $stmt = $db->prepare("
        SELECT
            vat_rate,
            SUM(amount - vat_amount) as base,
            SUM(vat_amount) as vat
        FROM expenses
        WHERE company_id = :company_id AND expense_date BETWEEN :start AND :end AND vat_deductible = true
        GROUP BY vat_rate
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $start, 'end' => $end]);
    $deductible = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalCollected = array_sum(array_column($collected, 'vat'));
    $totalDeductible = array_sum(array_column($deductible, 'vat'));
    $vatDue = $totalCollected - $totalDeductible;

    return [
        'title' => $lang === 'ro' ? 'Declarație TVA' : 'VAT Return',
        'collected' => [
            'label' => $lang === 'ro' ? 'TVA Colectat' : 'VAT Collected',
            'by_rate' => $collected,
            'total' => round($totalCollected, 2),
        ],
        'deductible' => [
            'label' => $lang === 'ro' ? 'TVA Deductibil' : 'VAT Deductible',
            'by_rate' => $deductible,
            'total' => round($totalDeductible, 2),
        ],
        'due' => [
            'label' => $vatDue >= 0 ? ($lang === 'ro' ? 'TVA de Plată' : 'VAT Due') : ($lang === 'ro' ? 'TVA de Recuperat' : 'VAT Refund'),
            'amount' => round(abs($vatDue), 2),
            'is_refund' => $vatDue < 0,
        ],
    ];
}

function generateARReport(PDO $db, string $companyId, string $date, string $lang): array {
    $stmt = $db->prepare("
        SELECT
            c.name as customer,
            i.invoice_number,
            i.issue_date,
            i.due_date,
            i.total_amount,
            CASE
                WHEN i.due_date < CURRENT_DATE THEN EXTRACT(DAY FROM CURRENT_DATE - i.due_date)
                ELSE 0
            END as days_overdue
        FROM invoices i
        JOIN contacts c ON c.id = i.customer_id
        WHERE i.company_id = :company_id AND i.status = 'pending'
        ORDER BY i.due_date
    ");
    $stmt->execute(['company_id' => $companyId]);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Aging buckets
    $aging = [
        'current' => 0,
        '1_30' => 0,
        '31_60' => 0,
        '61_90' => 0,
        'over_90' => 0,
    ];

    foreach ($invoices as $inv) {
        $days = intval($inv['days_overdue']);
        $amount = floatval($inv['total_amount']);
        if ($days <= 0) $aging['current'] += $amount;
        elseif ($days <= 30) $aging['1_30'] += $amount;
        elseif ($days <= 60) $aging['31_60'] += $amount;
        elseif ($days <= 90) $aging['61_90'] += $amount;
        else $aging['over_90'] += $amount;
    }

    return [
        'title' => $lang === 'ro' ? 'Creanțe Clienți' : 'Accounts Receivable',
        'invoices' => $invoices,
        'total' => round(array_sum(array_column($invoices, 'total_amount')), 2),
        'aging' => [
            'current' => ['label' => $lang === 'ro' ? 'Curente' : 'Current', 'amount' => round($aging['current'], 2)],
            '1_30' => ['label' => '1-30 ' . ($lang === 'ro' ? 'zile' : 'days'), 'amount' => round($aging['1_30'], 2)],
            '31_60' => ['label' => '31-60 ' . ($lang === 'ro' ? 'zile' : 'days'), 'amount' => round($aging['31_60'], 2)],
            '61_90' => ['label' => '61-90 ' . ($lang === 'ro' ? 'zile' : 'days'), 'amount' => round($aging['61_90'], 2)],
            'over_90' => ['label' => '90+ ' . ($lang === 'ro' ? 'zile' : 'days'), 'amount' => round($aging['over_90'], 2)],
        ],
    ];
}

function generateAPReport(PDO $db, string $companyId, string $date, string $lang): array {
    $stmt = $db->prepare("
        SELECT
            vendor,
            bill_number,
            issue_date,
            due_date,
            amount,
            CASE
                WHEN due_date < CURRENT_DATE THEN EXTRACT(DAY FROM CURRENT_DATE - due_date)
                ELSE 0
            END as days_overdue
        FROM bills
        WHERE company_id = :company_id AND status = 'pending'
        ORDER BY due_date
    ");
    $stmt->execute(['company_id' => $companyId]);
    $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return [
        'title' => $lang === 'ro' ? 'Datorii Furnizori' : 'Accounts Payable',
        'bills' => $bills,
        'total' => round(array_sum(array_column($bills, 'amount')), 2),
    ];
}

function generateExpenseBreakdownReport(PDO $db, string $companyId, string $start, string $end, string $lang): array {
    $stmt = $db->prepare("
        SELECT
            category,
            vendor,
            SUM(amount) as total,
            COUNT(*) as count
        FROM expenses
        WHERE company_id = :company_id AND expense_date BETWEEN :start AND :end
        GROUP BY category, vendor
        ORDER BY category, total DESC
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $start, 'end' => $end]);
    $breakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Group by category
    $byCategory = [];
    foreach ($breakdown as $item) {
        $cat = $item['category'] ?? 'Necategorisit';
        if (!isset($byCategory[$cat])) {
            $byCategory[$cat] = ['vendors' => [], 'total' => 0];
        }
        $byCategory[$cat]['vendors'][] = [
            'name' => $item['vendor'],
            'total' => floatval($item['total']),
            'count' => intval($item['count']),
        ];
        $byCategory[$cat]['total'] += floatval($item['total']);
    }

    return [
        'title' => $lang === 'ro' ? 'Detaliere Cheltuieli' : 'Expense Breakdown',
        'by_category' => $byCategory,
        'total' => array_sum(array_column($breakdown, 'total')),
    ];
}

function generateReportInsights(array $data, string $lang): array {
    $insights = [];

    // Profit margin insight
    if (isset($data['gross_profit'])) {
        $margin = $data['gross_profit']['margin_percent'] ?? 0;
        if ($margin < 10) {
            $insights[] = [
                'type' => 'warning',
                'message' => $lang === 'ro'
                    ? "Marja de profit de $margin% este sub media industriei. Analizați costurile."
                    : "Profit margin of $margin% is below industry average. Review costs.",
            ];
        } elseif ($margin > 30) {
            $insights[] = [
                'type' => 'positive',
                'message' => $lang === 'ro'
                    ? "Marja de profit de $margin% este excelentă!"
                    : "Profit margin of $margin% is excellent!",
            ];
        }
    }

    // Cash flow insight
    if (isset($data['operating']['net'])) {
        $net = $data['operating']['net'];
        if ($net < 0) {
            $insights[] = [
                'type' => 'warning',
                'message' => $lang === 'ro'
                    ? "Flux de numerar negativ. Verificați încasările și reduceti cheltuielile."
                    : "Negative cash flow. Check collections and reduce expenses.",
            ];
        }
    }

    return $insights;
}

function generateChartData(array $data, string $type): array {
    $charts = [];

    if ($type === 'profit_loss' && isset($data['expenses']['by_category'])) {
        $charts['expense_pie'] = [
            'type' => 'pie',
            'labels' => array_column($data['expenses']['by_category'], 'category'),
            'values' => array_column($data['expenses']['by_category'], 'total'),
        ];
    }

    return $charts;
}

function exportReport(array $data, string $type, string $format, string $companyId, string $lang): string {
    // Simplified - would use actual export libraries
    $filename = 'report_' . $type . '_' . date('Ymd_His') . '.' . $format;
    return $filename;
}
