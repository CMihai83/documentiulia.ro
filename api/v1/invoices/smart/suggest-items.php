<?php
/**
 * Smart Line Item Suggestion API
 * Suggests line items based on client history and product catalog
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../middleware/auth.php';

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

$customerId = $_GET['customer_id'] ?? null;
$searchTerm = $_GET['q'] ?? '';
$limit = min(intval($_GET['limit'] ?? 10), 50);

$db = getDbConnection();

try {
    $suggestions = [];

    // 1. Get items from product catalog matching search
    $stmt = $db->prepare("
        SELECT
            'product' as source,
            p.id as product_id,
            p.name as description,
            p.sku,
            p.unit_price,
            p.vat_rate,
            p.unit,
            NULL as frequency
        FROM products p
        WHERE p.company_id = :company_id
        AND p.is_active = true
        AND (p.name ILIKE :search OR p.sku ILIKE :search)
        ORDER BY p.name
        LIMIT :limit
    ");
    $stmt->execute([
        'company_id' => $companyId,
        'search' => '%' . $searchTerm . '%',
        'limit' => $limit,
    ]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. If customer specified, get their frequently ordered items
    $clientItems = [];
    if ($customerId) {
        $stmt = $db->prepare("
            SELECT
                'history' as source,
                NULL as product_id,
                il.description,
                NULL as sku,
                il.unit_price,
                il.vat_rate,
                il.unit,
                COUNT(*) as frequency
            FROM invoice_lines il
            JOIN invoices i ON i.id = il.invoice_id
            WHERE i.customer_id = :customer_id
            AND i.company_id = :company_id
            AND (il.description ILIKE :search OR :search = '')
            GROUP BY il.description, il.unit_price, il.vat_rate, il.unit
            ORDER BY frequency DESC
            LIMIT :limit
        ");
        $stmt->execute([
            'customer_id' => $customerId,
            'company_id' => $companyId,
            'search' => '%' . $searchTerm . '%',
            'limit' => $limit,
        ]);
        $clientItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // 3. Get globally popular items (across all customers)
    $stmt = $db->prepare("
        SELECT
            'popular' as source,
            NULL as product_id,
            il.description,
            NULL as sku,
            MODE() WITHIN GROUP (ORDER BY il.unit_price) as unit_price,
            MODE() WITHIN GROUP (ORDER BY il.vat_rate) as vat_rate,
            MODE() WITHIN GROUP (ORDER BY il.unit) as unit,
            COUNT(*) as frequency
        FROM invoice_lines il
        JOIN invoices i ON i.id = il.invoice_id
        WHERE i.company_id = :company_id
        AND (il.description ILIKE :search OR :search = '')
        GROUP BY il.description
        ORDER BY frequency DESC
        LIMIT :limit
    ");
    $stmt->execute([
        'company_id' => $companyId,
        'search' => '%' . $searchTerm . '%',
        'limit' => $limit,
    ]);
    $popularItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Merge and deduplicate suggestions
    $seen = [];

    // Priority: client history > products > popular
    foreach ($clientItems as $item) {
        $key = strtolower($item['description']);
        if (!isset($seen[$key])) {
            $seen[$key] = true;
            $suggestions[] = $item;
        }
    }

    foreach ($products as $item) {
        $key = strtolower($item['description']);
        if (!isset($seen[$key])) {
            $seen[$key] = true;
            $suggestions[] = $item;
        }
    }

    foreach ($popularItems as $item) {
        $key = strtolower($item['description']);
        if (!isset($seen[$key])) {
            $seen[$key] = true;
            $suggestions[] = $item;
        }
    }

    // Format numbers
    foreach ($suggestions as &$item) {
        $item['unit_price'] = floatval($item['unit_price']);
        $item['vat_rate'] = floatval($item['vat_rate']);
        $item['frequency'] = $item['frequency'] ? intval($item['frequency']) : null;
    }

    echo json_encode([
        'success' => true,
        'data' => array_slice($suggestions, 0, $limit),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
