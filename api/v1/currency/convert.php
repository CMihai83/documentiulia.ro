<?php
/**
 * Currency Conversion API
 * Converts amounts between currencies with automatic rate lookup
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

$input = json_decode(file_get_contents('php://input'), true);

$amount = floatval($input['amount'] ?? 0);
$fromCurrency = strtoupper($input['from'] ?? 'EUR');
$toCurrency = strtoupper($input['to'] ?? 'RON');
$date = $input['date'] ?? date('Y-m-d');

if ($amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid amount required']);
    exit;
}

// Exchange rates (RON-based)
$ronRates = [
    'EUR' => 4.9750,
    'USD' => 4.5820,
    'GBP' => 5.8120,
    'CHF' => 5.1650,
    'HUF' => 0.01265,
    'PLN' => 1.1580,
    'CZK' => 0.1985,
    'BGN' => 2.5440,
    'RON' => 1.0,
];

if (!isset($ronRates[$fromCurrency]) || !isset($ronRates[$toCurrency])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Unsupported currency']);
    exit;
}

// Convert: FROM -> RON -> TO
$amountInRon = $amount * $ronRates[$fromCurrency];
$convertedAmount = $amountInRon / $ronRates[$toCurrency];
$exchangeRate = $ronRates[$fromCurrency] / $ronRates[$toCurrency];

echo json_encode([
    'success' => true,
    'data' => [
        'original_amount' => $amount,
        'original_currency' => $fromCurrency,
        'converted_amount' => round($convertedAmount, 2),
        'target_currency' => $toCurrency,
        'exchange_rate' => round($exchangeRate, 6),
        'date' => $date,
        'ron_equivalent' => round($amountInRon, 2),
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
