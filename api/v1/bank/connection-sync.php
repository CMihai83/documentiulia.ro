<?php
/**
 * Trigger transaction sync for a connection
 *
 * POST /api/v1/bank/connection-sync
 * Body: { "connection_id": "uuid", "from_date": "2025-01-01", "to_date": "2025-01-21" }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../services/TransactionSyncService.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authentication
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['connection_id']) || empty($input['connection_id'])) {
        throw new Exception('Connection ID required');
    }

    $connectionId = $input['connection_id'];
    $fromDate = $input['from_date'] ?? null;
    $toDate = $input['to_date'] ?? null;

    // Trigger sync
    $syncService = new TransactionSyncService();
    $stats = $syncService->syncTransactions($connectionId, $fromDate, $toDate);

    echo json_encode([
        'success' => true,
        'data' => $stats,
        'message' => sprintf(
            'Sync completed: %d fetched, %d new, %d updated, %d duplicates',
            $stats['fetched'],
            $stats['new'],
            $stats['updated'],
            $stats['duplicate']
        )
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
