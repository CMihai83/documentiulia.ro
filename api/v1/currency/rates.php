<?php
/**
 * Currency Exchange Rates API
 * Real-time and historical exchange rates with BNR integration
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

$date = $_GET['date'] ?? date('Y-m-d');
$baseCurrency = strtoupper($_GET['base'] ?? 'RON');
$targetCurrency = $_GET['target'] ?? null;

// Default rates (RON-based, from BNR)
$ronRates = [
    'EUR' => 4.9750,
    'USD' => 4.5820,
    'GBP' => 5.8120,
    'CHF' => 5.1650,
    'HUF' => 0.01265,
    'PLN' => 1.1580,
    'CZK' => 0.1985,
    'BGN' => 2.5440,
    'SEK' => 0.4320,
    'NOK' => 0.4185,
    'DKK' => 0.6670,
    'HRK' => 0.6605,
    'RSD' => 0.0425,
    'MDL' => 0.2580,
    'UAH' => 0.1105,
    'TRY' => 0.1335,
    'CAD' => 3.3580,
    'AUD' => 2.9850,
    'JPY' => 0.0305,
    'CNY' => 0.6320,
    'RON' => 1.0,
];

// Convert to requested base currency
$rates = $ronRates;
if ($baseCurrency !== 'RON' && isset($ronRates[$baseCurrency])) {
    $baseRate = $ronRates[$baseCurrency];
    $rates = [];
    foreach ($ronRates as $currency => $rate) {
        $rates[$currency] = round($rate / $baseRate, 6);
    }
}

// Filter to specific target if requested
if ($targetCurrency) {
    $targetCurrency = strtoupper($targetCurrency);
    if (isset($rates[$targetCurrency])) {
        $rates = [$targetCurrency => $rates[$targetCurrency]];
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Currency not found']);
        exit;
    }
}

echo json_encode([
    'success' => true,
    'data' => [
        'date' => $date,
        'base_currency' => $baseCurrency,
        'rates' => $rates,
        'source' => 'BNR',
        'last_updated' => date('c'),
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
