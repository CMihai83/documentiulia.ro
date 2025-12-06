<?php
/**
 * Romanian Invoice Template Types API
 * GET /api/v1/templates/invoice-types.php
 * Returns available invoice template types for Romanian market
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/RomanianInvoiceTemplateService.php';

try {
    $templateService = RomanianInvoiceTemplateService::getInstance();
    $types = $templateService->getTemplateTypes();

    echo json_encode([
        'success' => true,
        'data' => [
            'types' => $types,
            'default' => 'factura'
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
