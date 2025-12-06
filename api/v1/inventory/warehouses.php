<?php
/**
 * Warehouses API Endpoint
 * Manage warehouse/storage locations
 *
 * Methods:
 * - GET: List warehouses
 * - POST: Create warehouse
 * - PUT: Update warehouse
 * - DELETE: Deactivate warehouse
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../helpers/headers.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../auth/AuthService.php';

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

        case 'DELETE':
            handleDelete($db, $userData);
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
 * GET: List warehouses
 */
function handleGet($db, $userData) {
    $companyId = getHeader('x-company-id') ?? $_GET['company_id'] ?? $userData['company_id'] ?? null;
    $type = $_GET['type'] ?? null;
    $includeStats = isset($_GET['include_stats']) ? filter_var($_GET['include_stats'], FILTER_VALIDATE_BOOLEAN) : false;
    $limit = min((int)($_GET['limit'] ?? 50), 200);
    $offset = (int)($_GET['offset'] ?? 0);

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'company_id required']);
        return;
    }

    $conditions = ['company_id = :company_id'];
    $params = ['company_id' => $companyId];

    if ($type) {
        $conditions[] = 'warehouse_type = :type';
        $params['type'] = $type;
    }

    $whereClause = implode(' AND ', $conditions);

    if ($includeStats) {
        // Include inventory statistics
        $sql = "
            SELECT
                w.*,
                COALESCE(SUM(sl.quantity_available), 0) as total_stock,
                COALESCE(SUM(sl.quantity_available * sl.average_cost), 0) as total_value,
                COUNT(DISTINCT sl.product_id) as product_count,
                COUNT(CASE WHEN sl.quantity_available <= sl.reorder_level THEN 1 END) as low_stock_count
            FROM warehouses w
            LEFT JOIN stock_levels sl ON sl.warehouse_id = w.id
            WHERE $whereClause
            GROUP BY w.id
            ORDER BY w.name
            LIMIT :limit OFFSET :offset
        ";
    } else {
        // Simple list without stats
        $sql = "
            SELECT * FROM warehouses
            WHERE $whereClause
            ORDER BY name
            LIMIT :limit OFFSET :offset
        ";
    }

    $params['limit'] = $limit;
    $params['offset'] = $offset;

    $warehouses = $db->fetchAll($sql, $params);

    // Get total count
    $countSql = "SELECT COUNT(*) as count FROM warehouses WHERE $whereClause";
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
 * POST: Create warehouse
 */
function handlePost($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);

    // Get company_id from header if not in body
    $companyId = $input['company_id'] ?? getHeader('x-company-id') ?? $userData['company_id'] ?? null;
    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'company_id required (via header or body)']);
        return;
    }
    $input['company_id'] = $companyId;

    // Validate required fields
    $required = ['name'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || $input[$field] === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Field '$field' is required"]);
            return;
        }
    }

    // Check if code already exists for this company (if provided)
    if (isset($input['code']) && $input['code']) {
        $existing = $db->fetchOne(
            "SELECT id FROM warehouses WHERE company_id = :company_id AND code = :code",
            ['company_id' => $input['company_id'], 'code' => $input['code']]
        );

        if ($existing) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Warehouse code already exists']);
            return;
        }
    }

    // Insert warehouse
    $warehouseId = $db->insert('warehouses', [
        'company_id' => $input['company_id'],
        'name' => $input['name'],
        'code' => $input['code'] ?? null,
        'warehouse_type' => $input['warehouse_type'] ?? 'warehouse',
        'address' => $input['address'] ?? null,
        'city' => $input['city'] ?? null,
        'county' => $input['county'] ?? null,
        'postal_code' => $input['postal_code'] ?? null,
        'country' => $input['country'] ?? 'RO',
        'manager_id' => $input['manager_id'] ?? null,
        'phone' => $input['phone'] ?? null,
        'email' => $input['email'] ?? null,
        'is_active' => $input['is_active'] ?? true,
        'is_sellable' => $input['is_sellable'] ?? false
    ]);

    echo json_encode([
        'success' => true,
        'warehouse_id' => $warehouseId,
        'message' => 'Warehouse created successfully'
    ]);
}

/**
 * PUT: Update warehouse
 */
function handlePut($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'warehouse_id required']);
        return;
    }

    // Verify warehouse exists
    $warehouse = $db->fetchOne(
        "SELECT * FROM warehouses WHERE id = :id",
        ['id' => $input['id']]
    );

    if (!$warehouse) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Warehouse not found']);
        return;
    }

    // Update allowed fields
    $updates = array_intersect_key($input, array_flip([
        'name', 'code', 'warehouse_type', 'address', 'city', 'county', 'postal_code',
        'country', 'manager_id', 'phone', 'email', 'is_active', 'is_sellable'
    ]));

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    // Check code uniqueness if being updated
    if (isset($updates['code']) && $updates['code'] !== $warehouse['code']) {
        $existing = $db->fetchOne(
            "SELECT id FROM warehouses WHERE company_id = :company_id AND code = :code AND id != :id",
            [
                'company_id' => $warehouse['company_id'],
                'code' => $updates['code'],
                'id' => $input['id']
            ]
        );

        if ($existing) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Warehouse code already exists']);
            return;
        }
    }

    $db->update('warehouses', $input['id'], $updates);

    echo json_encode([
        'success' => true,
        'message' => 'Warehouse updated successfully'
    ]);
}

/**
 * DELETE: Deactivate warehouse
 */
function handleDelete($db, $userData) {
    $warehouseId = $_GET['id'] ?? null;

    if (!$warehouseId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'warehouse_id required']);
        return;
    }

    // Check if warehouse has stock
    $hasStock = $db->fetchOne(
        "SELECT SUM(quantity_available) as total FROM stock_levels WHERE warehouse_id = :id",
        ['id' => $warehouseId]
    );

    if ($hasStock && $hasStock['total'] > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'Cannot delete warehouse with existing stock',
            'current_stock' => $hasStock['total'],
            'suggestion' => 'Transfer stock to another warehouse first or use stock adjustments'
        ]);
        return;
    }

    // Soft delete - just deactivate
    $db->update('warehouses', $warehouseId, ['is_active' => false]);

    echo json_encode([
        'success' => true,
        'message' => 'Warehouse deactivated successfully'
    ]);
}
