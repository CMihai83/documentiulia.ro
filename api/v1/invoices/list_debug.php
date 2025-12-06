<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../helpers/headers.php';
$authHeader = getHeader('authorization', '');
$allHeaders = getAllHeadersCaseInsensitive();
echo json_encode([
    'auth_header' => $authHeader,
    'all_headers' => $allHeaders,
    'server' => $_SERVER
]);
