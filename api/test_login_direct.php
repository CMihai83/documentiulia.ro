<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    require_once __DIR__ . '/auth/AuthService.php';
    require_once __DIR__ . '/helpers/headers.php';
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    echo json_encode([
        'input_received' => $input,
        'email_empty' => empty($input['email']),
        'password_empty' => empty($input['password'])
    ]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
