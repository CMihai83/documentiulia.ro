<?php
/**
 * Custom Report Builder API
 * GET - Get report configuration and run report
 * POST - Save custom report definition
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

// Available data sources and their fields
$dataSources = [
    'invoices' => [
        'name_ro' => 'Facturi',
        'name_en' => 'Invoices',
        'fields' => [
            'invoice_number' => ['name_ro' => 'Număr Factură', 'type' => 'string'],
            'customer_name' => ['name_ro' => 'Client', 'type' => 'string'],
            'issue_date' => ['name_ro' => 'Data Emiterii', 'type' => 'date'],
            'due_date' => ['name_ro' => 'Data Scadentă', 'type' => 'date'],
            'subtotal' => ['name_ro' => 'Subtotal', 'type' => 'money'],
            'vat_amount' => ['name_ro' => 'TVA', 'type' => 'money'],
            'total' => ['name_ro' => 'Total', 'type' => 'money'],
            'status' => ['name_ro' => 'Status', 'type' => 'status'],
            'currency' => ['name_ro' => 'Monedă', 'type' => 'string'],
        ],
        'aggregations' => ['sum', 'avg', 'count', 'min', 'max'],
        'groupings' => ['customer', 'month', 'quarter', 'year', 'status'],
    ],
    'expenses' => [
        'name_ro' => 'Cheltuieli',
        'name_en' => 'Expenses',
        'fields' => [
            'category_name' => ['name_ro' => 'Categorie', 'type' => 'string'],
            'description' => ['name_ro' => 'Descriere', 'type' => 'string'],
            'expense_date' => ['name_ro' => 'Data', 'type' => 'date'],
            'amount' => ['name_ro' => 'Sumă', 'type' => 'money'],
            'vendor_name' => ['name_ro' => 'Furnizor', 'type' => 'string'],
            'is_deductible' => ['name_ro' => 'Deductibilă', 'type' => 'boolean'],
            'status' => ['name_ro' => 'Status', 'type' => 'status'],
        ],
        'aggregations' => ['sum', 'avg', 'count', 'min', 'max'],
        'groupings' => ['category', 'vendor', 'month', 'quarter', 'year'],
    ],
    'contacts' => [
        'name_ro' => 'Contacte',
        'name_en' => 'Contacts',
        'fields' => [
            'display_name' => ['name_ro' => 'Nume', 'type' => 'string'],
            'email' => ['name_ro' => 'Email', 'type' => 'string'],
            'phone' => ['name_ro' => 'Telefon', 'type' => 'string'],
            'type' => ['name_ro' => 'Tip', 'type' => 'string'],
            'total_revenue' => ['name_ro' => 'Venit Total', 'type' => 'money'],
            'outstanding_balance' => ['name_ro' => 'Sold Restant', 'type' => 'money'],
        ],
        'aggregations' => ['sum', 'count'],
        'groupings' => ['type', 'city', 'county'],
    ],
    'products' => [
        'name_ro' => 'Produse/Servicii',
        'name_en' => 'Products/Services',
        'fields' => [
            'name' => ['name_ro' => 'Denumire', 'type' => 'string'],
            'sku' => ['name_ro' => 'Cod', 'type' => 'string'],
            'unit_price' => ['name_ro' => 'Preț Unitar', 'type' => 'money'],
            'quantity_sold' => ['name_ro' => 'Cantitate Vândută', 'type' => 'number'],
            'total_revenue' => ['name_ro' => 'Venit Total', 'type' => 'money'],
            'category' => ['name_ro' => 'Categorie', 'type' => 'string'],
        ],
        'aggregations' => ['sum', 'avg', 'count'],
        'groupings' => ['category'],
    ],
    'time_entries' => [
        'name_ro' => 'Pontaj',
        'name_en' => 'Time Entries',
        'fields' => [
            'employee_name' => ['name_ro' => 'Angajat', 'type' => 'string'],
            'project_name' => ['name_ro' => 'Proiect', 'type' => 'string'],
            'task_name' => ['name_ro' => 'Task', 'type' => 'string'],
            'hours' => ['name_ro' => 'Ore', 'type' => 'number'],
            'billable' => ['name_ro' => 'Facturabil', 'type' => 'boolean'],
            'billable_amount' => ['name_ro' => 'Valoare Facturabilă', 'type' => 'money'],
            'entry_date' => ['name_ro' => 'Data', 'type' => 'date'],
        ],
        'aggregations' => ['sum', 'avg', 'count'],
        'groupings' => ['employee', 'project', 'month', 'week'],
    ],
];

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDbConnection();
    
    if ($method === 'GET') {
        $reportId = $_GET['id'] ?? null;
        
        if ($reportId) {
            // Run a specific saved report
            $stmt = $db->prepare("
                SELECT * FROM custom_reports
                WHERE id = :id AND company_id = :company_id
            ");
            $stmt->execute(['id' => $reportId, 'company_id' => $companyId]);
            $report = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$report) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Report not found']);
                exit;
            }
            
            $config = json_decode($report['configuration'], true);
            $data = executeReport($db, $config, $companyId);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'report' => $report,
                    'results' => $data,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } else {
            // Return builder configuration
            echo json_encode([
                'success' => true,
                'data' => [
                    'data_sources' => $dataSources,
                    'filter_operators' => [
                        'equals' => ['name_ro' => 'Egal cu', 'name_en' => 'Equals'],
                        'not_equals' => ['name_ro' => 'Diferit de', 'name_en' => 'Not equals'],
                        'contains' => ['name_ro' => 'Conține', 'name_en' => 'Contains'],
                        'starts_with' => ['name_ro' => 'Începe cu', 'name_en' => 'Starts with'],
                        'greater_than' => ['name_ro' => 'Mai mare decât', 'name_en' => 'Greater than'],
                        'less_than' => ['name_ro' => 'Mai mic decât', 'name_en' => 'Less than'],
                        'between' => ['name_ro' => 'Între', 'name_en' => 'Between'],
                        'is_null' => ['name_ro' => 'Este gol', 'name_en' => 'Is empty'],
                        'is_not_null' => ['name_ro' => 'Nu este gol', 'name_en' => 'Is not empty'],
                    ],
                    'date_ranges' => [
                        'today' => ['name_ro' => 'Astăzi', 'name_en' => 'Today'],
                        'yesterday' => ['name_ro' => 'Ieri', 'name_en' => 'Yesterday'],
                        'this_week' => ['name_ro' => 'Săptămâna aceasta', 'name_en' => 'This week'],
                        'last_week' => ['name_ro' => 'Săptămâna trecută', 'name_en' => 'Last week'],
                        'this_month' => ['name_ro' => 'Luna aceasta', 'name_en' => 'This month'],
                        'last_month' => ['name_ro' => 'Luna trecută', 'name_en' => 'Last month'],
                        'this_quarter' => ['name_ro' => 'Trimestrul acesta', 'name_en' => 'This quarter'],
                        'last_quarter' => ['name_ro' => 'Trimestrul trecut', 'name_en' => 'Last quarter'],
                        'this_year' => ['name_ro' => 'Anul acesta', 'name_en' => 'This year'],
                        'last_year' => ['name_ro' => 'Anul trecut', 'name_en' => 'Last year'],
                        'custom' => ['name_ro' => 'Personalizat', 'name_en' => 'Custom'],
                    ],
                    'chart_types' => [
                        'bar' => ['name_ro' => 'Grafic Bare', 'name_en' => 'Bar Chart'],
                        'line' => ['name_ro' => 'Grafic Linie', 'name_en' => 'Line Chart'],
                        'pie' => ['name_ro' => 'Grafic Cerc', 'name_en' => 'Pie Chart'],
                        'doughnut' => ['name_ro' => 'Grafic Inel', 'name_en' => 'Doughnut Chart'],
                        'area' => ['name_ro' => 'Grafic Arie', 'name_en' => 'Area Chart'],
                        'table' => ['name_ro' => 'Tabel', 'name_en' => 'Table'],
                    ],
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }
    } elseif ($method === 'POST') {
        // Save custom report
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['name']) || empty($input['data_source'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'name and data_source required']);
            exit;
        }
        
        $reportId = 'rpt_' . bin2hex(random_bytes(12));
        
        $stmt = $db->prepare("
            INSERT INTO custom_reports (
                id, company_id, name, description, data_source,
                configuration, chart_type, is_public, schedule,
                created_by, created_at, updated_at
            ) VALUES (
                :id, :company_id, :name, :description, :data_source,
                :configuration, :chart_type, :is_public, :schedule,
                :created_by, NOW(), NOW()
            )
        ");
        
        $stmt->execute([
            'id' => $reportId,
            'company_id' => $companyId,
            'name' => $input['name'],
            'description' => $input['description'] ?? null,
            'data_source' => $input['data_source'],
            'configuration' => json_encode([
                'columns' => $input['columns'] ?? [],
                'filters' => $input['filters'] ?? [],
                'grouping' => $input['grouping'] ?? null,
                'aggregations' => $input['aggregations'] ?? [],
                'sorting' => $input['sorting'] ?? [],
                'date_range' => $input['date_range'] ?? 'this_month',
            ]),
            'chart_type' => $input['chart_type'] ?? 'table',
            'is_public' => $input['is_public'] ?? false,
            'schedule' => $input['schedule'] ? json_encode($input['schedule']) : null,
            'created_by' => $user['user_id'],
        ]);
        
        echo json_encode([
            'success' => true,
            'message_ro' => 'Raport personalizat salvat cu succes',
            'message_en' => 'Custom report saved successfully',
            'data' => ['id' => $reportId],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function executeReport($db, $config, $companyId) {
    // Simplified report execution - would be more complex in production
    return [
        'columns' => $config['columns'] ?? [],
        'rows' => [],
        'totals' => [],
        'generated_at' => date('c'),
    ];
}
