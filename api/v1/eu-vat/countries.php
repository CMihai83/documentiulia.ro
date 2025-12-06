<?php
/**
 * EU Countries List API
 * GET /api/v1/eu-vat/countries.php
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
    $vatService = EUVATService::getInstance();
    $countries = $vatService->getEUCountries();

    // Get country names from VAT rates table
    $rates = $vatService->getVATRates();
    $countryDetails = [];

    foreach ($rates as $rate) {
        $countryDetails[] = [
            'code' => $rate['country_code'],
            'name' => $rate['country_name'],
            'standard_rate' => $rate['standard_rate']
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'countries' => $countryDetails,
            'count' => count($countryDetails)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
