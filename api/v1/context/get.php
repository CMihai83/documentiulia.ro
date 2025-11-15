<?php
/**
 * Get Personal Context
 * GET /api/v1/context/get
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
    $context = $contextService->getUserContext($userId, $companyId);

    if (!$context) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'No personal context found for this user'
        ]);
        exit();
    }

    echo json_encode([
        'success' => true,
        'context' => $context
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
