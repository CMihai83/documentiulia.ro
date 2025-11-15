<?php
/**
 * Export Personal Context
 * GET /api/v1/context/export
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/PersonalContextService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    $userId = $_GET['user_id'] ?? null;
    $companyId = $_GET['company_id'] ?? null;

    if (empty($userId)) {
        throw new Exception('User ID is required');
    }

    $contextService = new PersonalContextService();
    $export = $contextService->exportContext($userId, $companyId);

    // Set headers for file download
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="' . $export['filename'] . '"');

    echo json_encode($export['context'], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
