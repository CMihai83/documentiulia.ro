<?php
header('Content-Type: application/json');
echo json_encode([
    'server_vars' => $_SERVER,
    'working' => true
]);
