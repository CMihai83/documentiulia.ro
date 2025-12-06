<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$raw = file_get_contents('php://input');
$decoded = json_decode($raw, true);

echo json_encode([
    'raw_input_length' => strlen($raw),
    'raw_input' => $raw,
    'decoded' => $decoded,
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'not set'
]);
