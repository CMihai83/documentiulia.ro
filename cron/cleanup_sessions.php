#!/usr/bin/env php
<?php
/**
 * Session Cleanup Cron Job
 * Removes expired sessions and temp files
 */

require_once __DIR__ . '/../api/config/Database.php';

echo "[" . date('Y-m-d H:i:s') . "] Starting cleanup...\n";

try {
    $db = Database::getInstance()->getConnection();

    // 1. Clean expired password reset tokens
    $stmt = $db->exec("DELETE FROM password_resets WHERE expires_at < NOW()");
    echo "Cleaned expired password reset tokens\n";

    // 2. Clean old audit logs (older than 90 days)
    $stmt = $db->exec("DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'");
    echo "Cleaned old audit logs\n";

    // 3. Clean orphaned upload files
    $uploadsDir = __DIR__ . '/../uploads/temp';
    if (is_dir($uploadsDir)) {
        $files = glob($uploadsDir . '/*');
        $now = time();
        $deleted = 0;
        foreach ($files as $file) {
            if (is_file($file) && ($now - filemtime($file)) > 86400) { // Older than 24 hours
                unlink($file);
                $deleted++;
            }
        }
        echo "Cleaned $deleted temp upload files\n";
    }

    // 4. Clean old notification read markers
    $stmt = $db->exec("DELETE FROM notification_reads WHERE created_at < NOW() - INTERVAL '30 days'");
    echo "Cleaned old notification markers\n";

    // 5. Vacuum analyze (PostgreSQL optimization)
    $db->exec("VACUUM ANALYZE");
    echo "Database vacuumed and analyzed\n";

    echo "[" . date('Y-m-d H:i:s') . "] Cleanup completed\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
