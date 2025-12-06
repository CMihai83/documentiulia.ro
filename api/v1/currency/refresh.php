<?php
/**
 * Refresh ECB Exchange Rates API
 * POST /api/v1/currency/refresh.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../../services/CurrencyService.php';

try {
    $currencyService = CurrencyService::getInstance();

    $result = $currencyService->fetchECBRates();

    echo json_encode([
        'success' => true,
        'data' => $result,
        'message' => 'Exchange rates refreshed from ECB'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
