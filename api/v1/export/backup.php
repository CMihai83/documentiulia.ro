<?php
/**
 * Full Data Backup API
 * Export all company data for backup/migration
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

// Check if user has admin role
if ($user['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Doar administratorii pot crea backup-uri',
        'error' => 'Only administrators can create backups'
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Tables to backup
$backupTables = [
    'contacts' => 'Contacte / Contacts',
    'products' => 'Produse / Products',
    'invoices' => 'Facturi / Invoices',
    'invoice_items' => 'Articole Factură / Invoice Items',
    'expenses' => 'Cheltuieli / Expenses',
    'bills' => 'Facturi Furnizori / Bills',
    'employees' => 'Angajați / Employees',
    'projects' => 'Proiecte / Projects',
    'tasks' => 'Sarcini / Tasks',
    'time_entries' => 'Pontaj / Time Entries',
    'bank_accounts' => 'Conturi Bancare / Bank Accounts',
    'bank_transactions' => 'Tranzacții Bancare / Bank Transactions',
    'chart_of_accounts' => 'Plan de Conturi / Chart of Accounts',
    'journal_entries' => 'Note Contabile / Journal Entries',
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        // Get backup status and history
        $stmt = $db->prepare("
            SELECT *
            FROM backup_jobs
            WHERE company_id = :company_id
            ORDER BY created_at DESC
            LIMIT 10
        ");
        $stmt->execute(['company_id' => $companyId]);
        $backups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get data counts
        $counts = [];
        foreach (array_keys($backupTables) as $table) {
            try {
                $countStmt = $db->prepare("SELECT COUNT(*) FROM $table WHERE company_id = :company_id");
                $countStmt->execute(['company_id' => $companyId]);
                $counts[$table] = intval($countStmt->fetchColumn());
            } catch (Exception $e) {
                $counts[$table] = 0;
            }
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'available_tables' => $backupTables,
                'record_counts' => $counts,
                'total_records' => array_sum($counts),
                'recent_backups' => $backups,
                'backup_formats' => [
                    ['id' => 'json', 'label' => 'JSON (Recomandat / Recommended)', 'description_ro' => 'Format complet cu structură', 'description_en' => 'Full format with structure'],
                    ['id' => 'csv_zip', 'label' => 'CSV Archive', 'description_ro' => 'Fișiere CSV arhivate', 'description_en' => 'Archived CSV files'],
                ],
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $format = $input['format'] ?? 'json';
        $tables = $input['tables'] ?? array_keys($backupTables);
        $includeAttachments = $input['include_attachments'] ?? false;

        // Create backup job
        $backupId = 'bkp_' . bin2hex(random_bytes(12));
        $stmt = $db->prepare("
            INSERT INTO backup_jobs (id, company_id, format, tables, status, created_by, created_at)
            VALUES (:id, :company_id, :format, :tables, 'processing', :created_by, NOW())
        ");
        $stmt->execute([
            'id' => $backupId,
            'company_id' => $companyId,
            'format' => $format,
            'tables' => json_encode($tables),
            'created_by' => $user['user_id'],
        ]);

        // Perform backup
        $backupData = [];
        $totalRecords = 0;

        foreach ($tables as $table) {
            if (!isset($backupTables[$table])) continue;

            try {
                $stmt = $db->prepare("SELECT * FROM $table WHERE company_id = :company_id");
                $stmt->execute(['company_id' => $companyId]);
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $backupData[$table] = [
                    'label' => $backupTables[$table],
                    'record_count' => count($records),
                    'data' => $records,
                ];
                $totalRecords += count($records);
            } catch (Exception $e) {
                $backupData[$table] = [
                    'label' => $backupTables[$table],
                    'record_count' => 0,
                    'error' => $e->getMessage(),
                ];
            }
        }

        // Save backup file
        $backupDir = __DIR__ . '/../../../uploads/backups/' . $companyId;
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $filename = 'backup_' . date('Y-m-d_His') . '.' . $format;
        $filepath = $backupDir . '/' . $filename;

        if ($format === 'json') {
            $backupContent = [
                'backup_id' => $backupId,
                'company_id' => $companyId,
                'created_at' => date('Y-m-d H:i:s'),
                'total_records' => $totalRecords,
                'tables' => $backupData,
            ];
            file_put_contents($filepath, json_encode($backupContent, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        $fileSize = filesize($filepath);

        // Update backup job
        $stmt = $db->prepare("
            UPDATE backup_jobs
            SET status = 'completed',
                file_path = :file_path,
                file_size = :file_size,
                record_count = :record_count,
                completed_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'id' => $backupId,
            'file_path' => $filepath,
            'file_size' => $fileSize,
            'record_count' => $totalRecords,
        ]);

        echo json_encode([
            'success' => true,
            'message_ro' => 'Backup creat cu succes',
            'message_en' => 'Backup created successfully',
            'data' => [
                'backup_id' => $backupId,
                'format' => $format,
                'total_records' => $totalRecords,
                'file_size' => $fileSize,
                'file_size_formatted' => formatBytes($fileSize),
                'tables_backed_up' => count(array_filter($backupData, fn($t) => ($t['record_count'] ?? 0) > 0)),
                'download_url' => '/api/v1/export/download.php?backup_id=' . $backupId,
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, $precision) . ' ' . $units[$pow];
}
