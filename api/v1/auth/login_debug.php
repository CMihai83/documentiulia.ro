<?php
/**
 * Debug Login Endpoint
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Read input FIRST
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Debug output
echo json_encode([
    'debug' => true,
    'raw_input_length' => strlen($rawInput),
    'raw_input' => $rawInput,
    'decoded_input' => $input,
    'email_isset' => isset($input['email']),
    'password_isset' => isset($input['password']),
    'email_empty' => empty($input['email']),
    'password_empty' => empty($input['password']),
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set'
]);
