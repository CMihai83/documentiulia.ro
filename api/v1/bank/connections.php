<?php
/**
 * Bank Connections Management
 *
 * GET /api/v1/bank/connections - List all connections
 * POST /api/v1/bank/connections - Initiate new connection
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

    // Get company ID
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $bankService = new BankIntegrationService();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // List connections
        $status = $_GET['status'] ?? null;
        $connections = $bankService->listConnections($companyId, $status);

        echo json_encode([
            'success' => true,
            'data' => $connections,
            'count' => count($connections)
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Initiate new connection
        $input = json_decode(file_get_contents('php://input'), true);

        // Validate input
        $required = ['provider', 'institution_id', 'redirect_url'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || empty($input[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }

        $result = $bankService->initiateConnection(
            $companyId,
            $userData['user_id'],
            $input['provider'],
            $input['institution_id'],
            $input['redirect_url']
        );

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'data' => $result,
            'message' => 'Connection initiated. Please redirect user to auth_url.'
        ]);
    }

} catch (Throwable $e) {
    $statusCode = is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
