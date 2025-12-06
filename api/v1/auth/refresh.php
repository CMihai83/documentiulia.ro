<?php
/**
 * Token Refresh Endpoint
 * GET /api/v1/auth/refresh.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authorization token required']);
        exit();
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Generate a new token with extended expiry
    $newToken = $auth->generateToken($userData['user_id'], $userData['email'], $userData['role']);

    echo json_encode([
        'success' => true,
        'data' => [
            'token' => $newToken,
            'user' => [
                'id' => $userData['user_id'],
                'email' => $userData['email'],
                'role' => $userData['role']
            ],
            'expires_in' => 2592000 // 30 days
        ]
    ]);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
