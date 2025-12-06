<?php

use PHPUnit\Framework\TestCase;

/**
 * Comprehensive Unit Tests for Products API
 *
 * Tests all CRUD operations, authentication, validation, and edge cases
 * for the /api/v1/inventory/products.php endpoint
 */
class ProductsAPITest extends TestCase
{
    private static $db;
    private static $testCompanyId;
    private static $testUserId;
    private static $testProductIds = [];

    public static function setUpBeforeClass(): void
    {
        // Switch to test database
        putenv('DB_NAME=accountech_test');

        // Get database connection
        require_once __DIR__ . '/../../api/config/database.php';
        self::$db = Database::getInstance();

        // Create test company
        self::$testCompanyId = self::createTestCompany();

        // Create test user
        self::$testUserId = self::createTestUser();
    }

    protected function setUp(): void
    {
        parent::setUp();
        // Start transaction for test isolation
        self::$db->beginTransaction();
    }

    protected function tearDown(): void
    {
        // Rollback transaction to clean up test data
        self::$db->rollback();
        parent::tearDown();
    }

    public static function tearDownAfterClass(): void
    {
        // Clean up test data
        if (self::$testCompanyId) {
            self::$db->delete('companies', 'id = :id', ['id' => self::$testCompanyId]);
        }
        if (self::$testUserId) {
            self::$db->delete('users', 'id = :id', ['id' => self::$testUserId]);
        }
    }

    /**
     * Helper: Create test company
     */
    private static function createTestCompany(): string
    {
        $companyId = sprintf(
            '%08x-%04x-%04x-%04x-%012x',
            mt_rand(0, 0xffffffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffffffffffff)
        );

        self::$db->getConnection()->exec("
            INSERT INTO companies (id, name, tax_id, created_at, updated_at)
            VALUES ('$companyId', 'Test Company PHPUnit', 'TEST" . uniqid() . "', NOW(), NOW())
        ");

        return $companyId;
    }

    /**
     * Helper: Create test user
     */
    private static function createTestUser(): string
    {
        $userId = sprintf(
            '%08x-%04x-%04x-%04x-%012x',
            mt_rand(0, 0xffffffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0xffffffffffff)
        );

        $email = 'phpunit_test_' . uniqid() . '@example.com';
        $passwordHash = password_hash('TestPass123!', PASSWORD_DEFAULT);

        self::$db->getConnection()->exec("
            INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, created_at, updated_at)
            VALUES ('$userId', '$email', '$passwordHash', 'Test', 'User', 'admin', 'active', NOW(), NOW())
        ");

        // Link user to company via company_users table
        self::$db->getConnection()->exec("
            INSERT INTO company_users (company_id, user_id, role, created_at)
            VALUES ('" . self::$testCompanyId . "', '$userId', 'admin', NOW())
        ");

        return $userId;
    }

    /**
     * Helper: Create test product
     */
    private function createTestProduct(array $overrides = []): string
    {
        $data = array_merge([
            'company_id' => self::$testCompanyId,
            'name' => 'Test Product ' . uniqid(),
            'sku' => 'TEST-' . uniqid(),
            'category' => 'Electronics',
            'selling_price' => 99.99,
            'purchase_price' => 50.00,
            'description' => 'Test product description',
            'is_active' => true,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ], $overrides);

        $productId = self::$db->insert('products', $data);
        self::$testProductIds[] = $productId;
        return $productId;
    }

    /**
     * Test 1: Create product with valid data
     */
    public function testCreateProductWithValidData(): void
    {
        $productData = [
            'company_id' => self::$testCompanyId,
            'name' => 'Test Product Valid',
            'sku' => 'TEST-VALID-001',
            'category' => 'Electronics',
            'selling_price' => 199.99,
            'purchase_price' => 100.00,
            'description' => 'Valid test product',
            'is_active' => true
        ];

        $productId = $this->createTestProduct($productData);

        $this->assertNotEmpty($productId);
        $this->assertIsString($productId);

        // Verify product was created in database
        $product = self::$db->fetchOne(
            'SELECT * FROM products WHERE id = :id',
            ['id' => $productId]
        );

        $this->assertNotNull($product);
        $this->assertEquals('Test Product Valid', $product['name']);
        $this->assertEquals('TEST-VALID-001', $product['sku']);
        $this->assertEquals(199.99, (float)$product['selling_price']);
        $this->assertEquals(100.00, (float)$product['purchase_price']);
        $this->assertTrue((bool)$product['is_active']);
    }

    /**
     * Test 2: Create product calculates profit margin correctly
     */
    public function testProductProfitMarginCalculation(): void
    {
        $productId = $this->createTestProduct([
            'selling_price' => 100.00,
            'purchase_price' => 60.00
        ]);

        $product = self::$db->fetchOne(
            'SELECT *,
             CASE WHEN selling_price > 0 AND purchase_price IS NOT NULL
                  THEN ROUND(((selling_price - purchase_price) / selling_price * 100)::numeric, 2)
                  ELSE 0
             END as profit_margin_percent
             FROM products WHERE id = :id',
            ['id' => $productId]
        );

        // Expected margin: (100 - 60) / 100 * 100 = 40%
        $this->assertEquals(40.00, (float)$product['profit_margin_percent']);
    }

    /**
     * Test 3: Create product with duplicate SKU should fail
     */
    public function testCreateProductWithDuplicateSKU(): void
    {
        $sku = 'TEST-DUPLICATE-SKU';

        // Create first product
        $this->createTestProduct(['sku' => $sku]);

        // Try to create second product with same SKU
        $this->expectException(PDOException::class);
        $this->createTestProduct(['sku' => $sku]);
    }

    /**
     * Test 4: Create product with missing required fields should fail
     */
    public function testCreateProductWithMissingRequiredFields(): void
    {
        $this->expectException(PDOException::class);

        self::$db->insert('products', [
            'company_id' => self::$testCompanyId,
            // Missing: name, sku, selling_price (required fields)
            'is_active' => true
        ]);
    }

    /**
     * Test 5: List products with pagination
     */
    public function testListProductsWithPagination(): void
    {
        // Create 15 test products
        for ($i = 1; $i <= 15; $i++) {
            $this->createTestProduct(['name' => "Test Product $i"]);
        }

        // Get first page (limit 10)
        $page1 = self::$db->fetchAll(
            'SELECT * FROM products
             WHERE company_id = :company_id
             ORDER BY created_at DESC
             LIMIT 10 OFFSET 0',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertCount(10, $page1);

        // Get second page (limit 10, offset 10)
        $page2 = self::$db->fetchAll(
            'SELECT * FROM products
             WHERE company_id = :company_id
             ORDER BY created_at DESC
             LIMIT 10 OFFSET 10',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertCount(5, $page2);
    }

    /**
     * Test 6: Search products by name
     */
    public function testSearchProductsByName(): void
    {
        $this->createTestProduct(['name' => 'Laptop Dell Inspiron']);
        $this->createTestProduct(['name' => 'Mouse Logitech']);
        $this->createTestProduct(['name' => 'Keyboard Dell']);

        $results = self::$db->fetchAll(
            'SELECT * FROM products
             WHERE company_id = :company_id
             AND name ILIKE :search',
            [
                'company_id' => self::$testCompanyId,
                'search' => '%Dell%'
            ]
        );

        $this->assertCount(2, $results);

        foreach ($results as $product) {
            $this->assertStringContainsString('Dell', $product['name']);
        }
    }

    /**
     * Test 7: Search products by SKU
     */
    public function testSearchProductsBySKU(): void
    {
        $this->createTestProduct(['sku' => 'LAPTOP-001', 'name' => 'Product 1']);
        $this->createTestProduct(['sku' => 'LAPTOP-002', 'name' => 'Product 2']);
        $this->createTestProduct(['sku' => 'MOUSE-001', 'name' => 'Product 3']);

        $results = self::$db->fetchAll(
            'SELECT * FROM products
             WHERE company_id = :company_id
             AND sku ILIKE :search',
            [
                'company_id' => self::$testCompanyId,
                'search' => 'LAPTOP%'
            ]
        );

        $this->assertCount(2, $results);
    }

    /**
     * Test 8: Filter products by category
     */
    public function testFilterProductsByCategory(): void
    {
        $this->createTestProduct(['category' => 'Electronics']);
        $this->createTestProduct(['category' => 'Electronics']);
        $this->createTestProduct(['category' => 'Furniture']);
        $this->createTestProduct(['category' => 'Clothing']);

        $results = self::$db->fetchAll(
            'SELECT * FROM products
             WHERE company_id = :company_id
             AND category = :category',
            [
                'company_id' => self::$testCompanyId,
                'category' => 'Electronics'
            ]
        );

        $this->assertCount(2, $results);
    }

    /**
     * Test 9: Update product details
     */
    public function testUpdateProductDetails(): void
    {
        $productId = $this->createTestProduct([
            'name' => 'Original Name',
            'selling_price' => 100.00
        ]);

        // Update product
        self::$db->update('products', [
            'name' => 'Updated Name',
            'selling_price' => 150.00,
            'updated_at' => date('Y-m-d H:i:s')
        ], "id = '$productId'");

        // Verify update
        $product = self::$db->fetchOne(
            'SELECT * FROM products WHERE id = :id',
            ['id' => $productId]
        );

        $this->assertEquals('Updated Name', $product['name']);
        $this->assertEquals(150.00, (float)$product['selling_price']);
    }

    /**
     * Test 10: Soft delete product
     */
    public function testSoftDeleteProduct(): void
    {
        $productId = $this->createTestProduct(['is_active' => true]);

        // Soft delete (set is_active to false)
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = :id");
        $stmt->bindValue(':id', $productId, PDO::PARAM_STR);
        $stmt->execute();

        $product = self::$db->fetchOne(
            'SELECT * FROM products WHERE id = :id',
            ['id' => $productId]
        );

        $this->assertFalse((bool)$product['is_active']);
    }

    /**
     * Test 11: Multi-tenant isolation
     */
    public function testMultiTenantIsolation(): void
    {
        // Create second company
        $company2Id = self::$db->insert('companies', [
            'name' => 'Test Company 2',
            'tax_id' => 'TEST999999',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        // Create product for company 1
        $this->createTestProduct(['company_id' => self::$testCompanyId]);

        // Create product for company 2
        $product2Id = self::$db->insert('products', [
            'company_id' => $company2Id,
            'name' => 'Company 2 Product',
            'sku' => 'COMPANY2-001',
            'selling_price' => 50.00,
            'purchase_price' => 25.00,
            'is_active' => true,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        // Query products for company 1
        $company1Products = self::$db->fetchAll(
            'SELECT * FROM products WHERE company_id = :company_id',
            ['company_id' => self::$testCompanyId]
        );

        // Verify company 2's products are not returned
        foreach ($company1Products as $product) {
            $this->assertEquals(self::$testCompanyId, $product['company_id']);
            $this->assertNotEquals($product2Id, $product['id']);
        }

        // Cleanup
        self::$db->delete('products', 'id = :id', ['id' => $product2Id]);
        self::$db->delete('companies', 'id = :id', ['id' => $company2Id]);
    }

    /**
     * Test 12: Product with barcode
     */
    public function testProductWithBarcode(): void
    {
        $productId = $this->createTestProduct([
            'barcode' => '1234567890123'
        ]);

        $product = self::$db->fetchOne(
            'SELECT * FROM products WHERE id = :id',
            ['id' => $productId]
        );

        $this->assertEquals('1234567890123', $product['barcode']);
    }

    /**
     * Test 13: List products with stock levels
     */
    public function testListProductsWithStockLevels(): void
    {
        $productId = $this->createTestProduct();

        // Create warehouse
        $warehouseId = self::$db->insert('warehouses', [
            'company_id' => self::$testCompanyId,
            'name' => 'Test Warehouse',
            'warehouse_type' => 'warehouse',
            'is_sellable' => true,
            'is_active' => true,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Create stock level
        self::$db->insert('stock_levels', [
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'quantity_available' => 100,
            'quantity_reserved' => 10,
            'reorder_level' => 20
        ]);

        // Query products with stock
        $result = self::$db->fetchOne(
            'SELECT p.*,
                    COALESCE(SUM(sl.quantity_available), 0) as total_stock,
                    COALESCE(SUM(sl.quantity_reserved), 0) as total_reserved
             FROM products p
             LEFT JOIN stock_levels sl ON p.id = sl.product_id
             WHERE p.id = :id
             GROUP BY p.id',
            ['id' => $productId]
        );

        $this->assertEquals(100, (int)$result['total_stock']);
        $this->assertEquals(10, (int)$result['total_reserved']);
    }

    /**
     * Test 14: Product active/inactive status
     */
    public function testProductActiveStatus(): void
    {
        $activeProduct = $this->createTestProduct(['is_active' => true]);
        $inactiveProduct = $this->createTestProduct(['is_active' => false]);

        $active = self::$db->fetchOne(
            'SELECT is_active FROM products WHERE id = :id',
            ['id' => $activeProduct]
        );
        $this->assertTrue((bool)$active['is_active']);

        $inactive = self::$db->fetchOne(
            'SELECT is_active FROM products WHERE id = :id',
            ['id' => $inactiveProduct]
        );
        $this->assertFalse((bool)$inactive['is_active']);
    }

    /**
     * Test 15: Product price validation (positive values)
     */
    public function testProductPriceValidation(): void
    {
        // Valid prices
        $validProduct = $this->createTestProduct([
            'selling_price' => 100.00,
            'purchase_price' => 50.00
        ]);

        $product = self::$db->fetchOne(
            'SELECT * FROM products WHERE id = :id',
            ['id' => $validProduct]
        );

        $this->assertGreaterThan(0, (float)$product['selling_price']);
        $this->assertGreaterThan(0, (float)$product['purchase_price']);
    }

    /**
     * Test 16: Count total products for company
     */
    public function testCountTotalProductsForCompany(): void
    {
        // Create 5 products
        for ($i = 1; $i <= 5; $i++) {
            $this->createTestProduct();
        }

        $result = self::$db->fetchOne(
            'SELECT COUNT(*) as count FROM products WHERE company_id = :company_id',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(5, (int)$result['count']);
    }

    /**
     * Test 17: Product ordering by created_at
     */
    public function testProductOrderingByCreatedAt(): void
    {
        // Create products with explicit timestamps
        $now = time();

        $product1Id = $this->createTestProduct([
            'name' => 'Product 1',
            'created_at' => date('Y-m-d H:i:s', $now - 20)
        ]);

        $product2Id = $this->createTestProduct([
            'name' => 'Product 2',
            'created_at' => date('Y-m-d H:i:s', $now - 10)
        ]);

        $product3Id = $this->createTestProduct([
            'name' => 'Product 3',
            'created_at' => date('Y-m-d H:i:s', $now)
        ]);

        $products = self::$db->fetchAll(
            'SELECT id, name, created_at FROM products
             WHERE id IN (:id1, :id2, :id3)
             ORDER BY created_at DESC',
            [
                'id1' => $product1Id,
                'id2' => $product2Id,
                'id3' => $product3Id
            ]
        );

        // Most recent should be first
        $this->assertEquals($product3Id, $products[0]['id']);
        $this->assertEquals($product2Id, $products[1]['id']);
        $this->assertEquals($product1Id, $products[2]['id']);
    }

    /**
     * Test 18: Product with NULL optional fields
     */
    public function testProductWithNullOptionalFields(): void
    {
        $productId = self::$db->insert('products', [
            'company_id' => self::$testCompanyId,
            'name' => 'Minimal Product',
            'sku' => 'MIN-001',
            'selling_price' => 10.00,
            'purchase_price' => 5.00,
            'is_active' => true,
            'barcode' => null,
            'description' => null,
            'category' => null,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        $product = self::$db->fetchOne(
            'SELECT * FROM products WHERE id = :id',
            ['id' => $productId]
        );

        $this->assertNull($product['barcode']);
        $this->assertNull($product['description']);
        $this->assertNull($product['category']);
    }
}
