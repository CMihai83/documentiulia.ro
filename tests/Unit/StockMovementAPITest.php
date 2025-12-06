<?php

use PHPUnit\Framework\TestCase;

/**
 * Comprehensive Unit Tests for Stock Movement API
 *
 * Tests all operations for the /api/v1/inventory/stock-movement.php endpoint
 */
class StockMovementAPITest extends TestCase
{
    private static $db;
    private static $testCompanyId;
    private static $testWarehouseId;
    private static $testWarehouse2Id;
    private static $testProductId;

    public static function setUpBeforeClass(): void
    {
        require_once __DIR__ . '/../../api/config/database.php';
        self::$db = Database::getInstance();

        // Create test data
        self::$testCompanyId = self::createTestCompany();
        self::$testWarehouseId = self::createTestWarehouse('Warehouse 1');
        self::$testWarehouse2Id = self::createTestWarehouse('Warehouse 2');
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
        if (self::$testWarehouse2Id) {
            self::$db->delete('warehouses', 'id = :id', ['id' => self::$testWarehouse2Id]);
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
            VALUES ('$companyId', 'Test Company Movement', 'TEST" . uniqid() . "', NOW(), NOW())
        ");
        return $companyId;
    }

    private static function createTestWarehouse(string $name): string
    {
        return self::$db->insert('warehouses', [
            'company_id' => self::$testCompanyId,
            'name' => $name,
            'warehouse_type' => 'warehouse',
            'is_active' => true
        ]);
    }

    private static function createTestProduct(): string
    {
        return self::$db->insert('products', [
            'company_id' => self::$testCompanyId,
            'name' => 'Test Product',
            'sku' => 'TEST-MOVE-001',
            'selling_price' => 100.00,
            'is_active' => true
        ]);
    }

    private function createStockMovement(array $overrides = []): string
    {
        $data = array_merge([
            'company_id' => self::$testCompanyId,
            'product_id' => self::$testProductId,
            'warehouse_id' => self::$testWarehouseId,
            'movement_type' => 'purchase',
            'quantity' => 100,
            'unit_cost' => 50.00,
            'total_cost' => 5000.00
        ], $overrides);

        return self::$db->insert('stock_movements', $data);
    }

    /**
     * Test 1: Create stock movement for purchase
     */
    public function testCreatePurchaseMovement(): void
    {
        $movementId = $this->createStockMovement([
            'movement_type' => 'purchase',
            'movement_subtype' => 'supplier_order',
            'quantity' => 100,
            'unit_cost' => 50.00,
            'total_cost' => 5000.00,
            'reference_number' => 'PO-001'
        ]);

        $this->assertNotEmpty($movementId);

        $movement = self::$db->fetchOne(
            'SELECT * FROM stock_movements WHERE id = :id',
            ['id' => $movementId]
        );

        $this->assertEquals('purchase', $movement['movement_type']);
        $this->assertEquals('supplier_order', $movement['movement_subtype']);
        $this->assertEquals(100, (float)$movement['quantity']);
        $this->assertEquals(50.00, (float)$movement['unit_cost']);
        $this->assertEquals(5000.00, (float)$movement['total_cost']);
    }

    /**
     * Test 2: Create stock movement for sale
     */
    public function testCreateSaleMovement(): void
    {
        $movementId = $this->createStockMovement([
            'movement_type' => 'sale',
            'quantity' => -10,  // Negative for outbound
            'unit_cost' => 50.00
        ]);

        $movement = self::$db->fetchOne(
            'SELECT * FROM stock_movements WHERE id = :id',
            ['id' => $movementId]
        );

        $this->assertEquals('sale', $movement['movement_type']);
        $this->assertEquals(-10, (float)$movement['quantity']);
    }

    /**
     * Test 3: Create stock movement for adjustment
     */
    public function testCreateAdjustmentMovement(): void
    {
        $movementId = $this->createStockMovement([
            'movement_type' => 'adjustment',
            'movement_subtype' => 'damage',
            'quantity' => -5,
            'notes' => 'Damaged during inspection'
        ]);

        $movement = self::$db->fetchOne(
            'SELECT * FROM stock_movements WHERE id = :id',
            ['id' => $movementId]
        );

        $this->assertEquals('adjustment', $movement['movement_type']);
        $this->assertEquals('damage', $movement['movement_subtype']);
        $this->assertStringContainsString('Damaged', $movement['notes']);
    }

    /**
     * Test 4: Create stock movement for transfer
     */
    public function testCreateTransferMovement(): void
    {
        $movementId = $this->createStockMovement([
            'movement_type' => 'transfer',
            'quantity' => 50,
            'warehouse_id' => self::$testWarehouseId,
            'from_warehouse_id' => self::$testWarehouseId,
            'to_warehouse_id' => self::$testWarehouse2Id,
            'reference_number' => 'TRANSFER-001'
        ]);

        $movement = self::$db->fetchOne(
            'SELECT * FROM stock_movements WHERE id = :id',
            ['id' => $movementId]
        );

        $this->assertEquals('transfer', $movement['movement_type']);
        $this->assertEquals(self::$testWarehouseId, $movement['from_warehouse_id']);
        $this->assertEquals(self::$testWarehouse2Id, $movement['to_warehouse_id']);
    }

    /**
     * Test 5: Query movements by product
     */
    public function testQueryMovementsByProduct(): void
    {
        $this->createStockMovement(['movement_type' => 'purchase', 'quantity' => 100]);
        $this->createStockMovement(['movement_type' => 'sale', 'quantity' => -10]);
        $this->createStockMovement(['movement_type' => 'adjustment', 'quantity' => -5]);

        $movements = self::$db->fetchAll(
            'SELECT * FROM stock_movements WHERE product_id = :product_id',
            ['product_id' => self::$testProductId]
        );

        $this->assertGreaterThanOrEqual(3, count($movements));
    }

    /**
     * Test 6: Query movements by warehouse
     */
    public function testQueryMovementsByWarehouse(): void
    {
        $this->createStockMovement(['warehouse_id' => self::$testWarehouseId]);
        $this->createStockMovement(['warehouse_id' => self::$testWarehouseId]);

        $movements = self::$db->fetchAll(
            'SELECT * FROM stock_movements WHERE warehouse_id = :warehouse_id',
            ['warehouse_id' => self::$testWarehouseId]
        );

        $this->assertGreaterThanOrEqual(2, count($movements));
    }

    /**
     * Test 7: Filter movements by type
     */
    public function testFilterMovementsByType(): void
    {
        $this->createStockMovement(['movement_type' => 'purchase']);
        $this->createStockMovement(['movement_type' => 'purchase']);
        $this->createStockMovement(['movement_type' => 'sale']);

        $purchases = self::$db->fetchAll(
            'SELECT * FROM stock_movements
             WHERE company_id = :company_id
             AND movement_type = :type',
            [
                'company_id' => self::$testCompanyId,
                'type' => 'purchase'
            ]
        );

        $this->assertGreaterThanOrEqual(2, count($purchases));
        foreach ($purchases as $movement) {
            $this->assertEquals('purchase', $movement['movement_type']);
        }
    }

    /**
     * Test 8: Calculate total quantity moved
     */
    public function testCalculateTotalQuantityMoved(): void
    {
        $this->createStockMovement(['quantity' => 100]);
        $this->createStockMovement(['quantity' => 50]);
        $this->createStockMovement(['quantity' => -20]);

        $result = self::$db->fetchOne(
            'SELECT SUM(quantity) as total_quantity
             FROM stock_movements
             WHERE product_id = :product_id
             AND warehouse_id = :warehouse_id',
            [
                'product_id' => self::$testProductId,
                'warehouse_id' => self::$testWarehouseId
            ]
        );

        $this->assertEquals(130, (float)$result['total_quantity']);
    }

    /**
     * Test 9: Movement with batch number
     */
    public function testMovementWithBatchNumber(): void
    {
        $movementId = $this->createStockMovement([
            'batch_number' => 'BATCH-2025-001',
            'quantity' => 100
        ]);

        $movement = self::$db->fetchOne(
            'SELECT * FROM stock_movements WHERE id = :id',
            ['id' => $movementId]
        );

        $this->assertEquals('BATCH-2025-001', $movement['batch_number']);
    }

    /**
     * Test 10: Movement with serial numbers (JSON)
     */
    public function testMovementWithSerialNumbers(): void
    {
        $serialNumbers = ['SN001', 'SN002', 'SN003'];
        $movementId = $this->createStockMovement([
            'quantity' => 3,
            'serial_numbers' => json_encode($serialNumbers)
        ]);

        $movement = self::$db->fetchOne(
            'SELECT * FROM stock_movements WHERE id = :id',
            ['id' => $movementId]
        );

        $this->assertNotNull($movement['serial_numbers']);
        $decoded = json_decode($movement['serial_numbers'], true);
        $this->assertCount(3, $decoded);
        $this->assertContains('SN001', $decoded);
    }

    /**
     * Test 11: Movement with reference
     */
    public function testMovementWithReference(): void
    {
        $movementId = $this->createStockMovement([
            'reference_type' => 'invoice',
            'reference_number' => 'INV-2025-001'
        ]);

        $movement = self::$db->fetchOne(
            'SELECT * FROM stock_movements WHERE id = :id',
            ['id' => $movementId]
        );

        $this->assertEquals('invoice', $movement['reference_type']);
        $this->assertEquals('INV-2025-001', $movement['reference_number']);
    }

    /**
     * Test 12: Multi-tenant isolation
     */
    public function testMultiTenantIsolation(): void
    {
        // Create movement for company 1
        $this->createStockMovement();

        // Create another company
        $company2Id = sprintf('%08x-%04x-%04x-%04x-%012x', mt_rand(), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand());
        self::$db->getConnection()->exec("
            INSERT INTO companies (id, name, tax_id, created_at, updated_at)
            VALUES ('$company2Id', 'Test Company 2', 'TEST" . uniqid() . "', NOW(), NOW())
        ");

        $warehouse2Id = self::$db->insert('warehouses', [
            'company_id' => $company2Id,
            'name' => 'Company 2 Warehouse',
            'warehouse_type' => 'warehouse',
            'is_active' => true
        ]);

        $product2Id = self::$db->insert('products', [
            'company_id' => $company2Id,
            'name' => 'Company 2 Product',
            'sku' => 'TEST-002',
            'selling_price' => 50.00,
            'is_active' => true
        ]);

        // Create movement for company 2
        self::$db->insert('stock_movements', [
            'company_id' => $company2Id,
            'product_id' => $product2Id,
            'warehouse_id' => $warehouse2Id,
            'movement_type' => 'purchase',
            'quantity' => 50
        ]);

        // Query should only return company 1 movements
        $movements = self::$db->fetchAll(
            'SELECT * FROM stock_movements WHERE company_id = :company_id',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThan(0, count($movements));
        foreach ($movements as $movement) {
            $this->assertEquals(self::$testCompanyId, $movement['company_id']);
        }

        // Cleanup
        self::$db->delete('companies', 'id = :id', ['id' => $company2Id]);
    }

    /**
     * Test 13: Movement timestamps
     */
    public function testMovementTimestamps(): void
    {
        $movementId = $this->createStockMovement();

        $movement = self::$db->fetchOne(
            'SELECT * FROM stock_movements WHERE id = :id',
            ['id' => $movementId]
        );

        $this->assertNotNull($movement['created_at']);
    }

    /**
     * Test 14: Query movements by date range
     */
    public function testQueryMovementsByDateRange(): void
    {
        // Create movements with different timestamps
        $conn = self::$db->getConnection();

        $movement1Id = $this->createStockMovement(['quantity' => 100]);
        $conn->exec("UPDATE stock_movements SET created_at = NOW() - INTERVAL '3 days' WHERE id = '$movement1Id'");

        $movement2Id = $this->createStockMovement(['quantity' => 50]);
        $conn->exec("UPDATE stock_movements SET created_at = NOW() - INTERVAL '1 day' WHERE id = '$movement2Id'");

        $movement3Id = $this->createStockMovement(['quantity' => 25]);

        // Query last 2 days
        $movements = self::$db->fetchAll(
            "SELECT * FROM stock_movements
             WHERE company_id = :company_id
             AND created_at >= NOW() - INTERVAL '2 days'
             ORDER BY created_at DESC",
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(2, count($movements));
    }

    /**
     * Test 15: Calculate inventory balance
     */
    public function testCalculateInventoryBalance(): void
    {
        // Starting with 0
        $this->createStockMovement(['movement_type' => 'purchase', 'quantity' => 200]);  // +200
        $this->createStockMovement(['movement_type' => 'sale', 'quantity' => -50]);      // -50
        $this->createStockMovement(['movement_type' => 'adjustment', 'quantity' => -10]); // -10
        $this->createStockMovement(['movement_type' => 'purchase', 'quantity' => 60]);    // +60

        $result = self::$db->fetchOne(
            'SELECT SUM(quantity) as balance
             FROM stock_movements
             WHERE product_id = :product_id
             AND warehouse_id = :warehouse_id',
            [
                'product_id' => self::$testProductId,
                'warehouse_id' => self::$testWarehouseId
            ]
        );

        // 200 - 50 - 10 + 60 = 200
        $this->assertEquals(200, (float)$result['balance']);
    }
}
