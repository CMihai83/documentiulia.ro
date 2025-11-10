<?php
/**
 * User Registration Endpoint
 * POST /api/v1/auth/register
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../auth/AuthService.php';

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    $required = ['email', 'password', 'first_name', 'last_name'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("Field '$field' is required");
        }
    }

    // Validate password strength
    if (strlen($input['password']) < 8) {
        throw new Exception('Password must be at least 8 characters');
    }

    $auth = new AuthService();
    $user = $auth->register(
        $input['email'],
        $input['password'],
        $input['first_name'],
        $input['last_name']
    );

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'User registered successfully',
        'data' => $user
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
