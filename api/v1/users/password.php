<?php
/**
 * Change Password Endpoint
 * PUT /api/v1/users/password
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

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
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['current_password'])) {
        throw new Exception('Current password is required');
    }

    if (empty($input['new_password'])) {
        throw new Exception('New password is required');
    }

    if (strlen($input['new_password']) < 8) {
        throw new Exception('New password must be at least 8 characters');
    }

    $db = Database::getInstance();

    // Get current user
    $user = $db->fetchOne(
        "SELECT id, password_hash FROM users WHERE id = :id",
        ['id' => $userId]
    );

    if (!$user) {
        throw new Exception('User not found');
    }

    // Verify current password
    if (!password_verify($input['current_password'], $user['password_hash'])) {
        throw new Exception('Current password is incorrect');
    }

    // Hash new password
    $newPasswordHash = password_hash($input['new_password'], PASSWORD_DEFAULT);

    // Update password
    $db->update('users', ['password_hash' => $newPasswordHash], "id = '$userId'");

    echo json_encode([
        'success' => true,
        'message' => 'Password changed successfully'
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
