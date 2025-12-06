<?php
/**
 * VIES VAT Validation API
 * GET /api/v1/eu-vat/validate.php?country=RO&vat=12345678
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
    $vatNumber = $_GET['vat'] ?? null;

    if (!$countryCode) {
        throw new Exception('Country code is required');
    }
    if (!$vatNumber) {
        throw new Exception('VAT number is required');
    }

    $vatService = EUVATService::getInstance();
    $result = $vatService->validateVAT($countryCode, $vatNumber);

    echo json_encode([
        'success' => true,
        'data' => $result
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
