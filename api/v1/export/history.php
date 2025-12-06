<?php
/**
 * Export History API
 * Track and download previous exports
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

// Labels
$dataTypeLabels = [
    'contacts' => ['ro' => 'Contacte', 'en' => 'Contacts'],
    'products' => ['ro' => 'Produse', 'en' => 'Products'],
    'invoices' => ['ro' => 'Facturi', 'en' => 'Invoices'],
    'expenses' => ['ro' => 'Cheltuieli', 'en' => 'Expenses'],
    'employees' => ['ro' => 'Angajați', 'en' => 'Employees'],
    'time_entries' => ['ro' => 'Pontaj', 'en' => 'Time Entries'],
    'transactions' => ['ro' => 'Tranzacții', 'en' => 'Transactions'],
];

$formatLabels = [
    'csv' => 'CSV',
    'xlsx' => 'Excel',
    'json' => 'JSON',
    'pdf' => 'PDF',
];

try {
    $db = getDbConnection();

    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(100, max(10, intval($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    $dataType = $_GET['data_type'] ?? null;

    // Count total
    $countSql = "SELECT COUNT(*) FROM export_logs WHERE company_id = :company_id";
    $params = ['company_id' => $companyId];

    if ($dataType) {
        $countSql .= " AND data_type = :data_type";
        $params['data_type'] = $dataType;
    }

    $countStmt = $db->prepare($countSql);
    $countStmt->execute($params);
    $total = $countStmt->fetchColumn();

    // Get exports
    $sql = "
        SELECT el.*, u.first_name, u.last_name
        FROM export_logs el
        LEFT JOIN users u ON el.user_id = u.id
        WHERE el.company_id = :company_id
    ";

    if ($dataType) {
        $sql .= " AND el.data_type = :data_type";
    }

    $sql .= " ORDER BY el.created_at DESC LIMIT :limit OFFSET :offset";

    $stmt = $db->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $exports = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Add labels
    foreach ($exports as &$export) {
        $export['data_type_label'] = $dataTypeLabels[$export['data_type']] ?? ['ro' => $export['data_type'], 'en' => $export['data_type']];
        $export['format_label'] = $formatLabels[$export['format']] ?? $export['format'];
        $export['exported_by_name'] = trim(($export['first_name'] ?? '') . ' ' . ($export['last_name'] ?? ''));
    }

    // Get summary stats
    $summaryStmt = $db->prepare("
        SELECT
            data_type,
            COUNT(*) as export_count,
            SUM(record_count) as total_records,
            MAX(created_at) as last_export
        FROM export_logs
        WHERE company_id = :company_id
        GROUP BY data_type
    ");
    $summaryStmt->execute(['company_id' => $companyId]);
    $summary = $summaryStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($summary as &$item) {
        $item['data_type_label'] = $dataTypeLabels[$item['data_type']] ?? ['ro' => $item['data_type'], 'en' => $item['data_type']];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'exports' => $exports,
            'summary' => $summary,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => intval($total),
                'total_pages' => ceil($total / $limit),
            ],
            'filters' => [
                'data_types' => $dataTypeLabels,
            ],
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
