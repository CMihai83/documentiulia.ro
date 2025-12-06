<?php
/**
 * Data Export API
 * Export data in various formats (CSV, Excel, JSON, PDF)
 */

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
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$companyId = $_SERVER['HTTP_X_COMPANY_ID'] ?? null;
if (!$companyId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID required']);
    exit;
}

// Export configurations per data type
$exportConfigs = [
    'contacts' => [
        'table' => 'contacts',
        'columns' => [
            'name' => 'Nume / Name',
            'email' => 'Email',
            'phone' => 'Telefon / Phone',
            'company_name' => 'Companie / Company',
            'address' => 'Adresă / Address',
            'city' => 'Oraș / City',
            'country' => 'Țară / Country',
            'tax_id' => 'CUI/CIF / Tax ID',
            'type' => 'Tip / Type',
            'created_at' => 'Data Creării / Created',
        ],
    ],
    'products' => [
        'table' => 'products',
        'columns' => [
            'name' => 'Denumire / Name',
            'sku' => 'Cod Produs / SKU',
            'price' => 'Preț / Price',
            'description' => 'Descriere / Description',
            'category' => 'Categorie / Category',
            'unit' => 'Unitate / Unit',
            'tax_rate' => 'Cota TVA / Tax Rate',
            'stock_quantity' => 'Stoc / Stock',
            'created_at' => 'Data Creării / Created',
        ],
    ],
    'invoices' => [
        'table' => 'invoices',
        'columns' => [
            'invoice_number' => 'Număr Factură / Invoice Number',
            'customer_name' => 'Client / Customer',
            'issue_date' => 'Data Emiterii / Issue Date',
            'due_date' => 'Data Scadenței / Due Date',
            'subtotal' => 'Subtotal',
            'tax_amount' => 'TVA / Tax',
            'total' => 'Total',
            'status' => 'Status',
            'currency' => 'Monedă / Currency',
        ],
    ],
    'expenses' => [
        'table' => 'expenses',
        'columns' => [
            'date' => 'Dată / Date',
            'description' => 'Descriere / Description',
            'amount' => 'Sumă / Amount',
            'category' => 'Categorie / Category',
            'vendor' => 'Furnizor / Vendor',
            'payment_method' => 'Metodă Plată / Payment Method',
            'receipt_number' => 'Nr. Document / Receipt No.',
        ],
    ],
    'employees' => [
        'table' => 'employees',
        'columns' => [
            'first_name' => 'Prenume / First Name',
            'last_name' => 'Nume / Last Name',
            'email' => 'Email',
            'phone' => 'Telefon / Phone',
            'position' => 'Funcție / Position',
            'department' => 'Departament / Department',
            'hire_date' => 'Data Angajării / Hire Date',
            'status' => 'Status',
        ],
    ],
    'time_entries' => [
        'table' => 'time_entries',
        'columns' => [
            'date' => 'Dată / Date',
            'hours' => 'Ore / Hours',
            'description' => 'Descriere / Description',
            'project_name' => 'Proiect / Project',
            'task_name' => 'Sarcină / Task',
            'billable' => 'Facturabil / Billable',
        ],
    ],
];

try {
    $db = getDbConnection();
    $dataType = $_GET['data_type'] ?? $_POST['data_type'] ?? null;
    $format = strtolower($_GET['format'] ?? $_POST['format'] ?? 'csv');

    if (!$dataType || !isset($exportConfigs[$dataType])) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'Tip de date invalid',
            'error' => 'Invalid data type',
            'available_types' => array_keys($exportConfigs),
        ]);
        exit;
    }

    if (!in_array($format, ['csv', 'json', 'excel', 'xlsx'])) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error_ro' => 'Format invalid',
            'error' => 'Invalid format',
            'available_formats' => ['csv', 'json', 'excel'],
        ]);
        exit;
    }

    // Build query
    $config = $exportConfigs[$dataType];
    $columns = array_keys($config['columns']);
    $columnList = implode(', ', $columns);

    $sql = "SELECT $columnList FROM {$config['table']} WHERE company_id = :company_id";
    $params = ['company_id' => $companyId];

    // Apply filters
    if (!empty($_GET['date_from'])) {
        $dateColumn = in_array('date', $columns) ? 'date' : (in_array('issue_date', $columns) ? 'issue_date' : 'created_at');
        $sql .= " AND $dateColumn >= :date_from";
        $params['date_from'] = $_GET['date_from'];
    }
    if (!empty($_GET['date_to'])) {
        $dateColumn = in_array('date', $columns) ? 'date' : (in_array('issue_date', $columns) ? 'issue_date' : 'created_at');
        $sql .= " AND $dateColumn <= :date_to";
        $params['date_to'] = $_GET['date_to'];
    }
    if (!empty($_GET['status'])) {
        $sql .= " AND status = :status";
        $params['status'] = $_GET['status'];
    }

    $sql .= " ORDER BY created_at DESC";

    // Limit for safety
    $limit = min(10000, intval($_GET['limit'] ?? 10000));
    $sql .= " LIMIT $limit";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Log export
    logExport($db, $companyId, $user['user_id'], $dataType, $format, count($data));

    // Generate output based on format
    $filename = $dataType . '_export_' . date('Y-m-d_His');

    switch ($format) {
        case 'csv':
            exportCSV($data, $config['columns'], $filename);
            break;
        case 'json':
            exportJSON($data, $filename);
            break;
        case 'excel':
        case 'xlsx':
            exportExcel($data, $config['columns'], $filename);
            break;
    }

} catch (Exception $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Export error: ' . $e->getMessage()]);
}

function exportCSV($data, $columns, $filename) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '.csv"');

    // UTF-8 BOM for Excel compatibility
    echo "\xEF\xBB\xBF";

    $output = fopen('php://output', 'w');

    // Header row
    fputcsv($output, array_values($columns), ';');

    // Data rows
    foreach ($data as $row) {
        $rowData = [];
        foreach (array_keys($columns) as $col) {
            $rowData[] = $row[$col] ?? '';
        }
        fputcsv($output, $rowData, ';');
    }

    fclose($output);
    exit;
}

function exportJSON($data, $filename) {
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="' . $filename . '.json"');

    echo json_encode([
        'export_date' => date('Y-m-d H:i:s'),
        'record_count' => count($data),
        'data' => $data,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

function exportExcel($data, $columns, $filename) {
    // Simplified Excel (actually CSV with xlsx extension for compatibility)
    // In production, would use PhpSpreadsheet
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $filename . '.xlsx"');

    // For now, output as CSV that Excel can open
    echo "\xEF\xBB\xBF";
    $output = fopen('php://output', 'w');
    fputcsv($output, array_values($columns), ';');
    foreach ($data as $row) {
        $rowData = [];
        foreach (array_keys($columns) as $col) {
            $rowData[] = $row[$col] ?? '';
        }
        fputcsv($output, $rowData, ';');
    }
    fclose($output);
    exit;
}

function logExport($db, $companyId, $userId, $dataType, $format, $recordCount) {
    try {
        $stmt = $db->prepare("
            INSERT INTO export_logs (id, company_id, user_id, data_type, format, record_count, created_at)
            VALUES (:id, :company_id, :user_id, :data_type, :format, :record_count, NOW())
        ");
        $stmt->execute([
            'id' => 'exp_' . bin2hex(random_bytes(12)),
            'company_id' => $companyId,
            'user_id' => $userId,
            'data_type' => $dataType,
            'format' => $format,
            'record_count' => $recordCount,
        ]);
    } catch (Exception $e) {
        // Log silently fails, don't interrupt export
    }
}
