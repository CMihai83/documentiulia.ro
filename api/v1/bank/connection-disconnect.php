<?php
/**
 * Disconnect and revoke bank connection
 *
 * POST /api/v1/bank/connection-disconnect
 * Body: { "connection_id": "uuid" }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/BankIntegrationService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['connection_id']) || empty($input['connection_id'])) {
        throw new Exception('Connection ID required');
    }

    $connectionId = $input['connection_id'];

    // Disconnect
    $bankService = new BankIntegrationService();
    $success = $bankService->disconnectConnection($connectionId);

    if (!$success) {
        throw new Exception('Failed to disconnect connection');
    }

    echo json_encode([
        'success' => true,
        'message' => 'Bank connection disconnected successfully'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
