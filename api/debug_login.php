<?php
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$raw_input = file_get_contents('php://input');
$decoded = json_decode($raw_input, true);

echo json_encode([
    'method' => $method,
    'raw_input' => $raw_input,
    'decoded' => $decoded,
    'email_empty' => empty($decoded['email']) ? 'YES' : 'NO',
    'password_empty' => empty($decoded['password']) ? 'YES' : 'NO',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none'
]);
