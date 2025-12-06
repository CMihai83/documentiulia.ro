<?php
/**
 * Backup Settings API
 * Manage backup configuration and schedules
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Admin-only for backup settings
if (!in_array($user['role'], ['admin'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot gestiona backup-urile',
        'error' => 'Only administrators can manage backups'
    ]);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Backup types
$backupTypes = [
    'full' => ['ro' => 'Complet', 'en' => 'Full', 'description_ro' => 'Toate datele și fișierele', 'description_en' => 'All data and files'],
    'database' => ['ro' => 'Bază de date', 'en' => 'Database', 'description_ro' => 'Doar baza de date', 'description_en' => 'Database only'],
    'files' => ['ro' => 'Fișiere', 'en' => 'Files', 'description_ro' => 'Doar fișierele', 'description_en' => 'Files only'],
    'incremental' => ['ro' => 'Incremental', 'en' => 'Incremental', 'description_ro' => 'Doar modificările', 'description_en' => 'Changes only'],
];

// Backup frequencies
$backupFrequencies = [
    'hourly' => ['ro' => 'Orar', 'en' => 'Hourly'],
    'daily' => ['ro' => 'Zilnic', 'en' => 'Daily'],
    'weekly' => ['ro' => 'Săptămânal', 'en' => 'Weekly'],
    'monthly' => ['ro' => 'Lunar', 'en' => 'Monthly'],
    'manual' => ['ro' => 'Manual', 'en' => 'Manual'],
];

// Backup statuses
$backupStatuses = [
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending', 'color' => '#9E9E9E'],
    'in_progress' => ['ro' => 'În desfășurare', 'en' => 'In Progress', 'color' => '#2196F3'],
    'completed' => ['ro' => 'Finalizat', 'en' => 'Completed', 'color' => '#4CAF50'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed', 'color' => '#F44336'],
    'cancelled' => ['ro' => 'Anulat', 'en' => 'Cancelled', 'color' => '#FF9800'],
];

// Storage providers
$storageProviders = [
    'local' => ['ro' => 'Local', 'en' => 'Local', 'icon' => 'folder'],
    'aws_s3' => ['ro' => 'Amazon S3', 'en' => 'Amazon S3', 'icon' => 'cloud'],
    'google_cloud' => ['ro' => 'Google Cloud', 'en' => 'Google Cloud', 'icon' => 'cloud'],
    'azure_blob' => ['ro' => 'Azure Blob', 'en' => 'Azure Blob', 'icon' => 'cloud'],
    'dropbox' => ['ro' => 'Dropbox', 'en' => 'Dropbox', 'icon' => 'cloud'],
    'ftp' => ['ro' => 'FTP', 'en' => 'FTP', 'icon' => 'dns'],
    'sftp' => ['ro' => 'SFTP', 'en' => 'SFTP', 'icon' => 'security'],
];

// Retention policies
$retentionPolicies = [
    '7_days' => ['ro' => '7 zile', 'en' => '7 days', 'days' => 7],
    '30_days' => ['ro' => '30 zile', 'en' => '30 days', 'days' => 30],
    '90_days' => ['ro' => '90 zile', 'en' => '90 days', 'days' => 90],
    '1_year' => ['ro' => '1 an', 'en' => '1 year', 'days' => 365],
    '5_years' => ['ro' => '5 ani', 'en' => '5 years', 'days' => 1825],
    'forever' => ['ro' => 'Permanent', 'en' => 'Forever', 'days' => null],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'settings';

            if ($action === 'settings') {
                // Get backup settings
                $stmt = $db->prepare("SELECT * FROM backup_settings WHERE company_id = :company_id");
                $stmt->execute(['company_id' => $companyId]);
                $settings = $stmt->fetch(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'settings' => $settings ?: [
                            'backup_enabled' => false,
                            'backup_type' => 'full',
                            'frequency' => 'daily',
                            'storage_provider' => 'local',
                            'retention_policy' => '30_days',
                        ],
                        'types' => $backupTypes,
                        'frequencies' => $backupFrequencies,
                        'providers' => $storageProviders,
                        'retention_policies' => $retentionPolicies,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'history') {
                // Get backup history
                $limit = intval($_GET['limit'] ?? 20);
                $offset = intval($_GET['offset'] ?? 0);

                $stmt = $db->prepare("
                    SELECT * FROM backup_history 
                    WHERE company_id = :company_id 
                    ORDER BY created_at DESC 
                    LIMIT $limit OFFSET $offset
                ");
                $stmt->execute(['company_id' => $companyId]);
                $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($history as &$backup) {
                    $backup['type_config'] = $backupTypes[$backup['backup_type']] ?? null;
                    $backup['status_config'] = $backupStatuses[$backup['status']] ?? null;
                    $backup['metadata'] = json_decode($backup['metadata'] ?? '{}', true);
                }

                // Get total count
                $stmt = $db->prepare("SELECT COUNT(*) FROM backup_history WHERE company_id = :company_id");
                $stmt->execute(['company_id' => $companyId]);
                $total = $stmt->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'backups' => $history,
                        'total' => intval($total),
                        'limit' => $limit,
                        'offset' => $offset,
                        'statuses' => $backupStatuses,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'stats') {
                // Get backup statistics
                $stmt = $db->prepare("
                    SELECT 
                        COUNT(*) as total_backups,
                        COUNT(*) FILTER (WHERE status = 'completed') as successful,
                        COUNT(*) FILTER (WHERE status = 'failed') as failed,
                        SUM(size_bytes) FILTER (WHERE status = 'completed') as total_size,
                        MAX(created_at) FILTER (WHERE status = 'completed') as last_successful
                    FROM backup_history
                    WHERE company_id = :company_id
                ");
                $stmt->execute(['company_id' => $companyId]);
                $stats = $stmt->fetch(PDO::FETCH_ASSOC);

                // Get next scheduled
                $stmt = $db->prepare("SELECT next_backup_at FROM backup_settings WHERE company_id = :company_id");
                $stmt->execute(['company_id' => $companyId]);
                $nextBackup = $stmt->fetchColumn();

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'total_backups' => intval($stats['total_backups']),
                        'successful' => intval($stats['successful']),
                        'failed' => intval($stats['failed']),
                        'total_size_bytes' => intval($stats['total_size'] ?? 0),
                        'total_size_formatted' => formatBytes($stats['total_size'] ?? 0),
                        'last_successful' => $stats['last_successful'],
                        'next_scheduled' => $nextBackup,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);

            // Validate inputs
            $backupEnabled = $input['backup_enabled'] ?? false;
            $backupType = $input['backup_type'] ?? 'full';
            $frequency = $input['frequency'] ?? 'daily';
            $storageProvider = $input['storage_provider'] ?? 'local';
            $retentionPolicy = $input['retention_policy'] ?? '30_days';
            $notifyEmail = $input['notify_email'] ?? null;
            $notifyOnFailure = $input['notify_on_failure'] ?? true;
            $notifyOnSuccess = $input['notify_on_success'] ?? false;
            $encryptBackups = $input['encrypt_backups'] ?? false;
            $compressionLevel = $input['compression_level'] ?? 6;

            if (!isset($backupTypes[$backupType])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid backup type']);
                exit;
            }
            if (!isset($backupFrequencies[$frequency])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid frequency']);
                exit;
            }

            // Calculate next backup
            $nextBackup = calculateNextBackup($frequency);

            $stmt = $db->prepare("
                INSERT INTO backup_settings (
                    company_id, backup_enabled, backup_type, frequency, storage_provider, retention_policy,
                    notify_email, notify_on_failure, notify_on_success, encrypt_backups, compression_level,
                    next_backup_at, updated_at
                ) VALUES (
                    :company_id, :enabled, :type, :frequency, :provider, :retention,
                    :email, :notify_fail, :notify_success, :encrypt, :compression,
                    :next_backup, NOW()
                )
                ON CONFLICT (company_id)
                DO UPDATE SET 
                    backup_enabled = EXCLUDED.backup_enabled,
                    backup_type = EXCLUDED.backup_type,
                    frequency = EXCLUDED.frequency,
                    storage_provider = EXCLUDED.storage_provider,
                    retention_policy = EXCLUDED.retention_policy,
                    notify_email = EXCLUDED.notify_email,
                    notify_on_failure = EXCLUDED.notify_on_failure,
                    notify_on_success = EXCLUDED.notify_on_success,
                    encrypt_backups = EXCLUDED.encrypt_backups,
                    compression_level = EXCLUDED.compression_level,
                    next_backup_at = EXCLUDED.next_backup_at,
                    updated_at = NOW()
            ");
            $stmt->execute([
                'company_id' => $companyId,
                'enabled' => $backupEnabled ? 1 : 0,
                'type' => $backupType,
                'frequency' => $frequency,
                'provider' => $storageProvider,
                'retention' => $retentionPolicy,
                'email' => $notifyEmail,
                'notify_fail' => $notifyOnFailure ? 1 : 0,
                'notify_success' => $notifyOnSuccess ? 1 : 0,
                'encrypt' => $encryptBackups ? 1 : 0,
                'compression' => $compressionLevel,
                'next_backup' => $nextBackup,
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Setările de backup au fost actualizate',
                'message_en' => 'Backup settings updated',
                'data' => [
                    'next_backup' => $nextBackup,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'create';

            if ($action === 'create' || $action === 'manual') {
                // Create manual backup
                $backupType = $input['backup_type'] ?? 'full';

                $backupId = 'bkp_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO backup_history (
                        id, company_id, backup_type, status, initiated_by, created_at
                    ) VALUES (
                        :id, :company_id, :type, 'pending', :user_id, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $backupId,
                    'company_id' => $companyId,
                    'type' => $backupType,
                    'user_id' => $user['user_id'],
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Backup-ul a fost inițiat',
                    'message_en' => 'Backup initiated',
                    'data' => [
                        'backup_id' => $backupId,
                        'status' => 'pending',
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'restore') {
                // Initiate restore
                $backupId = $input['backup_id'] ?? null;

                if (!$backupId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Backup ID required']);
                    exit;
                }

                // Verify backup exists and is completed
                $stmt = $db->prepare("
                    SELECT * FROM backup_history 
                    WHERE id = :id AND company_id = :company_id AND status = 'completed'
                ");
                $stmt->execute(['id' => $backupId, 'company_id' => $companyId]);
                $backup = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$backup) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Backup-ul nu a fost găsit sau nu este complet',
                        'error' => 'Backup not found or not completed'
                    ]);
                    exit;
                }

                // Create restore job
                $restoreId = 'rst_' . bin2hex(random_bytes(8));
                $stmt = $db->prepare("
                    INSERT INTO restore_history (
                        id, company_id, backup_id, status, initiated_by, created_at
                    ) VALUES (
                        :id, :company_id, :backup_id, 'pending', :user_id, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $restoreId,
                    'company_id' => $companyId,
                    'backup_id' => $backupId,
                    'user_id' => $user['user_id'],
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Restaurarea a fost inițiată',
                    'message_en' => 'Restore initiated',
                    'data' => [
                        'restore_id' => $restoreId,
                        'backup_id' => $backupId,
                        'status' => 'pending',
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'download') {
                // Get download link for backup
                $backupId = $input['backup_id'] ?? null;

                if (!$backupId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Backup ID required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT file_path FROM backup_history 
                    WHERE id = :id AND company_id = :company_id AND status = 'completed'
                ");
                $stmt->execute(['id' => $backupId, 'company_id' => $companyId]);
                $filePath = $stmt->fetchColumn();

                if (!$filePath) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Fișierul de backup nu a fost găsit',
                        'error' => 'Backup file not found'
                    ]);
                    exit;
                }

                // Generate temporary download URL
                $downloadToken = bin2hex(random_bytes(16));
                $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

                $stmt = $db->prepare("
                    INSERT INTO download_tokens (token, backup_id, company_id, expires_at, created_at)
                    VALUES (:token, :backup_id, :company_id, :expires, NOW())
                ");
                $stmt->execute([
                    'token' => $downloadToken,
                    'backup_id' => $backupId,
                    'company_id' => $companyId,
                    'expires' => $expiresAt,
                ]);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'download_url' => "/api/v1/settings/backup-download.php?token=$downloadToken",
                        'expires_at' => $expiresAt,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function formatBytes($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}

function calculateNextBackup($frequency) {
    $now = new DateTime();
    switch ($frequency) {
        case 'hourly':
            $now->modify('+1 hour');
            $now->setTime($now->format('H'), 0, 0);
            break;
        case 'daily':
            $now->modify('+1 day');
            $now->setTime(2, 0, 0);
            break;
        case 'weekly':
            $now->modify('next monday');
            $now->setTime(2, 0, 0);
            break;
        case 'monthly':
            $now->modify('first day of next month');
            $now->setTime(2, 0, 0);
            break;
        default:
            return null;
    }
    return $now->format('Y-m-d H:i:s');
}
