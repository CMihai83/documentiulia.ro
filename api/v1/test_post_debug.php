<?php
header('Content-Type: application/json');

$debug = [
    'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'] ?? 'not set',
    'CONTENT_TYPE' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'CONTENT_LENGTH' => $_SERVER['CONTENT_LENGTH'] ?? 'not set',
    'php_input' => file_get_contents('php://input'),
    '_POST' => $_POST,
    '_REQUEST' => $_REQUEST,
    'HTTP_HEADERS' => getallheaders(),
    'SERVER_VARS' => [
        'SCRIPT_FILENAME' => $_SERVER['SCRIPT_FILENAME'] ?? 'not set',
        'DOCUMENT_ROOT' => $_SERVER['DOCUMENT_ROOT'] ?? 'not set',
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'not set',
    ]
];

echo json_encode($debug, JSON_PRETTY_PRINT);
