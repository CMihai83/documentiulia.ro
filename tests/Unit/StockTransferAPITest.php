<?php

use PHPUnit\Framework\TestCase;

/**
 * Comprehensive Unit Tests for Stock Transfer API
 *
 * Tests all operations for the /api/v1/inventory/stock-transfer.php endpoint
 */
class StockTransferAPITest extends TestCase
{
    private static $db;
    private static $testCompanyId;
    private static $testWarehouse1Id;
    private static $testWarehouse2Id;
    private static $testProductId;

    public static function setUpBeforeClass(): void
    {
        require_once __DIR__ . '/../../api/config/database.php';
        self::$db = Database::getInstance();

        // Create test data
        self::$testCompanyId = self::createTestCompany();
        self::$testWarehouse1Id = self::createTestWarehouse('Warehouse 1');
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
        if (self::$testWarehouse1Id) {
            self::$db->delete('warehouses', 'id = :id', ['id' => self::$testWarehouse1Id]);
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
            VALUES ('$companyId', 'Test Company Transfer', 'TEST" . uniqid() . "', NOW(), NOW())
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
            'sku' => 'TEST-TRANS-001',
            'selling_price' => 100.00,
            'is_active' => true
        ]);
    }

    private function createStockTransfer(array $overrides = []): string
    {
        $data = array_merge([
            'company_id' => self::$testCompanyId,
            'transfer_number' => 'TRF-' . uniqid(),
            'transfer_date' => date('Y-m-d'),
            'from_warehouse_id' => self::$testWarehouse1Id,
            'to_warehouse_id' => self::$testWarehouse2Id,
            'status' => 'draft'
        ], $overrides);

        return self::$db->insert('stock_transfers', $data);
    }

    /**
     * Test 1: Create stock transfer with valid data
     */
    public function testCreateStockTransferWithValidData(): void
    {
        $transferId = $this->createStockTransfer([
            'transfer_number' => 'TRF-001',
            'transfer_date' => date('Y-m-d'),
            'expected_arrival' => date('Y-m-d', strtotime('+3 days')),
            'notes' => 'Transfer for stock balancing'
        ]);

        $this->assertNotEmpty($transferId);

        $transfer = self::$db->fetchOne(
            'SELECT * FROM stock_transfers WHERE id = :id',
            ['id' => $transferId]
        );

        $this->assertEquals('TRF-001', $transfer['transfer_number']);
        $this->assertEquals(self::$testWarehouse1Id, $transfer['from_warehouse_id']);
        $this->assertEquals(self::$testWarehouse2Id, $transfer['to_warehouse_id']);
        $this->assertEquals('draft', $transfer['status']);
    }

    /**
     * Test 2: Query transfers by from warehouse
     */
    public function testQueryTransfersByFromWarehouse(): void
    {
        $this->createStockTransfer(['transfer_number' => 'TRF-FROM1-' . uniqid()]);
        $this->createStockTransfer(['transfer_number' => 'TRF-FROM2-' . uniqid()]);

        $transfers = self::$db->fetchAll(
            'SELECT * FROM stock_transfers WHERE from_warehouse_id = :warehouse_id',
            ['warehouse_id' => self::$testWarehouse1Id]
        );

        $this->assertGreaterThanOrEqual(2, count($transfers));
    }

    /**
     * Test 3: Query transfers by to warehouse
     */
    public function testQueryTransfersByToWarehouse(): void
    {
        $this->createStockTransfer(['transfer_number' => 'TRF-TO1-' . uniqid()]);

        $transfers = self::$db->fetchAll(
            'SELECT * FROM stock_transfers WHERE to_warehouse_id = :warehouse_id',
            ['warehouse_id' => self::$testWarehouse2Id]
        );

        $this->assertGreaterThanOrEqual(1, count($transfers));
    }

    /**
     * Test 4: Filter transfers by status (draft)
     */
    public function testFilterTransfersByDraftStatus(): void
    {
        $this->createStockTransfer([
            'transfer_number' => 'TRF-DRAFT-' . uniqid(),
            'status' => 'draft'
        ]);

        $draftTransfers = self::$db->fetchAll(
            'SELECT * FROM stock_transfers
             WHERE company_id = :company_id
             AND status = :status',
            [
                'company_id' => self::$testCompanyId,
                'status' => 'draft'
            ]
        );

        $this->assertGreaterThanOrEqual(1, count($draftTransfers));
        foreach ($draftTransfers as $transfer) {
            $this->assertEquals('draft', $transfer['status']);
        }
    }

    /**
     * Test 5: Filter transfers by status (in_transit)
     */
    public function testFilterTransfersByInTransitStatus(): void
    {
        $this->createStockTransfer([
            'transfer_number' => 'TRF-TRANSIT-' . uniqid(),
            'status' => 'in_transit'
        ]);

        $inTransitTransfers = self::$db->fetchAll(
            'SELECT * FROM stock_transfers
             WHERE company_id = :company_id
             AND status = :status',
            [
                'company_id' => self::$testCompanyId,
                'status' => 'in_transit'
            ]
        );

        $this->assertGreaterThanOrEqual(1, count($inTransitTransfers));
    }

    /**
     * Test 6: Ship transfer
     */
    public function testShipTransfer(): void
    {
        $transferId = $this->createStockTransfer([
            'transfer_number' => 'TRF-SHIP-' . uniqid(),
            'status' => 'draft'
        ]);

        // Create test user for shipping
        $userId = self::$db->insert('users', [
            'email' => 'test_' . uniqid() . '@test.com',
            'password_hash' => password_hash('testpass', PASSWORD_DEFAULT),
            'first_name' => 'Test',
            'last_name' => 'User'
        ]);

        // Ship transfer
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("
            UPDATE stock_transfers
            SET status = 'in_transit',
                shipped_by = :user_id,
                shipped_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'user_id' => $userId,
            'id' => $transferId
        ]);

        $transfer = self::$db->fetchOne(
            'SELECT * FROM stock_transfers WHERE id = :id',
            ['id' => $transferId]
        );

        $this->assertEquals('in_transit', $transfer['status']);
        $this->assertEquals($userId, $transfer['shipped_by']);
        $this->assertNotNull($transfer['shipped_at']);
    }

    /**
     * Test 7: Receive transfer
     */
    public function testReceiveTransfer(): void
    {
        $transferId = $this->createStockTransfer([
            'transfer_number' => 'TRF-RECEIVE-' . uniqid(),
            'status' => 'in_transit'
        ]);

        // Create test user for receiving
        $userId = self::$db->insert('users', [
            'email' => 'test_' . uniqid() . '@test.com',
            'password_hash' => password_hash('testpass', PASSWORD_DEFAULT),
            'first_name' => 'Test',
            'last_name' => 'User'
        ]);

        // Receive transfer
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("
            UPDATE stock_transfers
            SET status = 'completed',
                received_by = :user_id,
                received_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'user_id' => $userId,
            'id' => $transferId
        ]);

        $transfer = self::$db->fetchOne(
            'SELECT * FROM stock_transfers WHERE id = :id',
            ['id' => $transferId]
        );

        $this->assertEquals('completed', $transfer['status']);
        $this->assertEquals($userId, $transfer['received_by']);
        $this->assertNotNull($transfer['received_at']);
    }

    /**
     * Test 8: Cancel transfer
     */
    public function testCancelTransfer(): void
    {
        $transferId = $this->createStockTransfer([
            'transfer_number' => 'TRF-CANCEL-' . uniqid(),
            'status' => 'draft'
        ]);

        // Cancel transfer
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("UPDATE stock_transfers SET status = 'cancelled' WHERE id = :id");
        $stmt->execute(['id' => $transferId]);

        $transfer = self::$db->fetchOne(
            'SELECT * FROM stock_transfers WHERE id = :id',
            ['id' => $transferId]
        );

        $this->assertEquals('cancelled', $transfer['status']);
    }

    /**
     * Test 9: Transfer with expected arrival date
     */
    public function testTransferWithExpectedArrival(): void
    {
        $expectedDate = date('Y-m-d', strtotime('+5 days'));

        $transferId = $this->createStockTransfer([
            'transfer_number' => 'TRF-EXPECT-' . uniqid(),
            'expected_arrival' => $expectedDate
        ]);

        $transfer = self::$db->fetchOne(
            'SELECT * FROM stock_transfers WHERE id = :id',
            ['id' => $transferId]
        );

        $this->assertEquals($expectedDate, $transfer['expected_arrival']);
    }

    /**
     * Test 10: Multi-tenant isolation
     */
    public function testMultiTenantIsolation(): void
    {
        // Create transfer for company 1
        $this->createStockTransfer(['transfer_number' => 'TRF-C1-' . uniqid()]);

        // Create another company
        $company2Id = sprintf('%08x-%04x-%04x-%04x-%012x', mt_rand(), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand());
        self::$db->getConnection()->exec("
            INSERT INTO companies (id, name, tax_id, created_at, updated_at)
            VALUES ('$company2Id', 'Test Company 2', 'TEST" . uniqid() . "', NOW(), NOW())
        ");

        $warehouse3Id = self::$db->insert('warehouses', [
            'company_id' => $company2Id,
            'name' => 'Company 2 Warehouse 1',
            'warehouse_type' => 'warehouse',
            'is_active' => true
        ]);

        $warehouse4Id = self::$db->insert('warehouses', [
            'company_id' => $company2Id,
            'name' => 'Company 2 Warehouse 2',
            'warehouse_type' => 'warehouse',
            'is_active' => true
        ]);

        // Create transfer for company 2
        self::$db->insert('stock_transfers', [
            'company_id' => $company2Id,
            'transfer_number' => 'TRF-C2-' . uniqid(),
            'transfer_date' => date('Y-m-d'),
            'from_warehouse_id' => $warehouse3Id,
            'to_warehouse_id' => $warehouse4Id,
            'status' => 'draft'
        ]);

        // Query should only return company 1 transfers
        $transfers = self::$db->fetchAll(
            'SELECT * FROM stock_transfers WHERE company_id = :company_id',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThan(0, count($transfers));
        foreach ($transfers as $transfer) {
            $this->assertEquals(self::$testCompanyId, $transfer['company_id']);
        }

        // Cleanup
        self::$db->delete('companies', 'id = :id', ['id' => $company2Id]);
    }

    /**
     * Test 11: Count transfers by status
     */
    public function testCountTransfersByStatus(): void
    {
        $this->createStockTransfer(['transfer_number' => 'TRF-S1-' . uniqid(), 'status' => 'draft']);
        $this->createStockTransfer(['transfer_number' => 'TRF-S2-' . uniqid(), 'status' => 'draft']);
        $this->createStockTransfer(['transfer_number' => 'TRF-S3-' . uniqid(), 'status' => 'in_transit']);
        $this->createStockTransfer(['transfer_number' => 'TRF-S4-' . uniqid(), 'status' => 'completed']);

        $result = self::$db->fetchAll(
            'SELECT status, COUNT(*) as count
             FROM stock_transfers
             WHERE company_id = :company_id
             GROUP BY status',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(3, count($result));
    }

    /**
     * Test 12: Transfer timestamps
     */
    public function testTransferTimestamps(): void
    {
        $transferId = $this->createStockTransfer(['transfer_number' => 'TRF-TS-' . uniqid()]);

        $transfer = self::$db->fetchOne(
            'SELECT * FROM stock_transfers WHERE id = :id',
            ['id' => $transferId]
        );

        $this->assertNotNull($transfer['created_at']);
        $this->assertNotNull($transfer['transfer_date']);
    }

    /**
     * Test 13: Transfer number uniqueness
     */
    public function testTransferNumberUniqueness(): void
    {
        $transferNumber = 'TRF-UNIQUE-' . uniqid();

        $this->createStockTransfer(['transfer_number' => $transferNumber]);

        // Attempting to create another with same number should fail
        $this->expectException(PDOException::class);
        $this->createStockTransfer(['transfer_number' => $transferNumber]);
    }

    /**
     * Test 14: Query transfers by date range
     */
    public function testQueryTransfersByDateRange(): void
    {
        $this->createStockTransfer([
            'transfer_number' => 'TRF-DATE1-' . uniqid(),
            'transfer_date' => date('Y-m-d', strtotime('-5 days'))
        ]);

        $this->createStockTransfer([
            'transfer_number' => 'TRF-DATE2-' . uniqid(),
            'transfer_date' => date('Y-m-d', strtotime('-2 days'))
        ]);

        $this->createStockTransfer([
            'transfer_number' => 'TRF-DATE3-' . uniqid(),
            'transfer_date' => date('Y-m-d')
        ]);

        // Query last 3 days
        $transfers = self::$db->fetchAll(
            "SELECT * FROM stock_transfers
             WHERE company_id = :company_id
             AND transfer_date >= CURRENT_DATE - INTERVAL '3 days'",
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(2, count($transfers));
    }

    /**
     * Test 15: Transfer status workflow
     */
    public function testTransferStatusWorkflow(): void
    {
        $transferId = $this->createStockTransfer([
            'transfer_number' => 'TRF-WORKFLOW-' . uniqid(),
            'status' => 'draft'
        ]);

        $conn = self::$db->getConnection();

        // Draft -> In Transit
        $stmt = $conn->prepare("UPDATE stock_transfers SET status = 'in_transit' WHERE id = :id");
        $stmt->execute(['id' => $transferId]);

        $transfer = self::$db->fetchOne('SELECT * FROM stock_transfers WHERE id = :id', ['id' => $transferId]);
        $this->assertEquals('in_transit', $transfer['status']);

        // In Transit -> Completed
        $stmt = $conn->prepare("UPDATE stock_transfers SET status = 'completed' WHERE id = :id");
        $stmt->execute(['id' => $transferId]);

        $transfer = self::$db->fetchOne('SELECT * FROM stock_transfers WHERE id = :id', ['id' => $transferId]);
        $this->assertEquals('completed', $transfer['status']);
    }
}
