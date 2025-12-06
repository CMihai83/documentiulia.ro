<?php
/**
 * Data Import API
 * Import data from various formats and sources
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

// Admin/manager only for imports
if (!in_array($user['role'], ['admin', 'owner', 'manager'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error_ro' => 'Nu aveți permisiunea de a importa date',
        'error' => 'You do not have permission to import data'
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Import types
$importTypes = [
    'contacts' => ['ro' => 'Contacte', 'en' => 'Contacts', 'icon' => 'contacts'],
    'products' => ['ro' => 'Produse', 'en' => 'Products', 'icon' => 'inventory'],
    'invoices' => ['ro' => 'Facturi', 'en' => 'Invoices', 'icon' => 'receipt'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses', 'icon' => 'payments'],
    'transactions' => ['ro' => 'Tranzacții', 'en' => 'Transactions', 'icon' => 'account_balance'],
    'employees' => ['ro' => 'Angajați', 'en' => 'Employees', 'icon' => 'people'],
    'chart_of_accounts' => ['ro' => 'Plan de conturi', 'en' => 'Chart of Accounts', 'icon' => 'account_tree'],
    'inventory' => ['ro' => 'Inventar', 'en' => 'Inventory', 'icon' => 'inventory_2'],
];

// File formats
$fileFormats = [
    'csv' => ['ro' => 'CSV', 'en' => 'CSV', 'mime' => 'text/csv'],
    'xlsx' => ['ro' => 'Excel (XLSX)', 'en' => 'Excel (XLSX)', 'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'xls' => ['ro' => 'Excel (XLS)', 'en' => 'Excel (XLS)', 'mime' => 'application/vnd.ms-excel'],
    'json' => ['ro' => 'JSON', 'en' => 'JSON', 'mime' => 'application/json'],
    'xml' => ['ro' => 'XML', 'en' => 'XML', 'mime' => 'application/xml'],
    'saga' => ['ro' => 'SAGA Export', 'en' => 'SAGA Export', 'mime' => 'text/plain'],
    'winmentor' => ['ro' => 'WinMentor Export', 'en' => 'WinMentor Export', 'mime' => 'text/plain'],
];

// Import statuses
$importStatuses = [
    'pending' => ['ro' => 'În așteptare', 'en' => 'Pending', 'color' => '#FF9800'],
    'processing' => ['ro' => 'În procesare', 'en' => 'Processing', 'color' => '#2196F3'],
    'validating' => ['ro' => 'Validare', 'en' => 'Validating', 'color' => '#9C27B0'],
    'completed' => ['ro' => 'Finalizat', 'en' => 'Completed', 'color' => '#4CAF50'],
    'failed' => ['ro' => 'Eșuat', 'en' => 'Failed', 'color' => '#F44336'],
    'partial' => ['ro' => 'Parțial', 'en' => 'Partial', 'color' => '#FF9800'],
];

// Duplicate handling options
$duplicateHandling = [
    'skip' => ['ro' => 'Omite duplicatele', 'en' => 'Skip duplicates', 'description_ro' => 'Rândurile duplicate vor fi ignorate', 'description_en' => 'Duplicate rows will be ignored'],
    'update' => ['ro' => 'Actualizează duplicatele', 'en' => 'Update duplicates', 'description_ro' => 'Rândurile existente vor fi actualizate', 'description_en' => 'Existing rows will be updated'],
    'create_new' => ['ro' => 'Creează noi înregistrări', 'en' => 'Create new records', 'description_ro' => 'Se vor crea înregistrări noi chiar dacă există duplicate', 'description_en' => 'New records will be created even if duplicates exist'],
    'fail' => ['ro' => 'Oprește la duplicate', 'en' => 'Fail on duplicates', 'description_ro' => 'Importul se va opri dacă sunt găsite duplicate', 'description_en' => 'Import will stop if duplicates are found'],
];

// Column mappings for contacts
$contactColumns = [
    'name' => ['ro' => 'Nume', 'en' => 'Name', 'required' => true],
    'email' => ['ro' => 'Email', 'en' => 'Email', 'required' => false],
    'phone' => ['ro' => 'Telefon', 'en' => 'Phone', 'required' => false],
    'company' => ['ro' => 'Companie', 'en' => 'Company', 'required' => false],
    'cui' => ['ro' => 'CUI', 'en' => 'Tax ID', 'required' => false],
    'address' => ['ro' => 'Adresă', 'en' => 'Address', 'required' => false],
    'city' => ['ro' => 'Oraș', 'en' => 'City', 'required' => false],
    'county' => ['ro' => 'Județ', 'en' => 'County', 'required' => false],
    'country' => ['ro' => 'Țară', 'en' => 'Country', 'required' => false],
    'notes' => ['ro' => 'Note', 'en' => 'Notes', 'required' => false],
];

// Column mappings for products
$productColumns = [
    'name' => ['ro' => 'Denumire', 'en' => 'Name', 'required' => true],
    'sku' => ['ro' => 'Cod produs', 'en' => 'SKU', 'required' => false],
    'price' => ['ro' => 'Preț', 'en' => 'Price', 'required' => true],
    'cost' => ['ro' => 'Cost', 'en' => 'Cost', 'required' => false],
    'quantity' => ['ro' => 'Cantitate', 'en' => 'Quantity', 'required' => false],
    'unit' => ['ro' => 'Unitate', 'en' => 'Unit', 'required' => false],
    'vat_rate' => ['ro' => 'Cotă TVA', 'en' => 'VAT Rate', 'required' => false],
    'category' => ['ro' => 'Categorie', 'en' => 'Category', 'required' => false],
    'description' => ['ro' => 'Descriere', 'en' => 'Description', 'required' => false],
    'barcode' => ['ro' => 'Cod de bare', 'en' => 'Barcode', 'required' => false],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'history';

            if ($action === 'history') {
                $type = $_GET['type'] ?? null;
                $limit = intval($_GET['limit'] ?? 20);

                $sql = "SELECT * FROM import_jobs WHERE company_id = :company_id";
                $params = ['company_id' => $companyId];

                if ($type) {
                    $sql .= " AND import_type = :type";
                    $params['type'] = $type;
                }

                $sql .= " ORDER BY created_at DESC LIMIT $limit";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $imports = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($imports as &$import) {
                    $import['type_config'] = $importTypes[$import['import_type']] ?? null;
                    $import['status_config'] = $importStatuses[$import['status']] ?? null;
                    $import['errors'] = json_decode($import['errors'] ?? '[]', true);
                    $import['summary'] = json_decode($import['summary'] ?? '{}', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'imports' => $imports,
                        'types' => $importTypes,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'templates') {
                // Get import templates/column mappings
                $type = $_GET['type'] ?? 'contacts';

                $columns = [];
                switch ($type) {
                    case 'contacts':
                        $columns = $contactColumns;
                        break;
                    case 'products':
                        $columns = $productColumns;
                        break;
                    default:
                        $columns = $contactColumns;
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'type' => $type,
                        'columns' => $columns,
                        'formats' => $fileFormats,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'status') {
                $importId = $_GET['id'] ?? null;

                if (!$importId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Import ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM import_jobs WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $importId, 'company_id' => $companyId]);
                $import = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$import) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Import not found']);
                    exit;
                }

                $import['type_config'] = $importTypes[$import['import_type']] ?? null;
                $import['status_config'] = $importStatuses[$import['status']] ?? null;
                $import['errors'] = json_decode($import['errors'] ?? '[]', true);
                $import['summary'] = json_decode($import['summary'] ?? '{}', true);

                echo json_encode([
                    'success' => true,
                    'data' => $import,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'types') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'types' => $importTypes,
                        'formats' => $fileFormats,
                        'statuses' => $importStatuses,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $action = $_POST['action'] ?? 'upload';

            if ($action === 'upload') {
                $importType = $_POST['type'] ?? 'contacts';
                $fileFormat = $_POST['format'] ?? 'csv';

                if (!isset($_FILES['file'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error_ro' => 'Fișierul este obligatoriu',
                        'error' => 'File is required'
                    ]);
                    exit;
                }

                $file = $_FILES['file'];
                $uploadDir = __DIR__ . '/../../../uploads/imports/' . $companyId . '/';

                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }

                $filename = 'import_' . date('YmdHis') . '_' . bin2hex(random_bytes(4)) . '.' . pathinfo($file['name'], PATHINFO_EXTENSION);
                $filePath = $uploadDir . $filename;

                if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => 'Failed to upload file']);
                    exit;
                }

                // Create import job
                $importId = 'imp_' . bin2hex(random_bytes(8));

                $stmt = $db->prepare("
                    INSERT INTO import_jobs (id, company_id, user_id, import_type, file_format, file_path, original_filename, status, created_at)
                    VALUES (:id, :company_id, :user_id, :type, :format, :path, :original, 'pending', NOW())
                ");
                $stmt->execute([
                    'id' => $importId,
                    'company_id' => $companyId,
                    'user_id' => $user['user_id'],
                    'type' => $importType,
                    'format' => $fileFormat,
                    'path' => $filePath,
                    'original' => $file['name'],
                ]);

                // Preview first rows
                $preview = previewFile($filePath, $fileFormat);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Fișierul a fost încărcat',
                    'message_en' => 'File uploaded',
                    'data' => [
                        'import_id' => $importId,
                        'preview' => $preview,
                        'total_rows' => $preview['total_rows'] ?? 0,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'process') {
                $input = json_decode(file_get_contents('php://input'), true);
                $importId = $input['import_id'] ?? null;
                $columnMapping = $input['column_mapping'] ?? [];
                $skipFirstRow = $input['skip_first_row'] ?? true;
                $updateExisting = $input['update_existing'] ?? false;

                if (!$importId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Import ID required']);
                    exit;
                }

                // Get import job
                $stmt = $db->prepare("SELECT * FROM import_jobs WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $importId, 'company_id' => $companyId]);
                $import = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$import) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Import not found']);
                    exit;
                }

                // Update status to processing
                $stmt = $db->prepare("UPDATE import_jobs SET status = 'processing', column_mapping = :mapping, started_at = NOW() WHERE id = :id");
                $stmt->execute(['id' => $importId, 'mapping' => json_encode($columnMapping)]);

                // Process import (simplified - in production this would be a background job)
                $result = processImport($db, $import, $columnMapping, $skipFirstRow, $updateExisting, $companyId);

                // Update job with results
                $status = $result['errors_count'] > 0 ? ($result['success_count'] > 0 ? 'partial' : 'failed') : 'completed';

                $stmt = $db->prepare("
                    UPDATE import_jobs SET
                        status = :status,
                        rows_processed = :processed,
                        rows_success = :success,
                        rows_failed = :failed,
                        errors = :errors,
                        summary = :summary,
                        completed_at = NOW()
                    WHERE id = :id
                ");
                $stmt->execute([
                    'id' => $importId,
                    'status' => $status,
                    'processed' => $result['total_rows'],
                    'success' => $result['success_count'],
                    'failed' => $result['errors_count'],
                    'errors' => json_encode($result['errors']),
                    'summary' => json_encode($result['summary']),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Importul a fost procesat',
                    'message_en' => 'Import processed',
                    'data' => [
                        'status' => $status,
                        'total_rows' => $result['total_rows'],
                        'success_count' => $result['success_count'],
                        'errors_count' => $result['errors_count'],
                        'errors' => array_slice($result['errors'], 0, 10), // First 10 errors
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'validate') {
                $input = json_decode(file_get_contents('php://input'), true);
                $importId = $input['import_id'] ?? null;
                $columnMapping = $input['column_mapping'] ?? [];

                if (!$importId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Import ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM import_jobs WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $importId, 'company_id' => $companyId]);
                $import = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$import) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Import not found']);
                    exit;
                }

                // Validate file
                $validation = validateImport($import['file_path'], $import['file_format'], $import['import_type'], $columnMapping);

                echo json_encode([
                    'success' => true,
                    'data' => $validation,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error: ' . $e->getMessage()]);
}

function previewFile($filePath, $format, $limit = 5) {
    $preview = ['headers' => [], 'rows' => [], 'total_rows' => 0];

    if ($format === 'csv') {
        if (($handle = fopen($filePath, 'r')) !== false) {
            $rowNum = 0;
            while (($row = fgetcsv($handle, 0, ',', '"')) !== false) {
                if ($rowNum === 0) {
                    $preview['headers'] = $row;
                } elseif ($rowNum <= $limit) {
                    $preview['rows'][] = $row;
                }
                $rowNum++;
            }
            $preview['total_rows'] = $rowNum - 1; // Exclude header
            fclose($handle);
        }
    } elseif ($format === 'json') {
        $content = file_get_contents($filePath);
        $data = json_decode($content, true);
        if (is_array($data) && !empty($data)) {
            $preview['headers'] = array_keys($data[0]);
            $preview['rows'] = array_slice(array_map('array_values', $data), 0, $limit);
            $preview['total_rows'] = count($data);
        }
    }

    return $preview;
}

function validateImport($filePath, $format, $type, $columnMapping) {
    $errors = [];
    $warnings = [];

    // Check required columns are mapped
    $requiredColumns = ['name']; // Simplified
    foreach ($requiredColumns as $col) {
        if (!isset($columnMapping[$col]) || $columnMapping[$col] === '') {
            $errors[] = "Coloana obligatorie '$col' nu este mapată";
        }
    }

    // Check file exists and readable
    if (!file_exists($filePath) || !is_readable($filePath)) {
        $errors[] = 'Fișierul nu poate fi citit';
    }

    return [
        'valid' => empty($errors),
        'errors' => $errors,
        'warnings' => $warnings,
    ];
}

function processImport($db, $import, $columnMapping, $skipFirstRow, $updateExisting, $companyId) {
    $result = [
        'total_rows' => 0,
        'success_count' => 0,
        'errors_count' => 0,
        'errors' => [],
        'summary' => [],
    ];

    $filePath = $import['file_path'];
    $format = $import['file_format'];
    $type = $import['import_type'];

    if ($format === 'csv' && ($handle = fopen($filePath, 'r')) !== false) {
        $rowNum = 0;
        $headers = [];

        while (($row = fgetcsv($handle, 0, ',', '"')) !== false) {
            $rowNum++;

            if ($rowNum === 1) {
                $headers = $row;
                if ($skipFirstRow) continue;
            }

            $result['total_rows']++;

            try {
                // Map columns to data
                $data = [];
                foreach ($columnMapping as $field => $colIndex) {
                    if ($colIndex !== '' && isset($row[$colIndex])) {
                        $data[$field] = trim($row[$colIndex]);
                    }
                }

                // Import based on type
                if ($type === 'contacts') {
                    importContact($db, $data, $companyId, $updateExisting);
                } elseif ($type === 'products') {
                    importProduct($db, $data, $companyId, $updateExisting);
                }

                $result['success_count']++;
            } catch (Exception $e) {
                $result['errors_count']++;
                $result['errors'][] = [
                    'row' => $rowNum,
                    'message' => $e->getMessage(),
                ];
            }
        }

        fclose($handle);
    }

    $result['summary'] = [
        'imported' => $result['success_count'],
        'skipped' => $result['errors_count'],
    ];

    return $result;
}

function importContact($db, $data, $companyId, $updateExisting) {
    if (empty($data['name'])) {
        throw new Exception('Numele este obligatoriu');
    }

    $contactId = 'cont_' . bin2hex(random_bytes(8));

    $stmt = $db->prepare("
        INSERT INTO contacts (id, company_id, name, email, phone, company_name, cui, address, city, county, country, notes, created_at)
        VALUES (:id, :company_id, :name, :email, :phone, :company_name, :cui, :address, :city, :county, :country, :notes, NOW())
    ");
    $stmt->execute([
        'id' => $contactId,
        'company_id' => $companyId,
        'name' => $data['name'] ?? null,
        'email' => $data['email'] ?? null,
        'phone' => $data['phone'] ?? null,
        'company_name' => $data['company'] ?? null,
        'cui' => $data['cui'] ?? null,
        'address' => $data['address'] ?? null,
        'city' => $data['city'] ?? null,
        'county' => $data['county'] ?? null,
        'country' => $data['country'] ?? 'Romania',
        'notes' => $data['notes'] ?? null,
    ]);
}

function importProduct($db, $data, $companyId, $updateExisting) {
    if (empty($data['name'])) {
        throw new Exception('Denumirea este obligatorie');
    }

    $productId = 'prod_' . bin2hex(random_bytes(8));

    $stmt = $db->prepare("
        INSERT INTO products (id, company_id, name, sku, price, cost, quantity, unit, vat_rate, category, description, barcode, created_at)
        VALUES (:id, :company_id, :name, :sku, :price, :cost, :quantity, :unit, :vat_rate, :category, :description, :barcode, NOW())
    ");
    $stmt->execute([
        'id' => $productId,
        'company_id' => $companyId,
        'name' => $data['name'] ?? null,
        'sku' => $data['sku'] ?? null,
        'price' => floatval($data['price'] ?? 0),
        'cost' => floatval($data['cost'] ?? 0),
        'quantity' => floatval($data['quantity'] ?? 0),
        'unit' => $data['unit'] ?? 'buc',
        'vat_rate' => floatval($data['vat_rate'] ?? 19),
        'category' => $data['category'] ?? null,
        'description' => $data['description'] ?? null,
        'barcode' => $data['barcode'] ?? null,
    ]);
}
