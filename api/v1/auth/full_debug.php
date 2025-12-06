<?php
header('Content-Type: application/json');

// Log everything
$debug = [
    'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'not set',
    'CONTENT_TYPE' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'CONTENT_LENGTH' => $_SERVER['CONTENT_LENGTH'] ?? 'not set',
    'raw_input' => file_get_contents('php://input'),
    'php_input_decoded' => json_decode(file_get_contents('php://input'), true),
    'POST_data' => $_POST,
    'headers' => function_exists('getallheaders') ? getallheaders() : 'getallheaders not available',
    'fastcgi_params' => [
        'HTTP_CONTENT_TYPE' => $_SERVER['HTTP_CONTENT_TYPE'] ?? 'not set',
        'HTTP_CONTENT_LENGTH' => $_SERVER['HTTP_CONTENT_LENGTH'] ?? 'not set',
    ]
];

echo json_encode($debug, JSON_PRETTY_PRINT);
