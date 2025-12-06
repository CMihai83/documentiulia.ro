<?php
/**
 * Stock Adjustments API Endpoint
 * Handle manual inventory corrections and physical counts
 *
 * Methods:
 * - GET: List stock adjustments
 * - POST: Create stock adjustment
 * - PUT: Update adjustment (confirm/post)
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
 * GET: List stock adjustments
 */
function handleGet($db, $userData) {
    $companyId = $_GET['company_id'] ?? getHeader('x-company-id') ?? $userData['company_id'] ?? null;
    $warehouseId = $_GET['warehouse_id'] ?? null;
    $status = $_GET['status'] ?? null;
    $adjustmentId = $_GET['id'] ?? null;
    $limit = min((int)($_GET['limit'] ?? 50), 200);
    $offset = (int)($_GET['offset'] ?? 0);

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'company_id required']);
        return;
    }

    // If specific adjustment requested, return with items
    if ($adjustmentId) {
        getAdjustmentWithItems($db, $adjustmentId);
        return;
    }

    $conditions = ['sa.company_id = :company_id'];
    $params = ['company_id' => $companyId];

    if ($warehouseId) {
        $conditions[] = 'sa.warehouse_id = :warehouse_id';
        $params['warehouse_id'] = $warehouseId;
    }

    if ($status) {
        $conditions[] = 'sa.status = :status';
        $params['status'] = $status;
    }

    $whereClause = implode(' AND ', $conditions);

    $sql = "
        SELECT
            sa.*,
            w.name as warehouse_name,
            w.code as warehouse_code,
            u1.first_name || ' ' || u1.last_name as created_by_name,
            u2.first_name || ' ' || u2.last_name as approved_by_name
        FROM stock_adjustments sa
        INNER JOIN warehouses w ON w.id = sa.warehouse_id
        LEFT JOIN users u1 ON u1.id = sa.created_by
        LEFT JOIN users u2 ON u2.id = sa.approved_by
        WHERE $whereClause
        ORDER BY sa.adjustment_date DESC, sa.created_at DESC
        LIMIT :limit OFFSET :offset
    ";

    $params['limit'] = $limit;
    $params['offset'] = $offset;

    $adjustments = $db->fetchAll($sql, $params);

    // Get total count
    $countSql = "SELECT COUNT(*) as count FROM stock_adjustments sa WHERE $whereClause";
    $total = $db->fetchOne($countSql, array_diff_key($params, ['limit' => '', 'offset' => '']))['count'];

    echo json_encode([
        'success' => true,
        'adjustments' => $adjustments,
        'pagination' => [
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ]
    ]);
}

/**
 * Get single adjustment with items
 */
function getAdjustmentWithItems($db, $adjustmentId) {
    $adjustment = $db->fetchOne(
        "SELECT sa.*, w.name as warehouse_name FROM stock_adjustments sa INNER JOIN warehouses w ON w.id = sa.warehouse_id WHERE sa.id = :id",
        ['id' => $adjustmentId]
    );

    if (!$adjustment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Adjustment not found']);
        return;
    }

    // Get adjustment items
    $items = $db->fetchAll(
        "SELECT sai.*, p.sku, p.name as product_name, p.unit_of_measure FROM stock_adjustment_items sai INNER JOIN products p ON p.id = sai.product_id WHERE sai.adjustment_id = :id ORDER BY p.name",
        ['id' => $adjustmentId]
    );

    $adjustment['items'] = $items;

    echo json_encode([
        'success' => true,
        'adjustment' => $adjustment
    ]);
}

/**
 * POST: Create stock adjustment
 */
function handlePost($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    $required = ['company_id', 'warehouse_id', 'adjustment_date', 'adjustment_type', 'items'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || $input[$field] === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Field '$field' is required"]);
            return;
        }
    }

    if (!is_array($input['items']) || empty($input['items'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'At least one item is required']);
        return;
    }

    // Generate adjustment number
    $adjustmentNumber = generateAdjustmentNumber($db, $input['company_id']);

    // Start transaction
    $db->beginTransaction();

    try {
        // Calculate totals
        $totalItems = count($input['items']);
        $totalValue = 0;

        foreach ($input['items'] as $item) {
            $totalValue += ($item['quantity_difference'] ?? 0) * ($item['unit_cost'] ?? 0);
        }

        // Insert adjustment header
        $adjustmentId = $db->insert('stock_adjustments', [
            'company_id' => $input['company_id'],
            'warehouse_id' => $input['warehouse_id'],
            'adjustment_number' => $adjustmentNumber,
            'adjustment_date' => $input['adjustment_date'],
            'adjustment_type' => $input['adjustment_type'],
            'status' => 'draft',
            'total_items' => $totalItems,
            'total_value' => $totalValue,
            'reason' => $input['reason'] ?? null,
            'notes' => $input['notes'] ?? null,
            'created_by' => $userData['id']
        ]);

        // Insert adjustment items
        foreach ($input['items'] as $item) {
            $db->insert('stock_adjustment_items', [
                'adjustment_id' => $adjustmentId,
                'product_id' => $item['product_id'],
                'variant_id' => $item['variant_id'] ?? null,
                'quantity_system' => $item['quantity_system'] ?? 0,
                'quantity_counted' => $item['quantity_counted'] ?? 0,
                'quantity_difference' => ($item['quantity_counted'] ?? 0) - ($item['quantity_system'] ?? 0),
                'unit_cost' => $item['unit_cost'] ?? 0,
                'value_difference' => (($item['quantity_counted'] ?? 0) - ($item['quantity_system'] ?? 0)) * ($item['unit_cost'] ?? 0),
                'notes' => $item['notes'] ?? null
            ]);
        }

        $db->commit();

        echo json_encode([
            'success' => true,
            'adjustment_id' => $adjustmentId,
            'adjustment_number' => $adjustmentNumber,
            'message' => 'Stock adjustment created successfully'
        ]);

    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

/**
 * PUT: Update/confirm stock adjustment
 */
function handlePut($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'adjustment_id required']);
        return;
    }

    // Get adjustment
    $adjustment = $db->fetchOne(
        "SELECT * FROM stock_adjustments WHERE id = :id",
        ['id' => $input['id']]
    );

    if (!$adjustment) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Adjustment not found']);
        return;
    }

    // Handle status change (confirm/post)
    if (isset($input['status']) && $input['status'] === 'posted' && $adjustment['status'] === 'draft') {
        postAdjustment($db, $adjustment, $userData);
        return;
    }

    // Update basic fields
    $updates = array_intersect_key($input, array_flip([
        'adjustment_date', 'adjustment_type', 'reason', 'notes'
    ]));

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    $db->update('stock_adjustments', $input['id'], $updates);

    echo json_encode([
        'success' => true,
        'message' => 'Adjustment updated successfully'
    ]);
}

/**
 * Post adjustment - apply to stock levels
 */
function postAdjustment($db, $adjustment, $userData) {
    // Get adjustment items
    $items = $db->fetchAll(
        "SELECT * FROM stock_adjustment_items WHERE adjustment_id = :id",
        ['id' => $adjustment['id']]
    );

    $db->beginTransaction();

    try {
        // Process each item
        foreach ($items as $item) {
            if ($item['quantity_difference'] == 0) {
                continue; // No adjustment needed
            }

            // Create stock movement
            $db->insert('stock_movements', [
                'company_id' => $adjustment['company_id'],
                'product_id' => $item['product_id'],
                'variant_id' => $item['variant_id'],
                'warehouse_id' => $adjustment['warehouse_id'],
                'movement_type' => 'adjustment',
                'movement_subtype' => $adjustment['adjustment_type'],
                'quantity' => abs($item['quantity_difference']),
                'unit_cost' => $item['unit_cost'],
                'total_cost' => abs($item['value_difference']),
                'reference_type' => 'stock_adjustment',
                'reference_id' => $adjustment['id'],
                'reference_number' => $adjustment['adjustment_number'],
                'notes' => $adjustment['reason'],
                'created_by' => $userData['id']
            ]);

            // Update stock level
            $stockLevel = $db->fetchOne(
                "SELECT * FROM stock_levels WHERE product_id = :product_id AND warehouse_id = :warehouse_id AND (variant_id = :variant_id OR (variant_id IS NULL AND :variant_id IS NULL))",
                [
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $adjustment['warehouse_id'],
                    'variant_id' => $item['variant_id']
                ]
            );

            if ($stockLevel) {
                $db->update('stock_levels', $stockLevel['id'], [
                    'quantity_available' => $item['quantity_counted'],
                    'last_count_date' => $adjustment['adjustment_date'],
                    'last_movement_date' => 'CURRENT_TIMESTAMP',
                    'last_updated' => 'CURRENT_TIMESTAMP'
                ]);
            } else {
                // Create new stock level
                $db->insert('stock_levels', [
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'warehouse_id' => $adjustment['warehouse_id'],
                    'quantity_available' => $item['quantity_counted'],
                    'average_cost' => $item['unit_cost'],
                    'last_count_date' => $adjustment['adjustment_date'],
                    'last_movement_date' => 'CURRENT_TIMESTAMP'
                ]);
            }
        }

        // Update adjustment status
        $db->update('stock_adjustments', $adjustment['id'], [
            'status' => 'posted',
            'approved_by' => $userData['id'],
            'approved_at' => 'CURRENT_TIMESTAMP'
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Adjustment posted successfully'
        ]);

    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

/**
 * Generate unique adjustment number
 */
function generateAdjustmentNumber($db, $companyId) {
    $prefix = 'ADJ-' . date('Ymd') . '-';

    $lastNumber = $db->fetchOne(
        "SELECT adjustment_number FROM stock_adjustments WHERE company_id = :company_id AND adjustment_number LIKE :prefix ORDER BY created_at DESC LIMIT 1",
        [
            'company_id' => $companyId,
            'prefix' => $prefix . '%'
        ]
    );

    if ($lastNumber) {
        $sequence = (int)substr($lastNumber['adjustment_number'], -4) + 1;
    } else {
        $sequence = 1;
    }

    return $prefix . str_pad($sequence, 4, '0', STR_PAD_LEFT);
}
