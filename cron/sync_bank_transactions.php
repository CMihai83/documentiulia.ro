#!/usr/bin/env php
<?php
/**
 * Bank Transaction Sync Cron Job
 * Syncs transactions from connected bank accounts
 */

require_once __DIR__ . '/../api/config/Database.php';
require_once __DIR__ . '/../api/services/BankIntegrationService.php';
require_once __DIR__ . '/../api/services/TransactionSyncService.php';

echo "[" . date('Y-m-d H:i:s') . "] Starting bank transaction sync...\n";

try {
    $db = Database::getInstance()->getConnection();

    // Get all active bank connections
    $stmt = $db->query("
        SELECT id, company_id, provider, account_id, last_sync_at
        FROM bank_connections
        WHERE status = 'active'
        AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '4 hours')
    ");

    $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($connections) . " connections to sync\n";

    $bankService = new BankIntegrationService();
    $syncService = new TransactionSyncService();

    foreach ($connections as $conn) {
        try {
            echo "Syncing connection {$conn['id']}...\n";

            // Sync transactions
            $result = $syncService->syncTransactions($conn['id']);

            echo "  - Added: {$result['added']}, Updated: {$result['updated']}\n";

            // Update last sync time
            $updateStmt = $db->prepare("
                UPDATE bank_connections
                SET last_sync_at = NOW(), last_sync_status = 'success'
                WHERE id = :id
            ");
            $updateStmt->execute([':id' => $conn['id']]);

        } catch (Exception $e) {
            echo "  ERROR: " . $e->getMessage() . "\n";

            // Update sync status to error
            $updateStmt = $db->prepare("
                UPDATE bank_connections
                SET last_sync_status = 'error', last_sync_error = :error
                WHERE id = :id
            ");
            $updateStmt->execute([
                ':id' => $conn['id'],
                ':error' => $e->getMessage()
            ]);
        }
    }

    echo "[" . date('Y-m-d H:i:s') . "] Bank sync completed\n";

} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
