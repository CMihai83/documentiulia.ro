<?php
/**
 * Search Suggestions API
 * Autocomplete and search suggestions
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

try {
    $db = getDbConnection();

    $query = trim($_GET['q'] ?? '');
    $entityType = $_GET['entity_type'] ?? null;
    $field = $_GET['field'] ?? null;
    $limit = min(20, max(5, intval($_GET['limit'] ?? 10)));

    if (strlen($query) < 1) {
        echo json_encode([
            'success' => true,
            'data' => ['suggestions' => []],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $suggestions = [];
    $searchTerm = "$query%";

    // If specific entity and field requested
    if ($entityType && $field) {
        $table = getTableName($entityType);
        $allowedFields = getAllowedFields($entityType);

        if (in_array($field, $allowedFields)) {
            try {
                $stmt = $db->prepare("
                    SELECT DISTINCT $field as value, COUNT(*) as count
                    FROM $table
                    WHERE company_id = :company_id AND $field LIKE :search
                    GROUP BY $field
                    ORDER BY count DESC, $field ASC
                    LIMIT :limit
                ");
                $stmt->bindValue('company_id', $companyId);
                $stmt->bindValue('search', $searchTerm);
                $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
                $stmt->execute();

                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    if (!empty($row['value'])) {
                        $suggestions[] = [
                            'value' => $row['value'],
                            'count' => intval($row['count']),
                            'type' => 'field_value',
                        ];
                    }
                }
            } catch (Exception $e) {
                // Field or table doesn't exist
            }
        }

    } else {
        // Global suggestions from multiple sources

        // 1. Recent searches
        try {
            $recentStmt = $db->prepare("
                SELECT query, COUNT(*) as count
                FROM search_history
                WHERE user_id = :user_id AND company_id = :company_id
                AND query LIKE :search
                GROUP BY query
                ORDER BY MAX(created_at) DESC
                LIMIT 5
            ");
            $recentStmt->execute([
                'user_id' => $user['user_id'],
                'company_id' => $companyId,
                'search' => $searchTerm,
            ]);

            while ($row = $recentStmt->fetch(PDO::FETCH_ASSOC)) {
                $suggestions[] = [
                    'value' => $row['query'],
                    'type' => 'recent',
                    'label_ro' => 'Căutare recentă',
                    'label_en' => 'Recent search',
                    'icon' => 'clock',
                ];
            }
        } catch (Exception $e) {
            // Search history table might not exist
        }

        // 2. Contact names
        try {
            $contactStmt = $db->prepare("
                SELECT id, name, 'contact' as entity_type
                FROM contacts
                WHERE company_id = :company_id AND name LIKE :search
                ORDER BY name ASC
                LIMIT 5
            ");
            $contactStmt->execute(['company_id' => $companyId, 'search' => $searchTerm]);

            while ($row = $contactStmt->fetch(PDO::FETCH_ASSOC)) {
                $suggestions[] = [
                    'value' => $row['name'],
                    'id' => $row['id'],
                    'type' => 'contact',
                    'label_ro' => 'Contact',
                    'label_en' => 'Contact',
                    'icon' => 'user',
                ];
            }
        } catch (Exception $e) {}

        // 3. Product names
        try {
            $productStmt = $db->prepare("
                SELECT id, name, sku, 'product' as entity_type
                FROM products
                WHERE company_id = :company_id AND (name LIKE :search OR sku LIKE :search)
                ORDER BY name ASC
                LIMIT 5
            ");
            $productStmt->execute(['company_id' => $companyId, 'search' => $searchTerm]);

            while ($row = $productStmt->fetch(PDO::FETCH_ASSOC)) {
                $suggestions[] = [
                    'value' => $row['name'],
                    'subtitle' => $row['sku'],
                    'id' => $row['id'],
                    'type' => 'product',
                    'label_ro' => 'Produs',
                    'label_en' => 'Product',
                    'icon' => 'package',
                ];
            }
        } catch (Exception $e) {}

        // 4. Invoice numbers
        try {
            $invoiceStmt = $db->prepare("
                SELECT id, invoice_number, customer_name, 'invoice' as entity_type
                FROM invoices
                WHERE company_id = :company_id AND invoice_number LIKE :search
                ORDER BY created_at DESC
                LIMIT 5
            ");
            $invoiceStmt->execute(['company_id' => $companyId, 'search' => $searchTerm]);

            while ($row = $invoiceStmt->fetch(PDO::FETCH_ASSOC)) {
                $suggestions[] = [
                    'value' => $row['invoice_number'],
                    'subtitle' => $row['customer_name'],
                    'id' => $row['id'],
                    'type' => 'invoice',
                    'label_ro' => 'Factură',
                    'label_en' => 'Invoice',
                    'icon' => 'file-text',
                ];
            }
        } catch (Exception $e) {}

        // 5. Project names
        try {
            $projectStmt = $db->prepare("
                SELECT id, name, 'project' as entity_type
                FROM projects
                WHERE company_id = :company_id AND name LIKE :search
                ORDER BY name ASC
                LIMIT 5
            ");
            $projectStmt->execute(['company_id' => $companyId, 'search' => $searchTerm]);

            while ($row = $projectStmt->fetch(PDO::FETCH_ASSOC)) {
                $suggestions[] = [
                    'value' => $row['name'],
                    'id' => $row['id'],
                    'type' => 'project',
                    'label_ro' => 'Proiect',
                    'label_en' => 'Project',
                    'icon' => 'folder',
                ];
            }
        } catch (Exception $e) {}
    }

    // Remove duplicates and limit
    $seen = [];
    $uniqueSuggestions = [];
    foreach ($suggestions as $s) {
        $key = strtolower($s['value']);
        if (!isset($seen[$key])) {
            $seen[$key] = true;
            $uniqueSuggestions[] = $s;
        }
    }

    // Group by type for UI
    $grouped = [];
    foreach ($uniqueSuggestions as $s) {
        $type = $s['type'];
        if (!isset($grouped[$type])) {
            $grouped[$type] = [
                'type' => $type,
                'label_ro' => $s['label_ro'] ?? ucfirst($type),
                'label_en' => $s['label_en'] ?? ucfirst($type),
                'icon' => $s['icon'] ?? 'search',
                'items' => [],
            ];
        }
        $grouped[$type]['items'][] = $s;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'suggestions' => array_slice($uniqueSuggestions, 0, $limit),
            'grouped' => array_values($grouped),
            'query' => $query,
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

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

function getAllowedFields($entityType) {
    $fields = [
        'invoices' => ['invoice_number', 'customer_name', 'status'],
        'contacts' => ['name', 'email', 'company_name', 'city', 'country'],
        'products' => ['name', 'sku', 'category', 'brand'],
        'expenses' => ['description', 'vendor', 'category'],
        'projects' => ['name', 'status'],
        'tasks' => ['title', 'status', 'priority'],
    ];
    return $fields[$entityType] ?? [];
}
