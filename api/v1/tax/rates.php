<?php
/**
 * Romanian Tax Rates API
 * GET /api/v1/tax/rates.php
 *
 * Returns current Romanian tax rates
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');

try {
    $auth = authenticate();
    $pdo = Database::getInstance()->getConnection();

    $date = $_GET['date'] ?? date('Y-m-d');
    $taxType = $_GET['type'] ?? null;

    // Build query
    $sql = "SELECT
                tax_type,
                tax_name_ro,
                tax_name_en,
                rate,
                effective_from,
                effective_until,
                applicable_to,
                notes
            FROM romanian_tax_rates
            WHERE is_active = true
              AND effective_from <= :date
              AND (effective_until IS NULL OR effective_until >= :date)";

    $params = ['date' => $date];

    if ($taxType) {
        $sql .= " AND tax_type = :tax_type";
        $params['tax_type'] = $taxType;
    }

    $sql .= " ORDER BY tax_type, effective_from DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format rates
    foreach ($rates as &$rate) {
        $rate['rate'] = (float)$rate['rate'];
        $rate['rate_percent'] = round($rate['rate'] * 100, 2);
        $rate['applicable_to'] = json_decode($rate['applicable_to'], true) ?? [];
    }

    // Get minimum wage
    $wageStmt = $pdo->prepare("
        SELECT amount, effective_from, notes
        FROM minimum_wage_history
        WHERE effective_from <= :date
          AND (effective_until IS NULL OR effective_until >= :date)
        ORDER BY effective_from DESC
        LIMIT 1
    ");
    $wageStmt->execute(['date' => $date]);
    $minimumWage = $wageStmt->fetch(PDO::FETCH_ASSOC);

    // Group rates by category
    $groupedRates = [
        'income_taxes' => [],
        'social_contributions' => [],
        'micro_enterprise' => [],
        'corporate' => [],
        'vat' => [],
        'other' => []
    ];

    foreach ($rates as $rate) {
        switch ($rate['tax_type']) {
            case 'income_tax':
                $groupedRates['income_taxes'][] = $rate;
                break;
            case 'cas':
            case 'cass':
            case 'cam':
                $groupedRates['social_contributions'][] = $rate;
                break;
            case 'micro_1':
            case 'micro_3':
                $groupedRates['micro_enterprise'][] = $rate;
                break;
            case 'profit_tax':
            case 'dividend_tax':
                $groupedRates['corporate'][] = $rate;
                break;
            case 'vat_19':
            case 'vat_9':
            case 'vat_5':
            case 'vat_0':
                $groupedRates['vat'][] = $rate;
                break;
            default:
                $groupedRates['other'][] = $rate;
        }
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'rates' => $rates,
            'grouped_rates' => $groupedRates,
            'minimum_wage' => $minimumWage ? [
                'amount' => (float)$minimumWage['amount'],
                'effective_from' => $minimumWage['effective_from'],
                'notes' => $minimumWage['notes']
            ] : null,
            'reference_date' => $date
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
