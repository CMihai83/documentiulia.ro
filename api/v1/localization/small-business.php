<?php
/**
 * German Small Business Exemption Check API
 * GET /api/v1/localization/small-business.php?previous_year=20000&current_estimate=25000
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
    $previousYear = floatval($_GET['previous_year'] ?? 0);
    $currentEstimate = floatval($_GET['current_estimate'] ?? 0);

    if ($previousYear <= 0) {
        throw new Exception('previous_year revenue is required');
    }

    $locService = LocalizationService::getInstance();
    $result = $locService->checkSmallBusinessExemption($previousYear, $currentEstimate);

    echo json_encode([
        'success' => true,
        'data' => $result
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
