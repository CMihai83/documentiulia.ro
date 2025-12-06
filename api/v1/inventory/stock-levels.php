<?php
/**
 * Stock Levels API Endpoint
 * Get real-time stock quantities across warehouses
 *
 * Methods:
 * - GET: Query stock levels with filtering
 * - PUT: Update stock level (for manual adjustments)
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
 * GET: Query stock levels
 */
function handleGet($db, $userData) {
    $companyId = getHeader('x-company-id') ?? $_GET['company_id'] ?? $userData['company_id'] ?? null;
    $productId = $_GET['product_id'] ?? null;
    $warehouseId = $_GET['warehouse_id'] ?? null;
    $lowStock = isset($_GET['low_stock']) ? filter_var($_GET['low_stock'], FILTER_VALIDATE_BOOLEAN) : false;
    $zeroStock = isset($_GET['zero_stock']) ? filter_var($_GET['zero_stock'], FILTER_VALIDATE_BOOLEAN) : false;
    $groupBy = $_GET['group_by'] ?? 'product'; // product, warehouse
    $limit = min((int)($_GET['limit'] ?? 200), 1000);
    $offset = (int)($_GET['offset'] ?? 0);

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'company_id required']);
        return;
    }

    // Build query based on grouping
    if ($groupBy === 'warehouse') {
        getStockByWarehouse($db, $companyId, $warehouseId, $productId, $lowStock, $zeroStock, $limit, $offset);
    } else {
        getStockByProduct($db, $companyId, $productId, $warehouseId, $lowStock, $zeroStock, $limit, $offset);
    }
}

/**
 * GET stock levels grouped by product (default view)
 */
function getStockByProduct($db, $companyId, $productId, $warehouseId, $lowStock, $zeroStock, $limit, $offset) {
    $conditions = ['p.company_id = :company_id'];
    $params = ['company_id' => $companyId];

    if ($productId) {
        $conditions[] = 'p.id = :product_id';
        $params['product_id'] = $productId;
    }

    if ($warehouseId) {
        $conditions[] = 'sl.warehouse_id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }

    if ($lowStock) {
        $conditions[] = 'sl.quantity_available <= sl.reorder_level';
    }

    if ($zeroStock) {
        $conditions[] = 'sl.quantity_available = 0';
    }

    $whereClause = implode(' AND ', $conditions);

    $sql = "
        SELECT
            p.id as product_id,
            p.sku,
            p.name as product_name,
            p.category,
            p.unit_of_measure,
            p.selling_price,
            p.reorder_level as product_reorder_level,
            COALESCE(SUM(sl.quantity_available), 0) as total_available,
            COALESCE(SUM(sl.quantity_reserved), 0) as total_reserved,
            COALESCE(SUM(sl.quantity_free), 0) as total_free,
            COALESCE(SUM(sl.quantity_on_order), 0) as total_on_order,
            COALESCE(AVG(sl.average_cost), 0) as avg_cost,
            COALESCE(SUM(sl.quantity_available * sl.average_cost), 0) as total_value,
            COUNT(DISTINCT sl.warehouse_id) as warehouse_count,
            json_agg(
                json_build_object(
                    'warehouse_id', w.id,
                    'warehouse_name', w.name,
                    'warehouse_code', w.code,
                    'quantity_available', sl.quantity_available,
                    'quantity_reserved', sl.quantity_reserved,
                    'quantity_free', sl.quantity_free,
                    'quantity_on_order', sl.quantity_on_order,
                    'reorder_level', sl.reorder_level,
                    'average_cost', sl.average_cost,
                    'last_movement_date', sl.last_movement_date
                ) ORDER BY w.name
            ) FILTER (WHERE sl.id IS NOT NULL) as warehouse_details
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        LEFT JOIN warehouses w ON w.id = sl.warehouse_id
        WHERE $whereClause
        GROUP BY p.id, p.sku, p.name, p.category, p.unit_of_measure, p.selling_price, p.reorder_level
        ORDER BY p.name
        LIMIT :limit OFFSET :offset
    ";

    $params['limit'] = $limit;
    $params['offset'] = $offset;

    $products = $db->fetchAll($sql, $params);

    // Get total count
    $countSql = "SELECT COUNT(DISTINCT p.id) as count FROM products p LEFT JOIN stock_levels sl ON sl.product_id = p.id WHERE $whereClause";
    $total = $db->fetchOne($countSql, array_diff_key($params, ['limit' => '', 'offset' => '']))['count'];

    // Get summary statistics
    $summarySql = "
        SELECT
            COUNT(DISTINCT p.id) as total_products,
            COALESCE(SUM(sl.quantity_available), 0) as total_units,
            COALESCE(SUM(sl.quantity_available * sl.average_cost), 0) as total_value,
            COUNT(DISTINCT CASE WHEN sl.quantity_available <= sl.reorder_level THEN p.id END) as low_stock_products,
            COUNT(DISTINCT CASE WHEN sl.quantity_available = 0 THEN p.id END) as out_of_stock_products
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        WHERE $whereClause
    ";
    $summary = $db->fetchOne($summarySql, array_diff_key($params, ['limit' => '', 'offset' => '']));

    echo json_encode([
        'success' => true,
        'products' => $products,
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
 * GET stock levels grouped by warehouse
 */
function getStockByWarehouse($db, $companyId, $warehouseId, $productId, $lowStock, $zeroStock, $limit, $offset) {
    $conditions = ['w.company_id = :company_id'];
    $params = ['company_id' => $companyId];

    if ($warehouseId) {
        $conditions[] = 'w.id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }

    if ($productId) {
        $conditions[] = 'sl.product_id = :product_id';
        $params['product_id'] = $productId;
    }

    if ($lowStock) {
        $conditions[] = 'sl.quantity_available <= sl.reorder_level';
    }

    if ($zeroStock) {
        $conditions[] = 'sl.quantity_available = 0';
    }

    $whereClause = implode(' AND ', $conditions);

    $sql = "
        SELECT
            w.id as warehouse_id,
            w.name as warehouse_name,
            w.code as warehouse_code,
            w.warehouse_type,
            w.city,
            COALESCE(SUM(sl.quantity_available), 0) as total_available,
            COALESCE(SUM(sl.quantity_reserved), 0) as total_reserved,
            COALESCE(SUM(sl.quantity_free), 0) as total_free,
            COALESCE(SUM(sl.quantity_available * sl.average_cost), 0) as total_value,
            COUNT(DISTINCT sl.product_id) as product_count,
            COUNT(CASE WHEN sl.quantity_available <= sl.reorder_level THEN 1 END) as low_stock_count,
            COUNT(CASE WHEN sl.quantity_available = 0 THEN 1 END) as out_of_stock_count,
            json_agg(
                json_build_object(
                    'product_id', p.id,
                    'sku', p.sku,
                    'product_name', p.name,
                    'category', p.category,
                    'quantity_available', sl.quantity_available,
                    'quantity_reserved', sl.quantity_reserved,
                    'quantity_free', sl.quantity_free,
                    'average_cost', sl.average_cost,
                    'value', sl.quantity_available * sl.average_cost
                ) ORDER BY p.name
            ) FILTER (WHERE sl.id IS NOT NULL) as product_details
        FROM warehouses w
        LEFT JOIN stock_levels sl ON sl.warehouse_id = w.id
        LEFT JOIN products p ON p.id = sl.product_id
        WHERE $whereClause
        GROUP BY w.id, w.name, w.code, w.warehouse_type, w.city
        ORDER BY w.name
        LIMIT :limit OFFSET :offset
    ";

    $params['limit'] = $limit;
    $params['offset'] = $offset;

    $warehouses = $db->fetchAll($sql, $params);

    // Get total count
    $countSql = "SELECT COUNT(DISTINCT w.id) as count FROM warehouses w LEFT JOIN stock_levels sl ON sl.warehouse_id = w.id WHERE $whereClause";
    $total = $db->fetchOne($countSql, array_diff_key($params, ['limit' => '', 'offset' => '']))['count'];

    echo json_encode([
        'success' => true,
        'warehouses' => $warehouses,
        'pagination' => [
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ]
    ]);
}

/**
 * PUT: Update stock level (manual adjustment)
 */
function handlePut($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'stock_level_id required']);
        return;
    }

    // Get current stock level
    $stockLevel = $db->fetchOne(
        "SELECT * FROM stock_levels WHERE id = :id",
        ['id' => $input['id']]
    );

    if (!$stockLevel) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Stock level not found']);
        return;
    }

    // Update allowed fields
    $updates = array_intersect_key($input, array_flip([
        'quantity_reserved', 'quantity_on_order', 'reorder_level', 'reorder_quantity'
    ]));

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    $updates['last_updated'] = 'CURRENT_TIMESTAMP';

    $db->update('stock_levels', $input['id'], $updates);

    echo json_encode([
        'success' => true,
        'message' => 'Stock level updated successfully'
    ]);
}
