<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);

    // Get company from header
    $companyId = getHeader('x-company-id') ?? null;
    if (!$companyId) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance();

    // Simple query without complex joins
    $sql = "SELECT
                po.*,
                (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) as items_count
            FROM purchase_orders po
            WHERE po.company_id = :company_id
            ORDER BY po.order_date DESC, po.created_at DESC";

    $purchaseOrders = $db->fetchAll($sql, ['company_id' => $companyId]);

    echo json_encode([
        'success' => true,
        'data' => ['purchase_orders' => $purchaseOrders]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
