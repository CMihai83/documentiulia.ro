<?php
/**
 * Get account balance for a connection
 *
 * GET /api/v1/bank/balance?connection_id=uuid
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

    // Get connection ID
    if (!isset($_GET['connection_id']) || empty($_GET['connection_id'])) {
        throw new Exception('Connection ID required');
    }

    $connectionId = $_GET['connection_id'];

    // Get balance
    $bankService = new BankIntegrationService();
    $balance = $bankService->getBalance($connectionId);

    echo json_encode([
        'success' => true,
        'data' => $balance
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
