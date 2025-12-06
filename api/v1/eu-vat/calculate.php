<?php
/**
 * VAT Calculation API
 * GET /api/v1/eu-vat/calculate.php?amount=100&country=RO&rate_type=standard&includes_vat=false
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/EUVATService.php';

try {
    $amount = floatval($_GET['amount'] ?? 0);
    $countryCode = $_GET['country'] ?? null;
    $rateType = $_GET['rate_type'] ?? 'standard';
    $includesVAT = filter_var($_GET['includes_vat'] ?? 'false', FILTER_VALIDATE_BOOLEAN);

    if ($amount <= 0) {
        throw new Exception('Valid amount is required');
    }
    if (!$countryCode) {
        throw new Exception('Country code is required');
    }

    $vatService = EUVATService::getInstance();
    $result = $vatService->calculateVAT($amount, $countryCode, $rateType, $includesVAT);

    echo json_encode([
        'success' => true,
        'data' => $result
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
