<?php
/**
 * EU VAT Rates API
 * GET /api/v1/eu-vat/rates.php - Get all EU VAT rates
 * GET /api/v1/eu-vat/rates.php?country=RO - Get rates for specific country
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
    $countryCode = $_GET['country'] ?? null;

    $vatService = EUVATService::getInstance();
    $rates = $vatService->getVATRates($countryCode);

    echo json_encode([
        'success' => true,
        'data' => $countryCode ? $rates : ['countries' => $rates, 'count' => count($rates)]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
