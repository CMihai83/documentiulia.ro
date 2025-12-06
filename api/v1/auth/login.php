<?php
/**
 * User Login Endpoint
 * POST /api/v1/auth/login
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// CRITICAL: Read input BEFORE any includes
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Load dependencies AFTER reading input
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    if (empty($input['email']) || empty($input['password'])) {
        throw new Exception('Email and password are required');
    }

    $auth = new AuthService();
    $result = $auth->login($input['email'], $input['password']);

    echo json_encode([
        'success' => true,
        'data' => $result
    ]);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
