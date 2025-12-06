<?php
header('Content-Type: application/json');

$rawInput = file_get_contents('php://input');
$decoded = json_decode($rawInput, true);

echo json_encode([
    'raw_input' => $rawInput,
    'decoded' => $decoded,
    'post' => $_POST,
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set'
], JSON_PRETTY_PRINT);
