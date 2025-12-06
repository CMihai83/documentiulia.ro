<?php
/**
 * Check PHP upload limits for receipt processing
 * GET /api/v1/test/check-upload-limits.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function return_bytes($val) {
    $val = trim($val);
    if (empty($val)) return 0;
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

$upload_max = ini_get('upload_max_filesize');
$post_max = ini_get('post_max_size');
$memory = ini_get('memory_limit');

$upload_bytes = return_bytes($upload_max);
$post_bytes = return_bytes($post_max);

$recommended_upload_bytes = 20 * 1024 * 1024; // 20MB

echo json_encode([
    'success' => true,
    'data' => [
        'php_version' => phpversion(),
        'current_settings' => [
            'upload_max_filesize' => $upload_max,
            'upload_max_filesize_bytes' => $upload_bytes,
            'post_max_size' => $post_max,
            'post_max_size_bytes' => $post_bytes,
            'memory_limit' => $memory
        ],
        'recommended_settings' => [
            'upload_max_filesize' => '20M',
            'post_max_size' => '25M',
            'memory_limit' => '256M',
            'reason' => 'Modern phone cameras produce 3-10MB photos'
        ],
        'status' => $upload_bytes >= $recommended_upload_bytes ? 'OK' : 'TOO_LOW',
        'can_upload_receipts' => $upload_bytes >= $recommended_upload_bytes,
        'max_photo_size_mb' => round($upload_bytes / (1024 * 1024), 1),
        'message' => $upload_bytes >= $recommended_upload_bytes
            ? 'Receipt upload configured correctly'
            : 'Upload limit too low for phone camera photos. Increase to 20M.'
    ]
], JSON_PRETTY_PRINT);
