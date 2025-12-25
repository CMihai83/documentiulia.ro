import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WarehouseManagementService,
  WarehouseType,
  WarehouseStatus,
  ZoneType,
  LocationType,
  StorageClass,
} from './warehouse-management.service';

describe('WarehouseManagementService', () => {
  let service: WarehouseManagementService;
  let eventEmitter: EventEmitter2;

  const mockTenantId = 'tenant_123';

  const createBasicWarehouseDto = () => ({
    code: 'WH001',
    name: 'Main Distribution Center',
    type: WarehouseType.DISTRIBUTION_CENTER,
    address: {
      street: '123 Warehouse Street',
      city: 'Bucharest',
      postalCode: '010101',
      country: 'Romania',
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseManagementService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WarehouseManagementService>(WarehouseManagementService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Warehouse Management', () => {
    it('should create a new warehouse', async () => {
      const dto = createBasicWarehouseDto();

      const result = await service.createWarehouse(mockTenantId, dto);

      expect(result.id).toBeDefined();
      expect(result.code).toBe('WH001');
      expect(result.name).toBe('Main Distribution Center');
      expect(result.type).toBe(WarehouseType.DISTRIBUTION_CENTER);
      expect(result.status).toBe(WarehouseStatus.ACTIVE);
      expect(result.settings.defaultPickingStrategy).toBe('fifo');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'warehouse.created',
        expect.any(Object),
      );
    });

    it('should not create duplicate warehouse code', async () => {
      await service.createWarehouse(mockTenantId, createBasicWarehouseDto());

      await expect(
        service.createWarehouse(mockTenantId, createBasicWarehouseDto()),
      ).rejects.toThrow('already exists');
    });

    it('should list warehouses', async () => {
      await service.createWarehouse(mockTenantId, createBasicWarehouseDto());
      await service.createWarehouse(mockTenantId, {
        ...createBasicWarehouseDto(),
        code: 'WH002',
        name: 'Secondary Warehouse',
        type: WarehouseType.FULFILLMENT_CENTER,
      });

      const warehouses = await service.listWarehouses(mockTenantId);
      expect(warehouses.length).toBe(2);

      const filtered = await service.listWarehouses(mockTenantId, {
        type: WarehouseType.FULFILLMENT_CENTER,
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Secondary Warehouse');
    });

    it('should update warehouse', async () => {
      const warehouse = await service.createWarehouse(
        mockTenantId,
        createBasicWarehouseDto(),
      );

      const result = await service.updateWarehouse(mockTenantId, warehouse.id, {
        name: 'Updated Warehouse Name',
        settings: { allowNegativeStock: true },
      });

      expect(result.name).toBe('Updated Warehouse Name');
      expect(result.settings.allowNegativeStock).toBe(true);
    });

    it('should deactivate warehouse without inventory', async () => {
      const warehouse = await service.createWarehouse(
        mockTenantId,
        createBasicWarehouseDto(),
      );

      const result = await service.deactivateWarehouse(
        mockTenantId,
        warehouse.id,
        'Moving to new location',
      );

      expect(result.status).toBe(WarehouseStatus.INACTIVE);
      expect(result.metadata?.deactivationReason).toBe('Moving to new location');
    });
  });

  describe('Zone Management', () => {
    let warehouse: any;

    beforeEach(async () => {
      warehouse = await service.createWarehouse(
        mockTenantId,
        createBasicWarehouseDto(),
      );
    });

    it('should create a zone', async () => {
      const result = await service.createZone(mockTenantId, warehouse.id, {
        code: 'RECV-01',
        name: 'Receiving Area 1',
        type: ZoneType.RECEIVING,
        storageClass: StorageClass.GENERAL,
      });

      expect(result.id).toBeDefined();
      expect(result.code).toBe('RECV-01');
      expect(result.type).toBe(ZoneType.RECEIVING);
      expect(result.isActive).toBe(true);
    });

    it('should create cold storage zone with temperature', async () => {
      const result = await service.createZone(mockTenantId, warehouse.id, {
        code: 'COLD-01',
        name: 'Cold Storage',
        type: ZoneType.COLD,
        storageClass: StorageClass.TEMPERATURE_CONTROLLED,
        temperatureRange: { min: 2, max: 8 },
        humidityRange: { min: 40, max: 60 },
      });

      expect(result.temperatureRange).toEqual({ min: 2, max: 8 });
      expect(result.humidityRange).toEqual({ min: 40, max: 60 });
      expect(result.storageClass).toBe(StorageClass.TEMPERATURE_CONTROLLED);
    });

    it('should list zones', async () => {
      await service.createZone(mockTenantId, warehouse.id, {
        code: 'RECV-01',
        name: 'Receiving',
        type: ZoneType.RECEIVING,
      });

      await service.createZone(mockTenantId, warehouse.id, {
        code: 'STOR-01',
        name: 'Storage',
        type: ZoneType.STORAGE,
      });

      const zones = await service.listZones(mockTenantId, warehouse.id);
      expect(zones.length).toBe(2);
    });

    it('should update zone', async () => {
      const zone = await service.createZone(mockTenantId, warehouse.id, {
        code: 'ZONE-01',
        name: 'Original Name',
        type: ZoneType.STORAGE,
      });

      const result = await service.updateZone(mockTenantId, zone.id, {
        name: 'Updated Zone Name',
        priority: 5,
      });

      expect(result.name).toBe('Updated Zone Name');
      expect(result.priority).toBe(5);
    });

    it('should deactivate zone without inventory', async () => {
      const zone = await service.createZone(mockTenantId, warehouse.id, {
        code: 'ZONE-01',
        name: 'Test Zone',
        type: ZoneType.STORAGE,
      });

      const result = await service.deactivateZone(mockTenantId, zone.id);

      expect(result.isActive).toBe(false);
    });
  });

  describe('Location Management', () => {
    let warehouse: any;
    let zone: any;

    beforeEach(async () => {
      warehouse = await service.createWarehouse(
        mockTenantId,
        createBasicWarehouseDto(),
      );

      zone = await service.createZone(mockTenantId, warehouse.id, {
        code: 'STOR-01',
        name: 'Storage Zone',
        type: ZoneType.STORAGE,
      });
    });

    it('should create a location', async () => {
      const result = await service.createLocation(mockTenantId, zone.id, {
        code: 'A01-01-01',
        type: LocationType.RACK,
        aisle: 'A01',
        rack: '01',
        level: '01',
      });

      expect(result.id).toBeDefined();
      expect(result.code).toBe('A01-01-01');
      expect(result.barcode).toBeDefined();
      expect(result.type).toBe(LocationType.RACK);
      expect(result.isActive).toBe(true);
      expect(result.isBlocked).toBe(false);
    });

    it('should bulk create locations', async () => {
      const result = await service.bulkCreateLocations(mockTenantId, zone.id, {
        aisles: ['A', 'B'],
        racks: ['01', '02'],
        levels: ['1', '2'],
        positions: ['A', 'B'],
        type: LocationType.BIN,
      });

      // 2 aisles * 2 racks * 2 levels * 2 positions = 16 locations
      expect(result.length).toBe(16);
    });

    it('should find location by barcode', async () => {
      const location = await service.createLocation(mockTenantId, zone.id, {
        code: 'A01-01-01',
        type: LocationType.RACK,
        aisle: 'A01',
      });

      const found = await service.getLocationByBarcode(
        mockTenantId,
        location.barcode,
      );

      expect(found.id).toBe(location.id);
    });

    it('should block and unblock location', async () => {
      const location = await service.createLocation(mockTenantId, zone.id, {
        code: 'A01-01-01',
        type: LocationType.RACK,
        aisle: 'A01',
      });

      const blocked = await service.blockLocation(
        mockTenantId,
        location.id,
        'Maintenance required',
      );

      expect(blocked.isBlocked).toBe(true);
      expect(blocked.blockReason).toBe('Maintenance required');

      const unblocked = await service.unblockLocation(mockTenantId, location.id);

      expect(unblocked.isBlocked).toBe(false);
      expect(unblocked.blockReason).toBeUndefined();
    });

    it('should list locations with filters', async () => {
      await service.createLocation(mockTenantId, zone.id, {
        code: 'A01',
        type: LocationType.RACK,
        aisle: 'A',
        storageClass: StorageClass.GENERAL,
      });

      await service.createLocation(mockTenantId, zone.id, {
        code: 'B01',
        type: LocationType.BIN,
        aisle: 'B',
        storageClass: StorageClass.FRAGILE,
      });

      const allLocations = await service.listLocations(
        mockTenantId,
        warehouse.id,
      );
      expect(allLocations.length).toBe(2);

      const rackOnly = await service.listLocations(mockTenantId, warehouse.id, {
        type: LocationType.RACK,
      });
      expect(rackOnly.length).toBe(1);
    });
  });

  describe('Inventory at Location', () => {
    let warehouse: any;
    let zone: any;
    let location: any;

    beforeEach(async () => {
      warehouse = await service.createWarehouse(
        mockTenantId,
        createBasicWarehouseDto(),
      );

      zone = await service.createZone(mockTenantId, warehouse.id, {
        code: 'STOR-01',
        name: 'Storage Zone',
        type: ZoneType.STORAGE,
      });

      location = await service.createLocation(mockTenantId, zone.id, {
        code: 'A01-01-01',
        type: LocationType.RACK,
        aisle: 'A01',
      });
    });

    it('should add inventory to location', async () => {
      const result = await service.addInventoryToLocation(
        mockTenantId,
        location.id,
        {
          itemId: 'item_123',
          itemCode: 'SKU-001',
          itemName: 'Test Product',
          quantity: 100,
          reservedQuantity: 0,
          unitOfMeasure: 'pcs',
          lotNumber: 'LOT-2024-001',
          status: 'available',
          receivedDate: new Date(),
        },
      );

      expect(result.inventoryItems.length).toBe(1);
      expect(result.inventoryItems[0].quantity).toBe(100);
      expect(result.inventoryItems[0].availableQuantity).toBe(100);
    });

    it('should not add inventory to blocked location', async () => {
      await service.blockLocation(mockTenantId, location.id, 'Maintenance');

      await expect(
        service.addInventoryToLocation(mockTenantId, location.id, {
          itemId: 'item_123',
          itemCode: 'SKU-001',
          itemName: 'Test Product',
          quantity: 100,
          reservedQuantity: 0,
          unitOfMeasure: 'pcs',
          status: 'available',
          receivedDate: new Date(),
        }),
      ).rejects.toThrow('blocked location');
    });

    it('should remove inventory from location', async () => {
      await service.addInventoryToLocation(mockTenantId, location.id, {
        itemId: 'item_123',
        itemCode: 'SKU-001',
        itemName: 'Test Product',
        quantity: 100,
        reservedQuantity: 0,
        unitOfMeasure: 'pcs',
        status: 'available',
        receivedDate: new Date(),
      });

      const locationWithInv = await service.getLocation(mockTenantId, location.id);
      const inventoryItemId = locationWithInv.inventoryItems[0].id;

      const result = await service.removeInventoryFromLocation(
        mockTenantId,
        location.id,
        inventoryItemId,
        30,
      );

      expect(result.inventoryItems[0].quantity).toBe(70);
      expect(result.inventoryItems[0].availableQuantity).toBe(70);
    });

    it('should remove entire inventory item when quantity reaches zero', async () => {
      await service.addInventoryToLocation(mockTenantId, location.id, {
        itemId: 'item_123',
        itemCode: 'SKU-001',
        itemName: 'Test Product',
        quantity: 50,
        reservedQuantity: 0,
        unitOfMeasure: 'pcs',
        status: 'available',
        receivedDate: new Date(),
      });

      const locationWithInv = await service.getLocation(mockTenantId, location.id);
      const inventoryItemId = locationWithInv.inventoryItems[0].id;

      const result = await service.removeInventoryFromLocation(
        mockTenantId,
        location.id,
        inventoryItemId,
        50,
      );

      expect(result.inventoryItems.length).toBe(0);
    });

    it('should not remove more than available quantity', async () => {
      await service.addInventoryToLocation(mockTenantId, location.id, {
        itemId: 'item_123',
        itemCode: 'SKU-001',
        itemName: 'Test Product',
        quantity: 50,
        reservedQuantity: 20, // 30 available
        unitOfMeasure: 'pcs',
        status: 'available',
        receivedDate: new Date(),
      });

      const locationWithInv = await service.getLocation(mockTenantId, location.id);
      const inventoryItemId = locationWithInv.inventoryItems[0].id;

      await expect(
        service.removeInventoryFromLocation(
          mockTenantId,
          location.id,
          inventoryItemId,
          40, // More than available 30
        ),
      ).rejects.toThrow('Insufficient available quantity');
    });
  });

  describe('Warehouse Utilization', () => {
    it('should get warehouse utilization', async () => {
      const warehouse = await service.createWarehouse(
        mockTenantId,
        createBasicWarehouseDto(),
      );

      const zone = await service.createZone(mockTenantId, warehouse.id, {
        code: 'STOR-01',
        name: 'Storage Zone',
        type: ZoneType.STORAGE,
      });

      const location = await service.createLocation(mockTenantId, zone.id, {
        code: 'A01-01-01',
        type: LocationType.RACK,
        aisle: 'A01',
      });

      await service.addInventoryToLocation(mockTenantId, location.id, {
        itemId: 'item_123',
        itemCode: 'SKU-001',
        itemName: 'Test Product',
        quantity: 100,
        reservedQuantity: 0,
        unitOfMeasure: 'pcs',
        status: 'available',
        unitCost: 50,
        totalValue: 5000,
        receivedDate: new Date(),
      });

      const utilization = await service.getWarehouseUtilization(
        mockTenantId,
        warehouse.id,
      );

      expect(utilization.zoneUtilization.length).toBe(1);
      expect(utilization.locationTypes.length).toBe(1);
      expect(utilization.inventorySummary.totalItems).toBe(1);
      expect(utilization.inventorySummary.totalQuantity).toBe(100);
      expect(utilization.inventorySummary.totalValue).toBe(5000);
    });
  });

  describe('Putaway Location Finder', () => {
    it('should find available putaway locations', async () => {
      const warehouse = await service.createWarehouse(
        mockTenantId,
        createBasicWarehouseDto(),
      );

      const zone = await service.createZone(mockTenantId, warehouse.id, {
        code: 'STOR-01',
        name: 'Storage Zone',
        type: ZoneType.STORAGE,
        storageClass: StorageClass.GENERAL,
      });

      await service.createLocation(mockTenantId, zone.id, {
        code: 'A01',
        type: LocationType.RACK,
        aisle: 'A',
        putawaySequence: 1,
      });

      await service.createLocation(mockTenantId, zone.id, {
        code: 'A02',
        type: LocationType.RACK,
        aisle: 'A',
        putawaySequence: 2,
      });

      const locations = await service.findPutawayLocation(
        mockTenantId,
        warehouse.id,
        'item_123',
        StorageClass.GENERAL,
        100,
      );

      expect(locations.length).toBe(2);
      expect(locations[0].putawaySequence).toBe(1); // Sorted by sequence
    });

    it('should exclude blocked locations from putaway', async () => {
      const warehouse = await service.createWarehouse(
        mockTenantId,
        createBasicWarehouseDto(),
      );

      const zone = await service.createZone(mockTenantId, warehouse.id, {
        code: 'STOR-01',
        name: 'Storage Zone',
        type: ZoneType.STORAGE,
        storageClass: StorageClass.GENERAL,
      });

      const loc1 = await service.createLocation(mockTenantId, zone.id, {
        code: 'A01',
        type: LocationType.RACK,
        aisle: 'A',
      });

      await service.createLocation(mockTenantId, zone.id, {
        code: 'A02',
        type: LocationType.RACK,
        aisle: 'A',
      });

      await service.blockLocation(mockTenantId, loc1.id, 'Maintenance');

      const locations = await service.findPutawayLocation(
        mockTenantId,
        warehouse.id,
        'item_123',
        StorageClass.GENERAL,
        100,
      );

      expect(locations.length).toBe(1);
      expect(locations[0].code).toBe('A02');
    });
  });
});
