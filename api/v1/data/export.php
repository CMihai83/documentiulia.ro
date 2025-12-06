<?php
/**
 * Data Export API
 * Export data to various formats
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

$method = $_SERVER['REQUEST_METHOD'];

// Export types
$exportTypes = [
    'contacts' => ['ro' => 'Contacte', 'en' => 'Contacts', 'icon' => 'contacts'],
    'products' => ['ro' => 'Produse', 'en' => 'Products', 'icon' => 'inventory'],
    'invoices' => ['ro' => 'Facturi', 'en' => 'Invoices', 'icon' => 'receipt'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses', 'icon' => 'payments'],
    'transactions' => ['ro' => 'Tranzacții', 'en' => 'Transactions', 'icon' => 'account_balance'],
    'reports' => ['ro' => 'Rapoarte', 'en' => 'Reports', 'icon' => 'assessment'],
    'journal_entries' => ['ro' => 'Note contabile', 'en' => 'Journal Entries', 'icon' => 'book'],
    'chart_of_accounts' => ['ro' => 'Plan de conturi', 'en' => 'Chart of Accounts', 'icon' => 'account_tree'],
    'employees' => ['ro' => 'Angajați', 'en' => 'Employees', 'icon' => 'people'],
    'time_entries' => ['ro' => 'Pontaje', 'en' => 'Time Entries', 'icon' => 'schedule'],
    'projects' => ['ro' => 'Proiecte', 'en' => 'Projects', 'icon' => 'folder'],
    'full_backup' => ['ro' => 'Backup complet', 'en' => 'Full Backup', 'icon' => 'backup'],
];

// Export formats
$exportFormats = [
    'csv' => ['ro' => 'CSV', 'en' => 'CSV', 'extension' => 'csv', 'mime' => 'text/csv'],
    'xlsx' => ['ro' => 'Excel (XLSX)', 'en' => 'Excel (XLSX)', 'extension' => 'xlsx', 'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'json' => ['ro' => 'JSON', 'en' => 'JSON', 'extension' => 'json', 'mime' => 'application/json'],
    'xml' => ['ro' => 'XML', 'en' => 'XML', 'extension' => 'xml', 'mime' => 'application/xml'],
    'pdf' => ['ro' => 'PDF', 'en' => 'PDF', 'extension' => 'pdf', 'mime' => 'application/pdf'],
    'saga' => ['ro' => 'Format SAGA', 'en' => 'SAGA Format', 'extension' => 'txt', 'mime' => 'text/plain'],
    'saf_t' => ['ro' => 'SAF-T', 'en' => 'SAF-T', 'extension' => 'xml', 'mime' => 'application/xml'],
];

// Export statuses
$exportStatuses = [
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending', 'color' => '#FF9800'],
    'processing' => ['ro' => 'În procesare', 'en' => 'Processing', 'color' => '#2196F3'],
    'completed' => ['ro' => 'Finalizat', 'en' => 'Completed', 'color' => '#4CAF50'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed', 'color' => '#F44336'],
    'expired' => ['ro' => 'Expirat', 'en' => 'Expired', 'color' => '#9E9E9E'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'history';

            if ($action === 'history') {
                $type = $_GET['type'] ?? null;
                $limit = intval($_GET['limit'] ?? 20);

                $sql = "SELECT * FROM export_jobs WHERE company_id = :company_id";
                $params = ['company_id' => $companyId];

                if ($type) {
                    $sql .= " AND export_type = :type";
                    $params['type'] = $type;
                }

                $sql .= " ORDER BY created_at DESC LIMIT $limit";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $exports = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($exports as &$export) {
                    $export['type_config'] = $exportTypes[$export['export_type']] ?? null;
                    $export['format_config'] = $exportFormats[$export['file_format']] ?? null;
                    $export['status_config'] = $exportStatuses[$export['status']] ?? null;
                    $export['is_expired'] = $export['expires_at'] && strtotime($export['expires_at']) < time();
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'exports' => $exports,
                        'types' => $exportTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'download') {
                $exportId = $_GET['id'] ?? null;

                if (!$exportId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Export ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM export_jobs WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $exportId, 'company_id' => $companyId]);
                $export = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$export) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Export not found']);
                    exit;
                }

                if ($export['status'] !== 'completed') {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Export not completed']);
                    exit;
                }

                if ($export['expires_at'] && strtotime($export['expires_at']) < time()) {
                    http_response_code(410);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Exportul a expirat',
                        'error' => 'Export has expired'
                    ]);
                    exit;
                }

                // Update download count
                $stmt = $db->prepare("UPDATE export_jobs SET download_count = download_count + 1, last_downloaded_at = NOW() WHERE id = :id");
                $stmt->execute(['id' => $exportId]);

                // Return download URL
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'download_url' => '/exports/' . basename($export['file_path']),
                        'filename' => $export['filename'],
                        'mime_type' => $exportFormats[$export['file_format']]['mime'] ?? 'application/octet-stream',
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'types' => $exportTypes,
                        'formats' => $exportFormats,
                        'statuses' => $exportStatuses,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'create';

            if ($action === 'create') {
                $exportType = $input['type'] ?? 'contacts';
                $format = $input['format'] ?? 'csv';
                $dateFrom = $input['date_from'] ?? null;
                $dateTo = $input['date_to'] ?? null;
                $filters = $input['filters'] ?? [];

                // Create export job
                $exportId = 'exp_' . bin2hex(random_bytes(8));
                $filename = $exportType . '_' . date('Y-m-d_His') . '.' . ($exportFormats[$format]['extension'] ?? 'csv');

                $stmt = $db->prepare("
                    INSERT INTO export_jobs (id, company_id, user_id, export_type, file_format, filename, filters, status, expires_at, created_at)
                    VALUES (:id, :company_id, :user_id, :type, :format, :filename, :filters, 'pending', NOW() + INTERVAL '7 days', NOW())
                ");
                $stmt->execute([
                    'id' => $exportId,
                    'company_id' => $companyId,
                    'user_id' => $user['user_id'],
                    'type' => $exportType,
                    'format' => $format,
                    'filename' => $filename,
                    'filters' => json_encode(['date_from' => $dateFrom, 'date_to' => $dateTo, 'custom' => $filters]),
                ]);

                // Process export (in production, this would be queued)
                $result = processExport($db, $exportId, $exportType, $format, $companyId, $dateFrom, $dateTo, $filters);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Exportul a fost creat',
                    'message_en' => 'Export created',
                    'data' => [
                        'export_id' => $exportId,
                        'status' => $result['status'],
                        'rows_exported' => $result['rows'],
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'schedule') {
                // Schedule recurring export
                $exportType = $input['type'] ?? 'invoices';
                $format = $input['format'] ?? 'csv';
                $frequency = $input['frequency'] ?? 'weekly'; // daily, weekly, monthly
                $recipients = $input['recipients'] ?? [];

                $scheduleId = 'sched_' . bin2hex(random_bytes(8));

                $stmt = $db->prepare("
                    INSERT INTO export_schedules (id, company_id, user_id, export_type, file_format, frequency, recipients, is_active, created_at)
                    VALUES (:id, :company_id, :user_id, :type, :format, :frequency, :recipients, true, NOW())
                ");
                $stmt->execute([
                    'id' => $scheduleId,
                    'company_id' => $companyId,
                    'user_id' => $user['user_id'],
                    'type' => $exportType,
                    'format' => $format,
                    'frequency' => $frequency,
                    'recipients' => json_encode($recipients),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Exportul programat a fost creat',
                    'message_en' => 'Scheduled export created',
                    'data' => ['schedule_id' => $scheduleId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error: ' . $e->getMessage()]);
}

function processExport($db, $exportId, $type, $format, $companyId, $dateFrom, $dateTo, $filters) {
    $result = ['status' => 'completed', 'rows' => 0];

    try {
        // Update status to processing
        $stmt = $db->prepare("UPDATE export_jobs SET status = 'processing', started_at = NOW() WHERE id = :id");
        $stmt->execute(['id' => $exportId]);

        // Get data based on type
        $data = [];
        $headers = [];

        switch ($type) {
            case 'contacts':
                $headers = ['Nume', 'Email', 'Telefon', 'Companie', 'CUI', 'Adresa', 'Oras', 'Judet'];
                $stmt = $db->prepare("SELECT name, email, phone, company_name, cui, address, city, county FROM contacts WHERE company_id = :company_id ORDER BY name");
                $stmt->execute(['company_id' => $companyId]);
                $data = $stmt->fetchAll(PDO::FETCH_NUM);
                break;

            case 'products':
                $headers = ['Denumire', 'Cod', 'Pret', 'Cost', 'Cantitate', 'UM', 'TVA', 'Categorie'];
                $stmt = $db->prepare("SELECT name, sku, price, cost, quantity, unit, vat_rate, category FROM products WHERE company_id = :company_id ORDER BY name");
                $stmt->execute(['company_id' => $companyId]);
                $data = $stmt->fetchAll(PDO::FETCH_NUM);
                break;

            case 'invoices':
                $headers = ['Numar', 'Data', 'Client', 'Total', 'TVA', 'Status', 'Scadenta'];
                $sql = "SELECT invoice_number, issue_date, customer_name, total_amount, vat_amount, status, due_date FROM invoices WHERE company_id = :company_id";
                $params = ['company_id' => $companyId];
                if ($dateFrom) {
                    $sql .= " AND issue_date >= :date_from";
                    $params['date_from'] = $dateFrom;
                }
                if ($dateTo) {
                    $sql .= " AND issue_date <= :date_to";
                    $params['date_to'] = $dateTo;
                }
                $sql .= " ORDER BY issue_date DESC";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $data = $stmt->fetchAll(PDO::FETCH_NUM);
                break;

            case 'expenses':
                $headers = ['Data', 'Descriere', 'Categorie', 'Suma', 'TVA', 'Furnizor', 'Status'];
                $sql = "SELECT expense_date, description, category, amount, vat_amount, vendor_name, status FROM expenses WHERE company_id = :company_id";
                $params = ['company_id' => $companyId];
                if ($dateFrom) {
                    $sql .= " AND expense_date >= :date_from";
                    $params['date_from'] = $dateFrom;
                }
                if ($dateTo) {
                    $sql .= " AND expense_date <= :date_to";
                    $params['date_to'] = $dateTo;
                }
                $sql .= " ORDER BY expense_date DESC";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $data = $stmt->fetchAll(PDO::FETCH_NUM);
                break;

            default:
                $headers = ['Coloana 1'];
                $data = [];
        }

        $result['rows'] = count($data);

        // Create export file
        $exportDir = __DIR__ . '/../../../exports/' . $companyId . '/';
        if (!is_dir($exportDir)) {
            mkdir($exportDir, 0755, true);
        }

        $filename = $type . '_' . date('Y-m-d_His') . '.' . getExtension($format);
        $filePath = $exportDir . $filename;

        if ($format === 'csv') {
            $fp = fopen($filePath, 'w');
            // BOM for Excel UTF-8 compatibility
            fwrite($fp, "\xEF\xBB\xBF");
            fputcsv($fp, $headers);
            foreach ($data as $row) {
                fputcsv($fp, $row);
            }
            fclose($fp);
        } elseif ($format === 'json') {
            $jsonData = [];
            foreach ($data as $row) {
                $jsonData[] = array_combine(array_map('strtolower', str_replace(' ', '_', $headers)), $row);
            }
            file_put_contents($filePath, json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        // Update job status
        $stmt = $db->prepare("
            UPDATE export_jobs SET
                status = 'completed',
                file_path = :path,
                rows_exported = :rows,
                file_size = :size,
                completed_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'id' => $exportId,
            'path' => $filePath,
            'rows' => $result['rows'],
            'size' => filesize($filePath),
        ]);

    } catch (Exception $e) {
        $stmt = $db->prepare("UPDATE export_jobs SET status = 'failed', error_message = :error WHERE id = :id");
        $stmt->execute(['id' => $exportId, 'error' => $e->getMessage()]);
        $result['status'] = 'failed';
    }

    return $result;
}

function getExtension($format) {
    $extensions = [
        'csv' => 'csv',
        'xlsx' => 'xlsx',
        'json' => 'json',
        'xml' => 'xml',
        'pdf' => 'pdf',
    ];
    return $extensions[$format] ?? 'txt';
}
