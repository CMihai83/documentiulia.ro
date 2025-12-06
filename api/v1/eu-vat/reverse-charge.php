<?php
/**
 * Reverse Charge Check API
 * GET /api/v1/eu-vat/reverse-charge.php?seller=RO&buyer=DE&buyer_has_vat=true
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
    $sellerCountry = $_GET['seller'] ?? null;
    $buyerCountry = $_GET['buyer'] ?? null;
    $buyerHasVAT = filter_var($_GET['buyer_has_vat'] ?? 'false', FILTER_VALIDATE_BOOLEAN);

    if (!$sellerCountry) {
        throw new Exception('Seller country is required');
    }
    if (!$buyerCountry) {
        throw new Exception('Buyer country is required');
    }

    $vatService = EUVATService::getInstance();
    $result = $vatService->checkReverseCharge($sellerCountry, $buyerCountry, $buyerHasVAT);

    echo json_encode([
        'success' => true,
        'data' => $result
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
