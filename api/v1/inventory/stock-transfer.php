<?php
/**
 * Stock Transfers API Endpoint
 * Handle inter-warehouse stock transfers
 *
 * Methods:
 * - GET: List stock transfers
 * - POST: Create stock transfer
 * - PUT: Update transfer status (ship, receive)
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
 * GET: List stock transfers
 */
function handleGet($db, $userData) {
    $companyId = $_GET['company_id'] ?? getHeader('x-company-id') ?? $userData['company_id'] ?? null;
    $fromWarehouseId = $_GET['from_warehouse_id'] ?? null;
    $toWarehouseId = $_GET['to_warehouse_id'] ?? null;
    $status = $_GET['status'] ?? null;
    $transferId = $_GET['id'] ?? null;
    $limit = min((int)($_GET['limit'] ?? 50), 200);
    $offset = (int)($_GET['offset'] ?? 0);

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'company_id required']);
        return;
    }

    // If specific transfer requested, return with items
    if ($transferId) {
        getTransferWithItems($db, $transferId);
        return;
    }

    $conditions = ['st.company_id = :company_id'];
    $params = ['company_id' => $companyId];

    if ($fromWarehouseId) {
        $conditions[] = 'st.from_warehouse_id = :from_warehouse_id';
        $params['from_warehouse_id'] = $fromWarehouseId;
    }

    if ($toWarehouseId) {
        $conditions[] = 'st.to_warehouse_id = :to_warehouse_id';
        $params['to_warehouse_id'] = $toWarehouseId;
    }

    if ($status) {
        $conditions[] = 'st.status = :status';
        $params['status'] = $status;
    }

    $whereClause = implode(' AND ', $conditions);

    $sql = "
        SELECT
            st.*,
            wf.name as from_warehouse_name,
            wf.code as from_warehouse_code,
            wt.name as to_warehouse_name,
            wt.code as to_warehouse_code,
            u1.first_name || ' ' || u1.last_name as requested_by_name,
            u2.first_name || ' ' || u2.last_name as shipped_by_name,
            u3.first_name || ' ' || u3.last_name as received_by_name
        FROM stock_transfers st
        INNER JOIN warehouses wf ON wf.id = st.from_warehouse_id
        INNER JOIN warehouses wt ON wt.id = st.to_warehouse_id
        LEFT JOIN users u1 ON u1.id = st.requested_by
        LEFT JOIN users u2 ON u2.id = st.shipped_by
        LEFT JOIN users u3 ON u3.id = st.received_by
        WHERE $whereClause
        ORDER BY st.transfer_date DESC, st.created_at DESC
        LIMIT :limit OFFSET :offset
    ";

    $params['limit'] = $limit;
    $params['offset'] = $offset;

    $transfers = $db->fetchAll($sql, $params);

    // Get total count
    $countSql = "SELECT COUNT(*) as count FROM stock_transfers st WHERE $whereClause";
    $total = $db->fetchOne($countSql, array_diff_key($params, ['limit' => '', 'offset' => '']))['count'];

    echo json_encode([
        'success' => true,
        'transfers' => $transfers,
        'pagination' => [
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ]
    ]);
}

/**
 * Get single transfer with items
 */
function getTransferWithItems($db, $transferId) {
    $transfer = $db->fetchOne(
        "SELECT st.*, wf.name as from_warehouse_name, wt.name as to_warehouse_name FROM stock_transfers st INNER JOIN warehouses wf ON wf.id = st.from_warehouse_id INNER JOIN warehouses wt ON wt.id = st.to_warehouse_id WHERE st.id = :id",
        ['id' => $transferId]
    );

    if (!$transfer) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Transfer not found']);
        return;
    }

    // Get transfer items
    $items = $db->fetchAll(
        "SELECT sti.*, p.sku, p.name as product_name, p.unit_of_measure FROM stock_transfer_items sti INNER JOIN products p ON p.id = sti.product_id WHERE sti.transfer_id = :id ORDER BY p.name",
        ['id' => $transferId]
    );

    $transfer['items'] = $items;

    echo json_encode([
        'success' => true,
        'transfer' => $transfer
    ]);
}

/**
 * POST: Create stock transfer
 */
function handlePost($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    $required = ['company_id', 'from_warehouse_id', 'to_warehouse_id', 'transfer_date', 'items'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || $input[$field] === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Field '$field' is required"]);
            return;
        }
    }

    if ($input['from_warehouse_id'] === $input['to_warehouse_id']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot transfer to the same warehouse']);
        return;
    }

    if (!is_array($input['items']) || empty($input['items'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'At least one item is required']);
        return;
    }

    // Generate transfer number
    $transferNumber = generateTransferNumber($db, $input['company_id']);

    // Start transaction
    $db->beginTransaction();

    try {
        // Validate stock availability at source warehouse
        foreach ($input['items'] as $item) {
            $stockLevel = $db->fetchOne(
                "SELECT quantity_available FROM stock_levels WHERE product_id = :product_id AND warehouse_id = :warehouse_id",
                [
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $input['from_warehouse_id']
                ]
            );

            $available = $stockLevel ? $stockLevel['quantity_available'] : 0;
            $requested = $item['quantity_requested'] ?? 0;

            if ($available < $requested) {
                throw new Exception("Insufficient stock for product ID {$item['product_id']}. Available: {$available}, Requested: {$requested}");
            }
        }

        // Insert transfer header
        $transferId = $db->insert('stock_transfers', [
            'company_id' => $input['company_id'],
            'transfer_number' => $transferNumber,
            'transfer_date' => $input['transfer_date'],
            'from_warehouse_id' => $input['from_warehouse_id'],
            'to_warehouse_id' => $input['to_warehouse_id'],
            'status' => 'draft',
            'expected_arrival' => $input['expected_arrival'] ?? null,
            'notes' => $input['notes'] ?? null,
            'requested_by' => $userData['id']
        ]);

        // Insert transfer items
        foreach ($input['items'] as $item) {
            $db->insert('stock_transfer_items', [
                'transfer_id' => $transferId,
                'product_id' => $item['product_id'],
                'variant_id' => $item['variant_id'] ?? null,
                'quantity_requested' => $item['quantity_requested'],
                'notes' => $item['notes'] ?? null
            ]);
        }

        $db->commit();

        echo json_encode([
            'success' => true,
            'transfer_id' => $transferId,
            'transfer_number' => $transferNumber,
            'message' => 'Stock transfer created successfully'
        ]);

    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

/**
 * PUT: Update transfer status (ship, receive, cancel)
 */
function handlePut($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'transfer_id required']);
        return;
    }

    // Get transfer
    $transfer = $db->fetchOne(
        "SELECT * FROM stock_transfers WHERE id = :id",
        ['id' => $input['id']]
    );

    if (!$transfer) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Transfer not found']);
        return;
    }

    // Handle status transitions
    if (isset($input['status'])) {
        switch ($input['status']) {
            case 'in_transit':
                shipTransfer($db, $transfer, $input, $userData);
                return;

            case 'received':
                receiveTransfer($db, $transfer, $input, $userData);
                return;

            case 'cancelled':
                cancelTransfer($db, $transfer, $userData);
                return;

            default:
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid status']);
                return;
        }
    }

    // Update basic fields (only for draft)
    if ($transfer['status'] !== 'draft') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Can only update draft transfers']);
        return;
    }

    $updates = array_intersect_key($input, array_flip([
        'transfer_date', 'expected_arrival', 'notes'
    ]));

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    $db->update('stock_transfers', $input['id'], $updates);

    echo json_encode([
        'success' => true,
        'message' => 'Transfer updated successfully'
    ]);
}

/**
 * Ship transfer - deduct from source warehouse
 */
function shipTransfer($db, $transfer, $input, $userData) {
    if ($transfer['status'] !== 'draft') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Can only ship draft transfers']);
        return;
    }

    $db->beginTransaction();

    try {
        // Get transfer items
        $items = $db->fetchAll(
            "SELECT * FROM stock_transfer_items WHERE transfer_id = :id",
            ['id' => $transfer['id']]
        );

        // Deduct stock from source warehouse and create movements
        foreach ($items as $item) {
            $shippedQty = $item['quantity_requested']; // In future, allow partial shipments

            // Create stock movement (OUT from source)
            $db->insert('stock_movements', [
                'company_id' => $transfer['company_id'],
                'product_id' => $item['product_id'],
                'variant_id' => $item['variant_id'],
                'warehouse_id' => $transfer['from_warehouse_id'],
                'movement_type' => 'transfer',
                'movement_subtype' => 'transfer_out',
                'quantity' => -$shippedQty,
                'reference_type' => 'stock_transfer',
                'reference_id' => $transfer['id'],
                'reference_number' => $transfer['transfer_number'],
                'from_warehouse_id' => $transfer['from_warehouse_id'],
                'to_warehouse_id' => $transfer['to_warehouse_id'],
                'created_by' => $userData['id']
            ]);

            // Update stock level at source
            $stockLevel = $db->fetchOne(
                "SELECT * FROM stock_levels WHERE product_id = :product_id AND warehouse_id = :warehouse_id",
                [
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $transfer['from_warehouse_id']
                ]
            );

            if ($stockLevel) {
                $newQty = $stockLevel['quantity_available'] - $shippedQty;
                $db->update('stock_levels', $stockLevel['id'], [
                    'quantity_available' => $newQty,
                    'last_movement_date' => 'CURRENT_TIMESTAMP'
                ]);
            }

            // Update transfer item
            $db->update('stock_transfer_items', $item['id'], [
                'quantity_shipped' => $shippedQty
            ]);
        }

        // Update transfer status
        $db->update('stock_transfers', $transfer['id'], [
            'status' => 'in_transit',
            'shipped_at' => 'CURRENT_TIMESTAMP',
            'shipped_by' => $userData['id']
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Transfer shipped successfully'
        ]);

    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

/**
 * Receive transfer - add to destination warehouse
 */
function receiveTransfer($db, $transfer, $input, $userData) {
    if ($transfer['status'] !== 'in_transit') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Can only receive in_transit transfers']);
        return;
    }

    $db->beginTransaction();

    try {
        // Get transfer items
        $items = $db->fetchAll(
            "SELECT * FROM stock_transfer_items WHERE transfer_id = :id",
            ['id' => $transfer['id']]
        );

        // Add stock to destination warehouse
        foreach ($items as $item) {
            $receivedQty = $input['items'][$item['id']]['quantity_received'] ?? $item['quantity_shipped'];

            // Create stock movement (IN to destination)
            $db->insert('stock_movements', [
                'company_id' => $transfer['company_id'],
                'product_id' => $item['product_id'],
                'variant_id' => $item['variant_id'],
                'warehouse_id' => $transfer['to_warehouse_id'],
                'movement_type' => 'transfer',
                'movement_subtype' => 'transfer_in',
                'quantity' => $receivedQty,
                'reference_type' => 'stock_transfer',
                'reference_id' => $transfer['id'],
                'reference_number' => $transfer['transfer_number'],
                'from_warehouse_id' => $transfer['from_warehouse_id'],
                'to_warehouse_id' => $transfer['to_warehouse_id'],
                'created_by' => $userData['id']
            ]);

            // Update stock level at destination
            $stockLevel = $db->fetchOne(
                "SELECT * FROM stock_levels WHERE product_id = :product_id AND warehouse_id = :warehouse_id",
                [
                    'product_id' => $item['product_id'],
                    'warehouse_id' => $transfer['to_warehouse_id']
                ]
            );

            if ($stockLevel) {
                $newQty = $stockLevel['quantity_available'] + $receivedQty;
                $db->update('stock_levels', $stockLevel['id'], [
                    'quantity_available' => $newQty,
                    'last_movement_date' => 'CURRENT_TIMESTAMP'
                ]);
            } else {
                // Create new stock level at destination
                $db->insert('stock_levels', [
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'warehouse_id' => $transfer['to_warehouse_id'],
                    'quantity_available' => $receivedQty,
                    'last_movement_date' => 'CURRENT_TIMESTAMP'
                ]);
            }

            // Update transfer item
            $db->update('stock_transfer_items', $item['id'], [
                'quantity_received' => $receivedQty
            ]);
        }

        // Update transfer status
        $db->update('stock_transfers', $transfer['id'], [
            'status' => 'received',
            'received_at' => 'CURRENT_TIMESTAMP',
            'received_by' => $userData['id']
        ]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Transfer received successfully'
        ]);

    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

/**
 * Cancel transfer
 */
function cancelTransfer($db, $transfer, $userData) {
    if ($transfer['status'] === 'received') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cannot cancel received transfers']);
        return;
    }

    // If already shipped, need to reverse the stock movements
    if ($transfer['status'] === 'in_transit') {
        $db->beginTransaction();

        try {
            // Get items and reverse stock movements
            $items = $db->fetchAll(
                "SELECT * FROM stock_transfer_items WHERE transfer_id = :id",
                ['id' => $transfer['id']]
            );

            foreach ($items as $item) {
                // Add stock back to source warehouse
                $stockLevel = $db->fetchOne(
                    "SELECT * FROM stock_levels WHERE product_id = :product_id AND warehouse_id = :warehouse_id",
                    [
                        'product_id' => $item['product_id'],
                        'warehouse_id' => $transfer['from_warehouse_id']
                    ]
                );

                if ($stockLevel) {
                    $newQty = $stockLevel['quantity_available'] + $item['quantity_shipped'];
                    $db->update('stock_levels', $stockLevel['id'], [
                        'quantity_available' => $newQty,
                        'last_movement_date' => 'CURRENT_TIMESTAMP'
                    ]);
                }

                // Record reversal movement
                $db->insert('stock_movements', [
                    'company_id' => $transfer['company_id'],
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'warehouse_id' => $transfer['from_warehouse_id'],
                    'movement_type' => 'adjustment',
                    'movement_subtype' => 'transfer_cancelled',
                    'quantity' => $item['quantity_shipped'],
                    'reference_type' => 'stock_transfer',
                    'reference_id' => $transfer['id'],
                    'reference_number' => $transfer['transfer_number'],
                    'notes' => 'Transfer cancelled - stock returned',
                    'created_by' => $userData['id']
                ]);
            }

            $db->update('stock_transfers', $transfer['id'], ['status' => 'cancelled']);

            $db->commit();
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
    } else {
        // Just mark as cancelled
        $db->update('stock_transfers', $transfer['id'], ['status' => 'cancelled']);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Transfer cancelled successfully'
    ]);
}

/**
 * Generate unique transfer number
 */
function generateTransferNumber($db, $companyId) {
    $prefix = 'TRF-' . date('Ymd') . '-';

    $lastNumber = $db->fetchOne(
        "SELECT transfer_number FROM stock_transfers WHERE company_id = :company_id AND transfer_number LIKE :prefix ORDER BY created_at DESC LIMIT 1",
        [
            'company_id' => $companyId,
            'prefix' => $prefix . '%'
        ]
    );

    if ($lastNumber) {
        $sequence = (int)substr($lastNumber['transfer_number'], -4) + 1;
    } else {
        $sequence = 1;
    }

    return $prefix . str_pad($sequence, 4, '0', STR_PAD_LEFT);
}
