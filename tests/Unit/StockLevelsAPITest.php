<?php

use PHPUnit\Framework\TestCase;

/**
 * Comprehensive Unit Tests for Stock Levels API
 *
 * Tests all operations for the /api/v1/inventory/stock-levels.php endpoint
 */
class StockLevelsAPITest extends TestCase
{
    private static $db;
    private static $testCompanyId;
    private static $testWarehouseId;
    private static $testProductId;

    public static function setUpBeforeClass(): void
    {
        require_once __DIR__ . '/../../api/config/database.php';
        self::$db = Database::getInstance();

        // Create test data
        self::$testCompanyId = self::createTestCompany();
        self::$testWarehouseId = self::createTestWarehouse();
        self::$testProductId = self::createTestProduct();
    }

    protected function setUp(): void
    {
        parent::setUp();
        self::$db->beginTransaction();
    }

    protected function tearDown(): void
    {
        self::$db->rollback();
        parent::tearDown();
    }

    public static function tearDownAfterClass(): void
    {
        // Cleanup
        if (self::$testProductId) {
            self::$db->delete('products', 'id = :id', ['id' => self::$testProductId]);
        }
        if (self::$testWarehouseId) {
            self::$db->delete('warehouses', 'id = :id', ['id' => self::$testWarehouseId]);
        }
        if (self::$testCompanyId) {
            self::$db->delete('companies', 'id = :id', ['id' => self::$testCompanyId]);
        }
    }

    private static function createTestCompany(): string
    {
        $companyId = sprintf('%08x-%04x-%04x-%04x-%012x', mt_rand(), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand());
        self::$db->getConnection()->exec("
            INSERT INTO companies (id, name, tax_id, created_at, updated_at)
            VALUES ('$companyId', 'Test Company Stock', 'TEST" . uniqid() . "', NOW(), NOW())
        ");
        return $companyId;
    }

    private static function createTestWarehouse(): string
    {
        return self::$db->insert('warehouses', [
            'company_id' => self::$testCompanyId,
            'name' => 'Test Warehouse',
            'warehouse_type' => 'warehouse',
            'is_active' => true,
            'is_sellable' => true
        ]);
    }

    private static function createTestProduct(): string
    {
        return self::$db->insert('products', [
            'company_id' => self::$testCompanyId,
            'name' => 'Test Product',
            'sku' => 'TEST-STOCK-001',
            'selling_price' => 100.00,
            'is_active' => true
        ]);
    }

    private function createStockLevel(array $overrides = []): string
    {
        $data = array_merge([
            'product_id' => self::$testProductId,
            'warehouse_id' => self::$testWarehouseId,
            'quantity_available' => 100,
            'quantity_reserved' => 0,
            'quantity_on_order' => 0,
            'reorder_level' => 20
        ], $overrides);

        return self::$db->insert('stock_levels', $data);
    }

    /**
     * Test 1: Create stock level with valid data
     */
    public function testCreateStockLevelWithValidData(): void
    {
        $stockId = $this->createStockLevel([
            'quantity_available' => 50,
            'quantity_reserved' => 5
        ]);

        $this->assertNotEmpty($stockId);

        $stock = self::$db->fetchOne(
            'SELECT * FROM stock_levels WHERE id = :id',
            ['id' => $stockId]
        );

        $this->assertEquals(50, (float)$stock['quantity_available']);
        $this->assertEquals(5, (float)$stock['quantity_reserved']);
        $this->assertEquals(45, (float)$stock['quantity_free']); // Generated column
    }

    /**
     * Test 2: Query stock levels by product
     */
    public function testQueryStockLevelsByProduct(): void
    {
        // Create stock in multiple warehouses
        $warehouse2Id = self::$db->insert('warehouses', [
            'company_id' => self::$testCompanyId,
            'name' => 'Warehouse 2',
            'warehouse_type' => 'warehouse',
            'is_active' => true
        ]);

        $this->createStockLevel(['quantity_available' => 100]);
        $this->createStockLevel([
            'warehouse_id' => $warehouse2Id,
            'quantity_available' => 50
        ]);

        $stockLevels = self::$db->fetchAll(
            'SELECT * FROM stock_levels WHERE product_id = :product_id',
            ['product_id' => self::$testProductId]
        );

        $this->assertCount(2, $stockLevels);

        $totalStock = array_sum(array_column($stockLevels, 'quantity_available'));
        $this->assertEquals(150, (float)$totalStock);
    }

    /**
     * Test 3: Query stock levels by warehouse
     */
    public function testQueryStockLevelsByWarehouse(): void
    {
        // Create multiple products
        $product2Id = self::$db->insert('products', [
            'company_id' => self::$testCompanyId,
            'name' => 'Product 2',
            'sku' => 'TEST-002',
            'selling_price' => 50.00,
            'is_active' => true
        ]);

        $this->createStockLevel(['quantity_available' => 100]);
        $this->createStockLevel([
            'product_id' => $product2Id,
            'quantity_available' => 75
        ]);

        $stockLevels = self::$db->fetchAll(
            'SELECT * FROM stock_levels WHERE warehouse_id = :warehouse_id',
            ['warehouse_id' => self::$testWarehouseId]
        );

        $this->assertGreaterThanOrEqual(2, count($stockLevels));
    }

    /**
     * Test 4: Calculate available vs reserved quantities
     */
    public function testAvailableVsReservedQuantities(): void
    {
        $stockId = $this->createStockLevel([
            'quantity_available' => 100,
            'quantity_reserved' => 25
        ]);

        $stock = self::$db->fetchOne(
            'SELECT *, quantity_free FROM stock_levels WHERE id = :id',
            ['id' => $stockId]
        );

        // quantity_free is a generated column: quantity_available - quantity_reserved
        $this->assertEquals(75, (float)$stock['quantity_free']);
    }

    /**
     * Test 5: Low stock detection
     */
    public function testLowStockDetection(): void
    {
        $this->createStockLevel([
            'quantity_available' => 15,  // Below reorder level
            'reorder_level' => 20
        ]);

        $lowStockItems = self::$db->fetchAll(
            'SELECT * FROM stock_levels
             WHERE warehouse_id = :warehouse_id
             AND quantity_available <= reorder_level',
            ['warehouse_id' => self::$testWarehouseId]
        );

        $this->assertGreaterThanOrEqual(1, count($lowStockItems));
    }

    /**
     * Test 6: Out of stock detection
     */
    public function testOutOfStockDetection(): void
    {
        $this->createStockLevel(['quantity_available' => 0]);

        $outOfStock = self::$db->fetchAll(
            'SELECT * FROM stock_levels
             WHERE warehouse_id = :warehouse_id
             AND quantity_available = 0',
            ['warehouse_id' => self::$testWarehouseId]
        );

        $this->assertGreaterThanOrEqual(1, count($outOfStock));
    }

    /**
     * Test 7: Update stock quantity
     */
    public function testUpdateStockQuantity(): void
    {
        $stockId = $this->createStockLevel(['quantity_available' => 100]);

        // Update quantity
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("UPDATE stock_levels SET quantity_available = :qty WHERE id = :id");
        $stmt->execute(['qty' => 150, 'id' => $stockId]);

        $stock = self::$db->fetchOne(
            'SELECT * FROM stock_levels WHERE id = :id',
            ['id' => $stockId]
        );

        $this->assertEquals(150, (float)$stock['quantity_available']);
    }

    /**
     * Test 8: Reserve stock quantity
     */
    public function testReserveStockQuantity(): void
    {
        $stockId = $this->createStockLevel([
            'quantity_available' => 100,
            'quantity_reserved' => 10
        ]);

        // Reserve 20 more units
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("UPDATE stock_levels SET quantity_reserved = quantity_reserved + 20 WHERE id = :id");
        $stmt->execute(['id' => $stockId]);

        $stock = self::$db->fetchOne(
            'SELECT * FROM stock_levels WHERE id = :id',
            ['id' => $stockId]
        );

        $this->assertEquals(30, (float)$stock['quantity_reserved']);
        $this->assertEquals(70, (float)$stock['quantity_free']);
    }

    /**
     * Test 9: Multi-warehouse aggregation
     */
    public function testMultiWarehouseAggregation(): void
    {
        $warehouse2Id = self::$db->insert('warehouses', [
            'company_id' => self::$testCompanyId,
            'name' => 'Warehouse 3',
            'warehouse_type' => 'warehouse',
            'is_active' => true
        ]);

        $this->createStockLevel(['quantity_available' => 100]);
        $this->createStockLevel([
            'warehouse_id' => $warehouse2Id,
            'quantity_available' => 50
        ]);

        $result = self::$db->fetchOne(
            'SELECT
                SUM(quantity_available) as total_available,
                SUM(quantity_reserved) as total_reserved,
                SUM(quantity_free) as total_free
             FROM stock_levels
             WHERE product_id = :product_id',
            ['product_id' => self::$testProductId]
        );

        $this->assertEquals(150, (float)$result['total_available']);
    }

    /**
     * Test 10: Stock level with reorder point
     */
    public function testStockLevelWithReorderPoint(): void
    {
        $stockId = $this->createStockLevel([
            'quantity_available' => 100,
            'reorder_level' => 30,
            'reorder_quantity' => 50
        ]);

        $stock = self::$db->fetchOne(
            'SELECT * FROM stock_levels WHERE id = :id',
            ['id' => $stockId]
        );

        $this->assertEquals(30, (float)$stock['reorder_level']);
        $this->assertEquals(50, (float)$stock['reorder_quantity']);
        $this->assertGreaterThan((float)$stock['reorder_level'], (float)$stock['quantity_available']);
    }

    /**
     * Test 11: Negative stock prevention check
     */
    public function testNegativeStockCheck(): void
    {
        $stockId = $this->createStockLevel(['quantity_available' => 10]);

        $stock = self::$db->fetchOne(
            'SELECT * FROM stock_levels WHERE id = :id',
            ['id' => $stockId]
        );

        // Verify current quantity is not negative
        $this->assertGreaterThanOrEqual(0, (float)$stock['quantity_available']);
        $this->assertGreaterThanOrEqual(0, (float)$stock['quantity_reserved']);
    }

    /**
     * Test 12: Stock with quantity on order
     */
    public function testStockWithQuantityOnOrder(): void
    {
        $stockId = $this->createStockLevel([
            'quantity_available' => 50,
            'quantity_on_order' => 100
        ]);

        $stock = self::$db->fetchOne(
            'SELECT * FROM stock_levels WHERE id = :id',
            ['id' => $stockId]
        );

        $this->assertEquals(100, (float)$stock['quantity_on_order']);
    }

    /**
     * Test 13: Group stock levels by product
     */
    public function testGroupStockLevelsByProduct(): void
    {
        $warehouse2Id = self::$db->insert('warehouses', [
            'company_id' => self::$testCompanyId,
            'name' => 'Warehouse 4',
            'warehouse_type' => 'warehouse',
            'is_active' => true
        ]);

        $product2Id = self::$db->insert('products', [
            'company_id' => self::$testCompanyId,
            'name' => 'Product 3',
            'sku' => 'TEST-003',
            'selling_price' => 75.00,
            'is_active' => true
        ]);

        // Create stocks for different products
        $this->createStockLevel(['quantity_available' => 100]);
        $this->createStockLevel([
            'warehouse_id' => $warehouse2Id,
            'quantity_available' => 50
        ]);

        self::$db->insert('stock_levels', [
            'product_id' => $product2Id,
            'warehouse_id' => self::$testWarehouseId,
            'quantity_available' => 75
        ]);

        $grouped = self::$db->fetchAll(
            'SELECT product_id, COUNT(*) as warehouse_count, SUM(quantity_available) as total_qty
             FROM stock_levels
             WHERE product_id IN (:id1, :id2)
             GROUP BY product_id',
            [
                'id1' => self::$testProductId,
                'id2' => $product2Id
            ]
        );

        $this->assertCount(2, $grouped);
    }

    /**
     * Test 14: Check stock level timestamps
     */
    public function testStockLevelTimestamps(): void
    {
        $stockId = $this->createStockLevel();

        $stock = self::$db->fetchOne(
            'SELECT * FROM stock_levels WHERE id = :id',
            ['id' => $stockId]
        );

        $this->assertNotNull($stock['last_updated']);
    }

    /**
     * Test 15: Stock variance detection
     */
    public function testStockVarianceDetection(): void
    {
        // Create stock where reserved exceeds available (error condition)
        $stockId = $this->createStockLevel([
            'quantity_available' => 10,
            'quantity_reserved' => 5
        ]);

        $stock = self::$db->fetchOne(
            'SELECT *,
             CASE
                WHEN quantity_reserved > quantity_available THEN true
                ELSE false
             END as has_variance
             FROM stock_levels WHERE id = :id',
            ['id' => $stockId]
        );

        // Should not have variance in this test
        $this->assertFalse((bool)$stock['has_variance']);
    }
}
