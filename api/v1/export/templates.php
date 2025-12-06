<?php
/**
 * Export Templates API
 * Manage export templates and presets
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

// Available export fields per data type
$availableFields = [
    'contacts' => [
        ['field' => 'name', 'label_ro' => 'Nume', 'label_en' => 'Name'],
        ['field' => 'email', 'label_ro' => 'Email', 'label_en' => 'Email'],
        ['field' => 'phone', 'label_ro' => 'Telefon', 'label_en' => 'Phone'],
        ['field' => 'company_name', 'label_ro' => 'Companie', 'label_en' => 'Company'],
        ['field' => 'address', 'label_ro' => 'Adresă', 'label_en' => 'Address'],
        ['field' => 'city', 'label_ro' => 'Oraș', 'label_en' => 'City'],
        ['field' => 'country', 'label_ro' => 'Țară', 'label_en' => 'Country'],
        ['field' => 'tax_id', 'label_ro' => 'CUI/CIF', 'label_en' => 'Tax ID'],
        ['field' => 'type', 'label_ro' => 'Tip', 'label_en' => 'Type'],
        ['field' => 'notes', 'label_ro' => 'Note', 'label_en' => 'Notes'],
        ['field' => 'created_at', 'label_ro' => 'Data Creării', 'label_en' => 'Created Date'],
    ],
    'invoices' => [
        ['field' => 'invoice_number', 'label_ro' => 'Număr Factură', 'label_en' => 'Invoice Number'],
        ['field' => 'customer_name', 'label_ro' => 'Client', 'label_en' => 'Customer'],
        ['field' => 'customer_tax_id', 'label_ro' => 'CUI Client', 'label_en' => 'Customer Tax ID'],
        ['field' => 'issue_date', 'label_ro' => 'Data Emiterii', 'label_en' => 'Issue Date'],
        ['field' => 'due_date', 'label_ro' => 'Data Scadenței', 'label_en' => 'Due Date'],
        ['field' => 'subtotal', 'label_ro' => 'Subtotal', 'label_en' => 'Subtotal'],
        ['field' => 'tax_amount', 'label_ro' => 'TVA', 'label_en' => 'Tax Amount'],
        ['field' => 'total', 'label_ro' => 'Total', 'label_en' => 'Total'],
        ['field' => 'paid_amount', 'label_ro' => 'Sumă Plătită', 'label_en' => 'Paid Amount'],
        ['field' => 'status', 'label_ro' => 'Status', 'label_en' => 'Status'],
        ['field' => 'currency', 'label_ro' => 'Monedă', 'label_en' => 'Currency'],
    ],
    'expenses' => [
        ['field' => 'date', 'label_ro' => 'Dată', 'label_en' => 'Date'],
        ['field' => 'description', 'label_ro' => 'Descriere', 'label_en' => 'Description'],
        ['field' => 'amount', 'label_ro' => 'Sumă', 'label_en' => 'Amount'],
        ['field' => 'category', 'label_ro' => 'Categorie', 'label_en' => 'Category'],
        ['field' => 'vendor', 'label_ro' => 'Furnizor', 'label_en' => 'Vendor'],
        ['field' => 'payment_method', 'label_ro' => 'Metodă Plată', 'label_en' => 'Payment Method'],
        ['field' => 'receipt_number', 'label_ro' => 'Nr. Document', 'label_en' => 'Receipt No.'],
        ['field' => 'tax_deductible', 'label_ro' => 'Deductibil Fiscal', 'label_en' => 'Tax Deductible'],
    ],
    'products' => [
        ['field' => 'name', 'label_ro' => 'Denumire', 'label_en' => 'Name'],
        ['field' => 'sku', 'label_ro' => 'Cod Produs', 'label_en' => 'SKU'],
        ['field' => 'price', 'label_ro' => 'Preț', 'label_en' => 'Price'],
        ['field' => 'cost', 'label_ro' => 'Cost', 'label_en' => 'Cost'],
        ['field' => 'category', 'label_ro' => 'Categorie', 'label_en' => 'Category'],
        ['field' => 'unit', 'label_ro' => 'Unitate', 'label_en' => 'Unit'],
        ['field' => 'tax_rate', 'label_ro' => 'Cota TVA', 'label_en' => 'Tax Rate'],
        ['field' => 'stock_quantity', 'label_ro' => 'Stoc', 'label_en' => 'Stock'],
    ],
];

// System templates
$systemTemplates = [
    [
        'id' => 'system_contacts_basic',
        'name_ro' => 'Contacte - Export Simplu',
        'name_en' => 'Contacts - Basic Export',
        'data_type' => 'contacts',
        'is_system' => true,
        'fields' => ['name', 'email', 'phone', 'company_name', 'type'],
        'format' => 'csv',
    ],
    [
        'id' => 'system_contacts_full',
        'name_ro' => 'Contacte - Export Complet',
        'name_en' => 'Contacts - Full Export',
        'data_type' => 'contacts',
        'is_system' => true,
        'fields' => ['name', 'email', 'phone', 'company_name', 'address', 'city', 'country', 'tax_id', 'type', 'created_at'],
        'format' => 'csv',
    ],
    [
        'id' => 'system_invoices_accounting',
        'name_ro' => 'Facturi - Export Contabil',
        'name_en' => 'Invoices - Accounting Export',
        'data_type' => 'invoices',
        'is_system' => true,
        'fields' => ['invoice_number', 'customer_name', 'customer_tax_id', 'issue_date', 'due_date', 'subtotal', 'tax_amount', 'total', 'status'],
        'format' => 'csv',
    ],
    [
        'id' => 'system_expenses_fiscal',
        'name_ro' => 'Cheltuieli - Export Fiscal',
        'name_en' => 'Expenses - Fiscal Export',
        'data_type' => 'expenses',
        'is_system' => true,
        'fields' => ['date', 'description', 'amount', 'category', 'vendor', 'receipt_number', 'tax_deductible'],
        'format' => 'csv',
    ],
    [
        'id' => 'system_products_inventory',
        'name_ro' => 'Produse - Export Inventar',
        'name_en' => 'Products - Inventory Export',
        'data_type' => 'products',
        'is_system' => true,
        'fields' => ['sku', 'name', 'price', 'cost', 'stock_quantity', 'unit', 'category'],
        'format' => 'csv',
    ],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $dataType = $_GET['data_type'] ?? null;

            // Get user templates
            $sql = "SELECT * FROM export_templates WHERE company_id = :company_id";
            $params = ['company_id' => $companyId];

            if ($dataType) {
                $sql .= " AND data_type = :data_type";
                $params['data_type'] = $dataType;
            }

            $sql .= " ORDER BY name ASC";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $userTemplates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($userTemplates as &$template) {
                $template['fields'] = json_decode($template['fields'] ?? '[]', true);
                $template['filters'] = json_decode($template['filters'] ?? '{}', true);
                $template['is_system'] = false;
            }

            // Filter system templates by data type if specified
            $filteredSystemTemplates = $dataType
                ? array_filter($systemTemplates, fn($t) => $t['data_type'] === $dataType)
                : $systemTemplates;

            echo json_encode([
                'success' => true,
                'data' => [
                    'system_templates' => array_values($filteredSystemTemplates),
                    'user_templates' => $userTemplates,
                    'available_fields' => $dataType ? ($availableFields[$dataType] ?? []) : $availableFields,
                    'available_formats' => [
                        ['id' => 'csv', 'label' => 'CSV'],
                        ['id' => 'xlsx', 'label' => 'Excel (XLSX)'],
                        ['id' => 'json', 'label' => 'JSON'],
                    ],
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $name = $input['name'] ?? null;
            $dataType = $input['data_type'] ?? null;
            $fields = $input['fields'] ?? [];
            $format = $input['format'] ?? 'csv';
            $filters = $input['filters'] ?? [];

            if (!$name || !$dataType || empty($fields)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error_ro' => 'Nume, tip de date și câmpuri sunt obligatorii',
                    'error' => 'Name, data type, and fields are required'
                ]);
                exit;
            }

            $templateId = 'exptpl_' . bin2hex(random_bytes(12));
            $stmt = $db->prepare("
                INSERT INTO export_templates (id, company_id, name, data_type, fields, format, filters, created_by, created_at)
                VALUES (:id, :company_id, :name, :data_type, :fields, :format, :filters, :created_by, NOW())
            ");
            $stmt->execute([
                'id' => $templateId,
                'company_id' => $companyId,
                'name' => $name,
                'data_type' => $dataType,
                'fields' => json_encode($fields),
                'format' => $format,
                'filters' => json_encode($filters),
                'created_by' => $user['user_id'],
            ]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablon de export creat',
                'message_en' => 'Export template created',
                'data' => ['id' => $templateId],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $templateId = $input['id'] ?? null;

            if (!$templateId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            // Check ownership
            $stmt = $db->prepare("SELECT id FROM export_templates WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Template not found']);
                exit;
            }

            $updates = [];
            $params = ['id' => $templateId];

            if (isset($input['name'])) {
                $updates[] = "name = :name";
                $params['name'] = $input['name'];
            }
            if (isset($input['fields'])) {
                $updates[] = "fields = :fields";
                $params['fields'] = json_encode($input['fields']);
            }
            if (isset($input['format'])) {
                $updates[] = "format = :format";
                $params['format'] = $input['format'];
            }
            if (isset($input['filters'])) {
                $updates[] = "filters = :filters";
                $params['filters'] = json_encode($input['filters']);
            }

            if (!empty($updates)) {
                $updates[] = "updated_at = NOW()";
                $sql = "UPDATE export_templates SET " . implode(', ', $updates) . " WHERE id = :id";
                $db->prepare($sql)->execute($params);
            }

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablon actualizat',
                'message_en' => 'Template updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $templateId = $_GET['id'] ?? null;

            if (!$templateId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'id required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM export_templates WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $templateId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Șablon șters',
                'message_en' => 'Template deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
