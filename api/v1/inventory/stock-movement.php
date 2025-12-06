<?php
/**
 * Stock Movement API Endpoint
 * Record and query inventory movements (in, out, adjustments, transfers)
 *
 * Methods:
 * - GET: List stock movements with filtering
 * - POST: Record new stock movement
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

        case 'POST':
            handlePost($db, $userData);
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
 * GET: List stock movements with filtering
 */
function handleGet($db, $userData) {
    $companyId = $_GET['company_id'] ?? getHeader('x-company-id') ?? $userData['company_id'] ?? null;
    $productId = $_GET['product_id'] ?? null;
    $warehouseId = $_GET['warehouse_id'] ?? null;
    $movementType = $_GET['movement_type'] ?? null; // in, out, adjustment, transfer, return
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    $limit = min((int)($_GET['limit'] ?? 100), 500);
    $offset = (int)($_GET['offset'] ?? 0);

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'company_id required']);
        return;
    }

    // Build query
    $conditions = ['sm.company_id = :company_id'];
    $params = ['company_id' => $companyId];

    if ($productId) {
        $conditions[] = 'sm.product_id = :product_id';
        $params['product_id'] = $productId;
    }

    if ($warehouseId) {
        $conditions[] = 'sm.warehouse_id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }

    if ($movementType) {
        $conditions[] = 'sm.movement_type = :movement_type';
        $params['movement_type'] = $movementType;
    }

    if ($startDate) {
        $conditions[] = 'sm.created_at >= :start_date';
        $params['start_date'] = $startDate;
    }

    if ($endDate) {
        $conditions[] = 'sm.created_at <= :end_date';
        $params['end_date'] = $endDate . ' 23:59:59';
    }

    $whereClause = implode(' AND ', $conditions);

    // Get movements with product and warehouse details
    $sql = "
        SELECT
            sm.*,
            p.name as product_name,
            p.sku as product_sku,
            p.barcode,
            w.name as warehouse_name,
            w.code as warehouse_code,
            u.first_name || ' ' || u.last_name as created_by_name
        FROM stock_movements sm
        INNER JOIN products p ON p.id = sm.product_id
        INNER JOIN warehouses w ON w.id = sm.warehouse_id
        LEFT JOIN users u ON u.id = sm.created_by
        WHERE $whereClause
        ORDER BY sm.created_at DESC
        LIMIT :limit OFFSET :offset
    ";

    $params['limit'] = $limit;
    $params['offset'] = $offset;

    $movements = $db->fetchAll($sql, $params);

    // Get total count
    $countSql = "SELECT COUNT(*) as count FROM stock_movements sm WHERE $whereClause";
    $total = $db->fetchOne($countSql, array_diff_key($params, ['limit' => '', 'offset' => '']))['count'];

    // Calculate summary statistics
    $summarySql = "
        SELECT
            movement_type,
            COUNT(*) as count,
            SUM(quantity) as total_quantity,
            SUM(total_cost) as total_value
        FROM stock_movements sm
        WHERE $whereClause
        GROUP BY movement_type
    ";
    $summary = $db->fetchAll($summarySql, array_diff_key($params, ['limit' => '', 'offset' => '']));

    echo json_encode([
        'success' => true,
        'movements' => $movements,
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
 * POST: Record new stock movement
 */
function handlePost($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    $required = ['company_id', 'product_id', 'warehouse_id', 'movement_type', 'quantity'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || $input[$field] === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Field '$field' is required"]);
            return;
        }
    }

    // Validate movement type
    $validTypes = ['in', 'out', 'adjustment', 'transfer', 'return'];
    if (!in_array($input['movement_type'], $validTypes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid movement_type']);
        return;
    }

    // For transfers, validate warehouse IDs
    if ($input['movement_type'] === 'transfer') {
        if (!isset($input['from_warehouse_id']) || !isset($input['to_warehouse_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Transfers require from_warehouse_id and to_warehouse_id']);
            return;
        }
    }

    // Get product details to check stock tracking
    $product = $db->fetchOne(
        "SELECT track_inventory, allow_negative_stock FROM products WHERE id = :id",
        ['id' => $input['product_id']]
    );

    if (!$product) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Product not found']);
        return;
    }

    // Start transaction
    $db->beginTransaction();

    try {
        // Insert stock movement record
        $movementId = $db->insert('stock_movements', [
            'company_id' => $input['company_id'],
            'product_id' => $input['product_id'],
            'variant_id' => $input['variant_id'] ?? null,
            'warehouse_id' => $input['warehouse_id'],
            'movement_type' => $input['movement_type'],
            'movement_subtype' => $input['movement_subtype'] ?? null,
            'quantity' => $input['quantity'],
            'unit_cost' => $input['unit_cost'] ?? null,
            'total_cost' => $input['total_cost'] ?? ($input['quantity'] * ($input['unit_cost'] ?? 0)),
            'reference_type' => $input['reference_type'] ?? null,
            'reference_id' => $input['reference_id'] ?? null,
            'reference_number' => $input['reference_number'] ?? null,
            'from_warehouse_id' => $input['from_warehouse_id'] ?? null,
            'to_warehouse_id' => $input['to_warehouse_id'] ?? null,
            'notes' => $input['notes'] ?? null,
            'batch_number' => $input['batch_number'] ?? null,
            'serial_numbers' => isset($input['serial_numbers']) ? json_encode($input['serial_numbers']) : null,
            'created_by' => $userData['id']
        ]);

        // Update stock levels if tracking inventory
        if ($product['track_inventory']) {
            updateStockLevel($db, $input, $product);
        }

        $db->commit();

        echo json_encode([
            'success' => true,
            'movement_id' => $movementId,
            'message' => 'Stock movement recorded successfully'
        ]);

    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

/**
 * Update stock level based on movement
 */
function updateStockLevel($db, $input, $product) {
    $warehouseId = $input['warehouse_id'];
    $productId = $input['product_id'];
    $variantId = $input['variant_id'] ?? null;
    $quantity = $input['quantity'];
    $movementType = $input['movement_type'];

    // Calculate quantity change based on movement type
    $quantityChange = 0;
    switch ($movementType) {
        case 'in':
        case 'return':
            $quantityChange = $quantity;
            break;
        case 'out':
            $quantityChange = -$quantity;
            break;
        case 'adjustment':
            // For adjustments, quantity is the final amount, not the change
            // This needs special handling
            break;
    }

    // Get current stock level
    $stockLevel = $db->fetchOne(
        "SELECT * FROM stock_levels WHERE product_id = :product_id AND warehouse_id = :warehouse_id AND (variant_id = :variant_id OR (variant_id IS NULL AND :variant_id IS NULL))",
        [
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'variant_id' => $variantId
        ]
    );

    if ($stockLevel) {
        // Update existing stock level
        $newQuantity = $stockLevel['quantity_available'] + $quantityChange;

        // Check negative stock
        if ($newQuantity < 0 && !$product['allow_negative_stock']) {
            throw new Exception('Insufficient stock. Cannot create negative stock for this product.');
        }

        $db->update('stock_levels', $stockLevel['id'], [
            'quantity_available' => $newQuantity,
            'last_movement_date' => 'CURRENT_TIMESTAMP',
            'last_updated' => 'CURRENT_TIMESTAMP'
        ]);

        // Update costing
        if ($movementType === 'in' && isset($input['unit_cost'])) {
            updateAverageCost($db, $stockLevel['id'], $stockLevel, $quantity, $input['unit_cost']);
        }

    } else {
        // Create new stock level
        if ($quantityChange < 0 && !$product['allow_negative_stock']) {
            throw new Exception('Cannot create stock level with negative quantity');
        }

        $db->insert('stock_levels', [
            'product_id' => $productId,
            'variant_id' => $variantId,
            'warehouse_id' => $warehouseId,
            'quantity_available' => max(0, $quantityChange),
            'average_cost' => $input['unit_cost'] ?? null,
            'last_purchase_cost' => $input['unit_cost'] ?? null,
            'last_movement_date' => 'CURRENT_TIMESTAMP'
        ]);
    }
}

/**
 * Update average cost using weighted average method
 */
function updateAverageCost($db, $stockLevelId, $currentStock, $newQuantity, $newCost) {
    $currentQty = $currentStock['quantity_available'];
    $currentAvgCost = $currentStock['average_cost'] ?? 0;

    // Weighted average: (old_qty * old_cost + new_qty * new_cost) / (old_qty + new_qty)
    $newAvgCost = (($currentQty * $currentAvgCost) + ($newQuantity * $newCost)) / ($currentQty + $newQuantity);

    $db->update('stock_levels', $stockLevelId, [
        'average_cost' => $newAvgCost,
        'last_purchase_cost' => $newCost
    ]);
}
