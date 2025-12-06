<?php
/**
 * German Localization API
 * GET /api/v1/localization/german.php - Get all German localization data
 * GET /api/v1/localization/german.php?section=accounts - Chart of accounts
 * GET /api/v1/localization/german.php?section=vat - VAT rules
 * GET /api/v1/localization/german.php?section=invoice - Invoice requirements
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../services/LocalizationService.php';

try {
    $section = $_GET['section'] ?? null;

    $locService = LocalizationService::getInstance();

    if ($section === 'accounts') {
        $data = $locService->getGermanChartOfAccounts();
    } elseif ($section === 'vat') {
        $data = $locService->getGermanVATRules();
    } elseif ($section === 'invoice') {
        $data = $locService->getGermanInvoiceRequirements();
    } else {
        $data = $locService->getLocalization('DE');
    }

    echo json_encode([
        'success' => true,
        'data' => $data
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
