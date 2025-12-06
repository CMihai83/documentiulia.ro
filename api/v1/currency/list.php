<?php
/**
 * List All Currencies API
 * GET /api/v1/currency/list.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/CurrencyService.php';

try {
    $currencyService = CurrencyService::getInstance();

    $activeOnly = ($_GET['active'] ?? 'true') === 'true';
    $euOnly = ($_GET['eu_only'] ?? 'false') === 'true';

    if ($euOnly) {
        $currencies = $currencyService->getEUCurrencies();
    } else {
        $currencies = $currencyService->getAllCurrencies($activeOnly);
    }

    echo json_encode([
        'success' => true,
        'data' => $currencies,
        'count' => count($currencies)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
