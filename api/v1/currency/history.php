<?php
/**
 * Currency History API
 * Historical exchange rates for reporting and analysis
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

$fromDate = $_GET['from'] ?? date('Y-m-d', strtotime('-30 days'));
$toDate = $_GET['to'] ?? date('Y-m-d');
$baseCurrency = strtoupper($_GET['base'] ?? 'RON');
$targetCurrency = strtoupper($_GET['target'] ?? 'EUR');

// Simulated historical data (in production, from database/BNR)
$history = [];
$currentDate = new DateTime($fromDate);
$endDate = new DateTime($toDate);

// Base rates with slight variations
$baseRates = [
    'EUR' => 4.9750,
    'USD' => 4.5820,
    'GBP' => 5.8120,
    'CHF' => 5.1650,
    'RON' => 1.0,
];

while ($currentDate <= $endDate) {
    // Add small random variation (±1%)
    $variation = 1 + (mt_rand(-100, 100) / 10000);
    $ronRate = ($baseRates[$targetCurrency] ?? 1.0) * $variation;
    
    if ($baseCurrency === 'RON') {
        $rate = $ronRate;
    } else {
        $baseToRon = ($baseRates[$baseCurrency] ?? 1.0) * $variation;
        $rate = $ronRate / $baseToRon;
    }

    $history[] = [
        'date' => $currentDate->format('Y-m-d'),
        'rate' => round($rate, 6),
    ];

    $currentDate->modify('+1 day');
}

// Calculate statistics
$rates = array_column($history, 'rate');
$stats = [
    'min' => round(min($rates), 6),
    'max' => round(max($rates), 6),
    'average' => round(array_sum($rates) / count($rates), 6),
    'start_rate' => $history[0]['rate'],
    'end_rate' => $history[count($history) - 1]['rate'],
    'change_percent' => round((($history[count($history) - 1]['rate'] - $history[0]['rate']) / $history[0]['rate']) * 100, 2),
];

echo json_encode([
    'success' => true,
    'data' => [
        'base_currency' => $baseCurrency,
        'target_currency' => $targetCurrency,
        'period' => [
            'from' => $fromDate,
            'to' => $toDate,
            'days' => count($history),
        ],
        'statistics' => $stats,
        'history' => $history,
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
