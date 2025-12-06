<?php
header('Content-Type: application/json');

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

echo json_encode([
    'success' => true,
    'raw_input' => $rawInput,
    'decoded_input' => $input,
    'post_data' => $_POST,
    'method' => $_SERVER['REQUEST_METHOD']
]);
