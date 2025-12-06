<?php
/**
 * Low Stock Alerts API Endpoint
 * Manage low stock notifications and alerts
 *
 * Methods:
 * - GET: List low stock alerts
 * - PUT: Update alert status (acknowledge, resolve)
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../helpers/headers.php';

// Authenticate user
$authService = new AuthService();
$userData = $authService->authenticate();

if (!$userData) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

$db = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            handleGet($db, $userData);
            break;

        case 'PUT':
            handlePut($db, $userData);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

/**
 * GET: List low stock alerts
 */
function handleGet($db, $userData) {
    $companyId = $_GET['company_id'] ?? getHeader('x-company-id') ?? $userData['company_id'] ?? null;
    $warehouseId = $_GET['warehouse_id'] ?? null;
    $status = $_GET['status'] ?? 'active'; // active, acknowledged, ordered, resolved
    $limit = min((int)($_GET['limit'] ?? 100), 500);
    $offset = (int)($_GET['offset'] ?? 0);

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'company_id required']);
        return;
    }

    $conditions = ['lsa.company_id = :company_id'];
    $params = ['company_id' => $companyId];

    if ($warehouseId) {
        $conditions[] = 'lsa.warehouse_id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }

    if ($status) {
        $conditions[] = 'lsa.alert_status = :status';
        $params['status'] = $status;
    }

    $whereClause = implode(' AND ', $conditions);

    $sql = "
        SELECT
            lsa.*,
            p.sku,
            p.name as product_name,
            p.category,
            p.unit_of_measure,
            p.selling_price,
            p.purchase_price,
            w.name as warehouse_name,
            w.code as warehouse_code,
            sl.quantity_available as current_stock,
            sl.quantity_on_order,
            u.first_name || ' ' || u.last_name as acknowledged_by_name,
            -- Calculate days out of stock if zero
            CASE
                WHEN sl.quantity_available = 0 THEN
                    EXTRACT(DAY FROM CURRENT_TIMESTAMP - lsa.created_at)
                ELSE 0
            END as days_out_of_stock,
            -- Calculate potential lost sales (simplified)
            CASE
                WHEN sl.quantity_available = 0 THEN
                    (EXTRACT(DAY FROM CURRENT_TIMESTAMP - lsa.created_at) * p.selling_price * 0.1)
                ELSE 0
            END as estimated_lost_revenue
        FROM low_stock_alerts lsa
        INNER JOIN products p ON p.id = lsa.product_id
        INNER JOIN warehouses w ON w.id = lsa.warehouse_id
        LEFT JOIN stock_levels sl ON sl.product_id = lsa.product_id AND sl.warehouse_id = lsa.warehouse_id
        LEFT JOIN users u ON u.id = lsa.acknowledged_by
        WHERE $whereClause
        ORDER BY
            CASE WHEN sl.quantity_available = 0 THEN 0 ELSE 1 END,
            lsa.created_at ASC
        LIMIT :limit OFFSET :offset
    ";

    $params['limit'] = $limit;
    $params['offset'] = $offset;

    $alerts = $db->fetchAll($sql, $params);

    // Get total count
    $countSql = "SELECT COUNT(*) as count FROM low_stock_alerts lsa WHERE $whereClause";
    $total = $db->fetchOne($countSql, array_diff_key($params, ['limit' => '', 'offset' => '']))['count'];

    // Get summary statistics
    $summarySql = "
        SELECT
            COUNT(*) as total_alerts,
            COUNT(CASE WHEN lsa.alert_status = 'active' THEN 1 END) as active_alerts,
            COUNT(CASE WHEN lsa.alert_status = 'acknowledged' THEN 1 END) as acknowledged_alerts,
            COUNT(CASE WHEN sl.quantity_available = 0 THEN 1 END) as out_of_stock_count,
            COALESCE(SUM(lsa.suggested_order_quantity * p.purchase_price), 0) as suggested_order_value
        FROM low_stock_alerts lsa
        INNER JOIN products p ON p.id = lsa.product_id
        LEFT JOIN stock_levels sl ON sl.product_id = lsa.product_id AND sl.warehouse_id = lsa.warehouse_id
        WHERE $whereClause
    ";
    $summary = $db->fetchOne($summarySql, array_diff_key($params, ['limit' => '', 'offset' => '']));

    echo json_encode([
        'success' => true,
        'alerts' => $alerts,
        'summary' => $summary,
        'pagination' => [
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ]
    ]);
}

/**
 * PUT: Update alert status
 */
function handlePut($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'alert_id required']);
        return;
    }

    // Verify alert exists
    $alert = $db->fetchOne(
        "SELECT * FROM low_stock_alerts WHERE id = :id",
        ['id' => $input['id']]
    );

    if (!$alert) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Alert not found']);
        return;
    }

    // Update status
    $updates = [];

    if (isset($input['alert_status'])) {
        $validStatuses = ['active', 'acknowledged', 'ordered', 'resolved'];
        if (!in_array($input['alert_status'], $validStatuses)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid alert_status']);
            return;
        }

        $updates['alert_status'] = $input['alert_status'];

        // Set timestamps based on status
        if ($input['alert_status'] === 'acknowledged' && !$alert['acknowledged_at']) {
            $updates['acknowledged_by'] = $userData['id'];
            $updates['acknowledged_at'] = 'CURRENT_TIMESTAMP';
        }

        if ($input['alert_status'] === 'resolved') {
            $updates['resolved_at'] = 'CURRENT_TIMESTAMP';
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    $db->update('low_stock_alerts', $input['id'], $updates);

    echo json_encode([
        'success' => true,
        'message' => 'Alert updated successfully'
    ]);
}
