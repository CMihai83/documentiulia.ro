<?php
/**
 * Labor Rates API
 * GET - Get default labor rates
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../services/ConstructionEstimateService.php';

try {
    $estimateService = ConstructionEstimateService::getInstance();
    $laborRates = $estimateService->getLaborRates();
    $materialCategories = $estimateService->getMaterialCategories();

    echo json_encode([
        'success' => true,
        'data' => [
            'labor_rates' => $laborRates,
            'material_categories' => $materialCategories
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
