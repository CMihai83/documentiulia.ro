<?php
/**
 * German VAT Filing Schedule API
 * GET /api/v1/localization/vat-schedule.php?previous_year_vat=5000
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
    $previousYearVAT = floatval($_GET['previous_year_vat'] ?? 0);

    $locService = LocalizationService::getInstance();
    $schedule = $locService->getVATFilingSchedule($previousYearVAT);

    echo json_encode([
        'success' => true,
        'data' => $schedule
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
