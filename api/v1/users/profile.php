<?php
/**
 * User Profile Endpoint
 * GET /api/v1/users/profile - Get current user profile
 * PUT /api/v1/users/profile - Update current user profile
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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

    $db = Database::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get user profile
        $user = $db->fetchOne(
            "SELECT id, email, first_name, last_name, role, status, created_at FROM users WHERE id = :id",
            ['id' => $userId]
        );

        if (!$user) {
            throw new Exception('User not found');
        }

        echo json_encode([
            'success' => true,
            'data' => $user
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        // Update user profile
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input)) {
            throw new Exception('No data provided');
        }

        $updateData = [];
        $allowedFields = ['first_name', 'last_name', 'email'];

        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $updateData[$field] = $input[$field];
            }
        }

        if (empty($updateData)) {
            throw new Exception('No valid fields to update');
        }

        // Check if email is already in use by another user
        if (isset($updateData['email'])) {
            $existing = $db->fetchOne(
                "SELECT id FROM users WHERE email = :email AND id != :id",
                ['email' => $updateData['email'], 'id' => $userId]
            );

            if ($existing) {
                throw new Exception('Email already in use');
            }
        }

        $db->update('users', $updateData, "id = '$userId'");

        // Get updated user
        $user = $db->fetchOne(
            "SELECT id, email, first_name, last_name, role, status, created_at FROM users WHERE id = :id",
            ['id' => $userId]
        );

        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => $user
        ]);

    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
