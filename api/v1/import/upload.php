<?php
/**
 * Data Import - File Upload API
 * Upload files for import (CSV, Excel, JSON)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Supported file types
$allowedTypes = [
    'text/csv' => 'csv',
    'application/vnd.ms-excel' => 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
    'application/json' => 'json',
    'text/plain' => 'csv', // Sometimes CSV comes as text/plain
];

// Supported data types for import
$dataTypes = [
    'contacts' => [
        'name_ro' => 'Contacte',
        'name_en' => 'Contacts',
        'required_fields' => ['name', 'email'],
        'optional_fields' => ['phone', 'company', 'address', 'city', 'country', 'tax_id', 'type'],
    ],
    'products' => [
        'name_ro' => 'Produse',
        'name_en' => 'Products',
        'required_fields' => ['name', 'price'],
        'optional_fields' => ['sku', 'description', 'category', 'unit', 'tax_rate', 'stock_quantity'],
    ],
    'invoices' => [
        'name_ro' => 'Facturi',
        'name_en' => 'Invoices',
        'required_fields' => ['customer_name', 'total', 'date'],
        'optional_fields' => ['invoice_number', 'due_date', 'items', 'status', 'notes'],
    ],
    'expenses' => [
        'name_ro' => 'Cheltuieli',
        'name_en' => 'Expenses',
        'required_fields' => ['description', 'amount', 'date'],
        'optional_fields' => ['category', 'vendor', 'payment_method', 'receipt_number'],
    ],
    'transactions' => [
        'name_ro' => 'Tranzacții Bancare',
        'name_en' => 'Bank Transactions',
        'required_fields' => ['date', 'amount', 'description'],
        'optional_fields' => ['reference', 'type', 'category', 'account'],
    ],
    'employees' => [
        'name_ro' => 'Angajați',
        'name_en' => 'Employees',
        'required_fields' => ['first_name', 'last_name', 'email'],
        'optional_fields' => ['phone', 'position', 'department', 'hire_date', 'salary', 'cnp'],
    ],
    'chart_of_accounts' => [
        'name_ro' => 'Plan de Conturi',
        'name_en' => 'Chart of Accounts',
        'required_fields' => ['code', 'name', 'type'],
        'optional_fields' => ['parent_code', 'description', 'currency'],
    ],
];

try {
    if (!isset($_FILES['file'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'Niciun fișier încărcat',
            'error' => 'No file uploaded'
        ]);
        exit;
    }

    $file = $_FILES['file'];
    $dataType = $_POST['data_type'] ?? null;

    if (!$dataType || !isset($dataTypes[$dataType])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'Tip de date invalid',
            'error' => 'Invalid data type',
            'available_types' => array_keys($dataTypes),
        ]);
        exit;
    }

    // Validate file
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'Fișierul depășește limita serverului',
            UPLOAD_ERR_FORM_SIZE => 'Fișierul depășește limita formularului',
            UPLOAD_ERR_PARTIAL => 'Fișierul a fost încărcat parțial',
            UPLOAD_ERR_NO_FILE => 'Niciun fișier selectat',
        ];
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => $errorMessages[$file['error']] ?? 'Eroare la încărcare',
            'error' => 'Upload error'
        ]);
        exit;
    }

    // Check file type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!isset($allowedTypes[$mimeType]) && !in_array($extension, ['csv', 'xls', 'xlsx', 'json'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'Tip de fișier neacceptat. Acceptăm: CSV, Excel, JSON',
            'error' => 'Unsupported file type. Accepted: CSV, Excel, JSON'
        ]);
        exit;
    }

    // Max file size: 10MB
    $maxSize = 10 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'Fișierul depășește 10MB',
            'error' => 'File exceeds 10MB limit'
        ]);
        exit;
    }

    // Create upload directory
    $uploadDir = __DIR__ . '/../../../uploads/imports/' . $companyId . '/' . date('Y/m');
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Generate unique filename
    $importId = 'imp_' . bin2hex(random_bytes(12));
    $filename = $importId . '.' . $extension;
    $filepath = $uploadDir . '/' . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to save file']);
        exit;
    }

    // Parse file to get preview
    $preview = parseFilePreview($filepath, $extension, 5);

    // Store import record
    $db = getDbConnection();
    $stmt = $db->prepare("
        INSERT INTO import_jobs (
            id, company_id, data_type, original_filename, stored_filename,
            file_path, file_size, status, uploaded_by, created_at
        ) VALUES (
            :id, :company_id, :data_type, :original_filename, :stored_filename,
            :file_path, :file_size, 'pending', :uploaded_by, NOW()
        )
    ");
    $stmt->execute([
        'id' => $importId,
        'company_id' => $companyId,
        'data_type' => $dataType,
        'original_filename' => $file['name'],
        'stored_filename' => $filename,
        'file_path' => $filepath,
        'file_size' => $file['size'],
        'uploaded_by' => $user['user_id'],
    ]);

    echo json_encode([
        'success' => true,
        'message_ro' => 'Fișier încărcat cu succes',
        'message_en' => 'File uploaded successfully',
        'data' => [
            'import_id' => $importId,
            'data_type' => $dataType,
            'data_type_label' => $dataTypes[$dataType],
            'filename' => $file['name'],
            'file_size' => $file['size'],
            'preview' => $preview,
            'detected_columns' => $preview['columns'] ?? [],
            'required_fields' => $dataTypes[$dataType]['required_fields'],
            'optional_fields' => $dataTypes[$dataType]['optional_fields'],
            'sample_rows' => $preview['rows'] ?? [],
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

function parseFilePreview($filepath, $extension, $rowLimit = 5) {
    $result = ['columns' => [], 'rows' => [], 'total_rows' => 0];

    switch ($extension) {
        case 'csv':
            if (($handle = fopen($filepath, 'r')) !== false) {
                // Detect delimiter
                $firstLine = fgets($handle);
                rewind($handle);
                $delimiter = detectCsvDelimiter($firstLine);

                // Read header
                $header = fgetcsv($handle, 0, $delimiter);
                $result['columns'] = array_map('trim', $header);

                // Read sample rows
                $rowCount = 0;
                while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                    $rowCount++;
                    if (count($result['rows']) < $rowLimit) {
                        $result['rows'][] = array_combine($result['columns'], array_pad($row, count($result['columns']), ''));
                    }
                }
                $result['total_rows'] = $rowCount;
                fclose($handle);
            }
            break;

        case 'json':
            $content = file_get_contents($filepath);
            $data = json_decode($content, true);
            if (is_array($data)) {
                if (isset($data[0]) && is_array($data[0])) {
                    $result['columns'] = array_keys($data[0]);
                    $result['rows'] = array_slice($data, 0, $rowLimit);
                    $result['total_rows'] = count($data);
                }
            }
            break;

        case 'xlsx':
        case 'xls':
            // Simplified - would use PhpSpreadsheet in production
            $result['columns'] = ['Excel file - full parsing requires processing'];
            $result['rows'] = [];
            $result['total_rows'] = 0;
            break;
    }

    return $result;
}

function detectCsvDelimiter($line) {
    $delimiters = [',', ';', '\t', '|'];
    $counts = [];

    foreach ($delimiters as $d) {
        $counts[$d] = substr_count($line, $d);
    }

    return array_keys($counts, max($counts))[0];
}
