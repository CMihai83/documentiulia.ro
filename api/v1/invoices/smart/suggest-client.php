<?php
/**
 * Smart Client Suggestion API
 * Suggests clients based on typing and past invoice history
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

$searchTerm = $_GET['q'] ?? '';
$limit = min(intval($_GET['limit'] ?? 10), 50);

$db = getDbConnection();

try {
    // Get clients matching search term, ordered by invoice frequency
    $stmt = $db->prepare("
        SELECT
            c.id,
            c.name,
            c.email,
            c.phone,
            c.fiscal_code as cui,
            c.vat_number,
            c.address,
            c.city,
            c.country,
            c.payment_terms,
            COUNT(i.id) as invoice_count,
            MAX(i.issue_date) as last_invoice_date,
            COALESCE(SUM(i.total_amount), 0) as total_revenue,
            COALESCE(AVG(i.total_amount), 0) as avg_invoice_amount
        FROM contacts c
        LEFT JOIN invoices i ON i.customer_id = c.id
        WHERE c.company_id = :company_id
        AND c.type = 'customer'
        AND (
            c.name ILIKE :search
            OR c.email ILIKE :search
            OR c.fiscal_code ILIKE :search
        )
        GROUP BY c.id
        ORDER BY invoice_count DESC, c.name ASC
        LIMIT :limit
    ");

    $stmt->execute([
        'company_id' => $companyId,
        'search' => '%' . $searchTerm . '%',
        'limit' => $limit,
    ]);

    $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Enrich with recent invoice patterns
    foreach ($clients as &$client) {
        // Get most common line items for this client
        $stmtItems = $db->prepare("
            SELECT
                il.description,
                il.unit_price,
                il.vat_rate,
                COUNT(*) as frequency
            FROM invoice_lines il
            JOIN invoices i ON i.id = il.invoice_id
            WHERE i.customer_id = :customer_id
            GROUP BY il.description, il.unit_price, il.vat_rate
            ORDER BY frequency DESC
            LIMIT 5
        ");
        $stmtItems->execute(['customer_id' => $client['id']]);
        $client['common_items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        // Format numbers
        $client['invoice_count'] = intval($client['invoice_count']);
        $client['total_revenue'] = floatval($client['total_revenue']);
        $client['avg_invoice_amount'] = round(floatval($client['avg_invoice_amount']), 2);
    }

    echo json_encode([
        'success' => true,
        'data' => $clients,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}
