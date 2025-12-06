<?php
/**
 * Data Import - Column Mapping API
 * Map imported columns to system fields
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

// Field definitions per data type
$fieldDefinitions = [
    'contacts' => [
        'name' => ['label_ro' => 'Nume', 'label_en' => 'Name', 'type' => 'string', 'required' => true],
        'email' => ['label_ro' => 'Email', 'label_en' => 'Email', 'type' => 'email', 'required' => true],
        'phone' => ['label_ro' => 'Telefon', 'label_en' => 'Phone', 'type' => 'string', 'required' => false],
        'company' => ['label_ro' => 'Companie', 'label_en' => 'Company', 'type' => 'string', 'required' => false],
        'address' => ['label_ro' => 'Adresă', 'label_en' => 'Address', 'type' => 'string', 'required' => false],
        'city' => ['label_ro' => 'Oraș', 'label_en' => 'City', 'type' => 'string', 'required' => false],
        'country' => ['label_ro' => 'Țară', 'label_en' => 'Country', 'type' => 'string', 'required' => false],
        'tax_id' => ['label_ro' => 'CUI/CIF', 'label_en' => 'Tax ID', 'type' => 'string', 'required' => false],
        'type' => ['label_ro' => 'Tip', 'label_en' => 'Type', 'type' => 'enum', 'options' => ['customer', 'vendor', 'both'], 'required' => false],
    ],
    'products' => [
        'name' => ['label_ro' => 'Denumire', 'label_en' => 'Name', 'type' => 'string', 'required' => true],
        'price' => ['label_ro' => 'Preț', 'label_en' => 'Price', 'type' => 'decimal', 'required' => true],
        'sku' => ['label_ro' => 'Cod Produs', 'label_en' => 'SKU', 'type' => 'string', 'required' => false],
        'description' => ['label_ro' => 'Descriere', 'label_en' => 'Description', 'type' => 'text', 'required' => false],
        'category' => ['label_ro' => 'Categorie', 'label_en' => 'Category', 'type' => 'string', 'required' => false],
        'unit' => ['label_ro' => 'Unitate', 'label_en' => 'Unit', 'type' => 'string', 'required' => false],
        'tax_rate' => ['label_ro' => 'Cota TVA', 'label_en' => 'Tax Rate', 'type' => 'decimal', 'required' => false],
        'stock_quantity' => ['label_ro' => 'Stoc', 'label_en' => 'Stock Qty', 'type' => 'integer', 'required' => false],
    ],
    'invoices' => [
        'customer_name' => ['label_ro' => 'Client', 'label_en' => 'Customer', 'type' => 'string', 'required' => true],
        'total' => ['label_ro' => 'Total', 'label_en' => 'Total', 'type' => 'decimal', 'required' => true],
        'date' => ['label_ro' => 'Dată Emitere', 'label_en' => 'Date', 'type' => 'date', 'required' => true],
        'invoice_number' => ['label_ro' => 'Număr Factură', 'label_en' => 'Invoice Number', 'type' => 'string', 'required' => false],
        'due_date' => ['label_ro' => 'Data Scadenței', 'label_en' => 'Due Date', 'type' => 'date', 'required' => false],
        'status' => ['label_ro' => 'Status', 'label_en' => 'Status', 'type' => 'enum', 'options' => ['draft', 'sent', 'paid', 'overdue'], 'required' => false],
        'notes' => ['label_ro' => 'Note', 'label_en' => 'Notes', 'type' => 'text', 'required' => false],
    ],
    'expenses' => [
        'description' => ['label_ro' => 'Descriere', 'label_en' => 'Description', 'type' => 'string', 'required' => true],
        'amount' => ['label_ro' => 'Sumă', 'label_en' => 'Amount', 'type' => 'decimal', 'required' => true],
        'date' => ['label_ro' => 'Dată', 'label_en' => 'Date', 'type' => 'date', 'required' => true],
        'category' => ['label_ro' => 'Categorie', 'label_en' => 'Category', 'type' => 'string', 'required' => false],
        'vendor' => ['label_ro' => 'Furnizor', 'label_en' => 'Vendor', 'type' => 'string', 'required' => false],
        'payment_method' => ['label_ro' => 'Metodă Plată', 'label_en' => 'Payment Method', 'type' => 'string', 'required' => false],
        'receipt_number' => ['label_ro' => 'Nr. Chitanță', 'label_en' => 'Receipt Number', 'type' => 'string', 'required' => false],
    ],
    'transactions' => [
        'date' => ['label_ro' => 'Dată', 'label_en' => 'Date', 'type' => 'date', 'required' => true],
        'amount' => ['label_ro' => 'Sumă', 'label_en' => 'Amount', 'type' => 'decimal', 'required' => true],
        'description' => ['label_ro' => 'Descriere', 'label_en' => 'Description', 'type' => 'string', 'required' => true],
        'reference' => ['label_ro' => 'Referință', 'label_en' => 'Reference', 'type' => 'string', 'required' => false],
        'type' => ['label_ro' => 'Tip', 'label_en' => 'Type', 'type' => 'enum', 'options' => ['income', 'expense'], 'required' => false],
        'category' => ['label_ro' => 'Categorie', 'label_en' => 'Category', 'type' => 'string', 'required' => false],
        'account' => ['label_ro' => 'Cont', 'label_en' => 'Account', 'type' => 'string', 'required' => false],
    ],
    'employees' => [
        'first_name' => ['label_ro' => 'Prenume', 'label_en' => 'First Name', 'type' => 'string', 'required' => true],
        'last_name' => ['label_ro' => 'Nume', 'label_en' => 'Last Name', 'type' => 'string', 'required' => true],
        'email' => ['label_ro' => 'Email', 'label_en' => 'Email', 'type' => 'email', 'required' => true],
        'phone' => ['label_ro' => 'Telefon', 'label_en' => 'Phone', 'type' => 'string', 'required' => false],
        'position' => ['label_ro' => 'Funcție', 'label_en' => 'Position', 'type' => 'string', 'required' => false],
        'department' => ['label_ro' => 'Departament', 'label_en' => 'Department', 'type' => 'string', 'required' => false],
        'hire_date' => ['label_ro' => 'Data Angajării', 'label_en' => 'Hire Date', 'type' => 'date', 'required' => false],
        'salary' => ['label_ro' => 'Salariu', 'label_en' => 'Salary', 'type' => 'decimal', 'required' => false],
        'cnp' => ['label_ro' => 'CNP', 'label_en' => 'Personal ID', 'type' => 'string', 'required' => false],
    ],
    'chart_of_accounts' => [
        'code' => ['label_ro' => 'Cod Cont', 'label_en' => 'Account Code', 'type' => 'string', 'required' => true],
        'name' => ['label_ro' => 'Denumire', 'label_en' => 'Name', 'type' => 'string', 'required' => true],
        'type' => ['label_ro' => 'Tip', 'label_en' => 'Type', 'type' => 'enum', 'options' => ['asset', 'liability', 'equity', 'revenue', 'expense'], 'required' => true],
        'parent_code' => ['label_ro' => 'Cont Părinte', 'label_en' => 'Parent Code', 'type' => 'string', 'required' => false],
        'description' => ['label_ro' => 'Descriere', 'label_en' => 'Description', 'type' => 'text', 'required' => false],
        'currency' => ['label_ro' => 'Monedă', 'label_en' => 'Currency', 'type' => 'string', 'required' => false],
    ],
];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        $importId = $_GET['import_id'] ?? null;

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

        // Get current mapping if exists
        $mappingStmt = $db->prepare("
            SELECT column_mapping FROM import_jobs WHERE id = :id
        ");
        $mappingStmt->execute(['id' => $importId]);
        $currentMapping = json_decode($mappingStmt->fetchColumn() ?: '{}', true);

        // Auto-suggest mappings based on column names
        $suggestions = [];
        if (!empty($import['detected_columns'])) {
            $columns = json_decode($import['detected_columns'], true) ?? [];
            foreach ($columns as $col) {
                $suggestions[$col] = suggestFieldMapping($col, $import['data_type'], $fieldDefinitions);
            }
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'import_id' => $importId,
                'data_type' => $import['data_type'],
                'available_fields' => $fieldDefinitions[$import['data_type']] ?? [],
                'current_mapping' => $currentMapping,
                'suggested_mapping' => $suggestions,
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $importId = $input['import_id'] ?? null;
        $mapping = $input['mapping'] ?? [];

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

        // Validate mapping - check required fields
        $dataType = $import['data_type'];
        $requiredFields = array_keys(array_filter($fieldDefinitions[$dataType], fn($f) => $f['required']));
        $mappedFields = array_values(array_filter($mapping));
        $missingRequired = array_diff($requiredFields, $mappedFields);

        if (!empty($missingRequired)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Câmpuri obligatorii nemapate: ' . implode(', ', $missingRequired),
                'error' => 'Required fields not mapped: ' . implode(', ', $missingRequired),
                'missing_fields' => $missingRequired,
            ]);
            exit;
        }

        // Save mapping
        $stmt = $db->prepare("
            UPDATE import_jobs
            SET column_mapping = :mapping, status = 'mapped', updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'id' => $importId,
            'mapping' => json_encode($mapping),
        ]);

        echo json_encode([
            'success' => true,
            'message_ro' => 'Mapare salvată cu succes',
            'message_en' => 'Mapping saved successfully',
            'data' => [
                'import_id' => $importId,
                'mapping' => $mapping,
                'status' => 'mapped',
                'next_step' => 'validate',
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function suggestFieldMapping($columnName, $dataType, $fieldDefinitions) {
    $col = strtolower(trim($columnName));
    $fields = $fieldDefinitions[$dataType] ?? [];

    // Direct match
    if (isset($fields[$col])) {
        return $col;
    }

    // Common aliases (Romanian and English)
    $aliases = [
        'name' => ['nume', 'denumire', 'name', 'title', 'titlu'],
        'email' => ['email', 'e-mail', 'mail', 'adresa email'],
        'phone' => ['telefon', 'phone', 'tel', 'mobil', 'mobile'],
        'company' => ['companie', 'firma', 'company', 'societate'],
        'address' => ['adresa', 'address', 'strada', 'street'],
        'city' => ['oras', 'city', 'localitate', 'municipiu'],
        'country' => ['tara', 'country'],
        'tax_id' => ['cui', 'cif', 'cod fiscal', 'tax id', 'vat'],
        'price' => ['pret', 'price', 'cost', 'valoare'],
        'amount' => ['suma', 'amount', 'total', 'valoare'],
        'date' => ['data', 'date', 'data emitere', 'issue date'],
        'description' => ['descriere', 'description', 'detalii', 'details'],
        'sku' => ['cod', 'code', 'sku', 'cod produs', 'product code'],
        'category' => ['categorie', 'category', 'tip', 'type'],
        'first_name' => ['prenume', 'first name', 'firstname'],
        'last_name' => ['nume', 'last name', 'lastname', 'familia'],
        'cnp' => ['cnp', 'personal id', 'cod numeric personal'],
        'hire_date' => ['data angajarii', 'hire date', 'data angajare'],
        'salary' => ['salariu', 'salary', 'venit'],
    ];

    foreach ($aliases as $field => $patterns) {
        if (isset($fields[$field])) {
            foreach ($patterns as $pattern) {
                if (strpos($col, $pattern) !== false || $col === $pattern) {
                    return $field;
                }
            }
        }
    }

    return null; // No suggestion
}
