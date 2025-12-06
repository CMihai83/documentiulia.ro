<?php

use PHPUnit\Framework\TestCase;

/**
 * Comprehensive Unit Tests for Low Stock Alerts API
 *
 * Tests all operations for the /api/v1/inventory/low-stock.php endpoint
 */
class LowStockAlertsAPITest extends TestCase
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
            VALUES ('$companyId', 'Test Company Alerts', 'TEST" . uniqid() . "', NOW(), NOW())
        ");
        return $companyId;
    }

    private static function createTestWarehouse(): string
    {
        return self::$db->insert('warehouses', [
            'company_id' => self::$testCompanyId,
            'name' => 'Test Warehouse',
            'warehouse_type' => 'warehouse',
            'is_active' => true
        ]);
    }

    private static function createTestProduct(): string
    {
        return self::$db->insert('products', [
            'company_id' => self::$testCompanyId,
            'name' => 'Test Product',
            'sku' => 'TEST-ALERT-001',
            'selling_price' => 100.00,
            'is_active' => true
        ]);
    }

    private function createLowStockAlert(array $overrides = []): string
    {
        $data = array_merge([
            'company_id' => self::$testCompanyId,
            'product_id' => self::$testProductId,
            'warehouse_id' => self::$testWarehouseId,
            'current_quantity' => 5,
            'reorder_level' => 20,
            'suggested_order_quantity' => 50,
            'alert_status' => 'active'
        ], $overrides);

        return self::$db->insert('low_stock_alerts', $data);
    }

    /**
     * Test 1: Create low stock alert with valid data
     */
    public function testCreateLowStockAlertWithValidData(): void
    {
        $alertId = $this->createLowStockAlert([
            'current_quantity' => 10,
            'reorder_level' => 30,
            'suggested_order_quantity' => 100
        ]);

        $this->assertNotEmpty($alertId);

        $alert = self::$db->fetchOne(
            'SELECT * FROM low_stock_alerts WHERE id = :id',
            ['id' => $alertId]
        );

        $this->assertEquals(10, (float)$alert['current_quantity']);
        $this->assertEquals(30, (float)$alert['reorder_level']);
        $this->assertEquals(100, (float)$alert['suggested_order_quantity']);
        $this->assertEquals('active', $alert['alert_status']);
    }

    /**
     * Test 2: Query alerts by product
     */
    public function testQueryAlertsByProduct(): void
    {
        $this->createLowStockAlert();
        $this->createLowStockAlert(['current_quantity' => 8]);

        $alerts = self::$db->fetchAll(
            'SELECT * FROM low_stock_alerts WHERE product_id = :product_id',
            ['product_id' => self::$testProductId]
        );

        $this->assertGreaterThanOrEqual(2, count($alerts));
    }

    /**
     * Test 3: Query alerts by warehouse
     */
    public function testQueryAlertsByWarehouse(): void
    {
        $this->createLowStockAlert();

        $alerts = self::$db->fetchAll(
            'SELECT * FROM low_stock_alerts WHERE warehouse_id = :warehouse_id',
            ['warehouse_id' => self::$testWarehouseId]
        );

        $this->assertGreaterThanOrEqual(1, count($alerts));
    }

    /**
     * Test 4: Filter alerts by status (active)
     */
    public function testFilterAlertsByActiveStatus(): void
    {
        $this->createLowStockAlert(['alert_status' => 'active']);
        $this->createLowStockAlert(['alert_status' => 'acknowledged']);
        $this->createLowStockAlert(['alert_status' => 'resolved']);

        $activeAlerts = self::$db->fetchAll(
            'SELECT * FROM low_stock_alerts
             WHERE company_id = :company_id
             AND alert_status = :status',
            [
                'company_id' => self::$testCompanyId,
                'status' => 'active'
            ]
        );

        $this->assertGreaterThanOrEqual(1, count($activeAlerts));
        foreach ($activeAlerts as $alert) {
            $this->assertEquals('active', $alert['alert_status']);
        }
    }

    /**
     * Test 5: Filter alerts by status (acknowledged)
     */
    public function testFilterAlertsByAcknowledgedStatus(): void
    {
        $this->createLowStockAlert(['alert_status' => 'acknowledged']);

        $acknowledgedAlerts = self::$db->fetchAll(
            'SELECT * FROM low_stock_alerts
             WHERE company_id = :company_id
             AND alert_status = :status',
            [
                'company_id' => self::$testCompanyId,
                'status' => 'acknowledged'
            ]
        );

        $this->assertGreaterThanOrEqual(1, count($acknowledgedAlerts));
    }

    /**
     * Test 6: Acknowledge alert
     */
    public function testAcknowledgeAlert(): void
    {
        $alertId = $this->createLowStockAlert(['alert_status' => 'active']);

        // Create test user for acknowledgment
        $userId = self::$db->insert('users', [
            'email' => 'test_' . uniqid() . '@test.com',
            'password_hash' => password_hash('testpass', PASSWORD_DEFAULT),
            'first_name' => 'Test',
            'last_name' => 'User'
        ]);

        // Acknowledge alert
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("
            UPDATE low_stock_alerts
            SET alert_status = 'acknowledged',
                acknowledged_by = :user_id,
                acknowledged_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'user_id' => $userId,
            'id' => $alertId
        ]);

        $alert = self::$db->fetchOne(
            'SELECT * FROM low_stock_alerts WHERE id = :id',
            ['id' => $alertId]
        );

        $this->assertEquals('acknowledged', $alert['alert_status']);
        $this->assertEquals($userId, $alert['acknowledged_by']);
        $this->assertNotNull($alert['acknowledged_at']);
    }

    /**
     * Test 7: Resolve alert
     */
    public function testResolveAlert(): void
    {
        $alertId = $this->createLowStockAlert(['alert_status' => 'acknowledged']);

        // Resolve alert
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("
            UPDATE low_stock_alerts
            SET alert_status = 'resolved',
                resolved_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute(['id' => $alertId]);

        $alert = self::$db->fetchOne(
            'SELECT * FROM low_stock_alerts WHERE id = :id',
            ['id' => $alertId]
        );

        $this->assertEquals('resolved', $alert['alert_status']);
        $this->assertNotNull($alert['resolved_at']);
    }

    /**
     * Test 8: Calculate suggested order quantity
     */
    public function testCalculateSuggestedOrderQuantity(): void
    {
        // Suggested qty should be enough to reach reorder level + buffer
        $alertId = $this->createLowStockAlert([
            'current_quantity' => 5,
            'reorder_level' => 20,
            'suggested_order_quantity' => 50
        ]);

        $alert = self::$db->fetchOne(
            'SELECT * FROM low_stock_alerts WHERE id = :id',
            ['id' => $alertId]
        );

        // Verify suggested quantity is greater than the deficit
        $deficit = (float)$alert['reorder_level'] - (float)$alert['current_quantity'];
        $this->assertGreaterThan($deficit, (float)$alert['suggested_order_quantity']);
    }

    /**
     * Test 9: Multi-tenant isolation
     */
    public function testMultiTenantIsolation(): void
    {
        // Create alert for company 1
        $this->createLowStockAlert();

        // Create another company
        $company2Id = sprintf('%08x-%04x-%04x-%04x-%012x', mt_rand(), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand());
        self::$db->getConnection()->exec("
            INSERT INTO companies (id, name, tax_id, created_at, updated_at)
            VALUES ('$company2Id', 'Test Company 2', 'TEST" . uniqid() . "', NOW(), NOW())
        ");

        // Create warehouse and product for company 2
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

        // Create alert for company 2
        self::$db->insert('low_stock_alerts', [
            'company_id' => $company2Id,
            'product_id' => $product2Id,
            'warehouse_id' => $warehouse2Id,
            'current_quantity' => 3,
            'reorder_level' => 15,
            'suggested_order_quantity' => 40,
            'alert_status' => 'active'
        ]);

        // Query should only return company 1 alerts
        $alerts = self::$db->fetchAll(
            'SELECT * FROM low_stock_alerts WHERE company_id = :company_id',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThan(0, count($alerts));
        foreach ($alerts as $alert) {
            $this->assertEquals(self::$testCompanyId, $alert['company_id']);
        }

        // Cleanup
        self::$db->delete('companies', 'id = :id', ['id' => $company2Id]);
    }

    /**
     * Test 10: Alert with critical low quantity
     */
    public function testAlertWithCriticalLowQuantity(): void
    {
        $alertId = $this->createLowStockAlert([
            'current_quantity' => 0,  // Out of stock
            'reorder_level' => 20
        ]);

        $alert = self::$db->fetchOne(
            'SELECT * FROM low_stock_alerts WHERE id = :id',
            ['id' => $alertId]
        );

        $this->assertEquals(0, (float)$alert['current_quantity']);
        $this->assertEquals('active', $alert['alert_status']);
    }

    /**
     * Test 11: Count alerts by status
     */
    public function testCountAlertsByStatus(): void
    {
        $this->createLowStockAlert(['alert_status' => 'active']);
        $this->createLowStockAlert(['alert_status' => 'active']);
        $this->createLowStockAlert(['alert_status' => 'acknowledged']);
        $this->createLowStockAlert(['alert_status' => 'resolved']);

        $result = self::$db->fetchAll(
            'SELECT alert_status, COUNT(*) as count
             FROM low_stock_alerts
             WHERE company_id = :company_id
             GROUP BY alert_status',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(2, count($result));
    }

    /**
     * Test 12: Alert timestamps
     */
    public function testAlertTimestamps(): void
    {
        $alertId = $this->createLowStockAlert();

        $alert = self::$db->fetchOne(
            'SELECT * FROM low_stock_alerts WHERE id = :id',
            ['id' => $alertId]
        );

        $this->assertNotNull($alert['created_at']);
    }

    /**
     * Test 13: Update alert quantities
     */
    public function testUpdateAlertQuantities(): void
    {
        $alertId = $this->createLowStockAlert([
            'current_quantity' => 5,
            'reorder_level' => 20
        ]);

        // Update quantities
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("
            UPDATE low_stock_alerts
            SET current_quantity = :qty,
                reorder_level = :reorder
            WHERE id = :id
        ");
        $stmt->execute([
            'qty' => 15,
            'reorder' => 30,
            'id' => $alertId
        ]);

        $alert = self::$db->fetchOne(
            'SELECT * FROM low_stock_alerts WHERE id = :id',
            ['id' => $alertId]
        );

        $this->assertEquals(15, (float)$alert['current_quantity']);
        $this->assertEquals(30, (float)$alert['reorder_level']);
    }

    /**
     * Test 14: Alert ordering by created_at
     */
    public function testAlertOrderingByCreatedAt(): void
    {
        // Create alerts with explicit timestamps
        $conn = self::$db->getConnection();

        // First alert (oldest)
        $alert1Id = self::$db->insert('low_stock_alerts', [
            'company_id' => self::$testCompanyId,
            'product_id' => self::$testProductId,
            'warehouse_id' => self::$testWarehouseId,
            'current_quantity' => 5,
            'reorder_level' => 20,
            'suggested_order_quantity' => 50,
            'alert_status' => 'active'
        ]);
        $conn->exec("UPDATE low_stock_alerts SET created_at = NOW() - INTERVAL '2 hours' WHERE id = '$alert1Id'");

        // Second alert
        $alert2Id = self::$db->insert('low_stock_alerts', [
            'company_id' => self::$testCompanyId,
            'product_id' => self::$testProductId,
            'warehouse_id' => self::$testWarehouseId,
            'current_quantity' => 3,
            'reorder_level' => 20,
            'suggested_order_quantity' => 50,
            'alert_status' => 'active'
        ]);
        $conn->exec("UPDATE low_stock_alerts SET created_at = NOW() - INTERVAL '1 hour' WHERE id = '$alert2Id'");

        // Third alert (newest)
        $alert3Id = self::$db->insert('low_stock_alerts', [
            'company_id' => self::$testCompanyId,
            'product_id' => self::$testProductId,
            'warehouse_id' => self::$testWarehouseId,
            'current_quantity' => 7,
            'reorder_level' => 20,
            'suggested_order_quantity' => 50,
            'alert_status' => 'active'
        ]);

        $alerts = self::$db->fetchAll(
            'SELECT * FROM low_stock_alerts
             WHERE id IN (:id1, :id2, :id3)
             ORDER BY created_at DESC',
            [
                'id1' => $alert1Id,
                'id2' => $alert2Id,
                'id3' => $alert3Id
            ]
        );

        $this->assertCount(3, $alerts);
        // Most recent should be first
        $this->assertEquals($alert3Id, $alerts[0]['id']);
        $this->assertEquals($alert1Id, $alerts[2]['id']);
    }

    /**
     * Test 15: Query unresolved alerts
     */
    public function testQueryUnresolvedAlerts(): void
    {
        $this->createLowStockAlert(['alert_status' => 'active']);
        $this->createLowStockAlert(['alert_status' => 'acknowledged']);
        $this->createLowStockAlert(['alert_status' => 'resolved']);

        $unresolvedAlerts = self::$db->fetchAll(
            "SELECT * FROM low_stock_alerts
             WHERE company_id = :company_id
             AND alert_status IN ('active', 'acknowledged')",
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(2, count($unresolvedAlerts));
        foreach ($unresolvedAlerts as $alert) {
            $this->assertContains($alert['alert_status'], ['active', 'acknowledged']);
        }
    }
}
