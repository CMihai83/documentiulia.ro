<?php
/**
 * Product Categories Endpoint
 * GET /api/v1/products/categories.php - List categories
 * POST /api/v1/products/categories.php - Create category
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Company-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../auth/AuthService.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/headers.php';

try {
    // Authenticate
    $authHeader = getHeader('authorization', '') ?? '';
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('Authorization required');
    }

    $auth = new AuthService();
    $userData = $auth->verifyToken($matches[1]);
    $userId = $userData['user_id'];

    $companyId = getHeader('x-company-id') ?? '';
    if (empty($companyId)) {
        throw new Exception('Company ID required');
    }

    $db = Database::getInstance();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Check if product_categories table exists
        $tableExists = $db->fetchOne(
            "SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'product_categories'
            ) as exists"
        );

        if ($tableExists['exists'] === true || $tableExists['exists'] === 't') {
            $categories = $db->fetchAll(
                "SELECT id, name, description, parent_id, created_at
                 FROM product_categories
                 WHERE company_id = :company_id
                 ORDER BY name ASC",
                ['company_id' => $companyId]
            );
        } else {
            // Return default categories if table doesn't exist
            $categories = [
                ['id' => 'default-1', 'name' => 'Produse', 'description' => 'Produse fizice', 'parent_id' => null],
                ['id' => 'default-2', 'name' => 'Servicii', 'description' => 'Servicii oferite', 'parent_id' => null],
                ['id' => 'default-3', 'name' => 'Materiale', 'description' => 'Materiale de construcție', 'parent_id' => null],
                ['id' => 'default-4', 'name' => 'Echipamente', 'description' => 'Echipamente și utilaje', 'parent_id' => null]
            ];
        }

        echo json_encode([
            'success' => true,
            'data' => $categories
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        $name = trim($input['name'] ?? '');
        if (empty($name)) {
            throw new Exception('Category name is required');
        }

        $description = $input['description'] ?? '';
        $parentId = $input['parent_id'] ?? null;

        // Check if table exists, create if not
        $db->execute("
            CREATE TABLE IF NOT EXISTS product_categories (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        ");

        $result = $db->fetchOne(
            "INSERT INTO product_categories (company_id, name, description, parent_id)
             VALUES (:company_id, :name, :description, :parent_id)
             RETURNING id, name, description, parent_id, created_at",
            [
                'company_id' => $companyId,
                'name' => $name,
                'description' => $description,
                'parent_id' => $parentId
            ]
        );

        echo json_encode([
            'success' => true,
            'message' => 'Category created successfully',
            'data' => $result
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
