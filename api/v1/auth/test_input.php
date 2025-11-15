<?php
header('Content-Type: application/json');

$raw = file_get_contents('php://input');
$decoded = json_decode($raw, true);

echo json_encode([
    'raw_input' => $raw,
    'decoded' => $decoded,
    'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'not set',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'request_method' => $_SERVER['REQUEST_METHOD']
]);
