<?php
/**
 * Global Search API
 * Search across all entity types
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

// Searchable entity types
$entityTypes = [
    'invoices' => [
        'label_ro' => 'Facturi',
        'label_en' => 'Invoices',
        'icon' => 'file-text',
        'table' => 'invoices',
        'fields' => ['invoice_number', 'customer_name', 'notes'],
        'display_field' => 'invoice_number',
        'url_pattern' => '/invoices/{id}',
    ],
    'contacts' => [
        'label_ro' => 'Contacte',
        'label_en' => 'Contacts',
        'icon' => 'users',
        'table' => 'contacts',
        'fields' => ['name', 'email', 'phone', 'company_name'],
        'display_field' => 'name',
        'url_pattern' => '/contacts/{id}',
    ],
    'products' => [
        'label_ro' => 'Produse',
        'label_en' => 'Products',
        'icon' => 'package',
        'table' => 'products',
        'fields' => ['name', 'sku', 'description'],
        'display_field' => 'name',
        'url_pattern' => '/products/{id}',
    ],
    'expenses' => [
        'label_ro' => 'Cheltuieli',
        'label_en' => 'Expenses',
        'icon' => 'credit-card',
        'table' => 'expenses',
        'fields' => ['description', 'vendor', 'reference'],
        'display_field' => 'description',
        'url_pattern' => '/expenses/{id}',
    ],
    'projects' => [
        'label_ro' => 'Proiecte',
        'label_en' => 'Projects',
        'icon' => 'folder',
        'table' => 'projects',
        'fields' => ['name', 'description', 'code'],
        'display_field' => 'name',
        'url_pattern' => '/projects/{id}',
    ],
    'tasks' => [
        'label_ro' => 'Sarcini',
        'label_en' => 'Tasks',
        'icon' => 'check-square',
        'table' => 'tasks',
        'fields' => ['title', 'description'],
        'display_field' => 'title',
        'url_pattern' => '/tasks/{id}',
    ],
    'employees' => [
        'label_ro' => 'Angajați',
        'label_en' => 'Employees',
        'icon' => 'user',
        'table' => 'employees',
        'fields' => ['first_name', 'last_name', 'email', 'position'],
        'display_field' => 'first_name',
        'url_pattern' => '/hr/employees/{id}',
    ],
];

try {
    $db = getDbConnection();

    $query = trim($_GET['q'] ?? '');
    $types = isset($_GET['types']) ? explode(',', $_GET['types']) : array_keys($entityTypes);
    $limit = min(50, max(5, intval($_GET['limit'] ?? 10)));

    if (strlen($query) < 2) {
        echo json_encode([
            'success' => true,
            'data' => [
                'results' => [],
                'query' => $query,
                'message_ro' => 'Introduceți cel puțin 2 caractere',
                'message_en' => 'Enter at least 2 characters',
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $results = [];
    $searchTerm = "%$query%";

    foreach ($types as $type) {
        if (!isset($entityTypes[$type])) continue;

        $config = $entityTypes[$type];
        $table = $config['table'];
        $fields = $config['fields'];

        // Build WHERE clause for searchable fields
        $whereClauses = [];
        foreach ($fields as $field) {
            $whereClauses[] = "$field LIKE :search";
        }
        $whereStr = implode(' OR ', $whereClauses);

        try {
            $sql = "
                SELECT id, " . implode(', ', $fields) . ", created_at
                FROM $table
                WHERE company_id = :company_id AND ($whereStr)
                ORDER BY created_at DESC
                LIMIT :limit
            ";

            $stmt = $db->prepare($sql);
            $stmt->bindValue('company_id', $companyId);
            $stmt->bindValue('search', $searchTerm);
            $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($rows as $row) {
                $displayValue = $row[$config['display_field']] ?? $row['id'];

                // For employees, combine first and last name
                if ($type === 'employees' && isset($row['first_name']) && isset($row['last_name'])) {
                    $displayValue = trim($row['first_name'] . ' ' . $row['last_name']);
                }

                $results[] = [
                    'id' => $row['id'],
                    'type' => $type,
                    'type_label' => $config['label_ro'],
                    'type_label_en' => $config['label_en'],
                    'icon' => $config['icon'],
                    'title' => $displayValue,
                    'subtitle' => getSubtitle($row, $config['fields'], $config['display_field']),
                    'url' => str_replace('{id}', $row['id'], $config['url_pattern']),
                    'created_at' => $row['created_at'],
                ];
            }
        } catch (Exception $e) {
            // Table might not exist, skip
            continue;
        }
    }

    // Sort by relevance (exact matches first, then by date)
    usort($results, function($a, $b) use ($query) {
        $aExact = stripos($a['title'], $query) === 0 ? 0 : 1;
        $bExact = stripos($b['title'], $query) === 0 ? 0 : 1;
        if ($aExact !== $bExact) return $aExact - $bExact;
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });

    // Group by type for UI
    $grouped = [];
    foreach ($results as $result) {
        $type = $result['type'];
        if (!isset($grouped[$type])) {
            $grouped[$type] = [
                'type' => $type,
                'label_ro' => $entityTypes[$type]['label_ro'],
                'label_en' => $entityTypes[$type]['label_en'],
                'icon' => $entityTypes[$type]['icon'],
                'items' => [],
                'count' => 0,
            ];
        }
        $grouped[$type]['items'][] = $result;
        $grouped[$type]['count']++;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'results' => array_slice($results, 0, $limit * count($types)),
            'grouped' => array_values($grouped),
            'total_count' => count($results),
            'query' => $query,
            'entity_types' => $entityTypes,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

function getSubtitle($row, $fields, $displayField) {
    foreach ($fields as $field) {
        if ($field !== $displayField && !empty($row[$field])) {
            return substr($row[$field], 0, 100);
        }
    }
    return null;
}
