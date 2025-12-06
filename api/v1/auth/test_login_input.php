<?php
header('Content-Type: application/json');

// Get raw input
$raw = file_get_contents('php://input');

// Try to decode
$decoded = json_decode($raw, true);

// Return debug info
echo json_encode([
    'raw_input' => $raw,
    'decoded' => $decoded,
    'post' => $_POST,
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set'
]);
