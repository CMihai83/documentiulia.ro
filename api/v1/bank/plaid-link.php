<?php
/**
 * Plaid Link Token Endpoint
 *
 * POST /api/v1/bank/plaid-link.php
 * Creates a Link token for Plaid Link initialization
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
require_once __DIR__ . '/../../adapters/PlaidAdapter.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    $plaid = new PlaidAdapter();

    if (!$plaid->isConfigured()) {
        echo json_encode([
            'success' => false,
            'message' => 'Plaid is not configured. Contact administrator.'
        ]);
        exit();
    }

    $result = $plaid->createLinkToken(
        $userData['user_id'],
        'Documentiulia',
        ['transactions'],
        ['RO', 'US', 'GB', 'DE', 'FR']
    );

    echo json_encode([
        'success' => true,
        'data' => $result
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
