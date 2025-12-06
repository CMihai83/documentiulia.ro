<?php
/**
 * Romanian IBAN Validation API
 * GET /api/v1/bank/validate-iban.php?iban=RO49AAAA1B31007593840000
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/RomanianBankService.php';

$iban = $_GET['iban'] ?? '';

if (empty($iban)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'IBAN parameter required'
    ]);
    exit();
}

try {
    $bankService = RomanianBankService::getInstance();
    $result = $bankService->validateIBAN($iban);

    echo json_encode([
        'success' => true,
        'data' => $result
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
