<?php
/**
 * Invoice Pattern Detection API
 * Analyzes invoice history to detect recurring patterns and suggest automation
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

$db = getDbConnection();

try {
    $patterns = [];

    // 1. Find clients with regular invoicing patterns
    $stmt = $db->prepare("
        WITH invoice_intervals AS (
            SELECT
                customer_id,
                issue_date,
                LAG(issue_date) OVER (PARTITION BY customer_id ORDER BY issue_date) as prev_date,
                total_amount
            FROM invoices
            WHERE company_id = :company_id
            AND issue_date >= NOW() - INTERVAL '12 months'
        ),
        client_patterns AS (
            SELECT
                customer_id,
                AVG(EXTRACT(DAY FROM (issue_date - prev_date))) as avg_interval_days,
                STDDEV(EXTRACT(DAY FROM (issue_date - prev_date))) as interval_stddev,
                AVG(total_amount) as avg_amount,
                STDDEV(total_amount) as amount_stddev,
                COUNT(*) as invoice_count
            FROM invoice_intervals
            WHERE prev_date IS NOT NULL
            GROUP BY customer_id
            HAVING COUNT(*) >= 3
        )
        SELECT
            cp.*,
            c.name as customer_name,
            c.email as customer_email
        FROM client_patterns cp
        JOIN contacts c ON c.id = cp.customer_id
        WHERE cp.interval_stddev < cp.avg_interval_days * 0.3  -- Low variance = regular pattern
        ORDER BY cp.invoice_count DESC
        LIMIT 10
    ");
    $stmt->execute(['company_id' => $companyId]);
    $regularClients = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($regularClients as $client) {
        $avgDays = round(floatval($client['avg_interval_days']));
        $frequency = detectFrequency($avgDays);

        if ($frequency) {
            $patterns[] = [
                'type' => 'recurring_client',
                'customer_id' => $client['customer_id'],
                'customer_name' => $client['customer_name'],
                'suggested_frequency' => $frequency,
                'avg_interval_days' => $avgDays,
                'avg_amount' => round(floatval($client['avg_amount']), 2),
                'invoice_count' => intval($client['invoice_count']),
                'confidence' => calculateConfidence($client),
                'suggestion_ro' => "Clientul \"{$client['customer_name']}\" primește facturi regulat (aproximativ $frequency). Doriți să creați o factură recurentă?",
                'suggestion_en' => "Client \"{$client['customer_name']}\" receives regular invoices (approximately $frequency). Would you like to create a recurring invoice?",
            ];
        }
    }

    // 2. Find similar line items that could be products
    $stmt = $db->prepare("
        SELECT
            il.description,
            MODE() WITHIN GROUP (ORDER BY il.unit_price) as common_price,
            MODE() WITHIN GROUP (ORDER BY il.vat_rate) as common_vat,
            MODE() WITHIN GROUP (ORDER BY il.unit) as common_unit,
            COUNT(*) as usage_count,
            COUNT(DISTINCT i.customer_id) as customer_count
        FROM invoice_lines il
        JOIN invoices i ON i.id = il.invoice_id
        WHERE i.company_id = :company_id
        AND NOT EXISTS (
            SELECT 1 FROM products p
            WHERE p.company_id = :company_id
            AND LOWER(p.name) = LOWER(il.description)
        )
        GROUP BY il.description
        HAVING COUNT(*) >= 3
        ORDER BY usage_count DESC
        LIMIT 10
    ");
    $stmt->execute(['company_id' => $companyId]);
    $frequentItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($frequentItems as $item) {
        $patterns[] = [
            'type' => 'product_suggestion',
            'description' => $item['description'],
            'suggested_price' => round(floatval($item['common_price']), 2),
            'suggested_vat' => floatval($item['common_vat']),
            'suggested_unit' => $item['common_unit'],
            'usage_count' => intval($item['usage_count']),
            'customer_count' => intval($item['customer_count']),
            'suggestion_ro' => "Articolul \"{$item['description']}\" a fost folosit de {$item['usage_count']} ori. Doriți să îl adăugați în catalogul de produse?",
            'suggestion_en' => "Item \"{$item['description']}\" has been used {$item['usage_count']} times. Would you like to add it to the product catalog?",
        ];
    }

    // 3. Detect seasonal patterns
    $stmt = $db->prepare("
        SELECT
            EXTRACT(MONTH FROM issue_date) as month,
            COUNT(*) as invoice_count,
            SUM(total_amount) as total_revenue
        FROM invoices
        WHERE company_id = :company_id
        AND issue_date >= NOW() - INTERVAL '24 months'
        GROUP BY EXTRACT(MONTH FROM issue_date)
        ORDER BY month
    ");
    $stmt->execute(['company_id' => $companyId]);
    $monthlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($monthlyData) >= 6) {
        $avgRevenue = array_sum(array_column($monthlyData, 'total_revenue')) / count($monthlyData);

        foreach ($monthlyData as $month) {
            $revenue = floatval($month['total_revenue']);
            $monthNum = intval($month['month']);
            $monthName = getMonthNameRo($monthNum);

            if ($revenue > $avgRevenue * 1.5) {
                $patterns[] = [
                    'type' => 'seasonal_high',
                    'month' => $monthNum,
                    'month_name' => $monthName,
                    'revenue' => round($revenue, 2),
                    'avg_revenue' => round($avgRevenue, 2),
                    'suggestion_ro' => "$monthName este o perioadă cu venituri peste medie. Pregătiți-vă pentru cerere crescută.",
                    'suggestion_en' => "$monthName is a high-revenue period. Prepare for increased demand.",
                ];
            } elseif ($revenue < $avgRevenue * 0.5) {
                $patterns[] = [
                    'type' => 'seasonal_low',
                    'month' => $monthNum,
                    'month_name' => $monthName,
                    'revenue' => round($revenue, 2),
                    'avg_revenue' => round($avgRevenue, 2),
                    'suggestion_ro' => "$monthName este o perioadă cu venituri sub medie. Planificați promoții sau reducerea costurilor.",
                    'suggestion_en' => "$monthName is a low-revenue period. Plan promotions or cost reduction.",
                ];
            }
        }
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'patterns' => $patterns,
            'analyzed_period' => [
                'start' => date('Y-m-d', strtotime('-12 months')),
                'end' => date('Y-m-d'),
            ],
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

// Helper functions
function detectFrequency(int $days): ?string {
    if ($days >= 6 && $days <= 8) return 'săptămânal';
    if ($days >= 13 && $days <= 16) return 'bi-săptămânal';
    if ($days >= 28 && $days <= 32) return 'lunar';
    if ($days >= 85 && $days <= 95) return 'trimestrial';
    if ($days >= 175 && $days <= 195) return 'semestrial';
    if ($days >= 355 && $days <= 375) return 'anual';
    return null;
}

function calculateConfidence(array $client): int {
    $confidence = 50;

    // More invoices = higher confidence
    $confidence += min(intval($client['invoice_count']) * 5, 25);

    // Lower variance = higher confidence
    $variance = floatval($client['interval_stddev']) / max(floatval($client['avg_interval_days']), 1);
    if ($variance < 0.1) $confidence += 25;
    elseif ($variance < 0.2) $confidence += 15;
    elseif ($variance < 0.3) $confidence += 5;

    return min($confidence, 95);
}

function getMonthNameRo(int $month): string {
    $months = [
        1 => 'Ianuarie', 2 => 'Februarie', 3 => 'Martie',
        4 => 'Aprilie', 5 => 'Mai', 6 => 'Iunie',
        7 => 'Iulie', 8 => 'August', 9 => 'Septembrie',
        10 => 'Octombrie', 11 => 'Noiembrie', 12 => 'Decembrie'
    ];
    return $months[$month] ?? '';
}
