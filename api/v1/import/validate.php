<?php
/**
 * Data Import - Validation API
 * Validate imported data before processing
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

// Validation rules per field type
$validators = [
    'string' => fn($v) => is_string($v) && strlen($v) <= 500,
    'text' => fn($v) => is_string($v),
    'email' => fn($v) => filter_var($v, FILTER_VALIDATE_EMAIL) !== false,
    'decimal' => fn($v) => is_numeric($v),
    'integer' => fn($v) => filter_var($v, FILTER_VALIDATE_INT) !== false,
    'date' => fn($v) => strtotime($v) !== false,
    'enum' => fn($v, $options) => in_array($v, $options),
];

try {
    $db = getDbConnection();
    $input = json_decode(file_get_contents('php://input'), true);
    $importId = $input['import_id'] ?? null;

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

    if ($import['status'] !== 'mapped') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'Import trebuie mai întâi mapat',
            'error' => 'Import must be mapped first'
        ]);
        exit;
    }

    $mapping = json_decode($import['column_mapping'], true);
    if (empty($mapping)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No mapping found']);
        exit;
    }

    // Parse file and validate
    $filepath = $import['file_path'];
    $extension = strtolower(pathinfo($import['stored_filename'], PATHINFO_EXTENSION));

    $validationResult = validateImportFile($filepath, $extension, $mapping, $import['data_type']);

    // Update import status
    $newStatus = $validationResult['valid_count'] > 0 && $validationResult['error_count'] === 0 ? 'validated' : 'validation_errors';
    $stmt = $db->prepare("
        UPDATE import_jobs
        SET status = :status,
            total_rows = :total_rows,
            valid_rows = :valid_rows,
            error_rows = :error_rows,
            validation_errors = :errors,
            updated_at = NOW()
        WHERE id = :id
    ");
    $stmt->execute([
        'id' => $importId,
        'status' => $newStatus,
        'total_rows' => $validationResult['total_count'],
        'valid_rows' => $validationResult['valid_count'],
        'error_rows' => $validationResult['error_count'],
        'errors' => json_encode($validationResult['errors']),
    ]);

    echo json_encode([
        'success' => true,
        'message_ro' => $validationResult['error_count'] === 0
            ? 'Validare completă - toate datele sunt valide'
            : 'Validare completă - s-au găsit erori',
        'message_en' => $validationResult['error_count'] === 0
            ? 'Validation complete - all data is valid'
            : 'Validation complete - errors found',
        'data' => [
            'import_id' => $importId,
            'status' => $newStatus,
            'total_rows' => $validationResult['total_count'],
            'valid_rows' => $validationResult['valid_count'],
            'error_rows' => $validationResult['error_count'],
            'errors' => array_slice($validationResult['errors'], 0, 50), // Limit to first 50 errors
            'can_proceed' => $validationResult['valid_count'] > 0,
            'next_step' => $newStatus === 'validated' ? 'process' : 'fix_errors',
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

function validateImportFile($filepath, $extension, $mapping, $dataType) {
    global $validators;

    $fieldDefinitions = getFieldDefinitions($dataType);
    $result = [
        'total_count' => 0,
        'valid_count' => 0,
        'error_count' => 0,
        'errors' => [],
    ];

    if ($extension === 'csv') {
        if (($handle = fopen($filepath, 'r')) !== false) {
            $firstLine = fgets($handle);
            rewind($handle);
            $delimiter = detectCsvDelimiter($firstLine);

            $header = fgetcsv($handle, 0, $delimiter);
            $rowNum = 1;

            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                $rowNum++;
                $result['total_count']++;
                $rowData = array_combine($header, array_pad($row, count($header), ''));
                $rowErrors = validateRow($rowData, $mapping, $fieldDefinitions, $rowNum);

                if (empty($rowErrors)) {
                    $result['valid_count']++;
                } else {
                    $result['error_count']++;
                    $result['errors'] = array_merge($result['errors'], $rowErrors);
                }
            }
            fclose($handle);
        }
    } elseif ($extension === 'json') {
        $content = file_get_contents($filepath);
        $data = json_decode($content, true);

        if (is_array($data)) {
            foreach ($data as $rowNum => $rowData) {
                $result['total_count']++;
                $rowErrors = validateRow($rowData, $mapping, $fieldDefinitions, $rowNum + 1);

                if (empty($rowErrors)) {
                    $result['valid_count']++;
                } else {
                    $result['error_count']++;
                    $result['errors'] = array_merge($result['errors'], $rowErrors);
                }
            }
        }
    }

    return $result;
}

function validateRow($rowData, $mapping, $fieldDefinitions, $rowNum) {
    global $validators;
    $errors = [];

    foreach ($mapping as $sourceCol => $targetField) {
        if (!$targetField) continue;

        $value = $rowData[$sourceCol] ?? '';
        $fieldDef = $fieldDefinitions[$targetField] ?? null;

        if (!$fieldDef) continue;

        // Check required
        if ($fieldDef['required'] && empty(trim($value))) {
            $errors[] = [
                'row' => $rowNum,
                'field' => $targetField,
                'error_ro' => "Câmp obligatoriu gol",
                'error_en' => "Required field is empty",
                'value' => $value,
            ];
            continue;
        }

        // Skip validation for empty optional fields
        if (empty(trim($value))) continue;

        // Type validation
        $type = $fieldDef['type'];
        $validator = $validators[$type] ?? null;

        if ($validator) {
            $options = $fieldDef['options'] ?? [];
            $isValid = $type === 'enum' ? $validator($value, $options) : $validator($value);

            if (!$isValid) {
                $errorMsg = match($type) {
                    'email' => 'Email invalid',
                    'decimal' => 'Trebuie să fie un număr',
                    'integer' => 'Trebuie să fie un număr întreg',
                    'date' => 'Format dată invalid',
                    'enum' => 'Valoare invalidă. Acceptate: ' . implode(', ', $options),
                    default => 'Format invalid',
                };
                $errors[] = [
                    'row' => $rowNum,
                    'field' => $targetField,
                    'error_ro' => $errorMsg,
                    'error_en' => "Invalid {$type} format",
                    'value' => $value,
                ];
            }
        }

        // Additional Romanian-specific validations
        if ($targetField === 'tax_id') {
            if (!validateRomanianTaxId($value)) {
                $errors[] = [
                    'row' => $rowNum,
                    'field' => $targetField,
                    'error_ro' => 'CUI/CIF invalid',
                    'error_en' => 'Invalid Tax ID format',
                    'value' => $value,
                ];
            }
        }

        if ($targetField === 'cnp') {
            if (!validateRomanianCNP($value)) {
                $errors[] = [
                    'row' => $rowNum,
                    'field' => $targetField,
                    'error_ro' => 'CNP invalid',
                    'error_en' => 'Invalid CNP format',
                    'value' => $value,
                ];
            }
        }
    }

    return $errors;
}

function getFieldDefinitions($dataType) {
    $definitions = [
        'contacts' => [
            'name' => ['type' => 'string', 'required' => true],
            'email' => ['type' => 'email', 'required' => true],
            'phone' => ['type' => 'string', 'required' => false],
            'company' => ['type' => 'string', 'required' => false],
            'address' => ['type' => 'string', 'required' => false],
            'city' => ['type' => 'string', 'required' => false],
            'country' => ['type' => 'string', 'required' => false],
            'tax_id' => ['type' => 'string', 'required' => false],
            'type' => ['type' => 'enum', 'options' => ['customer', 'vendor', 'both'], 'required' => false],
        ],
        'products' => [
            'name' => ['type' => 'string', 'required' => true],
            'price' => ['type' => 'decimal', 'required' => true],
            'sku' => ['type' => 'string', 'required' => false],
            'description' => ['type' => 'text', 'required' => false],
            'category' => ['type' => 'string', 'required' => false],
            'unit' => ['type' => 'string', 'required' => false],
            'tax_rate' => ['type' => 'decimal', 'required' => false],
            'stock_quantity' => ['type' => 'integer', 'required' => false],
        ],
        'expenses' => [
            'description' => ['type' => 'string', 'required' => true],
            'amount' => ['type' => 'decimal', 'required' => true],
            'date' => ['type' => 'date', 'required' => true],
            'category' => ['type' => 'string', 'required' => false],
            'vendor' => ['type' => 'string', 'required' => false],
            'payment_method' => ['type' => 'string', 'required' => false],
            'receipt_number' => ['type' => 'string', 'required' => false],
        ],
    ];
    return $definitions[$dataType] ?? [];
}

function validateRomanianTaxId($value) {
    // Basic Romanian CUI/CIF validation
    $value = preg_replace('/[^0-9]/', '', $value);
    return strlen($value) >= 2 && strlen($value) <= 10;
}

function validateRomanianCNP($value) {
    // Basic Romanian CNP validation
    $value = preg_replace('/[^0-9]/', '', $value);
    return strlen($value) === 13;
}

function detectCsvDelimiter($line) {
    $delimiters = [',', ';', '\t', '|'];
    $counts = [];
    foreach ($delimiters as $d) {
        $counts[$d] = substr_count($line, $d);
    }
    return array_keys($counts, max($counts))[0];
}
