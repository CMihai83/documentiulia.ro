<?php
// Test PHP configuration for receipt uploads
header('Content-Type: application/json');

echo json_encode([
    'php_version' => phpversion(),
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'memory_limit' => ini_get('memory_limit'),
    'max_execution_time' => ini_get('max_execution_time'),
    'upload_max_filesize_bytes' => return_bytes(ini_get('upload_max_filesize')),
    'recommended_for_receipts' => [
        'upload_max_filesize' => '20M (for phone camera photos)',
        'post_max_size' => '25M',
        'memory_limit' => '256M (for OCR processing)'
    ],
    'status' => return_bytes(ini_get('upload_max_filesize')) >= 20*1024*1024 ? 'OK' : 'NEEDS_INCREASE'
], JSON_PRETTY_PRINT);

function return_bytes($val) {
    $val = trim($val);
    $last = strtolower($val[strlen($val)-1]);
    $val = (int)$val;
    switch($last) {
        case 'g':
            $val *= 1024;
        case 'm':
            $val *= 1024;
        case 'k':
            $val *= 1024;
    }
    return $val;
}
