<?php
/**
 * Data Export API
 * Export data to various formats (CSV, Excel, PDF, JSON)
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

// Export formats
$exportFormats = [
    'csv' => [
        'ro' => 'CSV (Comma Separated Values)',
        'en' => 'CSV (Comma Separated Values)',
        'extension' => '.csv',
        'mime_type' => 'text/csv',
    ],
    'xlsx' => [
        'ro' => 'Excel 2007+ (.xlsx)',
        'en' => 'Excel 2007+ (.xlsx)',
        'extension' => '.xlsx',
        'mime_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    'pdf' => [
        'ro' => 'PDF (Portable Document Format)',
        'en' => 'PDF (Portable Document Format)',
        'extension' => '.pdf',
        'mime_type' => 'application/pdf',
    ],
    'json' => [
        'ro' => 'JSON (JavaScript Object Notation)',
        'en' => 'JSON (JavaScript Object Notation)',
        'extension' => '.json',
        'mime_type' => 'application/json',
    ],
    'xml' => [
        'ro' => 'XML (Extensible Markup Language)',
        'en' => 'XML (Extensible Markup Language)',
        'extension' => '.xml',
        'mime_type' => 'application/xml',
    ],
];

// Exportable data types
$exportTypes = [
    'contacts' => [
        'ro' => 'Contacte',
        'en' => 'Contacts',
        'table' => 'contacts',
        'fields' => ['name', 'email', 'phone', 'address', 'tax_id', 'type', 'notes', 'created_at'],
        'field_labels' => [
            'name' => ['ro' => 'Nume', 'en' => 'Name'],
            'email' => ['ro' => 'Email', 'en' => 'Email'],
            'phone' => ['ro' => 'Telefon', 'en' => 'Phone'],
            'address' => ['ro' => 'Adresă', 'en' => 'Address'],
            'tax_id' => ['ro' => 'CIF/CNP', 'en' => 'Tax ID'],
            'type' => ['ro' => 'Tip', 'en' => 'Type'],
            'notes' => ['ro' => 'Note', 'en' => 'Notes'],
            'created_at' => ['ro' => 'Data creării', 'en' => 'Created At'],
        ],
    ],
    'products' => [
        'ro' => 'Produse',
        'en' => 'Products',
        'table' => 'products',
        'fields' => ['sku', 'name', 'description', 'price', 'vat_rate', 'unit', 'category', 'stock_quantity'],
        'field_labels' => [
            'sku' => ['ro' => 'Cod', 'en' => 'SKU'],
            'name' => ['ro' => 'Nume', 'en' => 'Name'],
            'description' => ['ro' => 'Descriere', 'en' => 'Description'],
            'price' => ['ro' => 'Preț', 'en' => 'Price'],
            'vat_rate' => ['ro' => 'Cotă TVA', 'en' => 'VAT Rate'],
            'unit' => ['ro' => 'Unitate', 'en' => 'Unit'],
            'category' => ['ro' => 'Categorie', 'en' => 'Category'],
            'stock_quantity' => ['ro' => 'Stoc', 'en' => 'Stock'],
        ],
    ],
    'invoices' => [
        'ro' => 'Facturi',
        'en' => 'Invoices',
        'table' => 'invoices',
        'fields' => ['invoice_number', 'issue_date', 'due_date', 'customer_name', 'subtotal', 'vat_amount', 'total', 'status'],
        'field_labels' => [
            'invoice_number' => ['ro' => 'Număr factură', 'en' => 'Invoice Number'],
            'issue_date' => ['ro' => 'Data emiterii', 'en' => 'Issue Date'],
            'due_date' => ['ro' => 'Data scadenței', 'en' => 'Due Date'],
            'customer_name' => ['ro' => 'Client', 'en' => 'Customer'],
            'subtotal' => ['ro' => 'Subtotal', 'en' => 'Subtotal'],
            'vat_amount' => ['ro' => 'TVA', 'en' => 'VAT'],
            'total' => ['ro' => 'Total', 'en' => 'Total'],
            'status' => ['ro' => 'Status', 'en' => 'Status'],
        ],
    ],
    'expenses' => [
        'ro' => 'Cheltuieli',
        'en' => 'Expenses',
        'table' => 'expenses',
        'fields' => ['date', 'description', 'category', 'amount', 'vendor', 'receipt_number', 'status'],
        'field_labels' => [
            'date' => ['ro' => 'Data', 'en' => 'Date'],
            'description' => ['ro' => 'Descriere', 'en' => 'Description'],
            'category' => ['ro' => 'Categorie', 'en' => 'Category'],
            'amount' => ['ro' => 'Sumă', 'en' => 'Amount'],
            'vendor' => ['ro' => 'Furnizor', 'en' => 'Vendor'],
            'receipt_number' => ['ro' => 'Nr. chitanță', 'en' => 'Receipt No.'],
            'status' => ['ro' => 'Status', 'en' => 'Status'],
        ],
    ],
    'employees' => [
        'ro' => 'Angajați',
        'en' => 'Employees',
        'table' => 'employees',
        'fields' => ['first_name', 'last_name', 'email', 'phone', 'position', 'department', 'hire_date'],
        'field_labels' => [
            'first_name' => ['ro' => 'Prenume', 'en' => 'First Name'],
            'last_name' => ['ro' => 'Nume', 'en' => 'Last Name'],
            'email' => ['ro' => 'Email', 'en' => 'Email'],
            'phone' => ['ro' => 'Telefon', 'en' => 'Phone'],
            'position' => ['ro' => 'Funcție', 'en' => 'Position'],
            'department' => ['ro' => 'Departament', 'en' => 'Department'],
            'hire_date' => ['ro' => 'Data angajării', 'en' => 'Hire Date'],
        ],
    ],
    'projects' => [
        'ro' => 'Proiecte',
        'en' => 'Projects',
        'table' => 'projects',
        'fields' => ['name', 'description', 'status', 'start_date', 'end_date', 'budget', 'actual_cost'],
        'field_labels' => [
            'name' => ['ro' => 'Nume', 'en' => 'Name'],
            'description' => ['ro' => 'Descriere', 'en' => 'Description'],
            'status' => ['ro' => 'Status', 'en' => 'Status'],
            'start_date' => ['ro' => 'Data început', 'en' => 'Start Date'],
            'end_date' => ['ro' => 'Data sfârșit', 'en' => 'End Date'],
            'budget' => ['ro' => 'Buget', 'en' => 'Budget'],
            'actual_cost' => ['ro' => 'Cost real', 'en' => 'Actual Cost'],
        ],
    ],
    'time_entries' => [
        'ro' => 'Pontaj',
        'en' => 'Time Entries',
        'table' => 'time_entries',
        'fields' => ['date', 'project_name', 'task_name', 'hours', 'description', 'billable'],
        'field_labels' => [
            'date' => ['ro' => 'Data', 'en' => 'Date'],
            'project_name' => ['ro' => 'Proiect', 'en' => 'Project'],
            'task_name' => ['ro' => 'Sarcină', 'en' => 'Task'],
            'hours' => ['ro' => 'Ore', 'en' => 'Hours'],
            'description' => ['ro' => 'Descriere', 'en' => 'Description'],
            'billable' => ['ro' => 'Facturabil', 'en' => 'Billable'],
        ],
    ],
    'journal_entries' => [
        'ro' => 'Note contabile',
        'en' => 'Journal Entries',
        'table' => 'journal_entries',
        'fields' => ['entry_date', 'reference', 'description', 'debit_account', 'credit_account', 'amount'],
        'field_labels' => [
            'entry_date' => ['ro' => 'Data', 'en' => 'Date'],
            'reference' => ['ro' => 'Referință', 'en' => 'Reference'],
            'description' => ['ro' => 'Descriere', 'en' => 'Description'],
            'debit_account' => ['ro' => 'Cont debit', 'en' => 'Debit Account'],
            'credit_account' => ['ro' => 'Cont credit', 'en' => 'Credit Account'],
            'amount' => ['ro' => 'Sumă', 'en' => 'Amount'],
        ],
    ],
];

// Export job statuses
$exportStatuses = [
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending'],
    'processing' => ['ro' => 'În procesare', 'en' => 'Processing'],
    'completed' => ['ro' => 'Finalizat', 'en' => 'Completed'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed'],
    'expired' => ['ro' => 'Expirat', 'en' => 'Expired'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'options';

            if ($action === 'options') {
                // Return available export options
                $types = [];
                foreach ($exportTypes as $key => $type) {
                    $types[] = [
                        'type' => $key,
                        'label_ro' => $type['ro'],
                        'label_en' => $type['en'],
                        'fields' => $type['fields'],
                        'field_labels' => $type['field_labels'],
                    ];
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'types' => $types,
                        'formats' => $exportFormats,
                        'statuses' => $exportStatuses,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'history') {
                // Get export history
                $stmt = $db->prepare("
                    SELECT e.*, u.first_name, u.last_name
                    FROM export_jobs e
                    LEFT JOIN users u ON e.created_by = u.id
                    WHERE e.company_id = :company_id
                    ORDER BY e.created_at DESC
                    LIMIT 50
                ");
                $stmt->execute(['company_id' => $companyId]);
                $exports = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($exports as &$exp) {
                    $exp['status_label'] = $exportStatuses[$exp['status']] ?? null;
                    $exp['type_label'] = $exportTypes[$exp['export_type']] ?? null;
                    $exp['format_label'] = $exportFormats[$exp['format']] ?? null;
                    $exp['created_by_name'] = trim(($exp['first_name'] ?? '') . ' ' . ($exp['last_name'] ?? ''));
                    $exp['is_available'] = $exp['status'] === 'completed' && strtotime($exp['expires_at']) > time();
                }

                echo json_encode([
                    'success' => true,
                    'data' => $exports,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'download') {
                // Download exported file
                $jobId = $_GET['id'] ?? null;
                if (!$jobId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Job ID required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT * FROM export_jobs
                    WHERE id = :id AND company_id = :company_id AND status = 'completed'
                ");
                $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$job) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Export not found']);
                    exit;
                }

                if (strtotime($job['expires_at']) < time()) {
                    http_response_code(410);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Link-ul de descărcare a expirat',
                        'error' => 'Download link has expired'
                    ]);
                    exit;
                }

                // Update download count
                $db->prepare("UPDATE export_jobs SET download_count = download_count + 1 WHERE id = :id")
                    ->execute(['id' => $jobId]);

                // Return download URL or base64 content
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'download_url' => $job['file_url'],
                        'file_name' => $job['file_name'],
                        'mime_type' => $exportFormats[$job['format']]['mime_type'] ?? 'application/octet-stream',
                        'file_size' => $job['file_size'],
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            $exportType = $input['type'] ?? null;
            $format = $input['format'] ?? 'csv';
            $fields = $input['fields'] ?? null;
            $filters = $input['filters'] ?? [];
            $language = $input['language'] ?? 'ro';

            if (!$exportType || !isset($exportTypes[$exportType])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Tip export invalid',
                    'error' => 'Invalid export type'
                ]);
                exit;
            }

            if (!isset($exportFormats[$format])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Format invalid',
                    'error' => 'Invalid format'
                ]);
                exit;
            }

            $typeConfig = $exportTypes[$exportType];
            $selectedFields = $fields ?? $typeConfig['fields'];

            // Validate selected fields
            foreach ($selectedFields as $field) {
                if (!in_array($field, $typeConfig['fields'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => "Câmp invalid: $field",
                        'error' => "Invalid field: $field"
                    ]);
                    exit;
                }
            }

            // Build query
            $columns = implode(', ', $selectedFields);
            $sql = "SELECT $columns FROM {$typeConfig['table']} WHERE company_id = :company_id";
            $params = ['company_id' => $companyId];

            // Apply filters
            if (!empty($filters['date_from'])) {
                $sql .= " AND created_at >= :date_from";
                $params['date_from'] = $filters['date_from'];
            }
            if (!empty($filters['date_to'])) {
                $sql .= " AND created_at <= :date_to";
                $params['date_to'] = $filters['date_to'];
            }
            if (!empty($filters['status'])) {
                $sql .= " AND status = :status";
                $params['status'] = $filters['status'];
            }

            $sql .= " ORDER BY created_at DESC";

            if (!empty($filters['limit'])) {
                $sql .= " LIMIT " . intval($filters['limit']);
            }

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Generate export file
            $jobId = 'exp_' . bin2hex(random_bytes(8));
            $exportPath = "/var/www/documentiulia.ro/uploads/exports/{$companyId}";
            if (!is_dir($exportPath)) {
                mkdir($exportPath, 0755, true);
            }

            $fileName = $exportType . '_' . date('Y-m-d_His') . $exportFormats[$format]['extension'];
            $filePath = $exportPath . '/' . $fileName;

            // Generate file based on format
            if ($format === 'csv') {
                $handle = fopen($filePath, 'w');

                // Write header with labels
                $headerLabels = [];
                foreach ($selectedFields as $field) {
                    $headerLabels[] = $typeConfig['field_labels'][$field][$language] ?? $field;
                }
                fputcsv($handle, $headerLabels);

                // Write data
                foreach ($data as $row) {
                    fputcsv($handle, array_values($row));
                }
                fclose($handle);

            } elseif ($format === 'json') {
                $jsonData = [
                    'export_type' => $exportType,
                    'export_date' => date('Y-m-d H:i:s'),
                    'total_records' => count($data),
                    'fields' => $selectedFields,
                    'data' => $data,
                ];
                file_put_contents($filePath, json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            } elseif ($format === 'xml') {
                $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><export></export>');
                $xml->addChild('type', $exportType);
                $xml->addChild('date', date('Y-m-d H:i:s'));
                $xml->addChild('total', count($data));

                $records = $xml->addChild('records');
                foreach ($data as $row) {
                    $record = $records->addChild('record');
                    foreach ($row as $key => $value) {
                        $record->addChild($key, htmlspecialchars($value ?? ''));
                    }
                }
                file_put_contents($filePath, $xml->asXML());
            }

            $fileSize = filesize($filePath);
            $fileUrl = "https://documentiulia.ro/uploads/exports/{$companyId}/" . $fileName;

            // Save export job
            $stmt = $db->prepare("
                INSERT INTO export_jobs (
                    id, company_id, export_type, format, fields, filters,
                    total_records, file_name, file_path, file_url, file_size,
                    status, expires_at, created_by, created_at
                ) VALUES (
                    :id, :company_id, :export_type, :format, :fields, :filters,
                    :total_records, :file_name, :file_path, :file_url, :file_size,
                    'completed', NOW() + INTERVAL '7 days', :created_by, NOW()
                )
            ");
            $stmt->execute([
                'id' => $jobId,
                'company_id' => $companyId,
                'export_type' => $exportType,
                'format' => $format,
                'fields' => json_encode($selectedFields),
                'filters' => json_encode($filters),
                'total_records' => count($data),
                'file_name' => $fileName,
                'file_path' => $filePath,
                'file_url' => $fileUrl,
                'file_size' => $fileSize,
                'created_by' => $user['user_id'],
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Export creat cu succes',
                'message_en' => 'Export created successfully',
                'data' => [
                    'job_id' => $jobId,
                    'download_url' => $fileUrl,
                    'file_name' => $fileName,
                    'file_size' => $fileSize,
                    'total_records' => count($data),
                    'expires_in' => '7 days',
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
