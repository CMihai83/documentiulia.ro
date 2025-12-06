<?php
/**
 * Supported Localizations API
 * GET /api/v1/localization/countries.php - List supported localizations
 * GET /api/v1/localization/countries.php?code=DE - Get specific country localization
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
    $countryCode = $_GET['code'] ?? null;

    $locService = LocalizationService::getInstance();

    if ($countryCode) {
        $data = $locService->getLocalization($countryCode);
    } else {
        $data = [
            'localizations' => $locService->getSupportedLocalizations(),
            'count' => count($locService->getSupportedLocalizations())
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $data
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
