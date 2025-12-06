<?php
/**
 * CSV Import API
 * Import data from CSV files with mapping and validation
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

// Supported import types
$importTypes = [
    'contacts' => [
        'ro' => 'Contacte',
        'en' => 'Contacts',
        'table' => 'contacts',
        'required_fields' => ['name'],
        'optional_fields' => ['email', 'phone', 'address', 'tax_id', 'notes'],
    ],
    'products' => [
        'ro' => 'Produse',
        'en' => 'Products',
        'table' => 'products',
        'required_fields' => ['name', 'price'],
        'optional_fields' => ['sku', 'description', 'category', 'unit', 'stock_quantity', 'vat_rate'],
    ],
    'invoices' => [
        'ro' => 'Facturi',
        'en' => 'Invoices',
        'table' => 'invoices',
        'required_fields' => ['customer_name', 'total'],
        'optional_fields' => ['invoice_number', 'issue_date', 'due_date', 'items', 'notes'],
    ],
    'expenses' => [
        'ro' => 'Cheltuieli',
        'en' => 'Expenses',
        'table' => 'expenses',
        'required_fields' => ['description', 'amount'],
        'optional_fields' => ['category', 'date', 'vendor', 'receipt_number', 'notes'],
    ],
    'employees' => [
        'ro' => 'Angajați',
        'en' => 'Employees',
        'table' => 'employees',
        'required_fields' => ['first_name', 'last_name'],
        'optional_fields' => ['email', 'phone', 'position', 'department', 'hire_date', 'salary'],
    ],
    'projects' => [
        'ro' => 'Proiecte',
        'en' => 'Projects',
        'table' => 'projects',
        'required_fields' => ['name'],
        'optional_fields' => ['description', 'client_id', 'start_date', 'end_date', 'budget', 'status'],
    ],
    'chart_of_accounts' => [
        'ro' => 'Plan de conturi',
        'en' => 'Chart of Accounts',
        'table' => 'chart_of_accounts',
        'required_fields' => ['code', 'name'],
        'optional_fields' => ['type', 'parent_code', 'description', 'is_active'],
    ],
    'bank_transactions' => [
        'ro' => 'Tranzacții bancare',
        'en' => 'Bank Transactions',
        'table' => 'bank_transactions',
        'required_fields' => ['date', 'amount'],
        'optional_fields' => ['description', 'reference', 'category', 'counterparty'],
    ],
];

// Import statuses
$importStatuses = [
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending'],
    'processing' => ['ro' => 'În procesare', 'en' => 'Processing'],
    'completed' => ['ro' => 'Finalizat', 'en' => 'Completed'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed'],
    'partial' => ['ro' => 'Parțial', 'en' => 'Partial'],
];

// Duplicate handling modes
$duplicateModes = [
    'skip' => ['ro' => 'Omite duplicatele', 'en' => 'Skip duplicates'],
    'update' => ['ro' => 'Actualizează existente', 'en' => 'Update existing'],
    'create_new' => ['ro' => 'Creează noi', 'en' => 'Create new'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'types') {
                // Return available import types
                $types = [];
                foreach ($importTypes as $key => $type) {
                    $types[] = [
                        'type' => $key,
                        'label_ro' => $type['ro'],
                        'label_en' => $type['en'],
                        'required_fields' => $type['required_fields'],
                        'optional_fields' => $type['optional_fields'],
                        'all_fields' => array_merge($type['required_fields'], $type['optional_fields']),
                    ];
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'types' => $types,
                        'duplicate_modes' => $duplicateModes,
                        'statuses' => $importStatuses,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'history') {
                // Get import history
                $stmt = $db->prepare("
                    SELECT i.*, u.first_name, u.last_name
                    FROM import_jobs i
                    LEFT JOIN users u ON i.created_by = u.id
                    WHERE i.company_id = :company_id
                    ORDER BY i.created_at DESC
                    LIMIT 50
                ");
                $stmt->execute(['company_id' => $companyId]);
                $imports = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($imports as &$imp) {
                    $imp['status_label'] = $importStatuses[$imp['status']] ?? null;
                    $imp['type_label'] = $importTypes[$imp['import_type']] ?? null;
                    $imp['created_by_name'] = trim(($imp['first_name'] ?? '') . ' ' . ($imp['last_name'] ?? ''));
                    $imp['error_details'] = json_decode($imp['error_details'] ?? '[]', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => $imports,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'job') {
                // Get specific import job details
                $jobId = $_GET['id'] ?? null;
                if (!$jobId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Job ID required']);
                    exit;
                }

                $stmt = $db->prepare("
                    SELECT * FROM import_jobs
                    WHERE id = :id AND company_id = :company_id
                ");
                $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$job) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Import job not found']);
                    exit;
                }

                $job['status_label'] = $importStatuses[$job['status']] ?? null;
                $job['field_mapping'] = json_decode($job['field_mapping'] ?? '{}', true);
                $job['error_details'] = json_decode($job['error_details'] ?? '[]', true);
                $job['preview_data'] = json_decode($job['preview_data'] ?? '[]', true);

                echo json_encode([
                    'success' => true,
                    'data' => $job,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $action = $_GET['action'] ?? 'upload';

            if ($action === 'upload') {
                // Handle CSV file upload
                if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Fișier CSV invalid sau lipsă',
                        'error' => 'Invalid or missing CSV file'
                    ]);
                    exit;
                }

                $file = $_FILES['file'];
                $importType = $_POST['type'] ?? null;

                if (!$importType || !isset($importTypes[$importType])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Tip import invalid',
                        'error' => 'Invalid import type'
                    ]);
                    exit;
                }

                // Validate file type
                $mimeType = mime_content_type($file['tmp_name']);
                if (!in_array($mimeType, ['text/csv', 'text/plain', 'application/csv'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Doar fișiere CSV sunt acceptate',
                        'error' => 'Only CSV files are accepted'
                    ]);
                    exit;
                }

                // Parse CSV header and preview rows
                $handle = fopen($file['tmp_name'], 'r');
                $delimiter = $_POST['delimiter'] ?? ',';
                $enclosure = $_POST['enclosure'] ?? '"';

                $header = fgetcsv($handle, 0, $delimiter, $enclosure);
                $previewRows = [];
                $rowCount = 0;

                while (($row = fgetcsv($handle, 0, $delimiter, $enclosure)) !== false && $rowCount < 5) {
                    $previewRows[] = array_combine($header, $row);
                    $rowCount++;
                }

                // Count total rows
                rewind($handle);
                $totalRows = 0;
                while (fgetcsv($handle, 0, $delimiter, $enclosure) !== false) {
                    $totalRows++;
                }
                $totalRows--; // Subtract header row

                fclose($handle);

                // Save file and create import job
                $jobId = 'imp_' . bin2hex(random_bytes(8));
                $uploadPath = "/var/www/documentiulia.ro/uploads/imports/{$companyId}";
                if (!is_dir($uploadPath)) {
                    mkdir($uploadPath, 0755, true);
                }

                $fileName = $jobId . '_' . basename($file['name']);
                $filePath = $uploadPath . '/' . $fileName;
                move_uploaded_file($file['tmp_name'], $filePath);

                $stmt = $db->prepare("
                    INSERT INTO import_jobs (
                        id, company_id, import_type, file_name, file_path, total_rows,
                        status, delimiter, enclosure, preview_data, created_by, created_at
                    ) VALUES (
                        :id, :company_id, :import_type, :file_name, :file_path, :total_rows,
                        'pending', :delimiter, :enclosure, :preview_data, :created_by, NOW()
                    )
                ");
                $stmt->execute([
                    'id' => $jobId,
                    'company_id' => $companyId,
                    'import_type' => $importType,
                    'file_name' => $file['name'],
                    'file_path' => $filePath,
                    'total_rows' => $totalRows,
                    'delimiter' => $delimiter,
                    'enclosure' => $enclosure,
                    'preview_data' => json_encode($previewRows),
                    'created_by' => $user['user_id'],
                ]);

                $typeConfig = $importTypes[$importType];

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Fișier încărcat. Configurați maparea câmpurilor.',
                    'message_en' => 'File uploaded. Configure field mapping.',
                    'data' => [
                        'job_id' => $jobId,
                        'csv_columns' => $header,
                        'preview_rows' => $previewRows,
                        'total_rows' => $totalRows,
                        'required_fields' => $typeConfig['required_fields'],
                        'optional_fields' => $typeConfig['optional_fields'],
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'configure') {
                // Configure field mapping
                $input = json_decode(file_get_contents('php://input'), true);
                $jobId = $input['job_id'] ?? null;
                $fieldMapping = $input['field_mapping'] ?? [];
                $duplicateMode = $input['duplicate_mode'] ?? 'skip';

                if (!$jobId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Job ID required']);
                    exit;
                }

                // Verify job exists
                $stmt = $db->prepare("SELECT * FROM import_jobs WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$job) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Import job not found']);
                    exit;
                }

                // Validate required fields are mapped
                $typeConfig = $importTypes[$job['import_type']];
                $mappedFields = array_values($fieldMapping);
                foreach ($typeConfig['required_fields'] as $required) {
                    if (!in_array($required, $mappedFields)) {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'error_ro' => "Câmpul obligatoriu '$required' nu este mapat",
                            'error' => "Required field '$required' is not mapped"
                        ]);
                        exit;
                    }
                }

                // Update job with mapping
                $stmt = $db->prepare("
                    UPDATE import_jobs SET
                        field_mapping = :field_mapping,
                        duplicate_mode = :duplicate_mode,
                        status = 'pending'
                    WHERE id = :id
                ");
                $stmt->execute([
                    'id' => $jobId,
                    'field_mapping' => json_encode($fieldMapping),
                    'duplicate_mode' => $duplicateMode,
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Mapare configurată. Gata pentru import.',
                    'message_en' => 'Mapping configured. Ready for import.',
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'execute') {
                // Execute the import
                $input = json_decode(file_get_contents('php://input'), true);
                $jobId = $input['job_id'] ?? null;

                if (!$jobId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Job ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM import_jobs WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $jobId, 'company_id' => $companyId]);
                $job = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$job) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Import job not found']);
                    exit;
                }

                if (!$job['field_mapping']) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Configurați mai întâi maparea câmpurilor',
                        'error' => 'Configure field mapping first'
                    ]);
                    exit;
                }

                // Update status to processing
                $db->prepare("UPDATE import_jobs SET status = 'processing', started_at = NOW() WHERE id = :id")
                    ->execute(['id' => $jobId]);

                // Process the CSV file
                $fieldMapping = json_decode($job['field_mapping'], true);
                $typeConfig = $importTypes[$job['import_type']];
                $handle = fopen($job['file_path'], 'r');
                $header = fgetcsv($handle, 0, $job['delimiter'], $job['enclosure']);

                $imported = 0;
                $skipped = 0;
                $errors = [];
                $rowNum = 1;

                while (($row = fgetcsv($handle, 0, $job['delimiter'], $job['enclosure'])) !== false) {
                    $rowNum++;
                    try {
                        $data = [];
                        foreach ($fieldMapping as $csvCol => $dbField) {
                            $colIndex = array_search($csvCol, $header);
                            if ($colIndex !== false && isset($row[$colIndex])) {
                                $data[$dbField] = trim($row[$colIndex]);
                            }
                        }

                        // Add company_id
                        $data['company_id'] = $companyId;
                        $data['id'] = 'imp_' . bin2hex(random_bytes(8));
                        $data['created_at'] = date('Y-m-d H:i:s');

                        // Insert into database
                        $columns = implode(', ', array_keys($data));
                        $placeholders = ':' . implode(', :', array_keys($data));

                        $stmt = $db->prepare("INSERT INTO {$typeConfig['table']} ($columns) VALUES ($placeholders)");
                        $stmt->execute($data);
                        $imported++;

                    } catch (Exception $e) {
                        $errors[] = [
                            'row' => $rowNum,
                            'error' => $e->getMessage(),
                        ];
                        $skipped++;
                    }
                }

                fclose($handle);

                // Update job with results
                $status = $skipped === 0 ? 'completed' : ($imported > 0 ? 'partial' : 'failed');
                $stmt = $db->prepare("
                    UPDATE import_jobs SET
                        status = :status,
                        imported_rows = :imported,
                        skipped_rows = :skipped,
                        error_details = :errors,
                        completed_at = NOW()
                    WHERE id = :id
                ");
                $stmt->execute([
                    'id' => $jobId,
                    'status' => $status,
                    'imported' => $imported,
                    'skipped' => $skipped,
                    'errors' => json_encode($errors),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => "Import finalizat: $imported înregistrări importate, $skipped omise",
                    'message_en' => "Import complete: $imported records imported, $skipped skipped",
                    'data' => [
                        'imported' => $imported,
                        'skipped' => $skipped,
                        'status' => $status,
                        'errors' => array_slice($errors, 0, 10),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
