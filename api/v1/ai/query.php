<?php
/**
 * AI Natural Language Query API
 * Answers business questions in Romanian/English
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

$input = json_decode(file_get_contents('php://input'), true);
$query = strtolower(trim($input['query'] ?? ''));

if (empty($query)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Query required']);
    exit;
}

$db = getDbConnection();

// Define query patterns and handlers
$queryPatterns = [
    // Revenue queries
    [
        'patterns' => ['venit', 'încasări', 'revenue', 'câștig', 'câștigat', 'vânzări', 'vândut'],
        'handler' => 'getRevenue',
    ],
    // Expense queries
    [
        'patterns' => ['cheltuieli', 'cheltuială', 'cheltuit', 'expenses', 'costuri', 'plătit'],
        'handler' => 'getExpenses',
    ],
    // Profit queries
    [
        'patterns' => ['profit', 'câștig net', 'rezultat', 'diferență', 'balanță'],
        'handler' => 'getProfit',
    ],
    // Invoice queries
    [
        'patterns' => ['facturi', 'factură', 'invoices', 'neplătite', 'restante', 'în așteptare'],
        'handler' => 'getInvoices',
    ],
    // VAT queries
    [
        'patterns' => ['tva', 'vat', 'taxă', 'impozit'],
        'handler' => 'getVAT',
    ],
    // Client queries
    [
        'patterns' => ['client', 'clienți', 'customer', 'cumpărător'],
        'handler' => 'getClients',
    ],
    // Comparison queries
    [
        'patterns' => ['compara', 'comparație', 'față de', 'versus', 'vs', 'luna trecută', 'anul trecut'],
        'handler' => 'getComparison',
    ],
];

// Detect time period from query
$timePeriod = detectTimePeriod($query);

// Find matching handler
$handler = null;
foreach ($queryPatterns as $pattern) {
    foreach ($pattern['patterns'] as $keyword) {
        if (strpos($query, $keyword) !== false) {
            $handler = $pattern['handler'];
            break 2;
        }
    }
}

if (!$handler) {
    // Default response for unrecognized queries
    echo json_encode([
        'success' => true,
        'data' => [
            'query' => $query,
            'answer_ro' => 'Nu am înțeles întrebarea. Încercați să întrebați despre: venituri, cheltuieli, profit, facturi, TVA sau clienți.',
            'answer_en' => 'I didn\'t understand the question. Try asking about: revenue, expenses, profit, invoices, VAT or clients.',
            'suggestions' => [
                'Cât am vândut luna aceasta?',
                'Care sunt cheltuielile pe luna aceasta?',
                'Câte facturi neplătite am?',
                'Care este profitul pe acest an?',
                'Cât TVA am de plătit?',
            ],
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Execute handler
$result = $handler($db, $companyId, $timePeriod, $query);

echo json_encode([
    'success' => true,
    'data' => $result,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

// Helper functions

function detectTimePeriod(string $query): array {
    $now = new DateTime();

    if (preg_match('/azi|astăzi|today/', $query)) {
        return [
            'start' => $now->format('Y-m-d'),
            'end' => $now->format('Y-m-d'),
            'label_ro' => 'astăzi',
            'label_en' => 'today',
        ];
    }

    if (preg_match('/săptămâna|week/', $query)) {
        return [
            'start' => (clone $now)->modify('monday this week')->format('Y-m-d'),
            'end' => $now->format('Y-m-d'),
            'label_ro' => 'săptămâna aceasta',
            'label_en' => 'this week',
        ];
    }

    if (preg_match('/luna trecută|last month/', $query)) {
        return [
            'start' => (clone $now)->modify('first day of last month')->format('Y-m-d'),
            'end' => (clone $now)->modify('last day of last month')->format('Y-m-d'),
            'label_ro' => 'luna trecută',
            'label_en' => 'last month',
        ];
    }

    if (preg_match('/anul|an|year/', $query)) {
        if (preg_match('/anul trecut|last year/', $query)) {
            return [
                'start' => (clone $now)->modify('-1 year')->modify('first day of January')->format('Y-m-d'),
                'end' => (clone $now)->modify('-1 year')->modify('last day of December')->format('Y-m-d'),
                'label_ro' => 'anul trecut',
                'label_en' => 'last year',
            ];
        }
        return [
            'start' => (clone $now)->modify('first day of January')->format('Y-m-d'),
            'end' => $now->format('Y-m-d'),
            'label_ro' => 'acest an',
            'label_en' => 'this year',
        ];
    }

    if (preg_match('/trimestru|quarter/', $query)) {
        $quarter = ceil($now->format('n') / 3);
        $startMonth = ($quarter - 1) * 3 + 1;
        return [
            'start' => $now->format('Y') . '-' . str_pad($startMonth, 2, '0', STR_PAD_LEFT) . '-01',
            'end' => $now->format('Y-m-d'),
            'label_ro' => 'trimestrul ' . $quarter,
            'label_en' => 'Q' . $quarter,
        ];
    }

    // Default: current month
    return [
        'start' => (clone $now)->modify('first day of this month')->format('Y-m-d'),
        'end' => $now->format('Y-m-d'),
        'label_ro' => 'luna aceasta',
        'label_en' => 'this month',
    ];
}

function getRevenue(PDO $db, string $companyId, array $period, string $query): array {
    $stmt = $db->prepare("
        SELECT
            COUNT(*) as invoice_count,
            COALESCE(SUM(total_amount), 0) as total,
            COALESCE(AVG(total_amount), 0) as average
        FROM invoices
        WHERE company_id = :company_id
        AND issue_date BETWEEN :start AND :end
        AND status IN ('paid', 'pending')
    ");
    $stmt->execute([
        'company_id' => $companyId,
        'start' => $period['start'],
        'end' => $period['end'],
    ]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    $total = floatval($data['total']);
    $count = intval($data['invoice_count']);

    return [
        'query' => $query,
        'period' => $period,
        'data' => [
            'total' => $total,
            'invoice_count' => $count,
            'average' => round(floatval($data['average']), 2),
        ],
        'answer_ro' => "În perioada {$period['label_ro']}, ați avut venituri de " . number_format($total, 2) . " lei din $count facturi.",
        'answer_en' => "During {$period['label_en']}, you had revenue of " . number_format($total, 2) . " lei from $count invoices.",
    ];
}

function getExpenses(PDO $db, string $companyId, array $period, string $query): array {
    $stmt = $db->prepare("
        SELECT
            COUNT(*) as expense_count,
            COALESCE(SUM(amount), 0) as total,
            category
        FROM expenses
        WHERE company_id = :company_id
        AND expense_date BETWEEN :start AND :end
        GROUP BY category
        ORDER BY SUM(amount) DESC
    ");
    $stmt->execute([
        'company_id' => $companyId,
        'start' => $period['start'],
        'end' => $period['end'],
    ]);
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $total = array_sum(array_column($categories, 'total'));
    $count = array_sum(array_column($categories, 'expense_count'));

    $topCategory = $categories[0]['category'] ?? 'necategorisit';

    return [
        'query' => $query,
        'period' => $period,
        'data' => [
            'total' => $total,
            'expense_count' => $count,
            'by_category' => $categories,
        ],
        'answer_ro' => "În perioada {$period['label_ro']}, ați cheltuit " . number_format($total, 2) . " lei pe $count tranzacții. Categoria principală: $topCategory.",
        'answer_en' => "During {$period['label_en']}, you spent " . number_format($total, 2) . " lei on $count transactions. Main category: $topCategory.",
    ];
}

function getProfit(PDO $db, string $companyId, array $period, string $query): array {
    // Get revenue
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(total_amount), 0) as revenue
        FROM invoices
        WHERE company_id = :company_id AND issue_date BETWEEN :start AND :end AND status = 'paid'
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $period['start'], 'end' => $period['end']]);
    $revenue = floatval($stmt->fetch(PDO::FETCH_ASSOC)['revenue']);

    // Get expenses
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(amount), 0) as expenses
        FROM expenses
        WHERE company_id = :company_id AND expense_date BETWEEN :start AND :end
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $period['start'], 'end' => $period['end']]);
    $expenses = floatval($stmt->fetch(PDO::FETCH_ASSOC)['expenses']);

    $profit = $revenue - $expenses;
    $margin = $revenue > 0 ? round(($profit / $revenue) * 100, 1) : 0;

    $status = $profit >= 0 ? 'profit' : 'pierdere';

    return [
        'query' => $query,
        'period' => $period,
        'data' => [
            'revenue' => $revenue,
            'expenses' => $expenses,
            'profit' => $profit,
            'margin' => $margin,
        ],
        'answer_ro' => "În perioada {$period['label_ro']}: Venituri " . number_format($revenue, 2) . " lei, Cheltuieli " . number_format($expenses, 2) . " lei. Rezultat: " . number_format(abs($profit), 2) . " lei $status (marja: $margin%).",
        'answer_en' => "During {$period['label_en']}: Revenue " . number_format($revenue, 2) . " lei, Expenses " . number_format($expenses, 2) . " lei. Result: " . number_format(abs($profit), 2) . " lei " . ($profit >= 0 ? 'profit' : 'loss') . " (margin: $margin%).",
    ];
}

function getInvoices(PDO $db, string $companyId, array $period, string $query): array {
    $stmt = $db->prepare("
        SELECT
            status,
            COUNT(*) as count,
            COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE company_id = :company_id
        GROUP BY status
    ");
    $stmt->execute(['company_id' => $companyId]);
    $statuses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $statusMap = [];
    foreach ($statuses as $s) {
        $statusMap[$s['status']] = [
            'count' => intval($s['count']),
            'total' => floatval($s['total']),
        ];
    }

    $pending = $statusMap['pending'] ?? ['count' => 0, 'total' => 0];
    $paid = $statusMap['paid'] ?? ['count' => 0, 'total' => 0];

    return [
        'query' => $query,
        'data' => [
            'pending' => $pending,
            'paid' => $paid,
            'all_statuses' => $statusMap,
        ],
        'answer_ro' => "Aveți {$pending['count']} facturi neplătite în valoare de " . number_format($pending['total'], 2) . " lei și {$paid['count']} facturi plătite.",
        'answer_en' => "You have {$pending['count']} unpaid invoices worth " . number_format($pending['total'], 2) . " lei and {$paid['count']} paid invoices.",
    ];
}

function getVAT(PDO $db, string $companyId, array $period, string $query): array {
    // VAT collected
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(vat_amount), 0) as collected
        FROM invoices
        WHERE company_id = :company_id AND issue_date BETWEEN :start AND :end
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $period['start'], 'end' => $period['end']]);
    $collected = floatval($stmt->fetch(PDO::FETCH_ASSOC)['collected']);

    // VAT deductible
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(vat_amount), 0) as deductible
        FROM expenses
        WHERE company_id = :company_id AND expense_date BETWEEN :start AND :end AND vat_deductible = true
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $period['start'], 'end' => $period['end']]);
    $deductible = floatval($stmt->fetch(PDO::FETCH_ASSOC)['deductible']);

    $due = $collected - $deductible;

    return [
        'query' => $query,
        'period' => $period,
        'data' => [
            'collected' => $collected,
            'deductible' => $deductible,
            'due' => $due,
        ],
        'answer_ro' => "TVA colectat: " . number_format($collected, 2) . " lei. TVA deductibil: " . number_format($deductible, 2) . " lei. " . ($due >= 0 ? "De plată: " : "De recuperat: ") . number_format(abs($due), 2) . " lei.",
        'answer_en' => "VAT collected: " . number_format($collected, 2) . " lei. VAT deductible: " . number_format($deductible, 2) . " lei. " . ($due >= 0 ? "Due: " : "To recover: ") . number_format(abs($due), 2) . " lei.",
    ];
}

function getClients(PDO $db, string $companyId, array $period, string $query): array {
    $stmt = $db->prepare("
        SELECT
            c.name,
            COUNT(i.id) as invoice_count,
            COALESCE(SUM(i.total_amount), 0) as total_revenue
        FROM contacts c
        LEFT JOIN invoices i ON i.customer_id = c.id AND i.issue_date BETWEEN :start AND :end
        WHERE c.company_id = :company_id AND c.type = 'customer'
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
        LIMIT 5
    ");
    $stmt->execute([
        'company_id' => $companyId,
        'start' => $period['start'],
        'end' => $period['end'],
    ]);
    $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $topClient = $clients[0]['name'] ?? 'N/A';
    $topRevenue = floatval($clients[0]['total_revenue'] ?? 0);

    return [
        'query' => $query,
        'period' => $period,
        'data' => [
            'top_clients' => $clients,
            'client_count' => count($clients),
        ],
        'answer_ro' => "În perioada {$period['label_ro']}, cel mai bun client este \"$topClient\" cu venituri de " . number_format($topRevenue, 2) . " lei.",
        'answer_en' => "During {$period['label_en']}, the best client is \"$topClient\" with revenue of " . number_format($topRevenue, 2) . " lei.",
    ];
}

function getComparison(PDO $db, string $companyId, array $period, string $query): array {
    // This period
    $stmt = $db->prepare("
        SELECT
            COALESCE(SUM(total_amount), 0) as revenue
        FROM invoices
        WHERE company_id = :company_id AND issue_date BETWEEN :start AND :end AND status = 'paid'
    ");
    $stmt->execute(['company_id' => $companyId, 'start' => $period['start'], 'end' => $period['end']]);
    $currentRevenue = floatval($stmt->fetch(PDO::FETCH_ASSOC)['revenue']);

    // Previous period
    $daysDiff = (new DateTime($period['end']))->diff(new DateTime($period['start']))->days + 1;
    $previousEnd = (new DateTime($period['start']))->modify('-1 day')->format('Y-m-d');
    $previousStart = (new DateTime($previousEnd))->modify("-$daysDiff days")->format('Y-m-d');

    $stmt->execute(['company_id' => $companyId, 'start' => $previousStart, 'end' => $previousEnd]);
    $previousRevenue = floatval($stmt->fetch(PDO::FETCH_ASSOC)['revenue']);

    $change = $previousRevenue > 0 ? (($currentRevenue - $previousRevenue) / $previousRevenue) * 100 : 0;
    $direction = $change >= 0 ? 'creștere' : 'scădere';

    return [
        'query' => $query,
        'data' => [
            'current_period' => $period,
            'current_revenue' => $currentRevenue,
            'previous_revenue' => $previousRevenue,
            'change_percent' => round($change, 1),
        ],
        'answer_ro' => "Comparativ cu perioada anterioară: " . number_format($currentRevenue, 2) . " lei vs " . number_format($previousRevenue, 2) . " lei. " . ucfirst($direction) . " de " . abs(round($change, 1)) . "%.",
        'answer_en' => "Compared to previous period: " . number_format($currentRevenue, 2) . " lei vs " . number_format($previousRevenue, 2) . " lei. " . ($change >= 0 ? 'Increase' : 'Decrease') . " of " . abs(round($change, 1)) . "%.",
    ];
}
