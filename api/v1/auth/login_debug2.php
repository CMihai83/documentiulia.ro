<?php
header('Content-Type: application/json');
error_log("=== LOGIN DEBUG START ===");

// Check request method
error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);

// Try to read raw input
$rawInput = file_get_contents('php://input');
error_log("Raw Input Length: " . strlen($rawInput));
error_log("Raw Input: " . $rawInput);

// Try to decode
$input = json_decode($rawInput, true);
error_log("Decoded Input: " . print_r($input, true));
error_log("JSON Last Error: " . json_last_error_msg());

// Check $_POST
error_log("POST vars: " . print_r($_POST, true));

// Check content type
error_log("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'NOT SET'));

echo json_encode([
    'raw_length' => strlen($rawInput),
    'raw_input' => $rawInput,
    'decoded' => $input,
    'json_error' => json_last_error_msg(),
    'post' => $_POST,
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'NOT SET',
    'request_method' => $_SERVER['REQUEST_METHOD']
], JSON_PRETTY_PRINT);
