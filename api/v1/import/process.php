<?php
/**
 * Data Import - Process API
 * Execute the import and create records
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

try {
    $db = getDbConnection();
    $input = json_decode(file_get_contents('php://input'), true);
    $importId = $input['import_id'] ?? null;
    $skipErrors = $input['skip_errors'] ?? false;

    if (!$importId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'import_id required']);
        exit;
    }

    // Get import job
    $stmt = $db->prepare("
        SELECT * FROM import_jobs
        WHERE id = :id AND company_id = :company_id
    ");
    $stmt->execute(['id' => $importId, 'company_id' => $companyId]);
    $import = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$import) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Import not found']);
        exit;
    }

    if (!in_array($import['status'], ['validated', 'validation_errors'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'Import trebuie validat mai întâi',
            'error' => 'Import must be validated first'
        ]);
        exit;
    }

    if ($import['status'] === 'validation_errors' && !$skipErrors) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'Import are erori. Setați skip_errors=true pentru a continua cu rândurile valide.',
            'error' => 'Import has errors. Set skip_errors=true to continue with valid rows only.',
            'error_count' => $import['error_rows'],
        ]);
        exit;
    }

    $mapping = json_decode($import['column_mapping'], true);
    $filepath = $import['file_path'];
    $extension = strtolower(pathinfo($import['stored_filename'], PATHINFO_EXTENSION));
    $dataType = $import['data_type'];

    // Update status to processing
    $db->prepare("UPDATE import_jobs SET status = 'processing', started_at = NOW() WHERE id = :id")
       ->execute(['id' => $importId]);

    // Process the import
    $result = processImport($db, $companyId, $user['user_id'], $filepath, $extension, $mapping, $dataType, $skipErrors);

    // Update final status
    $finalStatus = $result['failed_count'] === 0 ? 'completed' : 'completed_with_errors';
    $stmt = $db->prepare("
        UPDATE import_jobs
        SET status = :status,
            processed_rows = :processed,
            failed_rows = :failed,
            completed_at = NOW(),
            processing_result = :result
        WHERE id = :id
    ");
    $stmt->execute([
        'id' => $importId,
        'status' => $finalStatus,
        'processed' => $result['success_count'],
        'failed' => $result['failed_count'],
        'result' => json_encode($result),
    ]);

    echo json_encode([
        'success' => true,
        'message_ro' => $result['failed_count'] === 0
            ? 'Import completat cu succes'
            : 'Import completat cu unele erori',
        'message_en' => $result['failed_count'] === 0
            ? 'Import completed successfully'
            : 'Import completed with some errors',
        'data' => [
            'import_id' => $importId,
            'status' => $finalStatus,
            'total_rows' => $result['total_count'],
            'imported_rows' => $result['success_count'],
            'failed_rows' => $result['failed_count'],
            'skipped_rows' => $result['skipped_count'],
            'created_ids' => array_slice($result['created_ids'], 0, 100), // Limit response
            'errors' => array_slice($result['errors'], 0, 20),
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

function processImport($db, $companyId, $userId, $filepath, $extension, $mapping, $dataType, $skipErrors) {
    $result = [
        'total_count' => 0,
        'success_count' => 0,
        'failed_count' => 0,
        'skipped_count' => 0,
        'created_ids' => [],
        'errors' => [],
    ];

    $rows = [];

    // Parse file
    if ($extension === 'csv') {
        if (($handle = fopen($filepath, 'r')) !== false) {
            $firstLine = fgets($handle);
            rewind($handle);
            $delimiter = detectCsvDelimiter($firstLine);
            $header = fgetcsv($handle, 0, $delimiter);

            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                $rows[] = array_combine($header, array_pad($row, count($header), ''));
            }
            fclose($handle);
        }
    } elseif ($extension === 'json') {
        $content = file_get_contents($filepath);
        $rows = json_decode($content, true) ?? [];
    }

    // Process each row
    foreach ($rows as $rowNum => $rowData) {
        $result['total_count']++;

        try {
            // Map columns to fields
            $mappedData = [];
            foreach ($mapping as $sourceCol => $targetField) {
                if ($targetField && isset($rowData[$sourceCol])) {
                    $mappedData[$targetField] = trim($rowData[$sourceCol]);
                }
            }

            // Insert record based on data type
            $recordId = insertRecord($db, $companyId, $userId, $dataType, $mappedData);

            if ($recordId) {
                $result['success_count']++;
                $result['created_ids'][] = $recordId;
            } else {
                throw new Exception('Failed to create record');
            }

        } catch (Exception $e) {
            if ($skipErrors) {
                $result['skipped_count']++;
                $result['errors'][] = [
                    'row' => $rowNum + 2, // +2 for header and 0-index
                    'error' => $e->getMessage(),
                ];
            } else {
                $result['failed_count']++;
                $result['errors'][] = [
                    'row' => $rowNum + 2,
                    'error' => $e->getMessage(),
                ];
            }
        }
    }

    return $result;
}

function insertRecord($db, $companyId, $userId, $dataType, $data) {
    $recordId = bin2hex(random_bytes(16));

    switch ($dataType) {
        case 'contacts':
            $stmt = $db->prepare("
                INSERT INTO contacts (id, company_id, name, email, phone, company_name,
                    address, city, country, tax_id, type, created_by, created_at)
                VALUES (:id, :company_id, :name, :email, :phone, :company_name,
                    :address, :city, :country, :tax_id, :type, :created_by, NOW())
            ");
            $stmt->execute([
                'id' => $recordId,
                'company_id' => $companyId,
                'name' => $data['name'] ?? '',
                'email' => $data['email'] ?? '',
                'phone' => $data['phone'] ?? null,
                'company_name' => $data['company'] ?? null,
                'address' => $data['address'] ?? null,
                'city' => $data['city'] ?? null,
                'country' => $data['country'] ?? 'Romania',
                'tax_id' => $data['tax_id'] ?? null,
                'type' => $data['type'] ?? 'customer',
                'created_by' => $userId,
            ]);
            break;

        case 'products':
            $stmt = $db->prepare("
                INSERT INTO products (id, company_id, name, price, sku, description,
                    category, unit, tax_rate, stock_quantity, created_by, created_at)
                VALUES (:id, :company_id, :name, :price, :sku, :description,
                    :category, :unit, :tax_rate, :stock_quantity, :created_by, NOW())
            ");
            $stmt->execute([
                'id' => $recordId,
                'company_id' => $companyId,
                'name' => $data['name'] ?? '',
                'price' => floatval($data['price'] ?? 0),
                'sku' => $data['sku'] ?? null,
                'description' => $data['description'] ?? null,
                'category' => $data['category'] ?? null,
                'unit' => $data['unit'] ?? 'buc',
                'tax_rate' => floatval($data['tax_rate'] ?? 19),
                'stock_quantity' => intval($data['stock_quantity'] ?? 0),
                'created_by' => $userId,
            ]);
            break;

        case 'expenses':
            $stmt = $db->prepare("
                INSERT INTO expenses (id, company_id, description, amount, date,
                    category, vendor, payment_method, receipt_number, created_by, created_at)
                VALUES (:id, :company_id, :description, :amount, :date,
                    :category, :vendor, :payment_method, :receipt_number, :created_by, NOW())
            ");
            $stmt->execute([
                'id' => $recordId,
                'company_id' => $companyId,
                'description' => $data['description'] ?? '',
                'amount' => floatval($data['amount'] ?? 0),
                'date' => $data['date'] ?? date('Y-m-d'),
                'category' => $data['category'] ?? null,
                'vendor' => $data['vendor'] ?? null,
                'payment_method' => $data['payment_method'] ?? null,
                'receipt_number' => $data['receipt_number'] ?? null,
                'created_by' => $userId,
            ]);
            break;

        case 'employees':
            $stmt = $db->prepare("
                INSERT INTO employees (id, company_id, first_name, last_name, email,
                    phone, position, department, hire_date, salary, cnp, created_by, created_at)
                VALUES (:id, :company_id, :first_name, :last_name, :email,
                    :phone, :position, :department, :hire_date, :salary, :cnp, :created_by, NOW())
            ");
            $stmt->execute([
                'id' => $recordId,
                'company_id' => $companyId,
                'first_name' => $data['first_name'] ?? '',
                'last_name' => $data['last_name'] ?? '',
                'email' => $data['email'] ?? '',
                'phone' => $data['phone'] ?? null,
                'position' => $data['position'] ?? null,
                'department' => $data['department'] ?? null,
                'hire_date' => $data['hire_date'] ?? null,
                'salary' => !empty($data['salary']) ? floatval($data['salary']) : null,
                'cnp' => $data['cnp'] ?? null,
                'created_by' => $userId,
            ]);
            break;

        default:
            throw new Exception('Unsupported data type: ' . $dataType);
    }

    return $recordId;
}

function detectCsvDelimiter($line) {
    $delimiters = [',', ';', '\t', '|'];
    $counts = [];
    foreach ($delimiters as $d) {
        $counts[$d] = substr_count($line, $d);
    }
    return array_keys($counts, max($counts))[0];
}
