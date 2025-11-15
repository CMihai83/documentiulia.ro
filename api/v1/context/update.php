<?php
/**
 * Update Personal Context
 * PUT /api/v1/context/update
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../services/PersonalContextService.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['user_id'])) {
        throw new Exception('User ID is required');
    }

    if (empty($input['updates'])) {
        throw new Exception('Updates data is required');
    }

    $userId = $input['user_id'];
    $companyId = $input['company_id'] ?? null;
    $updates = $input['updates'];
    $changeReason = $input['change_reason'] ?? null;

    $contextService = new PersonalContextService();
    $context = $contextService->updateUserContext($userId, $updates, $companyId, $changeReason);

    echo json_encode([
        'success' => true,
        'message' => 'Personal context updated successfully',
        'context' => $context
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
