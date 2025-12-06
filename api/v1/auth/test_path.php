<?php
echo json_encode([
    'dir' => __DIR__,
    'auth_path' => __DIR__ . '/../../auth/AuthService.php',
    'auth_exists' => file_exists(__DIR__ . '/../../auth/AuthService.php'),
    'helpers_path' => __DIR__ . '/../../helpers/headers.php',
    'helpers_exists' => file_exists(__DIR__ . '/../../helpers/headers.php')
]);
