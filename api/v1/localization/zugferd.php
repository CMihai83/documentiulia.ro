<?php
/**
 * ZUGFeRD XML Generation API
 * POST /api/v1/localization/zugferd.php
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
    exit();
}

require_once __DIR__ . '/../../services/LocalizationService.php';

try {
    $invoice = json_decode(file_get_contents('php://input'), true);

    if (empty($invoice)) {
        throw new Exception('Invoice data is required');
    }

    $locService = LocalizationService::getInstance();
    $xml = $locService->generateZUGFeRDXML($invoice);

    // Return as XML
    header('Content-Type: application/xml');
    echo $xml;

} catch (Exception $e) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
