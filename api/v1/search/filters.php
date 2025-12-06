<?php
/**
 * Search Filters API
 * Advanced filtering options for each entity type
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

// Filter operators
$operators = [
    'equals' => ['ro' => 'Este egal cu', 'en' => 'Equals'],
    'not_equals' => ['ro' => 'Nu este egal cu', 'en' => 'Not equals'],
    'contains' => ['ro' => 'Conține', 'en' => 'Contains'],
    'not_contains' => ['ro' => 'Nu conține', 'en' => 'Does not contain'],
    'starts_with' => ['ro' => 'Începe cu', 'en' => 'Starts with'],
    'ends_with' => ['ro' => 'Se termină cu', 'en' => 'Ends with'],
    'greater_than' => ['ro' => 'Mai mare decât', 'en' => 'Greater than'],
    'less_than' => ['ro' => 'Mai mic decât', 'en' => 'Less than'],
    'between' => ['ro' => 'Între', 'en' => 'Between'],
    'in_list' => ['ro' => 'În listă', 'en' => 'In list'],
    'is_empty' => ['ro' => 'Este gol', 'en' => 'Is empty'],
    'is_not_empty' => ['ro' => 'Nu este gol', 'en' => 'Is not empty'],
    'before' => ['ro' => 'Înainte de', 'en' => 'Before'],
    'after' => ['ro' => 'După', 'en' => 'After'],
    'today' => ['ro' => 'Astăzi', 'en' => 'Today'],
    'this_week' => ['ro' => 'Săptămâna aceasta', 'en' => 'This week'],
    'this_month' => ['ro' => 'Luna aceasta', 'en' => 'This month'],
    'this_year' => ['ro' => 'Anul acesta', 'en' => 'This year'],
    'last_7_days' => ['ro' => 'Ultimele 7 zile', 'en' => 'Last 7 days'],
    'last_30_days' => ['ro' => 'Ultimele 30 zile', 'en' => 'Last 30 days'],
];

// Field types
$fieldTypes = [
    'text' => ['operators' => ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty']],
    'number' => ['operators' => ['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'is_empty', 'is_not_empty']],
    'currency' => ['operators' => ['equals', 'not_equals', 'greater_than', 'less_than', 'between']],
    'date' => ['operators' => ['equals', 'before', 'after', 'between', 'today', 'this_week', 'this_month', 'this_year', 'last_7_days', 'last_30_days']],
    'select' => ['operators' => ['equals', 'not_equals', 'in_list']],
    'boolean' => ['operators' => ['equals']],
];

// Entity filter configurations
$entityFilters = [
    'invoices' => [
        'label_ro' => 'Facturi',
        'label_en' => 'Invoices',
        'fields' => [
            'invoice_number' => ['label_ro' => 'Număr factură', 'label_en' => 'Invoice Number', 'type' => 'text'],
            'customer_name' => ['label_ro' => 'Client', 'label_en' => 'Customer', 'type' => 'text'],
            'status' => ['label_ro' => 'Stare', 'label_en' => 'Status', 'type' => 'select', 'options' => [
                'draft' => ['ro' => 'Ciornă', 'en' => 'Draft'],
                'sent' => ['ro' => 'Trimisă', 'en' => 'Sent'],
                'paid' => ['ro' => 'Plătită', 'en' => 'Paid'],
                'overdue' => ['ro' => 'Restantă', 'en' => 'Overdue'],
                'cancelled' => ['ro' => 'Anulată', 'en' => 'Cancelled'],
            ]],
            'total_amount' => ['label_ro' => 'Sumă totală', 'label_en' => 'Total Amount', 'type' => 'currency'],
            'issue_date' => ['label_ro' => 'Data emiterii', 'label_en' => 'Issue Date', 'type' => 'date'],
            'due_date' => ['label_ro' => 'Data scadenței', 'label_en' => 'Due Date', 'type' => 'date'],
        ],
    ],
    'contacts' => [
        'label_ro' => 'Contacte',
        'label_en' => 'Contacts',
        'fields' => [
            'name' => ['label_ro' => 'Nume', 'label_en' => 'Name', 'type' => 'text'],
            'email' => ['label_ro' => 'Email', 'label_en' => 'Email', 'type' => 'text'],
            'phone' => ['label_ro' => 'Telefon', 'label_en' => 'Phone', 'type' => 'text'],
            'company_name' => ['label_ro' => 'Companie', 'label_en' => 'Company', 'type' => 'text'],
            'type' => ['label_ro' => 'Tip', 'label_en' => 'Type', 'type' => 'select', 'options' => [
                'customer' => ['ro' => 'Client', 'en' => 'Customer'],
                'vendor' => ['ro' => 'Furnizor', 'en' => 'Vendor'],
                'lead' => ['ro' => 'Lead', 'en' => 'Lead'],
            ]],
            'created_at' => ['label_ro' => 'Data creării', 'label_en' => 'Created Date', 'type' => 'date'],
        ],
    ],
    'products' => [
        'label_ro' => 'Produse',
        'label_en' => 'Products',
        'fields' => [
            'name' => ['label_ro' => 'Nume', 'label_en' => 'Name', 'type' => 'text'],
            'sku' => ['label_ro' => 'SKU', 'label_en' => 'SKU', 'type' => 'text'],
            'category' => ['label_ro' => 'Categorie', 'label_en' => 'Category', 'type' => 'text'],
            'price' => ['label_ro' => 'Preț', 'label_en' => 'Price', 'type' => 'currency'],
            'stock_quantity' => ['label_ro' => 'Cantitate stoc', 'label_en' => 'Stock Quantity', 'type' => 'number'],
            'is_active' => ['label_ro' => 'Activ', 'label_en' => 'Active', 'type' => 'boolean'],
        ],
    ],
    'expenses' => [
        'label_ro' => 'Cheltuieli',
        'label_en' => 'Expenses',
        'fields' => [
            'description' => ['label_ro' => 'Descriere', 'label_en' => 'Description', 'type' => 'text'],
            'vendor' => ['label_ro' => 'Furnizor', 'label_en' => 'Vendor', 'type' => 'text'],
            'category' => ['label_ro' => 'Categorie', 'label_en' => 'Category', 'type' => 'select', 'options' => [
                'office' => ['ro' => 'Birou', 'en' => 'Office'],
                'travel' => ['ro' => 'Deplasări', 'en' => 'Travel'],
                'utilities' => ['ro' => 'Utilități', 'en' => 'Utilities'],
                'equipment' => ['ro' => 'Echipamente', 'en' => 'Equipment'],
                'other' => ['ro' => 'Altele', 'en' => 'Other'],
            ]],
            'amount' => ['label_ro' => 'Sumă', 'label_en' => 'Amount', 'type' => 'currency'],
            'expense_date' => ['label_ro' => 'Data cheltuielii', 'label_en' => 'Expense Date', 'type' => 'date'],
            'status' => ['label_ro' => 'Stare', 'label_en' => 'Status', 'type' => 'select', 'options' => [
                'pending' => ['ro' => 'În așteptare', 'en' => 'Pending'],
                'approved' => ['ro' => 'Aprobată', 'en' => 'Approved'],
                'rejected' => ['ro' => 'Respinsă', 'en' => 'Rejected'],
                'paid' => ['ro' => 'Plătită', 'en' => 'Paid'],
            ]],
        ],
    ],
    'projects' => [
        'label_ro' => 'Proiecte',
        'label_en' => 'Projects',
        'fields' => [
            'name' => ['label_ro' => 'Nume', 'label_en' => 'Name', 'type' => 'text'],
            'status' => ['label_ro' => 'Stare', 'label_en' => 'Status', 'type' => 'select', 'options' => [
                'planning' => ['ro' => 'Planificare', 'en' => 'Planning'],
                'active' => ['ro' => 'Activ', 'en' => 'Active'],
                'on_hold' => ['ro' => 'În așteptare', 'en' => 'On Hold'],
                'completed' => ['ro' => 'Finalizat', 'en' => 'Completed'],
                'cancelled' => ['ro' => 'Anulat', 'en' => 'Cancelled'],
            ]],
            'budget' => ['label_ro' => 'Buget', 'label_en' => 'Budget', 'type' => 'currency'],
            'start_date' => ['label_ro' => 'Data început', 'label_en' => 'Start Date', 'type' => 'date'],
            'end_date' => ['label_ro' => 'Data sfârșit', 'label_en' => 'End Date', 'type' => 'date'],
        ],
    ],
    'tasks' => [
        'label_ro' => 'Sarcini',
        'label_en' => 'Tasks',
        'fields' => [
            'title' => ['label_ro' => 'Titlu', 'label_en' => 'Title', 'type' => 'text'],
            'status' => ['label_ro' => 'Stare', 'label_en' => 'Status', 'type' => 'select', 'options' => [
                'todo' => ['ro' => 'De făcut', 'en' => 'To Do'],
                'in_progress' => ['ro' => 'În lucru', 'en' => 'In Progress'],
                'review' => ['ro' => 'Revizuire', 'en' => 'Review'],
                'done' => ['ro' => 'Finalizat', 'en' => 'Done'],
            ]],
            'priority' => ['label_ro' => 'Prioritate', 'label_en' => 'Priority', 'type' => 'select', 'options' => [
                'low' => ['ro' => 'Scăzută', 'en' => 'Low'],
                'medium' => ['ro' => 'Medie', 'en' => 'Medium'],
                'high' => ['ro' => 'Ridicată', 'en' => 'High'],
                'urgent' => ['ro' => 'Urgentă', 'en' => 'Urgent'],
            ]],
            'due_date' => ['label_ro' => 'Data scadenței', 'label_en' => 'Due Date', 'type' => 'date'],
        ],
    ],
];

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        $entityType = $_GET['entity_type'] ?? null;

        if ($entityType && isset($entityFilters[$entityType])) {
            // Return filters for specific entity
            $config = $entityFilters[$entityType];

            // Add operators to each field
            foreach ($config['fields'] as $key => &$field) {
                $type = $field['type'];
                $field['operators'] = [];
                foreach ($fieldTypes[$type]['operators'] as $op) {
                    $field['operators'][$op] = $operators[$op];
                }
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'entity_type' => $entityType,
                    'config' => $config,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } else {
            // Return all filter configurations
            echo json_encode([
                'success' => true,
                'data' => [
                    'entity_filters' => $entityFilters,
                    'operators' => $operators,
                    'field_types' => $fieldTypes,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }

    } elseif ($method === 'POST') {
        // Apply filters and return results
        $input = json_decode(file_get_contents('php://input'), true);
        $entityType = $input['entity_type'] ?? null;
        $filters = $input['filters'] ?? [];
        $sort = $input['sort'] ?? ['field' => 'created_at', 'direction' => 'desc'];
        $page = max(1, intval($input['page'] ?? 1));
        $limit = min(100, max(10, intval($input['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        if (!$entityType || !isset($entityFilters[$entityType])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error_ro' => 'Tip de entitate invalid',
                'error' => 'Invalid entity type'
            ]);
            exit;
        }

        // Build query based on filters
        $config = $entityFilters[$entityType];
        $table = getTableName($entityType);

        $sql = "SELECT * FROM $table WHERE company_id = :company_id";
        $params = ['company_id' => $companyId];
        $filterIndex = 0;

        foreach ($filters as $filter) {
            $field = $filter['field'] ?? null;
            $operator = $filter['operator'] ?? null;
            $value = $filter['value'] ?? null;

            if (!$field || !$operator) continue;
            if (!isset($config['fields'][$field])) continue;

            $paramName = "filter_$filterIndex";
            $filterIndex++;

            $sqlCondition = buildFilterCondition($field, $operator, $value, $paramName, $params);
            if ($sqlCondition) {
                $sql .= " AND $sqlCondition";
            }
        }

        // Count total
        $countSql = str_replace('SELECT *', 'SELECT COUNT(*)', $sql);
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        // Add sorting
        $sortField = preg_replace('/[^a-z_]/', '', $sort['field']);
        $sortDir = strtoupper($sort['direction']) === 'ASC' ? 'ASC' : 'DESC';
        $sql .= " ORDER BY $sortField $sortDir LIMIT :limit OFFSET :offset";

        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => [
                'results' => $results,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => intval($total),
                    'total_pages' => ceil($total / $limit),
                ],
                'applied_filters' => $filters,
                'sort' => $sort,
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function getTableName($entityType) {
    $tables = [
        'invoices' => 'invoices',
        'contacts' => 'contacts',
        'products' => 'products',
        'expenses' => 'expenses',
        'projects' => 'projects',
        'tasks' => 'tasks',
    ];
    return $tables[$entityType] ?? $entityType;
}

function buildFilterCondition($field, $operator, $value, $paramName, &$params) {
    switch ($operator) {
        case 'equals':
            $params[$paramName] = $value;
            return "$field = :$paramName";

        case 'not_equals':
            $params[$paramName] = $value;
            return "$field != :$paramName";

        case 'contains':
            $params[$paramName] = "%$value%";
            return "$field LIKE :$paramName";

        case 'not_contains':
            $params[$paramName] = "%$value%";
            return "$field NOT LIKE :$paramName";

        case 'starts_with':
            $params[$paramName] = "$value%";
            return "$field LIKE :$paramName";

        case 'ends_with':
            $params[$paramName] = "%$value";
            return "$field LIKE :$paramName";

        case 'greater_than':
            $params[$paramName] = $value;
            return "$field > :$paramName";

        case 'less_than':
            $params[$paramName] = $value;
            return "$field < :$paramName";

        case 'between':
            if (is_array($value) && count($value) >= 2) {
                $params[$paramName . '_min'] = $value[0];
                $params[$paramName . '_max'] = $value[1];
                return "$field BETWEEN :{$paramName}_min AND :{$paramName}_max";
            }
            return null;

        case 'in_list':
            if (is_array($value)) {
                $placeholders = [];
                foreach ($value as $i => $v) {
                    $key = $paramName . '_' . $i;
                    $params[$key] = $v;
                    $placeholders[] = ":$key";
                }
                return "$field IN (" . implode(',', $placeholders) . ")";
            }
            return null;

        case 'is_empty':
            return "($field IS NULL OR $field = '')";

        case 'is_not_empty':
            return "($field IS NOT NULL AND $field != '')";

        case 'before':
            $params[$paramName] = $value;
            return "$field < :$paramName";

        case 'after':
            $params[$paramName] = $value;
            return "$field > :$paramName";

        case 'today':
            return "DATE($field) = CURDATE()";

        case 'this_week':
            return "YEARWEEK($field) = YEARWEEK(CURDATE())";

        case 'this_month':
            return "YEAR($field) = YEAR(CURDATE()) AND MONTH($field) = MONTH(CURDATE())";

        case 'this_year':
            return "YEAR($field) = YEAR(CURDATE())";

        case 'last_7_days':
            return "$field >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";

        case 'last_30_days':
            return "$field >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";

        default:
            return null;
    }
}
