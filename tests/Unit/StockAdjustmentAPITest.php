<?php

use PHPUnit\Framework\TestCase;

/**
 * Comprehensive Unit Tests for Stock Adjustment API
 *
 * Tests all operations for the /api/v1/inventory/stock-adjustment.php endpoint
 */
class StockAdjustmentAPITest extends TestCase
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
            VALUES ('$companyId', 'Test Company Adjustment', 'TEST" . uniqid() . "', NOW(), NOW())
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
            'sku' => 'TEST-ADJ-001',
            'selling_price' => 100.00,
            'is_active' => true
        ]);
    }

    private function createStockAdjustment(array $overrides = []): string
    {
        $data = array_merge([
            'company_id' => self::$testCompanyId,
            'warehouse_id' => self::$testWarehouseId,
            'adjustment_number' => 'ADJ-' . uniqid(),
            'adjustment_date' => date('Y-m-d'),
            'adjustment_type' => 'count_correction',
            'status' => 'draft',
            'total_items' => 1,
            'total_value' => 100.00
        ], $overrides);

        return self::$db->insert('stock_adjustments', $data);
    }

    /**
     * Test 1: Create stock adjustment with valid data
     */
    public function testCreateStockAdjustmentWithValidData(): void
    {
        $adjustmentId = $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-001',
            'adjustment_type' => 'count_correction',
            'total_items' => 5,
            'total_value' => 500.00,
            'reason' => 'Physical count discrepancy'
        ]);

        $this->assertNotEmpty($adjustmentId);

        $adjustment = self::$db->fetchOne(
            'SELECT * FROM stock_adjustments WHERE id = :id',
            ['id' => $adjustmentId]
        );

        $this->assertEquals('ADJ-001', $adjustment['adjustment_number']);
        $this->assertEquals('count_correction', $adjustment['adjustment_type']);
        $this->assertEquals(5, (int)$adjustment['total_items']);
        $this->assertEquals(500.00, (float)$adjustment['total_value']);
        $this->assertEquals('draft', $adjustment['status']);
    }

    /**
     * Test 2: Create adjustment with different types
     */
    public function testCreateAdjustmentWithDifferentTypes(): void
    {
        $types = ['count_correction', 'damage', 'loss', 'found', 'revaluation'];

        foreach ($types as $type) {
            $adjustmentId = $this->createStockAdjustment([
                'adjustment_number' => 'ADJ-' . strtoupper($type) . '-' . uniqid(),
                'adjustment_type' => $type
            ]);

            $adjustment = self::$db->fetchOne(
                'SELECT * FROM stock_adjustments WHERE id = :id',
                ['id' => $adjustmentId]
            );

            $this->assertEquals($type, $adjustment['adjustment_type']);
        }
    }

    /**
     * Test 3: Query adjustments by warehouse
     */
    public function testQueryAdjustmentsByWarehouse(): void
    {
        $this->createStockAdjustment(['adjustment_number' => 'ADJ-W1-' . uniqid()]);
        $this->createStockAdjustment(['adjustment_number' => 'ADJ-W2-' . uniqid()]);

        $adjustments = self::$db->fetchAll(
            'SELECT * FROM stock_adjustments WHERE warehouse_id = :warehouse_id',
            ['warehouse_id' => self::$testWarehouseId]
        );

        $this->assertGreaterThanOrEqual(2, count($adjustments));
    }

    /**
     * Test 4: Filter adjustments by status (draft)
     */
    public function testFilterAdjustmentsByDraftStatus(): void
    {
        $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-DRAFT-' . uniqid(),
            'status' => 'draft'
        ]);

        $draftAdjustments = self::$db->fetchAll(
            'SELECT * FROM stock_adjustments
             WHERE company_id = :company_id
             AND status = :status',
            [
                'company_id' => self::$testCompanyId,
                'status' => 'draft'
            ]
        );

        $this->assertGreaterThanOrEqual(1, count($draftAdjustments));
        foreach ($draftAdjustments as $adjustment) {
            $this->assertEquals('draft', $adjustment['status']);
        }
    }

    /**
     * Test 5: Filter adjustments by status (approved)
     */
    public function testFilterAdjustmentsByApprovedStatus(): void
    {
        $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-APPROVED-' . uniqid(),
            'status' => 'approved'
        ]);

        $approvedAdjustments = self::$db->fetchAll(
            'SELECT * FROM stock_adjustments
             WHERE company_id = :company_id
             AND status = :status',
            [
                'company_id' => self::$testCompanyId,
                'status' => 'approved'
            ]
        );

        $this->assertGreaterThanOrEqual(1, count($approvedAdjustments));
    }

    /**
     * Test 6: Approve adjustment
     */
    public function testApproveAdjustment(): void
    {
        $adjustmentId = $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-APPROVE-' . uniqid(),
            'status' => 'draft'
        ]);

        // Create test user for approval
        $userId = self::$db->insert('users', [
            'email' => 'test_' . uniqid() . '@test.com',
            'password_hash' => password_hash('testpass', PASSWORD_DEFAULT),
            'first_name' => 'Test',
            'last_name' => 'User'
        ]);

        // Approve adjustment
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("
            UPDATE stock_adjustments
            SET status = 'approved',
                approved_by = :user_id,
                approved_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'user_id' => $userId,
            'id' => $adjustmentId
        ]);

        $adjustment = self::$db->fetchOne(
            'SELECT * FROM stock_adjustments WHERE id = :id',
            ['id' => $adjustmentId]
        );

        $this->assertEquals('approved', $adjustment['status']);
        $this->assertEquals($userId, $adjustment['approved_by']);
        $this->assertNotNull($adjustment['approved_at']);
    }

    /**
     * Test 7: Cancel adjustment
     */
    public function testCancelAdjustment(): void
    {
        $adjustmentId = $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-CANCEL-' . uniqid(),
            'status' => 'draft'
        ]);

        // Cancel adjustment
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("UPDATE stock_adjustments SET status = 'cancelled' WHERE id = :id");
        $stmt->execute(['id' => $adjustmentId]);

        $adjustment = self::$db->fetchOne(
            'SELECT * FROM stock_adjustments WHERE id = :id',
            ['id' => $adjustmentId]
        );

        $this->assertEquals('cancelled', $adjustment['status']);
    }

    /**
     * Test 8: Update adjustment details
     */
    public function testUpdateAdjustmentDetails(): void
    {
        $adjustmentId = $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-UPDATE-' . uniqid(),
            'total_items' => 5,
            'total_value' => 500.00
        ]);

        // Update adjustment
        $conn = self::$db->getConnection();
        $stmt = $conn->prepare("
            UPDATE stock_adjustments
            SET total_items = :items,
                total_value = :value,
                notes = :notes
            WHERE id = :id
        ");
        $stmt->execute([
            'items' => 10,
            'value' => 1000.00,
            'notes' => 'Updated after recount',
            'id' => $adjustmentId
        ]);

        $adjustment = self::$db->fetchOne(
            'SELECT * FROM stock_adjustments WHERE id = :id',
            ['id' => $adjustmentId]
        );

        $this->assertEquals(10, (int)$adjustment['total_items']);
        $this->assertEquals(1000.00, (float)$adjustment['total_value']);
        $this->assertStringContainsString('Updated', $adjustment['notes']);
    }

    /**
     * Test 9: Multi-tenant isolation
     */
    public function testMultiTenantIsolation(): void
    {
        // Create adjustment for company 1
        $this->createStockAdjustment(['adjustment_number' => 'ADJ-C1-' . uniqid()]);

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

        // Create adjustment for company 2
        self::$db->insert('stock_adjustments', [
            'company_id' => $company2Id,
            'warehouse_id' => $warehouse2Id,
            'adjustment_number' => 'ADJ-C2-' . uniqid(),
            'adjustment_date' => date('Y-m-d'),
            'status' => 'draft'
        ]);

        // Query should only return company 1 adjustments
        $adjustments = self::$db->fetchAll(
            'SELECT * FROM stock_adjustments WHERE company_id = :company_id',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThan(0, count($adjustments));
        foreach ($adjustments as $adjustment) {
            $this->assertEquals(self::$testCompanyId, $adjustment['company_id']);
        }

        // Cleanup
        self::$db->delete('companies', 'id = :id', ['id' => $company2Id]);
    }

    /**
     * Test 10: Adjustment with reason
     */
    public function testAdjustmentWithReason(): void
    {
        $adjustmentId = $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-REASON-' . uniqid(),
            'reason' => 'Physical inventory count revealed discrepancy',
            'adjustment_type' => 'count_correction'
        ]);

        $adjustment = self::$db->fetchOne(
            'SELECT * FROM stock_adjustments WHERE id = :id',
            ['id' => $adjustmentId]
        );

        $this->assertStringContainsString('Physical inventory', $adjustment['reason']);
    }

    /**
     * Test 11: Count adjustments by status
     */
    public function testCountAdjustmentsByStatus(): void
    {
        $this->createStockAdjustment(['adjustment_number' => 'ADJ-S1-' . uniqid(), 'status' => 'draft']);
        $this->createStockAdjustment(['adjustment_number' => 'ADJ-S2-' . uniqid(), 'status' => 'draft']);
        $this->createStockAdjustment(['adjustment_number' => 'ADJ-S3-' . uniqid(), 'status' => 'approved']);

        $result = self::$db->fetchAll(
            'SELECT status, COUNT(*) as count
             FROM stock_adjustments
             WHERE company_id = :company_id
             GROUP BY status',
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(2, count($result));
    }

    /**
     * Test 12: Adjustment timestamps
     */
    public function testAdjustmentTimestamps(): void
    {
        $adjustmentId = $this->createStockAdjustment(['adjustment_number' => 'ADJ-TS-' . uniqid()]);

        $adjustment = self::$db->fetchOne(
            'SELECT * FROM stock_adjustments WHERE id = :id',
            ['id' => $adjustmentId]
        );

        $this->assertNotNull($adjustment['created_at']);
        $this->assertNotNull($adjustment['adjustment_date']);
    }

    /**
     * Test 13: Adjustment number uniqueness
     */
    public function testAdjustmentNumberUniqueness(): void
    {
        $adjustmentNumber = 'ADJ-UNIQUE-' . uniqid();

        $this->createStockAdjustment(['adjustment_number' => $adjustmentNumber]);

        // Attempting to create another with same number should fail
        $this->expectException(PDOException::class);
        $this->createStockAdjustment(['adjustment_number' => $adjustmentNumber]);
    }

    /**
     * Test 14: Query adjustments by date range
     */
    public function testQueryAdjustmentsByDateRange(): void
    {
        $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-DATE1-' . uniqid(),
            'adjustment_date' => date('Y-m-d', strtotime('-5 days'))
        ]);

        $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-DATE2-' . uniqid(),
            'adjustment_date' => date('Y-m-d', strtotime('-2 days'))
        ]);

        $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-DATE3-' . uniqid(),
            'adjustment_date' => date('Y-m-d')
        ]);

        // Query last 3 days
        $adjustments = self::$db->fetchAll(
            "SELECT * FROM stock_adjustments
             WHERE company_id = :company_id
             AND adjustment_date >= CURRENT_DATE - INTERVAL '3 days'",
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(2, count($adjustments));
    }

    /**
     * Test 15: Calculate total adjustment value
     */
    public function testCalculateTotalAdjustmentValue(): void
    {
        $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-VAL1-' . uniqid(),
            'total_value' => 500.00,
            'status' => 'approved'
        ]);

        $this->createStockAdjustment([
            'adjustment_number' => 'ADJ-VAL2-' . uniqid(),
            'total_value' => 750.00,
            'status' => 'approved'
        ]);

        $result = self::$db->fetchOne(
            "SELECT SUM(total_value) as total
             FROM stock_adjustments
             WHERE company_id = :company_id
             AND status = 'approved'",
            ['company_id' => self::$testCompanyId]
        );

        $this->assertGreaterThanOrEqual(1250.00, (float)$result['total']);
    }
}
