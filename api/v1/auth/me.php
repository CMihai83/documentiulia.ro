<?php
/**
 * Get current user info from JWT token
 * Endpoint: GET /api/v1/auth/me
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../auth/AuthService.php';

try {
    // Get JWT token from Authorization header
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (empty($authHeader)) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Authorization token required'
        ]);
        exit;
    }

    // Extract token (format: "Bearer <token>")
    $token = str_replace('Bearer ', '', $authHeader);

    // Use AuthService to verify token and get user
    $authService = new AuthService();
    $user = $authService->verifyToken($token);

    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or expired token'
        ]);
        exit;
    }

    // Get user's companies
    require_once __DIR__ . '/../../config/database.php';
    $db = Database::getInstance();
    $companies = $db->fetchAll(
        "SELECT c.id, c.name, cu.role
         FROM companies c
         JOIN company_users cu ON c.id = cu.company_id
         WHERE cu.user_id = $1",
        [$user['user_id']]
    );

    // Return user data with companies
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['user_id'],
            'email' => $user['email'] ?? '',
            'first_name' => $user['first_name'] ?? '',
            'last_name' => $user['last_name'] ?? '',
            'role' => $user['role'] ?? 'user',
            'status' => 'active'
        ],
        'companies' => $companies
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error',
        'error' => $e->getMessage()
    ]);
}
