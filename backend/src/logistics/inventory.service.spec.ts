import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockPrismaService = {
    inventoryItem: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    service.resetState();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default warehouse', async () => {
      const warehouses = await service.getWarehouses();
      expect(warehouses.length).toBeGreaterThan(0);
      expect(warehouses[0].name).toBe('Depozit Principal București');
    });

    it('should have default zones', async () => {
      const zones = await service.getZones('wh-default');
      expect(zones.length).toBeGreaterThanOrEqual(6);
      expect(zones.map(z => z.type)).toContain('RECEIVING');
      expect(zones.map(z => z.type)).toContain('SHIPPING');
      expect(zones.map(z => z.type)).toContain('STORAGE');
    });

    it('should have default locations', async () => {
      const locations = await service.getLocations();
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should have sample inventory items', async () => {
      const items = await service.getItems();
      expect(items.length).toBeGreaterThan(0);
    });

    it('should have RFID readers configured', async () => {
      const readers = await service.getRFIDReaders();
      expect(readers.length).toBeGreaterThan(0);
      expect(readers.map(r => r.type)).toContain('PORTAL');
      expect(readers.map(r => r.type)).toContain('HANDHELD');
    });
  });

  describe('Inventory Items', () => {
    it('should create a new item', async () => {
      const dto = {
        sku: 'TEST-001',
        name: 'Test Product',
        category: 'MERCHANDISE' as const,
        unit: 'PIECE' as const,
        unitCost: 100,
        warehouseId: 'wh-default',
      };

      const item = await service.createItem(dto);

      expect(item.id).toBeDefined();
      expect(item.sku).toBe('TEST-001');
      expect(item.name).toBe('Test Product');
      expect(item.currentStock).toBe(0);
      expect(item.barcode).toBeDefined();
      expect(item.qrCode).toBeDefined();
    });

    it('should reject duplicate SKU', async () => {
      const dto = {
        sku: 'DUP-SKU-001',
        name: 'Product 1',
        category: 'MERCHANDISE' as const,
        unit: 'PIECE' as const,
        unitCost: 50,
        warehouseId: 'wh-default',
      };

      await service.createItem(dto);
      await expect(service.createItem({ ...dto, name: 'Product 2' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should get item by SKU', async () => {
      const item = await service.getItemBySku('ELEC-LAP-001');
      expect(item).toBeDefined();
      expect(item.name).toContain('Laptop');
    });

    it('should get item by barcode', async () => {
      const item = await service.getItemByBarcode('5901234123457');
      expect(item).toBeDefined();
      expect(item.sku).toBe('ELEC-LAP-001');
    });

    it('should filter items by category', async () => {
      const items = await service.getItems({ category: 'CONSUMABLES' });
      expect(items.every(i => i.category === 'CONSUMABLES')).toBe(true);
    });

    it('should filter low stock items', async () => {
      const items = await service.getItems({ lowStock: true });
      expect(items.every(i => i.currentStock <= i.reorderPoint)).toBe(true);
    });

    it('should search items by name', async () => {
      const items = await service.getItems({ search: 'laptop' });
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].name.toLowerCase()).toContain('laptop');
    });

    it('should update item', async () => {
      const item = await service.getItemById('item-laptop-1');
      const updated = await service.updateItem(item.id, { name: 'Updated Laptop Name' });
      expect(updated.name).toBe('Updated Laptop Name');
    });

    it('should deactivate item', async () => {
      const item = await service.getItemById('item-laptop-1');
      const deactivated = await service.deactivateItem(item.id);
      expect(deactivated.isActive).toBe(false);
    });
  });

  describe('Warehouses', () => {
    it('should create a new warehouse', async () => {
      const dto = {
        name: 'Test Warehouse',
        code: 'TEST-WH',
        address: {
          street: 'Test Street 1',
          city: 'București',
          county: 'București',
          postalCode: '010101',
          country: 'România',
        },
        type: 'DISTRIBUTION' as const,
        totalArea: 2000,
      };

      const warehouse = await service.createWarehouse(dto);

      expect(warehouse.id).toBeDefined();
      expect(warehouse.code).toBe('TEST-WH');
      expect(warehouse.usableArea).toBe(1700); // 85% of total
    });

    it('should reject duplicate warehouse code', async () => {
      const dto = {
        name: 'Another Warehouse',
        code: 'BUC-01', // existing code
        address: {
          street: 'Test',
          city: 'Test',
          county: 'Test',
          postalCode: '000000',
          country: 'România',
        },
        type: 'MAIN' as const,
        totalArea: 1000,
      };

      await expect(service.createWarehouse(dto)).rejects.toThrow(BadRequestException);
    });

    it('should filter warehouses by type', async () => {
      const warehouses = await service.getWarehouses({ type: 'MAIN' });
      expect(warehouses.every(w => w.type === 'MAIN')).toBe(true);
    });
  });

  describe('Zones', () => {
    it('should create a new zone', async () => {
      const dto = {
        warehouseId: 'wh-default',
        name: 'Test Zone',
        code: 'TZ-01',
        type: 'STORAGE' as const,
        area: 500,
      };

      const zone = await service.createZone(dto);

      expect(zone.id).toBeDefined();
      expect(zone.code).toBe('TZ-01');
      expect(zone.isActive).toBe(true);
    });

    it('should reject duplicate zone code in same warehouse', async () => {
      const dto = {
        warehouseId: 'wh-default',
        name: 'Duplicate Zone',
        code: 'REC', // existing code
        type: 'RECEIVING' as const,
      };

      await expect(service.createZone(dto)).rejects.toThrow(BadRequestException);
    });

    it('should create zone with temperature range', async () => {
      const dto = {
        warehouseId: 'wh-default',
        name: 'Freezer Zone',
        code: 'FRZ-01',
        type: 'COLD' as const,
        temperatureRange: { min: -20, max: -18, unit: 'C' as const },
      };

      const zone = await service.createZone(dto);
      expect(zone.temperatureRange).toBeDefined();
      expect(zone.temperatureRange!.min).toBe(-20);
    });
  });

  describe('Locations', () => {
    it('should create a new location', async () => {
      const dto = {
        zoneId: 'zone-storage-a',
        code: 'A-02-01-01',
        type: 'RACK' as const,
        capacity: { maxWeight: 500, maxVolume: 2 },
      };

      const location = await service.createLocation(dto);

      expect(location.id).toBeDefined();
      expect(location.code).toBe('A-02-01-01');
      expect(location.currentUtilization).toBe(0);
    });

    it('should block and unblock location', async () => {
      const locations = await service.getLocations('zone-storage-a');
      const location = locations[0];

      const blocked = await service.blockLocation(location.id, 'Maintenance');
      expect(blocked.isBlocked).toBe(true);
      expect(blocked.blockReason).toBe('Maintenance');

      const unblocked = await service.unblockLocation(location.id);
      expect(unblocked.isBlocked).toBe(false);
      expect(unblocked.blockReason).toBeUndefined();
    });
  });

  describe('Batch Tracking', () => {
    it('should create a batch', async () => {
      // Use future expiry date
      const futureExpiry = new Date();
      futureExpiry.setFullYear(futureExpiry.getFullYear() + 1);

      const dto = {
        itemId: 'item-milk-1',
        batchNumber: 'BATCH-TEST-001',
        lotNumber: 'LOT-TEST-001',
        quantity: 100,
        unitCost: 8.5,
        expiryDate: futureExpiry,
      };

      const batch = await service.createBatch(dto);

      expect(batch.id).toBeDefined();
      expect(batch.batchNumber).toBe('BATCH-TEST-001');
      expect(batch.availableQuantity).toBe(100);
      expect(batch.qualityStatus).toBe('PENDING');
    });

    it('should update item stock when batch created', async () => {
      const itemBefore = await service.getItemById('item-milk-1');
      const stockBefore = itemBefore.currentStock;

      await service.createBatch({
        itemId: 'item-milk-1',
        batchNumber: 'BATCH-STOCK-TEST',
        quantity: 50,
        unitCost: 8,
      });

      const itemAfter = await service.getItemById('item-milk-1');
      expect(itemAfter.currentStock).toBe(stockBefore + 50);
    });

    it('should get batches for item', async () => {
      const batches = await service.getBatches('item-milk-1');
      expect(batches.length).toBeGreaterThan(0);
      expect(batches[0].itemId).toBe('item-milk-1');
    });

    it('should get batches sorted by FIFO', async () => {
      const batches = await service.getBatches('item-milk-1');
      for (let i = 1; i < batches.length; i++) {
        expect(new Date(batches[i - 1].receivedDate).getTime())
          .toBeLessThanOrEqual(new Date(batches[i].receivedDate).getTime());
      }
    });

    it('should update batch quality status', async () => {
      const batches = await service.getBatches('item-milk-1');
      const batch = batches[0];

      const updated = await service.updateBatchQualityStatus(
        batch.id,
        'APPROVED',
        'Quality check passed'
      );

      expect(updated.qualityStatus).toBe('APPROVED');
      expect(updated.qualityNotes).toBe('Quality check passed');
    });

    it('should get expiring batches', async () => {
      const expiring = await service.getExpiringBatches(90);
      expect(Array.isArray(expiring)).toBe(true);
    });
  });

  describe('Serial Numbers', () => {
    it('should register serial number', async () => {
      const serial = await service.registerSerialNumber(
        'item-laptop-1',
        'SN-TEST-001'
      );

      expect(serial.id).toBeDefined();
      expect(serial.serialNumber).toBe('SN-TEST-001');
      expect(serial.status).toBe('IN_STOCK');
    });

    it('should reject duplicate serial number for same item', async () => {
      await service.registerSerialNumber('item-laptop-1', 'SN-DUP-001');
      await expect(service.registerSerialNumber('item-laptop-1', 'SN-DUP-001'))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject serial number for non-serial-tracked item', async () => {
      await expect(service.registerSerialNumber('item-paper-1', 'SN-PAPER-001'))
        .rejects.toThrow(BadRequestException);
    });

    it('should update serial number status', async () => {
      await service.registerSerialNumber('item-laptop-1', 'SN-SOLD-001');

      const updated = await service.updateSerialNumberStatus(
        'SN-SOLD-001',
        'SOLD',
        'customer-123'
      );

      expect(updated.status).toBe('SOLD');
      expect(updated.customerId).toBe('customer-123');
      expect(updated.soldDate).toBeDefined();
    });
  });

  describe('RFID Operations', () => {
    it('should register RFID tag', async () => {
      const tag = await service.registerRFIDTag(
        'E280-TEST-0001',
        'ITEM',
        'item-laptop-1'
      );

      expect(tag.id).toBeDefined();
      expect(tag.tagId).toBe('E280-TEST-0001');
      expect(tag.type).toBe('ITEM');
      expect(tag.status).toBe('ACTIVE');
    });

    it('should reject duplicate RFID tag', async () => {
      await service.registerRFIDTag('E280-DUP-0001', 'ITEM', 'item-laptop-1');
      await expect(service.registerRFIDTag('E280-DUP-0001', 'BATCH', 'batch-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should process RFID read event', async () => {
      await service.registerRFIDTag('E280-READ-0001', 'ITEM', 'item-laptop-1');

      const event = await service.processRFIDRead(
        'reader-portal-1',
        'E280-READ-0001',
        1,
        -45
      );

      expect(event.id).toBeDefined();
      expect(event.processingResult).toBe('LOCATION_UPDATED');
    });

    it('should handle unknown RFID tag', async () => {
      const event = await service.processRFIDRead(
        'reader-portal-1',
        'UNKNOWN-TAG-ID',
        1,
        -60
      );

      expect(event.processingResult).toBe('UNKNOWN_TAG');
    });

    it('should update tag read count', async () => {
      const tagId = 'E280-COUNT-0001';
      await service.registerRFIDTag(tagId, 'ITEM', 'item-laptop-1');

      await service.processRFIDRead('reader-portal-1', tagId, 1, -50);
      await service.processRFIDRead('reader-portal-1', tagId, 2, -48);

      const tag = await service.getRFIDTagByTagId(tagId);
      expect(tag.readCount).toBe(2);
    });

    it('should get RFID readers by warehouse', async () => {
      const readers = await service.getRFIDReaders('wh-default');
      expect(readers.length).toBeGreaterThan(0);
      expect(readers.every(r => r.warehouseId === 'wh-default')).toBe(true);
    });

    it('should update reader status', async () => {
      const updated = await service.updateReaderStatus('reader-portal-1', 'MAINTENANCE');
      expect(updated.status).toBe('MAINTENANCE');
    });
  });

  describe('QR Code Operations', () => {
    it('should generate QR code', () => {
      const code = service.generateQRCode('ITEM', 'item-laptop-1');
      expect(code).toContain('QR-ITEM-');
    });

    it('should get QR code data', async () => {
      const code = service.generateQRCode('ITEM', 'item-laptop-1');
      const data = await service.getQRCodeData(code);

      expect(data.type).toBe('ITEM');
      expect(data.referenceId).toBe('item-laptop-1');
    });

    it('should process QR scan', async () => {
      const code = service.generateQRCode('ITEM', 'item-laptop-1');
      const result = await service.processQRScan(code);

      expect(result.type).toBe('ITEM');
      expect(result.data).toBeDefined();
      expect(result.data.sku).toBe('ELEC-LAP-001');
    });

    it('should increment scan count', async () => {
      const code = service.generateQRCode('ITEM', 'item-laptop-1');

      await service.processQRScan(code);
      await service.processQRScan(code);

      const data = await service.getQRCodeData(code);
      expect(data.scanCount).toBe(2);
    });
  });

  describe('Stock Movements', () => {
    it('should receive stock', async () => {
      const itemBefore = await service.getItemById('item-paper-1');
      const stockBefore = itemBefore.currentStock;

      const movement = await service.receiveStock({
        itemId: 'item-paper-1',
        quantity: 50,
        unitCost: 25,
        batchNumber: 'PAP-RCV-001',
      });

      expect(movement.type).toBe('RECEIPT');
      expect(movement.quantity).toBe(50);
      expect(movement.status).toBe('COMPLETED');

      const itemAfter = await service.getItemById('item-paper-1');
      expect(itemAfter.currentStock).toBe(stockBefore + 50);
    });

    it('should issue stock', async () => {
      const itemBefore = await service.getItemById('item-paper-1');
      const stockBefore = itemBefore.currentStock;

      const movement = await service.issueStock({
        itemId: 'item-paper-1',
        quantity: 10,
        reason: 'Sales order',
      });

      expect(movement.type).toBe('ISSUE');
      expect(movement.quantity).toBe(10);

      const itemAfter = await service.getItemById('item-paper-1');
      expect(itemAfter.currentStock).toBe(stockBefore - 10);
    });

    it('should reject issue for insufficient stock', async () => {
      await expect(service.issueStock({
        itemId: 'item-paper-1',
        quantity: 99999,
      })).rejects.toThrow(BadRequestException);
    });

    it('should transfer stock between locations', async () => {
      const movement = await service.transferStock(
        'item-laptop-1',
        5,
        'loc-a-01-01',
        'loc-a-01-02',
        undefined,
        'Warehouse reorganization'
      );

      expect(movement.type).toBe('TRANSFER');
      expect(movement.fromLocationId).toBe('loc-a-01-01');
      expect(movement.toLocationId).toBe('loc-a-01-02');
    });

    it('should reject transfer to blocked location', async () => {
      await service.blockLocation('loc-a-01-02', 'Maintenance');

      await expect(service.transferStock(
        'item-laptop-1',
        5,
        'loc-a-01-01',
        'loc-a-01-02'
      )).rejects.toThrow(BadRequestException);

      await service.unblockLocation('loc-a-01-02');
    });

    it('should adjust stock positively', async () => {
      const itemBefore = await service.getItemById('item-laptop-1');
      const stockBefore = itemBefore.currentStock;

      const movement = await service.adjustStock(
        'item-laptop-1',
        5,
        'Found during inventory count'
      );

      expect(movement.type).toBe('ADJUSTMENT');

      const itemAfter = await service.getItemById('item-laptop-1');
      expect(itemAfter.currentStock).toBe(stockBefore + 5);
    });

    it('should adjust stock negatively', async () => {
      const itemBefore = await service.getItemById('item-laptop-1');
      const stockBefore = itemBefore.currentStock;

      await service.adjustStock(
        'item-laptop-1',
        -3,
        'Damaged items'
      );

      const itemAfter = await service.getItemById('item-laptop-1');
      expect(itemAfter.currentStock).toBe(stockBefore - 3);
    });

    it('should get movements filtered by type', async () => {
      // Create some movements first
      await service.receiveStock({
        itemId: 'item-paper-1',
        quantity: 10,
        unitCost: 25,
      });

      const movements = await service.getMovements({ type: 'RECEIPT' });
      expect(movements.every(m => m.type === 'RECEIPT')).toBe(true);
    });
  });

  describe('Stock Alerts', () => {
    it('should get alerts', async () => {
      const alerts = await service.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should acknowledge alert', async () => {
      // Create a low stock situation
      const item = await service.createItem({
        sku: 'ALERT-TEST-001',
        name: 'Alert Test Item',
        category: 'MERCHANDISE',
        unit: 'PIECE',
        unitCost: 10,
        warehouseId: 'wh-default',
        minStockLevel: 100,
        reorderPoint: 50,
      });

      // Receive some stock then issue to trigger alert
      await service.receiveStock({
        itemId: item.id,
        quantity: 30,
        unitCost: 10,
      });

      const alerts = await service.getAlerts({ itemId: item.id });
      if (alerts.length > 0) {
        const acknowledged = await service.acknowledgeAlert(alerts[0].id, 'user-123');
        expect(acknowledged.acknowledgedAt).toBeDefined();
        expect(acknowledged.acknowledgedBy).toBe('user-123');
      }
    });

    it('should filter unresolved alerts', async () => {
      const unresolvedAlerts = await service.getAlerts({ resolved: false });
      expect(unresolvedAlerts.every(a => a.resolvedAt === undefined)).toBe(true);
    });
  });

  describe('Reorder Rules', () => {
    it('should create reorder rule', async () => {
      const item = await service.createItem({
        sku: 'REORDER-TEST-001',
        name: 'Reorder Test Item',
        category: 'MERCHANDISE',
        unit: 'PIECE',
        unitCost: 50,
        warehouseId: 'wh-default',
      });

      const rule = await service.createReorderRule({
        itemId: item.id,
        isEnabled: true,
        reorderPoint: 20,
        reorderQuantity: 50,
        leadTimeDays: 5,
        safetyStockDays: 3,
        reviewFrequency: 'WEEKLY',
      });

      expect(rule.id).toBeDefined();
      expect(rule.reorderPoint).toBe(20);
      expect(rule.reviewFrequency).toBe('WEEKLY');
    });

    it('should update reorder rule', async () => {
      const rules = await service.getReorderRules('item-laptop-1');
      if (rules.length > 0) {
        const updated = await service.updateReorderRule(rules[0].id, {
          reorderQuantity: 40,
        });
        expect(updated.reorderQuantity).toBe(40);
      }
    });

    it('should get reorder suggestions', async () => {
      const suggestions = await service.getReorderSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);

      if (suggestions.length > 0) {
        expect(suggestions[0].itemId).toBeDefined();
        expect(suggestions[0].suggestedQuantity).toBeGreaterThan(0);
      }
    });
  });

  describe('Inventory Valuation', () => {
    it('should calculate FIFO valuation', async () => {
      const valuation = await service.calculateValuation('item-milk-1', 'FIFO');

      expect(valuation.valuationMethod).toBe('FIFO');
      expect(valuation.totalQuantity).toBeGreaterThanOrEqual(0);
      expect(valuation.totalValue).toBeGreaterThanOrEqual(0);
    });

    it('should calculate LIFO valuation', async () => {
      const valuation = await service.calculateValuation('item-milk-1', 'LIFO');
      expect(valuation.valuationMethod).toBe('LIFO');
    });

    it('should calculate weighted average valuation', async () => {
      const valuation = await service.calculateValuation('item-milk-1', 'WEIGHTED_AVERAGE');
      expect(valuation.valuationMethod).toBe('WEIGHTED_AVERAGE');
      expect(valuation.averageCost).toBeGreaterThan(0);
    });

    it('should get total inventory value', async () => {
      const totalValue = await service.getTotalInventoryValue('WEIGHTED_AVERAGE');

      expect(totalValue.totalItems).toBeGreaterThan(0);
      expect(totalValue.totalValue).toBeGreaterThan(0);
      expect(totalValue.byCategory).toBeDefined();
      expect(Array.isArray(totalValue.byCategory)).toBe(true);
    });
  });

  describe('Cycle Count', () => {
    it('should create cycle count', async () => {
      const cycleCount = await service.createCycleCount({
        warehouseId: 'wh-default',
        type: 'RANDOM',
        scheduledDate: new Date(),
        assignedTo: ['user-1', 'user-2'],
      });

      expect(cycleCount.id).toBeDefined();
      expect(cycleCount.status).toBe('SCHEDULED');
      expect(cycleCount.items.length).toBeGreaterThan(0);
    });

    it('should create ABC cycle count', async () => {
      const cycleCount = await service.createCycleCount({
        warehouseId: 'wh-default',
        type: 'ABC',
        scheduledDate: new Date(),
        assignedTo: ['user-1'],
      });

      // ABC should include high-value items
      expect(cycleCount.items.length).toBeGreaterThan(0);
    });

    it('should start cycle count', async () => {
      const cycleCount = await service.createCycleCount({
        warehouseId: 'wh-default',
        type: 'RANDOM',
        scheduledDate: new Date(),
        assignedTo: ['user-1'],
      });

      const started = await service.startCycleCount(cycleCount.id);
      expect(started.status).toBe('IN_PROGRESS');
      expect(started.startedAt).toBeDefined();
    });

    it('should record count', async () => {
      const cycleCount = await service.createCycleCount({
        warehouseId: 'wh-default',
        type: 'RANDOM',
        scheduledDate: new Date(),
        assignedTo: ['user-1'],
      });

      await service.startCycleCount(cycleCount.id);

      if (cycleCount.items.length > 0) {
        const countItem = await service.recordCount(
          cycleCount.id,
          cycleCount.items[0].itemId,
          cycleCount.items[0].systemQuantity + 2, // intentional variance
          'user-1',
          'Found extra units'
        );

        expect(countItem.countedQuantity).toBe(cycleCount.items[0].systemQuantity + 2);
        expect(countItem.variance).toBe(2);
        expect(countItem.status).toBe('COUNTED');
      }
    });

    it('should complete cycle count with adjustments', async () => {
      const cycleCount = await service.createCycleCount({
        warehouseId: 'wh-default',
        type: 'RANDOM',
        scheduledDate: new Date(),
        assignedTo: ['user-1'],
      });

      await service.startCycleCount(cycleCount.id);

      // Record counts for all items
      for (const item of cycleCount.items) {
        await service.recordCount(
          cycleCount.id,
          item.itemId,
          item.systemQuantity,
          'user-1'
        );
      }

      const completed = await service.completeCycleCount(cycleCount.id, false);
      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });

    it('should calculate cycle count accuracy', async () => {
      const cycleCount = await service.createCycleCount({
        warehouseId: 'wh-default',
        type: 'RANDOM',
        scheduledDate: new Date(),
        assignedTo: ['user-1'],
      });

      await service.startCycleCount(cycleCount.id);

      // Record accurate counts
      for (const item of cycleCount.items) {
        await service.recordCount(
          cycleCount.id,
          item.itemId,
          item.systemQuantity, // exact match
          'user-1'
        );
      }

      const counts = await service.getCycleCounts();
      const count = counts.find(c => c.id === cycleCount.id);
      expect(count?.accuracy).toBe(100);
    });
  });

  describe('Reports', () => {
    it('should get inventory summary', async () => {
      const summary = await service.getInventorySummary();

      expect(summary.totalItems).toBeGreaterThan(0);
      expect(summary.totalSKUs).toBeGreaterThan(0);
      expect(summary.totalValue).toBeGreaterThan(0);
      expect(summary.byCategory).toBeDefined();
      expect(Array.isArray(summary.byCategory)).toBe(true);
    });

    it('should get inventory summary by warehouse', async () => {
      const summary = await service.getInventorySummary('wh-default');
      expect(summary).toBeDefined();
    });

    it('should get stock movement report', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date();

      const report = await service.getStockMovementReport(fromDate, toDate);

      expect(report.period.from).toEqual(fromDate);
      expect(report.period.to).toEqual(toDate);
      expect(report.totalReceipts).toBeDefined();
      expect(report.totalIssues).toBeDefined();
    });

    it('should get slow moving items', async () => {
      const slowMoving = await service.getSlowMovingItems(90);
      expect(Array.isArray(slowMoving)).toBe(true);
    });

    it('should get dead stock', async () => {
      const deadStock = await service.getDeadStock(365);

      expect(deadStock.items).toBeDefined();
      expect(Array.isArray(deadStock.items)).toBe(true);
      expect(deadStock.totalQuantity).toBeGreaterThanOrEqual(0);
      expect(deadStock.totalValue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Barcode Generation', () => {
    it('should generate valid EAN-13', () => {
      const barcode = service.generateBarcode('EAN13');
      expect(barcode.length).toBe(13);
      expect(barcode).toMatch(/^\d{13}$/);
    });

    it('should generate valid EAN-8', () => {
      const barcode = service.generateBarcode('EAN8');
      expect(barcode.length).toBe(8);
      expect(barcode).toMatch(/^\d{8}$/);
    });

    it('should generate valid UPC', () => {
      const barcode = service.generateBarcode('UPC');
      expect(barcode.length).toBe(12);
      expect(barcode).toMatch(/^\d{12}$/);
    });

    it('should generate Code128', () => {
      const barcode = service.generateBarcode('CODE128');
      expect(barcode).toContain('CODE128-');
    });
  });

  describe('Error Handling', () => {
    it('should throw NotFoundException for non-existent item', async () => {
      await expect(service.getItemById('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent warehouse', async () => {
      await expect(service.getWarehouseById('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent zone', async () => {
      await expect(service.getZoneById('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent location', async () => {
      await expect(service.getLocationById('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent batch', async () => {
      await expect(service.getBatchById('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent RFID tag', async () => {
      await expect(service.getRFIDTagByTagId('non-existent-tag'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent QR code', async () => {
      await expect(service.getQRCodeData('non-existent-qr'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent alert', async () => {
      await expect(service.acknowledgeAlert('non-existent-alert', 'user-1'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
