<?php
/**
 * Login Debug Test
 */

header('Content-Type: application/json');

// Get raw input
$raw_input = file_get_contents('php://input');

// Decode JSON
$input = json_decode($raw_input, true);

// Debug output
echo json_encode([
    'raw_input' => $raw_input,
    'decoded_input' => $input,
    'email_empty' => empty($input['email']),
    'password_empty' => empty($input['password']),
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set'
], JSON_PRETTY_PRINT);
