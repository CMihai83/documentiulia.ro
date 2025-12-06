<?php
header('Content-Type: application/json');

$response = [
    'all_headers' => getallheaders(),
    'server_vars' => [
        'HTTP_X_COMPANY_ID' => $_SERVER['HTTP_X_COMPANY_ID'] ?? 'NOT SET',
        'HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET',
    ],
    'test' => 'success'
];

echo json_encode($response, JSON_PRETTY_PRINT);
