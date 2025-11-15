<?php
header('Content-Type: application/json');
require_once __DIR__ . '/auth/AuthService.php';
require_once __DIR__ . '/helpers/headers.php';

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

$debug = [
    'raw_input' => $rawInput,
    'decoded_input' => $input,
    'email_present' => isset($input['email']),
    'password_present' => isset($input['password']),
    'email_empty' => empty($input['email']),
    'password_empty' => empty($input['password'])
];

if (empty($input['email']) || empty($input['password'])) {
    echo json_encode([
        'error' => 'Email and password are required',
        'debug' => $debug
    ], JSON_PRETTY_PRINT);
    exit;
}

try {
    $auth = new AuthService();
    $result = $auth->login($input['email'], $input['password']);
    echo json_encode([
        'success' => true,
        'data' => $result
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => $debug
    ], JSON_PRETTY_PRINT);
}
