<?php
/**
 * Sync Status API
 * Returns current sync status and server timestamp
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

// Check authentication
$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;

$response = [
    'success' => true,
    'data' => [
        'server_time' => date('c'),
        'sync_enabled' => true,
        'sync_interval_seconds' => 300, // 5 minutes
        'offline_storage' => [
            'enabled' => true,
            'max_records' => 1000,
            'supported_types' => ['invoice', 'expense', 'contact', 'project', 'product'],
        ],
        'conflict_resolution' => 'server_wins', // or 'client_wins', 'manual'
        'compression_enabled' => true,
    ],
];

// Get last sync time for this user/company if stored
if ($companyId) {
    try {
        $db = getDbConnection();
        $stmt = $db->prepare("
            SELECT last_sync_at, pending_changes
            FROM sync_status
            WHERE company_id = :company_id AND user_id = :user_id
        ");
        $stmt->execute([
            'company_id' => $companyId,
            'user_id' => $user['user_id'],
        ]);
        $syncStatus = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($syncStatus) {
            $response['data']['last_sync'] = $syncStatus['last_sync_at'];
            $response['data']['pending_changes'] = (int)$syncStatus['pending_changes'];
        }
    } catch (Exception $e) {
        // Table may not exist, ignore
    }
}

echo json_encode($response, JSON_PRETTY_PRINT);
