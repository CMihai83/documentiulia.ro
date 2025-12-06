<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Debug: Check raw input before includes
$raw_input = file_get_contents('php://input');
$input = json_decode($raw_input, true);

// Debug output
error_log("DEBUG - Raw input: " . $raw_input);
error_log("DEBUG - Decoded: " . print_r($input, true));

// Now include files
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

echo json_encode([
    'raw_input' => $raw_input,
    'decoded' => $input,
    'email' => $input['email'] ?? 'not found',
    'password' => $input['password'] ?? 'not found'
]);
