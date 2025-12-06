<?php
/**
 * Report Builder API
 * Custom report creation and management
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

// Report categories
$reportCategories = [
    'financial' => ['ro' => 'Rapoarte financiare', 'en' => 'Financial Reports', 'icon' => 'account_balance'],
    'sales' => ['ro' => 'Rapoarte vânzări', 'en' => 'Sales Reports', 'icon' => 'trending_up'],
    'expenses' => ['ro' => 'Rapoarte cheltuieli', 'en' => 'Expense Reports', 'icon' => 'payments'],
    'inventory' => ['ro' => 'Rapoarte inventar', 'en' => 'Inventory Reports', 'icon' => 'inventory'],
    'hr' => ['ro' => 'Rapoarte HR', 'en' => 'HR Reports', 'icon' => 'people'],
    'tax' => ['ro' => 'Rapoarte fiscale', 'en' => 'Tax Reports', 'icon' => 'receipt_long'],
    'custom' => ['ro' => 'Rapoarte personalizate', 'en' => 'Custom Reports', 'icon' => 'tune'],
];

// Data sources
$dataSources = [
    'invoices' => ['ro' => 'Facturi', 'en' => 'Invoices', 'table' => 'invoices'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses', 'table' => 'expenses'],
    'contacts' => ['ro' => 'Contacte', 'en' => 'Contacts', 'table' => 'contacts'],
    'products' => ['ro' => 'Produse', 'en' => 'Products', 'table' => 'products'],
    'employees' => ['ro' => 'Angajați', 'en' => 'Employees', 'table' => 'employees'],
    'time_entries' => ['ro' => 'Pontaje', 'en' => 'Time Entries', 'table' => 'time_entries'],
    'projects' => ['ro' => 'Proiecte', 'en' => 'Projects', 'table' => 'projects'],
    'journal_entries' => ['ro' => 'Note contabile', 'en' => 'Journal Entries', 'table' => 'journal_entries'],
    'transactions' => ['ro' => 'Tranzacții', 'en' => 'Transactions', 'table' => 'bank_transactions'],
    'inventory' => ['ro' => 'Inventar', 'en' => 'Inventory', 'table' => 'inventory_items'],
];

// Field types
$fieldTypes = [
    'text' => ['ro' => 'Text', 'en' => 'Text'],
    'number' => ['ro' => 'Număr', 'en' => 'Number'],
    'currency' => ['ro' => 'Valută', 'en' => 'Currency'],
    'date' => ['ro' => 'Dată', 'en' => 'Date'],
    'datetime' => ['ro' => 'Dată și oră', 'en' => 'Date & Time'],
    'percentage' => ['ro' => 'Procent', 'en' => 'Percentage'],
    'boolean' => ['ro' => 'Da/Nu', 'en' => 'Yes/No'],
];

// Aggregations
$aggregations = [
    'none' => ['ro' => 'Fără agregare', 'en' => 'None'],
    'sum' => ['ro' => 'Sumă', 'en' => 'Sum'],
    'avg' => ['ro' => 'Medie', 'en' => 'Average'],
    'count' => ['ro' => 'Numărare', 'en' => 'Count'],
    'min' => ['ro' => 'Minim', 'en' => 'Minimum'],
    'max' => ['ro' => 'Maxim', 'en' => 'Maximum'],
    'count_distinct' => ['ro' => 'Numărare unică', 'en' => 'Count Distinct'],
];

// Filter operators
$filterOperators = [
    'equals' => ['ro' => 'Egal cu', 'en' => 'Equals', 'sql' => '='],
    'not_equals' => ['ro' => 'Diferit de', 'en' => 'Not Equals', 'sql' => '!='],
    'contains' => ['ro' => 'Conține', 'en' => 'Contains', 'sql' => 'LIKE'],
    'starts_with' => ['ro' => 'Începe cu', 'en' => 'Starts With', 'sql' => 'LIKE'],
    'ends_with' => ['ro' => 'Se termină cu', 'en' => 'Ends With', 'sql' => 'LIKE'],
    'greater_than' => ['ro' => 'Mai mare decât', 'en' => 'Greater Than', 'sql' => '>'],
    'less_than' => ['ro' => 'Mai mic decât', 'en' => 'Less Than', 'sql' => '<'],
    'between' => ['ro' => 'Între', 'en' => 'Between', 'sql' => 'BETWEEN'],
    'in_list' => ['ro' => 'În listă', 'en' => 'In List', 'sql' => 'IN'],
    'is_null' => ['ro' => 'Este gol', 'en' => 'Is Empty', 'sql' => 'IS NULL'],
    'is_not_null' => ['ro' => 'Nu este gol', 'en' => 'Is Not Empty', 'sql' => 'IS NOT NULL'],
];

// Sort directions
$sortDirections = [
    'asc' => ['ro' => 'Crescător', 'en' => 'Ascending'],
    'desc' => ['ro' => 'Descrescător', 'en' => 'Descending'],
];

// Output formats
$outputFormats = [
    'table' => ['ro' => 'Tabel', 'en' => 'Table', 'icon' => 'table_chart'],
    'chart' => ['ro' => 'Grafic', 'en' => 'Chart', 'icon' => 'bar_chart'],
    'summary' => ['ro' => 'Sumar', 'en' => 'Summary', 'icon' => 'summarize'],
    'pivot' => ['ro' => 'Pivot', 'en' => 'Pivot Table', 'icon' => 'pivot_table_chart'],
];

// Schedule frequencies
$scheduleFrequencies = [
    'once' => ['ro' => 'O singură dată', 'en' => 'Once'],
    'daily' => ['ro' => 'Zilnic', 'en' => 'Daily'],
    'weekly' => ['ro' => 'Săptămânal', 'en' => 'Weekly'],
    'monthly' => ['ro' => 'Lunar', 'en' => 'Monthly'],
    'quarterly' => ['ro' => 'Trimestrial', 'en' => 'Quarterly'],
    'yearly' => ['ro' => 'Anual', 'en' => 'Yearly'],
];

try {
    $db = getDbConnection();

    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? 'list';

            if ($action === 'list') {
                $category = $_GET['category'] ?? null;

                $sql = "SELECT * FROM custom_reports WHERE company_id = :company_id";
                $params = ['company_id' => $companyId];

                if ($category) {
                    $sql .= " AND category = :category";
                    $params['category'] = $category;
                }

                $sql .= " ORDER BY name ASC";

                $stmt = $db->prepare($sql);
                $stmt->execute($params);
                $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($reports as &$report) {
                    $report['category_config'] = $reportCategories[$report['category']] ?? null;
                    $report['config'] = json_decode($report['config'] ?? '{}', true);
                }

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'reports' => $reports,
                        'categories' => $reportCategories,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'get') {
                $reportId = $_GET['id'] ?? null;

                if (!$reportId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Report ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM custom_reports WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $reportId, 'company_id' => $companyId]);
                $report = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$report) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Report not found']);
                    exit;
                }

                $report['category_config'] = $reportCategories[$report['category']] ?? null;
                $report['config'] = json_decode($report['config'] ?? '{}', true);

                echo json_encode([
                    'success' => true,
                    'data' => $report,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'run') {
                $reportId = $_GET['id'] ?? null;

                if (!$reportId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Report ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM custom_reports WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $reportId, 'company_id' => $companyId]);
                $report = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$report) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Report not found']);
                    exit;
                }

                $config = json_decode($report['config'] ?? '{}', true);
                $results = executeReport($db, $companyId, $config);

                // Log report execution
                $stmt = $db->prepare("UPDATE custom_reports SET last_run_at = NOW(), run_count = run_count + 1 WHERE id = :id");
                $stmt->execute(['id' => $reportId]);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'results' => $results,
                        'executed_at' => date('Y-m-d H:i:s'),
                        'row_count' => count($results),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'preview') {
                // Preview report with current config without saving
                $config = [
                    'data_source' => $_GET['data_source'] ?? 'invoices',
                    'fields' => json_decode($_GET['fields'] ?? '[]', true),
                    'filters' => json_decode($_GET['filters'] ?? '[]', true),
                    'limit' => 10, // Preview limit
                ];

                $results = executeReport($db, $companyId, $config);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'preview' => $results,
                        'row_count' => count($results),
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'fields') {
                $dataSource = $_GET['data_source'] ?? 'invoices';

                // Get available fields for data source
                $fields = getFieldsForDataSource($dataSource);

                echo json_encode([
                    'success' => true,
                    'data' => [
                        'fields' => $fields,
                        'data_source' => $dataSources[$dataSource] ?? null,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'config') {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'categories' => $reportCategories,
                        'data_sources' => $dataSources,
                        'field_types' => $fieldTypes,
                        'aggregations' => $aggregations,
                        'filter_operators' => $filterOperators,
                        'sort_directions' => $sortDirections,
                        'output_formats' => $outputFormats,
                        'schedule_frequencies' => $scheduleFrequencies,
                    ],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? 'create';

            if ($action === 'create') {
                $name = $input['name'] ?? null;
                $category = $input['category'] ?? 'custom';
                $description = $input['description'] ?? '';
                $config = $input['config'] ?? [];

                if (!$name) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Report name required']);
                    exit;
                }

                $reportId = 'rpt_' . bin2hex(random_bytes(8));

                $stmt = $db->prepare("
                    INSERT INTO custom_reports (id, company_id, user_id, name, category, description, config, created_at)
                    VALUES (:id, :company_id, :user_id, :name, :category, :description, :config, NOW())
                ");
                $stmt->execute([
                    'id' => $reportId,
                    'company_id' => $companyId,
                    'user_id' => $user['user_id'],
                    'name' => $name,
                    'category' => $category,
                    'description' => $description,
                    'config' => json_encode($config),
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Raportul a fost creat',
                    'message_en' => 'Report created',
                    'data' => ['report_id' => $reportId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'schedule') {
                $reportId = $input['report_id'] ?? null;
                $frequency = $input['frequency'] ?? 'weekly';
                $recipients = $input['recipients'] ?? [];
                $nextRun = $input['next_run'] ?? date('Y-m-d H:i:s');

                if (!$reportId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Report ID required']);
                    exit;
                }

                $scheduleId = 'sched_' . bin2hex(random_bytes(8));

                $stmt = $db->prepare("
                    INSERT INTO report_schedules (id, report_id, company_id, frequency, recipients, next_run, is_active, created_at)
                    VALUES (:id, :report_id, :company_id, :frequency, :recipients, :next_run, true, NOW())
                ");
                $stmt->execute([
                    'id' => $scheduleId,
                    'report_id' => $reportId,
                    'company_id' => $companyId,
                    'frequency' => $frequency,
                    'recipients' => json_encode($recipients),
                    'next_run' => $nextRun,
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Programarea raportului a fost creată',
                    'message_en' => 'Report schedule created',
                    'data' => ['schedule_id' => $scheduleId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'duplicate') {
                $reportId = $input['report_id'] ?? null;
                $newName = $input['name'] ?? null;

                if (!$reportId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Report ID required']);
                    exit;
                }

                $stmt = $db->prepare("SELECT * FROM custom_reports WHERE id = :id AND company_id = :company_id");
                $stmt->execute(['id' => $reportId, 'company_id' => $companyId]);
                $original = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$original) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Report not found']);
                    exit;
                }

                $newReportId = 'rpt_' . bin2hex(random_bytes(8));

                $stmt = $db->prepare("
                    INSERT INTO custom_reports (id, company_id, user_id, name, category, description, config, created_at)
                    VALUES (:id, :company_id, :user_id, :name, :category, :description, :config, NOW())
                ");
                $stmt->execute([
                    'id' => $newReportId,
                    'company_id' => $companyId,
                    'user_id' => $user['user_id'],
                    'name' => $newName ?? $original['name'] . ' (copie)',
                    'category' => $original['category'],
                    'description' => $original['description'],
                    'config' => $original['config'],
                ]);

                echo json_encode([
                    'success' => true,
                    'message_ro' => 'Raportul a fost duplicat',
                    'message_en' => 'Report duplicated',
                    'data' => ['report_id' => $newReportId],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $reportId = $input['id'] ?? $_GET['id'] ?? null;

            if (!$reportId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Report ID required']);
                exit;
            }

            $updates = [];
            $params = ['id' => $reportId, 'company_id' => $companyId];

            if (isset($input['name'])) {
                $updates[] = "name = :name";
                $params['name'] = $input['name'];
            }
            if (isset($input['category'])) {
                $updates[] = "category = :category";
                $params['category'] = $input['category'];
            }
            if (isset($input['description'])) {
                $updates[] = "description = :description";
                $params['description'] = $input['description'];
            }
            if (isset($input['config'])) {
                $updates[] = "config = :config";
                $params['config'] = json_encode($input['config']);
            }

            if (empty($updates)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No updates provided']);
                exit;
            }

            $updates[] = "updated_at = NOW()";
            $sql = "UPDATE custom_reports SET " . implode(', ', $updates) . " WHERE id = :id AND company_id = :company_id";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Raportul a fost actualizat',
                'message_en' => 'Report updated',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $reportId = $_GET['id'] ?? null;

            if (!$reportId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Report ID required']);
                exit;
            }

            $stmt = $db->prepare("DELETE FROM custom_reports WHERE id = :id AND company_id = :company_id");
            $stmt->execute(['id' => $reportId, 'company_id' => $companyId]);

            echo json_encode([
                'success' => true,
                'message_ro' => 'Raportul a fost șters',
                'message_en' => 'Report deleted',
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error: ' . $e->getMessage()]);
}

function executeReport($db, $companyId, $config) {
    $dataSource = $config['data_source'] ?? 'invoices';
    $fields = $config['fields'] ?? ['*'];
    $filters = $config['filters'] ?? [];
    $orderBy = $config['order_by'] ?? null;
    $limit = $config['limit'] ?? 100;

    $table = getTableForDataSource($dataSource);
    $selectFields = is_array($fields) && $fields[0] !== '*' ? implode(', ', $fields) : '*';

    $sql = "SELECT $selectFields FROM $table WHERE company_id = :company_id";
    $params = ['company_id' => $companyId];

    // Apply filters
    foreach ($filters as $i => $filter) {
        $field = $filter['field'] ?? null;
        $operator = $filter['operator'] ?? 'equals';
        $value = $filter['value'] ?? null;

        if ($field && $value !== null) {
            $paramKey = "filter_$i";
            switch ($operator) {
                case 'equals':
                    $sql .= " AND $field = :$paramKey";
                    $params[$paramKey] = $value;
                    break;
                case 'contains':
                    $sql .= " AND $field LIKE :$paramKey";
                    $params[$paramKey] = "%$value%";
                    break;
                case 'greater_than':
                    $sql .= " AND $field > :$paramKey";
                    $params[$paramKey] = $value;
                    break;
                case 'less_than':
                    $sql .= " AND $field < :$paramKey";
                    $params[$paramKey] = $value;
                    break;
            }
        }
    }

    if ($orderBy) {
        $sql .= " ORDER BY $orderBy";
    }

    $sql .= " LIMIT $limit";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getTableForDataSource($dataSource) {
    $tables = [
        'invoices' => 'invoices',
        'expenses' => 'expenses',
        'contacts' => 'contacts',
        'products' => 'products',
        'employees' => 'employees',
        'time_entries' => 'time_entries',
        'projects' => 'projects',
        'journal_entries' => 'journal_entries',
        'transactions' => 'bank_transactions',
        'inventory' => 'inventory_items',
    ];

    return $tables[$dataSource] ?? 'invoices';
}

function getFieldsForDataSource($dataSource) {
    $fieldDefs = [
        'invoices' => [
            ['name' => 'invoice_number', 'label_ro' => 'Număr factură', 'label_en' => 'Invoice Number', 'type' => 'text'],
            ['name' => 'issue_date', 'label_ro' => 'Data emiterii', 'label_en' => 'Issue Date', 'type' => 'date'],
            ['name' => 'due_date', 'label_ro' => 'Scadența', 'label_en' => 'Due Date', 'type' => 'date'],
            ['name' => 'customer_name', 'label_ro' => 'Client', 'label_en' => 'Customer', 'type' => 'text'],
            ['name' => 'subtotal', 'label_ro' => 'Subtotal', 'label_en' => 'Subtotal', 'type' => 'currency'],
            ['name' => 'vat_amount', 'label_ro' => 'TVA', 'label_en' => 'VAT', 'type' => 'currency'],
            ['name' => 'total_amount', 'label_ro' => 'Total', 'label_en' => 'Total', 'type' => 'currency'],
            ['name' => 'status', 'label_ro' => 'Status', 'label_en' => 'Status', 'type' => 'text'],
        ],
        'expenses' => [
            ['name' => 'expense_date', 'label_ro' => 'Data', 'label_en' => 'Date', 'type' => 'date'],
            ['name' => 'description', 'label_ro' => 'Descriere', 'label_en' => 'Description', 'type' => 'text'],
            ['name' => 'category', 'label_ro' => 'Categorie', 'label_en' => 'Category', 'type' => 'text'],
            ['name' => 'amount', 'label_ro' => 'Sumă', 'label_en' => 'Amount', 'type' => 'currency'],
            ['name' => 'vat_amount', 'label_ro' => 'TVA', 'label_en' => 'VAT', 'type' => 'currency'],
            ['name' => 'vendor_name', 'label_ro' => 'Furnizor', 'label_en' => 'Vendor', 'type' => 'text'],
            ['name' => 'status', 'label_ro' => 'Status', 'label_en' => 'Status', 'type' => 'text'],
        ],
    ];

    return $fieldDefs[$dataSource] ?? [];
}
