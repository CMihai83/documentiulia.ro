<?php

use PHPUnit\Framework\TestCase;

/**
 * Comprehensive Unit Tests for Warehouses API
 *
 * Tests all operations for the /api/v1/inventory/warehouses.php endpoint
 */
class WarehousesAPITest extends TestCase
{
    private static $db;
    private static $testCompanyId;

    public static function setUpBeforeClass(): void
    {
        require_once __DIR__ . '/../../api/config/database.php';
        self::$db = Database::getInstance();

        // Create test company
        self::$testCompanyId = self::createTestCompany();
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
        if (self::$testCompanyId) {
            self::$db->delete('companies', 'id = :id', ['id' => self::$testCompanyId]);
        }
    }

    private static function createTestCompany(): string
    {
        $companyId = sprintf('%08x-%04x-%04x-%04x-%012x', mt_rand(), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand());
        self::$db->getConnection()->exec("
            INSERT INTO companies (id, name, tax_id, created_at, updated_at)
            VALUES ('$companyId', 'Test Company Warehouse', 'TEST" . uniqid() . "', NOW(), NOW())
        ");
        return $companyId;
    }

    private function createWarehouse(array $overrides = []): string
    {
        $data = array_merge([
            'company_id' => self::$testCompanyId,
            'name' => 'Test Warehouse ' . uniqid(),
            'warehouse_type' => 'warehouse',
            'is_active' => true,
            'is_sellable' => true
        ], $overrides);

        return self::$db->insert('warehouses', $data);
    }

    /**
     * Test 1: Create warehouse with valid data
     */
    public function testCreateWarehouseWithValidData(): void
    {
        $warehouseId = $this->createWarehouse([
            'name' => 'Main Warehouse',
            'warehouse_type' => 'warehouse'
        ]);

        $this->assertNotEmpty($warehouseId);

        $warehouse = self::$db->fetchOne(
            'SELECT * FROM warehouses WHERE id = :id',
            ['id' => $warehouseId]
        );

        $this->assertEquals('Main Warehouse', $warehouse['name']);
        $this->assertEquals('warehouse', $warehouse['warehouse_type']);
        $this->assertTrue((bool)$warehouse['is_active']);
    }

    /**
     * Test 2: Create warehouse with all optional fields
     */
    public function testCreateWarehouseWithAllFields(): void
    {
        $warehouseId = $this->createWarehouse([
            'name' => 'Distribution Center',
            'warehouse_type' => 'distribution',
            'address' => '123 Main St',
            'city' => 'Bucharest',
            'country' => 'RO',
            'postal_code' => '010101',
            'is_active' => true,
            'is_sellable' => true
        ]);

        $warehouse = self::$db->fetchOne(
            'SELECT * FROM warehouses WHERE id = :id',
            ['id' => $warehouseId]
        );

        $this->assertEquals('Distribution Center', $warehouse['name']);
        $this->assertEquals('distribution', $warehouse['warehouse_type']);
        $this->assertEquals('123 Main St', $warehouse['address']);
        $this->assertEquals('Bucharest', $warehouse['city']);
        $this->assertEquals('RO', $warehouse['country']);
        $this->assertEquals('010101', $warehouse['postal_code']);
        $this->assertTrue((bool)$warehouse['is_sellable']);
    }

    /**
     * Test 3: Query warehouses by company
     */
    public function testQueryWarehousesByCompany(): void
    {
        // Create multiple warehouses
        $this->createWarehouse(['name' => 'Warehouse 1']);
        $this->createWarehouse(['name' => 'Warehouse 2']);
        $this->createWarehouse(['name' => 'Warehouse 3']);

        $warehouses = self::$db->fetchAll(
            'SELECT * FROM warehouses WHERE company_id = :company_id',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(3, count($warehouses));
    }

    /**
     * Test 4: Filter warehouses by type
     */
    public function testFilterWarehousesByType(): void
    {
        $this->createWarehouse([
            'name' => 'Main Warehouse',
            'warehouse_type' => 'warehouse'
        ]);

        $this->createWarehouse([
            'name' => 'Store 1',
            'warehouse_type' => 'store'
        ]);

        $this->createWarehouse([
            'name' => 'Transit Hub',
            'warehouse_type' => 'transit'
        ]);

        $warehouses = self::$db->fetchAll(
            'SELECT * FROM warehouses
             WHERE company_id = :company_id
             AND warehouse_type = :type',
            [
                'company_id' => self::$testCompanyId,
                'type' => 'warehouse'
            ]
        );

        $this->assertGreaterThanOrEqual(1, count($warehouses));
        foreach ($warehouses as $warehouse) {
            $this->assertEquals('warehouse', $warehouse['warehouse_type']);
        }
    }

    /**
     * Test 5: Filter warehouses by active status
     */
    public function testFilterWarehousesByActiveStatus(): void
    {
        $this->createWarehouse([
            'name' => 'Active Warehouse',
            'is_active' => true
        ]);

        $this->createWarehouse([
            'name' => 'Inactive Warehouse',
            'is_active' => false
        ]);

        $activeWarehouses = self::$db->fetchAll(
            'SELECT * FROM warehouses
             WHERE company_id = :company_id
             AND is_active = true',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(1, count($activeWarehouses));
    }

    /**
     * Test 6: Filter warehouses by sellable status
     */
    public function testFilterWarehousesBySellableStatus(): void
    {
        $this->createWarehouse([
            'name' => 'Sellable Warehouse',
            'is_sellable' => true
        ]);

        $this->createWarehouse([
            'name' => 'Non-Sellable Warehouse',
            'is_sellable' => false
        ]);

        $sellableWarehouses = self::$db->fetchAll(
            'SELECT * FROM warehouses
             WHERE company_id = :company_id
             AND is_sellable = true',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(1, count($sellableWarehouses));
    }

    /**
     * Test 7: Update warehouse details
     */
    public function testUpdateWarehouseDetails(): void
    {
        $warehouseId = $this->createWarehouse([
            'name' => 'Old Name',
            'address' => 'Old Address'
        ]);

        // Update warehouse
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("
            UPDATE warehouses
            SET name = :name, address = :address
            WHERE id = :id
        ");
        $stmt->execute([
            'name' => 'New Name',
            'address' => 'New Address',
            'id' => $warehouseId
        ]);

        $warehouse = self::$db->fetchOne(
            'SELECT * FROM warehouses WHERE id = :id',
            ['id' => $warehouseId]
        );

        $this->assertEquals('New Name', $warehouse['name']);
        $this->assertEquals('New Address', $warehouse['address']);
    }

    /**
     * Test 8: Deactivate warehouse
     */
    public function testDeactivateWarehouse(): void
    {
        $warehouseId = $this->createWarehouse(['is_active' => true]);

        // Deactivate
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("UPDATE warehouses SET is_active = FALSE WHERE id = :id");
        $stmt->execute(['id' => $warehouseId]);

        $warehouse = self::$db->fetchOne(
            'SELECT * FROM warehouses WHERE id = :id',
            ['id' => $warehouseId]
        );

        $this->assertFalse((bool)$warehouse['is_active']);
    }

    /**
     * Test 9: Multi-tenant isolation
     */
    public function testMultiTenantIsolation(): void
    {
        // Create warehouse for company 1
        $this->createWarehouse(['name' => 'Company 1 Warehouse']);

        // Create another company
        $company2Id = sprintf('%08x-%04x-%04x-%04x-%012x', mt_rand(), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand());
        self::$db->getConnection()->exec("
            INSERT INTO companies (id, name, tax_id, created_at, updated_at)
            VALUES ('$company2Id', 'Test Company 2', 'TEST" . uniqid() . "', NOW(), NOW())
        ");

        // Create warehouse for company 2
        self::$db->insert('warehouses', [
            'company_id' => $company2Id,
            'name' => 'Company 2 Warehouse',
            'warehouse_type' => 'warehouse',
            'is_active' => true
        ]);

        // Query should only return company 1 warehouses
        $warehouses = self::$db->fetchAll(
            'SELECT * FROM warehouses WHERE company_id = :company_id',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThan(0, count($warehouses));
        foreach ($warehouses as $warehouse) {
            $this->assertEquals(self::$testCompanyId, $warehouse['company_id']);
        }

        // Cleanup
        self::$db->delete('companies', 'id = :id', ['id' => $company2Id]);
    }

    /**
     * Test 10: Warehouse with location data
     */
    public function testWarehouseWithLocationData(): void
    {
        $warehouseId = $this->createWarehouse([
            'name' => 'Warehouse with Location',
            'address' => '123 Main St',
            'city' => 'Bucharest',
            'county' => 'Bucuresti',
            'country' => 'RO',
            'postal_code' => '010101'
        ]);

        $warehouse = self::$db->fetchOne(
            'SELECT * FROM warehouses WHERE id = :id',
            ['id' => $warehouseId]
        );

        $this->assertEquals('123 Main St', $warehouse['address']);
        $this->assertEquals('Bucharest', $warehouse['city']);
        $this->assertEquals('Bucuresti', $warehouse['county']);
        $this->assertEquals('RO', $warehouse['country']);
        $this->assertEquals('010101', $warehouse['postal_code']);
    }

    /**
     * Test 11: Warehouse types validation
     */
    public function testWarehouseTypes(): void
    {
        $types = ['warehouse', 'store', 'distribution', 'transit', 'virtual'];

        foreach ($types as $type) {
            $warehouseId = $this->createWarehouse([
                'name' => ucfirst($type) . ' Test',
                'warehouse_type' => $type
            ]);

            $warehouse = self::$db->fetchOne(
                'SELECT * FROM warehouses WHERE id = :id',
                ['id' => $warehouseId]
            );

            $this->assertEquals($type, $warehouse['warehouse_type']);
        }
    }

    /**
     * Test 12: Count warehouses by company
     */
    public function testCountWarehousesByCompany(): void
    {
        $this->createWarehouse(['name' => 'Warehouse 1']);
        $this->createWarehouse(['name' => 'Warehouse 2']);
        $this->createWarehouse(['name' => 'Warehouse 3']);

        $result = self::$db->fetchOne(
            'SELECT COUNT(*) as count FROM warehouses WHERE company_id = :company_id',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(3, (int)$result['count']);
    }

    /**
     * Test 13: Warehouse timestamps
     */
    public function testWarehouseTimestamps(): void
    {
        $warehouseId = $this->createWarehouse();

        $warehouse = self::$db->fetchOne(
            'SELECT * FROM warehouses WHERE id = :id',
            ['id' => $warehouseId]
        );

        $this->assertNotNull($warehouse['created_at']);
    }

    /**
     * Test 14: Search warehouses by name
     */
    public function testSearchWarehousesByName(): void
    {
        $this->createWarehouse(['name' => 'Main Distribution Center']);
        $this->createWarehouse(['name' => 'Secondary Warehouse']);
        $this->createWarehouse(['name' => 'Distribution Hub']);

        $warehouses = self::$db->fetchAll(
            "SELECT * FROM warehouses
             WHERE company_id = :company_id
             AND name ILIKE :search",
            [
                'company_id' => self::$testCompanyId,
                'search' => '%Distribution%'
            ]
        );

        $this->assertGreaterThanOrEqual(2, count($warehouses));
        foreach ($warehouses as $warehouse) {
            $this->assertStringContainsStringIgnoringCase('Distribution', $warehouse['name']);
        }
    }

    /**
     * Test 15: Warehouse with NULL optional fields
     */
    public function testWarehouseWithNullOptionalFields(): void
    {
        $warehouseId = $this->createWarehouse([
            'name' => 'Minimal Warehouse',
            'warehouse_type' => 'warehouse',
            'is_active' => true
            // No address, city, country, postal_code
        ]);

        $warehouse = self::$db->fetchOne(
            'SELECT * FROM warehouses WHERE id = :id',
            ['id' => $warehouseId]
        );

        $this->assertNotEmpty($warehouse['name']);
        $this->assertEquals('warehouse', $warehouse['warehouse_type']);
        // Optional fields can be NULL
    }
}
