<?php
/**
 * Products API Endpoint
 * Manage product catalog with inventory tracking
 *
 * Methods:
 * - GET: List products with stock levels
 * - POST: Create new product
 * - PUT: Update product
 * - DELETE: Deactivate product
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
 * GET: List products with stock levels
 */
function handleGet($db, $userData) {
    $companyId = getHeader('x-company-id') ?? $_GET['company_id'] ?? $userData['company_id'] ?? null;
    $search = $_GET['search'] ?? '';
    $category = $_GET['category'] ?? '';
    $lowStock = isset($_GET['low_stock']) ? filter_var($_GET['low_stock'], FILTER_VALIDATE_BOOLEAN) : false;
    $limit = min((int)($_GET['limit'] ?? 50), 200);
    $offset = (int)($_GET['offset'] ?? 0);

    if (!$companyId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'company_id required']);
        return;
    }

    // Build query
    $conditions = ['p.company_id = :company_id'];
    $params = ['company_id' => $companyId];

    if ($search) {
        $conditions[] = '(p.name ILIKE :search OR p.sku ILIKE :search OR p.barcode ILIKE :search)';
        $params['search'] = '%' . $search . '%';
    }

    if ($category) {
        $conditions[] = 'p.category = :category';
        $params['category'] = $category;
    }

    if ($lowStock) {
        $conditions[] = 'EXISTS (
            SELECT 1 FROM stock_levels sl
            WHERE sl.product_id = p.id
            AND sl.quantity_available <= sl.reorder_level
        )';
    }

    $whereClause = implode(' AND ', $conditions);

    // Get products with aggregated stock levels
    $sql = "
        SELECT
            p.*,
            COALESCE(SUM(sl.quantity_available), 0) as total_stock,
            COALESCE(SUM(sl.quantity_reserved), 0) as total_reserved,
            COALESCE(SUM(sl.quantity_free), 0) as total_free,
            COUNT(DISTINCT sl.warehouse_id) as warehouse_count,
            CASE
                WHEN SUM(sl.quantity_available) <= p.reorder_level THEN true
                ELSE false
            END as is_low_stock
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        WHERE $whereClause
        GROUP BY p.id
        ORDER BY p.name
        LIMIT :limit OFFSET :offset
    ";

    $params['limit'] = $limit;
    $params['offset'] = $offset;

    $products = $db->fetchAll($sql, $params);

    // Get total count
    $countSql = "SELECT COUNT(*) as count FROM products p WHERE $whereClause";
    $total = $db->fetchOne($countSql, array_diff_key($params, ['limit' => '', 'offset' => '']))['count'];

    echo json_encode([
        'success' => true,
        'products' => $products,
        'pagination' => [
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ]
    ]);
}

/**
 * POST: Create new product
 */
function handlePost($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);

    // Get company ID from header if not in input
    $companyId = getHeader('x-company-id') ?? $input['company_id'] ?? $userData['company_id'] ?? null;
    if ($companyId && !isset($input['company_id'])) {
        $input['company_id'] = $companyId;
    }

    // Accept unit_price or price as alias for selling_price (backwards compatibility)
    if (isset($input['unit_price']) && !isset($input['selling_price'])) {
        $input['selling_price'] = $input['unit_price'];
    }
    if (isset($input['price']) && !isset($input['selling_price'])) {
        $input['selling_price'] = $input['price'];
    }

    // Validate required fields
    $required = ['company_id', 'name', 'sku', 'selling_price'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || $input[$field] === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => "Field '$field' is required"]);
            return;
        }
    }

    // Check if SKU already exists for this company
    $existing = $db->fetchOne(
        "SELECT id FROM products WHERE company_id = :company_id AND sku = :sku",
        ['company_id' => $input['company_id'], 'sku' => $input['sku']]
    );

    if ($existing) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'SKU already exists for this company']);
        return;
    }

    // Insert product
    $productId = $db->insert('products', [
        'company_id' => $input['company_id'],
        'sku' => $input['sku'],
        'name' => $input['name'],
        'description' => $input['description'] ?? null,
        'barcode' => $input['barcode'] ?? null,
        'category' => $input['category'] ?? null,
        'subcategory' => $input['subcategory'] ?? null,
        'brand' => $input['brand'] ?? null,
        'unit_of_measure' => $input['unit_of_measure'] ?? 'buc',
        'purchase_price' => $input['purchase_price'] ?? null,
        'selling_price' => $input['selling_price'],
        'min_selling_price' => $input['min_selling_price'] ?? null,
        'vat_rate' => $input['vat_rate'] ?? 19.00,
        'track_inventory' => $input['track_inventory'] ?? true,
        'allow_negative_stock' => $input['allow_negative_stock'] ?? false,
        'reorder_level' => $input['reorder_level'] ?? null,
        'reorder_quantity' => $input['reorder_quantity'] ?? null,
        'weight' => $input['weight'] ?? null,
        'dimensions' => $input['dimensions'] ?? null,
        'manufacturer' => $input['manufacturer'] ?? null,
        'primary_image_url' => $input['primary_image_url'] ?? null,
        'is_active' => $input['is_active'] ?? true,
        'is_sellable' => $input['is_sellable'] ?? true,
        'is_purchasable' => $input['is_purchasable'] ?? true,
        'created_by' => $userData['id']
    ]);

    // If initial stock provided, create stock levels
    if (isset($input['initial_stock']) && is_array($input['initial_stock'])) {
        foreach ($input['initial_stock'] as $stock) {
            $db->insert('stock_levels', [
                'product_id' => $productId,
                'warehouse_id' => $stock['warehouse_id'],
                'quantity_available' => $stock['quantity'] ?? 0,
                'reorder_level' => $input['reorder_level'] ?? null,
                'reorder_quantity' => $input['reorder_quantity'] ?? null
            ]);

            // Record initial stock movement
            $db->insert('stock_movements', [
                'company_id' => $input['company_id'],
                'product_id' => $productId,
                'warehouse_id' => $stock['warehouse_id'],
                'movement_type' => 'in',
                'movement_subtype' => 'initial_stock',
                'quantity' => $stock['quantity'] ?? 0,
                'unit_cost' => $input['purchase_price'] ?? 0,
                'total_cost' => ($stock['quantity'] ?? 0) * ($input['purchase_price'] ?? 0),
                'reference_type' => 'product_creation',
                'reference_id' => $productId,
                'notes' => 'Initial stock on product creation',
                'created_by' => $userData['id']
            ]);
        }
    }

    echo json_encode([
        'success' => true,
        'product_id' => $productId,
        'message' => 'Product created successfully'
    ]);
}

/**
 * PUT: Update product
 */
function handlePut($db, $userData) {
    $input = json_decode(file_get_contents('php://input'), true);
    $productId = $input['id'] ?? null;

    if (!$productId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'product_id required']);
        return;
    }

    // Verify product exists and user has access
    $product = $db->fetchOne(
        "SELECT * FROM products WHERE id = :id",
        ['id' => $productId]
    );

    if (!$product) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Product not found']);
        return;
    }

    // Update allowed fields
    $updates = array_intersect_key($input, array_flip([
        'name', 'description', 'barcode', 'category', 'subcategory', 'brand',
        'unit_of_measure', 'purchase_price', 'selling_price', 'min_selling_price',
        'vat_rate', 'track_inventory', 'allow_negative_stock', 'reorder_level',
        'reorder_quantity', 'weight', 'dimensions', 'manufacturer',
        'primary_image_url', 'is_active', 'is_sellable', 'is_purchasable'
    ]));

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No fields to update']);
        return;
    }

    $db->update('products', $productId, $updates);

    echo json_encode([
        'success' => true,
        'message' => 'Product updated successfully'
    ]);
}

/**
 * DELETE: Deactivate product (soft delete)
 */
function handleDelete($db, $userData) {
    $productId = $_GET['id'] ?? null;

    if (!$productId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'product_id required']);
        return;
    }

    // Check if product has stock
    $hasStock = $db->fetchOne(
        "SELECT SUM(quantity_available) as total FROM stock_levels WHERE product_id = :id",
        ['id' => $productId]
    );

    if ($hasStock && $hasStock['total'] > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'Cannot delete product with existing stock',
            'current_stock' => $hasStock['total']
        ]);
        return;
    }

    // Soft delete - just deactivate
    $db->update('products', $productId, ['is_active' => false]);

    echo json_encode([
        'success' => true,
        'message' => 'Product deactivated successfully'
    ]);
}
