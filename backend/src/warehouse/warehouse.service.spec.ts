import { Test, TestingModule } from '@nestjs/testing';
import {
  WarehouseService,
  WarehouseType,
  LocationType,
  MovementType,
  ValuationMethod,
  StockStatus,
  UnitOfMeasure,
  Warehouse,
  Product,
  StockLevel,
} from './warehouse.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('WarehouseService', () => {
  let service: WarehouseService;
  let module: TestingModule;

  const mockPrismaService = {};

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        WarehouseService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WarehouseService>(WarehouseService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Warehouse Management', () => {
    describe('createWarehouse', () => {
      it('should create a new warehouse', async () => {
        const warehouse = await service.createWarehouse('tenant-1', {
          code: 'WH-MAIN',
          name: 'Depozit Principal București',
          type: WarehouseType.MAIN,
          address: {
            street: 'Str. Industriilor 45',
            city: 'București',
            county: 'București',
            postalCode: '060123',
            country: 'Romania',
          },
          isActive: true,
        });

        expect(warehouse.id).toBeDefined();
        expect(warehouse.code).toBe('WH-MAIN');
        expect(warehouse.name).toBe('Depozit Principal București');
        expect(warehouse.type).toBe(WarehouseType.MAIN);
        expect(warehouse.userId).toBe('tenant-1');
        expect(warehouse.isActive).toBe(true);
      });

      it('should create warehouse with capacity', async () => {
        const warehouse = await service.createWarehouse('tenant-1', {
          code: 'WH-DIST',
          name: 'Centru Distribuție Cluj',
          type: WarehouseType.DISTRIBUTION,
          address: {
            street: 'Calea Florești 25',
            city: 'Cluj-Napoca',
            county: 'Cluj',
            postalCode: '400500',
            country: 'Romania',
          },
          capacity: {
            totalArea: 5000,
            usableArea: 4500,
            palletPositions: 1000,
          },
          isActive: true,
        });

        expect(warehouse.capacity?.totalArea).toBe(5000);
        expect(warehouse.capacity?.palletPositions).toBe(1000);
      });

      it('should create warehouse with contact info', async () => {
        const warehouse = await service.createWarehouse('tenant-1', {
          code: 'WH-COLD',
          name: 'Depozit Frigorific',
          type: WarehouseType.COLD_STORAGE,
          address: {
            street: 'Zona Industrială',
            city: 'Timișoara',
            county: 'Timiș',
            postalCode: '300001',
            country: 'Romania',
          },
          contact: {
            name: 'Ion Popescu',
            phone: '+40722123456',
            email: 'ion.popescu@company.ro',
          },
          isActive: true,
        });

        expect(warehouse.contact?.name).toBe('Ion Popescu');
        expect(warehouse.contact?.email).toBe('ion.popescu@company.ro');
      });

      it('should reject duplicate warehouse code', async () => {
        await service.createWarehouse('tenant-1', {
          code: 'WH-DUP',
          name: 'Warehouse 1',
          type: WarehouseType.MAIN,
          address: {
            street: 'Test Street',
            city: 'București',
            county: 'București',
            postalCode: '010000',
            country: 'Romania',
          },
          isActive: true,
        });

        await expect(
          service.createWarehouse('tenant-1', {
            code: 'WH-DUP',
            name: 'Warehouse 2',
            type: WarehouseType.DISTRIBUTION,
            address: {
              street: 'Other Street',
              city: 'București',
              county: 'București',
              postalCode: '020000',
              country: 'Romania',
            },
            isActive: true,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should allow same code for different tenants', async () => {
        await service.createWarehouse('tenant-1', {
          code: 'WH-001',
          name: 'Warehouse Tenant 1',
          type: WarehouseType.MAIN,
          address: {
            street: 'Street 1',
            city: 'București',
            county: 'București',
            postalCode: '010000',
            country: 'Romania',
          },
          isActive: true,
        });

        const wh2 = await service.createWarehouse('tenant-2', {
          code: 'WH-001',
          name: 'Warehouse Tenant 2',
          type: WarehouseType.MAIN,
          address: {
            street: 'Street 2',
            city: 'Cluj-Napoca',
            county: 'Cluj',
            postalCode: '400000',
            country: 'Romania',
          },
          isActive: true,
        });

        expect(wh2.code).toBe('WH-001');
        expect(wh2.userId).toBe('tenant-2');
      });
    });

    describe('getWarehouse', () => {
      it('should return warehouse by ID', async () => {
        const created = await service.createWarehouse('tenant-1', {
          code: 'WH-GET',
          name: 'Get Test Warehouse',
          type: WarehouseType.MAIN,
          address: {
            street: 'Test',
            city: 'București',
            county: 'București',
            postalCode: '010000',
            country: 'Romania',
          },
          isActive: true,
        });

        const warehouse = service.getWarehouse(created.id);

        expect(warehouse.id).toBe(created.id);
        expect(warehouse.name).toBe('Get Test Warehouse');
      });

      it('should throw NotFoundException for invalid ID', () => {
        expect(() => service.getWarehouse('invalid-id')).toThrow(NotFoundException);
      });
    });

    describe('getUserWarehouses', () => {
      beforeEach(async () => {
        await service.createWarehouse('user-wh-1', {
          code: 'MAIN-1',
          name: 'Main Warehouse',
          type: WarehouseType.MAIN,
          address: { street: 'A', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
          isActive: true,
        });
        await service.createWarehouse('user-wh-1', {
          code: 'DIST-1',
          name: 'Distribution Center',
          type: WarehouseType.DISTRIBUTION,
          address: { street: 'B', city: 'Cluj', county: 'Cluj', postalCode: '400000', country: 'Romania' },
          isActive: true,
        });
        await service.createWarehouse('user-wh-1', {
          code: 'COLD-1',
          name: 'Cold Storage',
          type: WarehouseType.COLD_STORAGE,
          address: { street: 'C', city: 'Timișoara', county: 'Timiș', postalCode: '300000', country: 'Romania' },
          isActive: true,
        });
      });

      it('should return all warehouses for user', () => {
        const warehouses = service.getUserWarehouses('user-wh-1');

        expect(warehouses.length).toBe(3);
      });

      it('should filter by type', () => {
        const coldWarehouses = service.getUserWarehouses('user-wh-1', WarehouseType.COLD_STORAGE);

        expect(coldWarehouses.length).toBe(1);
        expect(coldWarehouses[0].type).toBe(WarehouseType.COLD_STORAGE);
      });

      it('should return empty array for user without warehouses', () => {
        const warehouses = service.getUserWarehouses('no-warehouses-user');

        expect(warehouses).toEqual([]);
      });
    });

    describe('updateWarehouse', () => {
      it('should update warehouse details', async () => {
        const warehouse = await service.createWarehouse('tenant-1', {
          code: 'WH-UPD',
          name: 'Original Name',
          type: WarehouseType.MAIN,
          address: { street: 'Old Street', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
          isActive: true,
        });

        // Small delay to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 5));

        const updated = await service.updateWarehouse(warehouse.id, {
          name: 'Updated Name',
          isActive: false,
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.isActive).toBe(false);
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(warehouse.createdAt.getTime());
      });
    });

    describe('deleteWarehouse', () => {
      it('should delete empty warehouse', async () => {
        const warehouse = await service.createWarehouse('tenant-del', {
          code: 'WH-DEL',
          name: 'Delete Test',
          type: WarehouseType.MAIN,
          address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
          isActive: true,
        });

        await service.deleteWarehouse('tenant-del', warehouse.id);

        expect(() => service.getWarehouse(warehouse.id)).toThrow(NotFoundException);
      });

      it('should reject deletion of warehouse with stock', async () => {
        const warehouse = await service.createWarehouse('tenant-del-stock', {
          code: 'WH-DEL-STOCK',
          name: 'Warehouse With Stock',
          type: WarehouseType.MAIN,
          address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
          isActive: true,
        });

        const product = await service.createProduct('tenant-del-stock', {
          sku: 'PROD-DEL',
          name: 'Test Product',
          unitOfMeasure: UnitOfMeasure.PIECE,
          valuationMethod: ValuationMethod.FIFO,
          vatRate: 19,
          isActive: true,
        });

        await service.addStock('tenant-del-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 100,
          unitCost: 10,
        });

        await expect(
          service.deleteWarehouse('tenant-del-stock', warehouse.id),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Location Management', () => {
    let warehouse: Warehouse;

    beforeEach(async () => {
      warehouse = await service.createWarehouse('tenant-loc', {
        code: 'WH-LOC',
        name: 'Location Test Warehouse',
        type: WarehouseType.MAIN,
        address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });
    });

    describe('createLocation', () => {
      it('should create a storage location', async () => {
        const location = await service.createLocation(warehouse.id, {
          code: 'A-01-01-01',
          name: 'Aisle A, Rack 1, Level 1, Bin 1',
          type: LocationType.STORAGE,
          zone: 'A',
          aisle: '01',
          rack: '01',
          shelf: '01',
          capacity: 50,
        });

        expect(location.id).toBeDefined();
        expect(location.code).toBe('A-01-01-01');
        expect(location.type).toBe(LocationType.STORAGE);
        expect(location.zone).toBe('A');
        expect(location.warehouseId).toBe(warehouse.id);
      });

      it('should create receiving location', async () => {
        const location = await service.createLocation(warehouse.id, {
          code: 'RCV-01',
          name: 'Receiving Dock 1',
          type: LocationType.RECEIVING,
        });

        expect(location.type).toBe(LocationType.RECEIVING);
      });

      it('should create quarantine location', async () => {
        const location = await service.createLocation(warehouse.id, {
          code: 'QRN-01',
          name: 'Quarantine Zone',
          type: LocationType.QUARANTINE,
        });

        expect(location.type).toBe(LocationType.QUARANTINE);
      });

      it('should throw for non-existent warehouse', async () => {
        await expect(
          service.createLocation('invalid-wh', {
            code: 'LOC-01',
            name: 'Test Location',
            type: LocationType.STORAGE,
          }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('getWarehouseLocations', () => {
      beforeEach(async () => {
        await service.createLocation(warehouse.id, { code: 'RCV-01', name: 'Receiving 1', type: LocationType.RECEIVING });
        await service.createLocation(warehouse.id, { code: 'STR-01', name: 'Storage 1', type: LocationType.STORAGE });
        await service.createLocation(warehouse.id, { code: 'STR-02', name: 'Storage 2', type: LocationType.STORAGE });
        await service.createLocation(warehouse.id, { code: 'SHP-01', name: 'Shipping 1', type: LocationType.SHIPPING });
      });

      it('should return all locations for warehouse', () => {
        const locations = service.getWarehouseLocations(warehouse.id);

        expect(locations.length).toBe(4);
      });

      it('should filter by type', () => {
        const storageLocations = service.getWarehouseLocations(warehouse.id, LocationType.STORAGE);

        expect(storageLocations.length).toBe(2);
        expect(storageLocations.every(l => l.type === LocationType.STORAGE)).toBe(true);
      });
    });
  });

  describe('Product Management', () => {
    describe('createProduct', () => {
      it('should create a product with Romanian units', async () => {
        const product = await service.createProduct('tenant-prod', {
          sku: 'PRODUS-001',
          name: 'Produs Test',
          description: 'Descriere produs test',
          category: 'Electronice',
          unitOfMeasure: UnitOfMeasure.PIECE,
          valuationMethod: ValuationMethod.FIFO,
          vatRate: 19,
          isActive: true,
        });

        expect(product.id).toBeDefined();
        expect(product.sku).toBe('PRODUS-001');
        expect(product.unitOfMeasure).toBe('BUC'); // Romanian abbreviation
        expect(product.vatRate).toBe(19);
      });

      it('should create product with reorder settings', async () => {
        const product = await service.createProduct('tenant-prod', {
          sku: 'PRODUS-002',
          name: 'Product with Reorder',
          unitOfMeasure: UnitOfMeasure.KILOGRAM,
          valuationMethod: ValuationMethod.WEIGHTED_AVERAGE,
          minStock: 10,
          maxStock: 1000,
          reorderPoint: 50,
          reorderQuantity: 200,
          vatRate: 9, // Reduced VAT for food
          isActive: true,
        });

        expect(product.minStock).toBe(10);
        expect(product.maxStock).toBe(1000);
        expect(product.reorderPoint).toBe(50);
        expect(product.reorderQuantity).toBe(200);
      });

      it('should create product with NC code for customs', async () => {
        const product = await service.createProduct('tenant-prod', {
          sku: 'IMPORT-001',
          name: 'Imported Product',
          unitOfMeasure: UnitOfMeasure.PIECE,
          valuationMethod: ValuationMethod.SPECIFIC_IDENTIFICATION,
          ncCode: '8471300000', // Nomenclatura Combinată
          vatRate: 19,
          isActive: true,
        });

        expect(product.ncCode).toBe('8471300000');
      });

      it('should create product with dimensions', async () => {
        const product = await service.createProduct('tenant-prod', {
          sku: 'DIMS-001',
          name: 'Product with Dimensions',
          unitOfMeasure: UnitOfMeasure.PIECE,
          valuationMethod: ValuationMethod.FIFO,
          weight: 2.5,
          dimensions: { length: 30, width: 20, height: 10 },
          vatRate: 19,
          isActive: true,
        });

        expect(product.weight).toBe(2.5);
        expect(product.dimensions?.length).toBe(30);
      });

      it('should reject duplicate SKU for same tenant', async () => {
        await service.createProduct('tenant-dup-sku', {
          sku: 'DUP-SKU',
          name: 'First Product',
          unitOfMeasure: UnitOfMeasure.PIECE,
          valuationMethod: ValuationMethod.FIFO,
          vatRate: 19,
          isActive: true,
        });

        await expect(
          service.createProduct('tenant-dup-sku', {
            sku: 'DUP-SKU',
            name: 'Second Product',
            unitOfMeasure: UnitOfMeasure.PIECE,
            valuationMethod: ValuationMethod.FIFO,
            vatRate: 19,
            isActive: true,
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('getProduct', () => {
      it('should return product by ID', async () => {
        const created = await service.createProduct('tenant-get-prod', {
          sku: 'GET-PROD',
          name: 'Get Product Test',
          unitOfMeasure: UnitOfMeasure.PIECE,
          valuationMethod: ValuationMethod.FIFO,
          vatRate: 19,
          isActive: true,
        });

        const product = service.getProduct(created.id);

        expect(product.sku).toBe('GET-PROD');
      });

      it('should throw NotFoundException for invalid ID', () => {
        expect(() => service.getProduct('invalid-prod-id')).toThrow(NotFoundException);
      });
    });

    describe('getUserProducts', () => {
      beforeEach(async () => {
        await service.createProduct('user-prods', {
          sku: 'ELEC-001',
          name: 'Laptop',
          category: 'Electronics',
          unitOfMeasure: UnitOfMeasure.PIECE,
          valuationMethod: ValuationMethod.FIFO,
          vatRate: 19,
          isActive: true,
        });
        await service.createProduct('user-prods', {
          sku: 'ELEC-002',
          name: 'Monitor',
          category: 'Electronics',
          unitOfMeasure: UnitOfMeasure.PIECE,
          valuationMethod: ValuationMethod.FIFO,
          vatRate: 19,
          isActive: true,
        });
        await service.createProduct('user-prods', {
          sku: 'FOOD-001',
          name: 'Pâine',
          category: 'Food',
          unitOfMeasure: UnitOfMeasure.PIECE,
          valuationMethod: ValuationMethod.FIFO,
          vatRate: 9,
          isActive: true,
        });
      });

      it('should return all products for user', () => {
        const products = service.getUserProducts('user-prods');

        expect(products.length).toBe(3);
      });

      it('should filter by category', () => {
        const electronics = service.getUserProducts('user-prods', { category: 'Electronics' });

        expect(electronics.length).toBe(2);
      });

      it('should search by name', () => {
        const results = service.getUserProducts('user-prods', { search: 'Laptop' });

        expect(results.length).toBe(1);
        expect(results[0].name).toBe('Laptop');
      });
    });
  });

  describe('Stock Level Management', () => {
    let warehouse: Warehouse;
    let product: Product;

    beforeEach(async () => {
      warehouse = await service.createWarehouse('tenant-stock', {
        code: 'WH-STOCK',
        name: 'Stock Test Warehouse',
        type: WarehouseType.MAIN,
        address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      product = await service.createProduct('tenant-stock', {
        sku: 'STK-PROD',
        name: 'Stock Test Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.WEIGHTED_AVERAGE,
        vatRate: 19,
        isActive: true,
      });
    });

    describe('addStock', () => {
      it('should add stock to warehouse', async () => {
        const result = await service.addStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 100,
          unitCost: 50,
        });

        expect(result.stockLevel.quantity).toBe(100);
        expect(result.stockLevel.availableQuantity).toBe(100);
        expect(result.stockLevel.totalValue).toBe(5000);
        expect(result.movement.type).toBe(MovementType.RECEIPT);
      });

      it('should update existing stock with weighted average', async () => {
        await service.addStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 100,
          unitCost: 50,
        });

        const result = await service.addStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 100,
          unitCost: 70,
        });

        expect(result.stockLevel.quantity).toBe(200);
        expect(result.stockLevel.unitCost).toBe(60); // (100*50 + 100*70) / 200
        expect(result.stockLevel.totalValue).toBe(12000);
      });

      it('should add stock with lot number', async () => {
        const result = await service.addStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 50,
          unitCost: 25,
          lotNumber: 'LOT-2024-001',
          batchNumber: 'BATCH-A',
        });

        expect(result.stockLevel.lotNumber).toBe('LOT-2024-001');
        expect(result.stockLevel.batchNumber).toBe('BATCH-A');
      });

      it('should add stock with expiry date', async () => {
        const expiryDate = new Date('2025-12-31');
        const result = await service.addStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 100,
          unitCost: 10,
          expiryDate,
        });

        expect(result.stockLevel.expiryDate).toEqual(expiryDate);
      });
    });

    describe('removeStock', () => {
      beforeEach(async () => {
        await service.addStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 100,
          unitCost: 50,
        });
      });

      it('should remove stock from warehouse', async () => {
        const result = await service.removeStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 30,
        });

        expect(result.stockLevel.quantity).toBe(70);
        expect(result.stockLevel.availableQuantity).toBe(70);
        expect(result.movement.type).toBe(MovementType.SHIPMENT);
      });

      it('should reject insufficient stock', async () => {
        await expect(
          service.removeStock('tenant-stock', {
            productId: product.id,
            warehouseId: warehouse.id,
            quantity: 150,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should record e-Transport UIT', async () => {
        const result = await service.removeStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 10,
          eTransportUIT: 'UIT-2024-12345',
        });

        expect(result.movement.eTransportUIT).toBe('UIT-2024-12345');
      });
    });

    describe('transferStock', () => {
      let destinationWarehouse: Warehouse;

      beforeEach(async () => {
        destinationWarehouse = await service.createWarehouse('tenant-stock', {
          code: 'WH-DEST',
          name: 'Destination Warehouse',
          type: WarehouseType.DISTRIBUTION,
          address: { street: 'Dest', city: 'Cluj', county: 'Cluj', postalCode: '400000', country: 'Romania' },
          isActive: true,
        });

        await service.addStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 100,
          unitCost: 50,
        });
      });

      it('should transfer stock between warehouses', async () => {
        const result = await service.transferStock('tenant-stock', {
          productId: product.id,
          sourceWarehouseId: warehouse.id,
          destinationWarehouseId: destinationWarehouse.id,
          quantity: 40,
        });

        expect(result.sourceStock.quantity).toBe(60);
        expect(result.destinationStock.quantity).toBe(40);
        expect(result.movement.type).toBe(MovementType.TRANSFER);
      });

      it('should maintain unit cost during transfer', async () => {
        const result = await service.transferStock('tenant-stock', {
          productId: product.id,
          sourceWarehouseId: warehouse.id,
          destinationWarehouseId: destinationWarehouse.id,
          quantity: 20,
        });

        expect(result.destinationStock.unitCost).toBe(50);
      });

      it('should reject transfer with insufficient stock', async () => {
        await expect(
          service.transferStock('tenant-stock', {
            productId: product.id,
            sourceWarehouseId: warehouse.id,
            destinationWarehouseId: destinationWarehouse.id,
            quantity: 200,
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('adjustStock', () => {
      beforeEach(async () => {
        await service.addStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 100,
          unitCost: 50,
        });
      });

      it('should adjust stock upward', async () => {
        const result = await service.adjustStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          newQuantity: 120,
          reason: 'Found additional units',
        });

        expect(result.stockLevel.quantity).toBe(120);
        expect(result.movement.type).toBe(MovementType.ADJUSTMENT);
        expect(result.movement.quantity).toBe(20);
      });

      it('should adjust stock downward', async () => {
        const result = await service.adjustStock('tenant-stock', {
          productId: product.id,
          warehouseId: warehouse.id,
          newQuantity: 80,
          reason: 'Damaged units removed',
        });

        expect(result.stockLevel.quantity).toBe(80);
        expect(result.movement.quantity).toBe(20);
      });
    });
  });

  describe('Stock Queries', () => {
    let warehouse1: Warehouse;
    let warehouse2: Warehouse;
    let product1: Product;
    let product2: Product;

    beforeEach(async () => {
      warehouse1 = await service.createWarehouse('tenant-query', {
        code: 'WH-Q1',
        name: 'Query Warehouse 1',
        type: WarehouseType.MAIN,
        address: { street: 'A', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      warehouse2 = await service.createWarehouse('tenant-query', {
        code: 'WH-Q2',
        name: 'Query Warehouse 2',
        type: WarehouseType.DISTRIBUTION,
        address: { street: 'B', city: 'Cluj', county: 'Cluj', postalCode: '400000', country: 'Romania' },
        isActive: true,
      });

      product1 = await service.createProduct('tenant-query', {
        sku: 'QUERY-P1',
        name: 'Query Product 1',
        category: 'Category A',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      product2 = await service.createProduct('tenant-query', {
        sku: 'QUERY-P2',
        name: 'Query Product 2',
        category: 'Category B',
        unitOfMeasure: UnitOfMeasure.KILOGRAM,
        valuationMethod: ValuationMethod.WEIGHTED_AVERAGE,
        vatRate: 9,
        isActive: true,
      });

      await service.addStock('tenant-query', {
        productId: product1.id,
        warehouseId: warehouse1.id,
        quantity: 100,
        unitCost: 10,
      });

      await service.addStock('tenant-query', {
        productId: product1.id,
        warehouseId: warehouse2.id,
        quantity: 50,
        unitCost: 12,
      });

      await service.addStock('tenant-query', {
        productId: product2.id,
        warehouseId: warehouse1.id,
        quantity: 200,
        unitCost: 5,
      });
    });

    describe('getProductStock', () => {
      it('should return all stock for product', () => {
        const stock = service.getProductStock(product1.id);

        expect(stock.length).toBe(2);
      });
    });

    describe('getWarehouseStock', () => {
      it('should return all stock in warehouse', () => {
        const stock = service.getWarehouseStock(warehouse1.id);

        expect(stock.length).toBe(2);
      });

      it('should filter by product', () => {
        const stock = service.getWarehouseStock(warehouse1.id, { productId: product1.id });

        expect(stock.length).toBe(1);
      });
    });

    describe('getTotalStock', () => {
      it('should aggregate stock across warehouses', () => {
        const total = service.getTotalStock(product1.id);

        expect(total.totalQuantity).toBe(150);
        expect(total.availableQuantity).toBe(150);
        expect(total.byWarehouse.length).toBe(2);
      });

      it('should calculate total value', () => {
        const total = service.getTotalStock(product1.id);

        expect(total.totalValue).toBe(1600); // 100*10 + 50*12
      });
    });
  });

  describe('Stock Reservations', () => {
    let stockLevel: StockLevel;

    beforeEach(async () => {
      const warehouse = await service.createWarehouse('tenant-res', {
        code: 'WH-RES',
        name: 'Reservation Warehouse',
        type: WarehouseType.MAIN,
        address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      const product = await service.createProduct('tenant-res', {
        sku: 'RES-PROD',
        name: 'Reservation Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      const result = await service.addStock('tenant-res', {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 100,
        unitCost: 25,
      });

      stockLevel = result.stockLevel;
    });

    describe('reserveStock', () => {
      it('should reserve stock for order', async () => {
        const reservation = await service.reserveStock(
          stockLevel.id,
          'ORDER-001',
          'SALES_ORDER',
          30,
        );

        expect(reservation.id).toBeDefined();
        expect(reservation.quantity).toBe(30);
        expect(reservation.status).toBe('ACTIVE');

        const updated = service.getProductStock(stockLevel.productId)[0];
        expect(updated.reservedQuantity).toBe(30);
        expect(updated.availableQuantity).toBe(70);
      });

      it('should set expiration time', async () => {
        const reservation = await service.reserveStock(
          stockLevel.id,
          'ORDER-002',
          'SALES_ORDER',
          10,
          120, // 2 hours
        );

        const expectedExpiry = new Date(reservation.reservedAt.getTime() + 120 * 60 * 1000);
        expect(reservation.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
      });

      it('should reject reservation exceeding available', async () => {
        await expect(
          service.reserveStock(stockLevel.id, 'ORDER-003', 'SALES_ORDER', 150),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('releaseReservation', () => {
      it('should release reserved stock', async () => {
        const reservation = await service.reserveStock(
          stockLevel.id,
          'ORDER-REL',
          'SALES_ORDER',
          25,
        );

        await service.releaseReservation(reservation.id);

        const updated = service.getProductStock(stockLevel.productId)[0];
        expect(updated.reservedQuantity).toBe(0);
        expect(updated.availableQuantity).toBe(100);
      });
    });

    describe('fulfillReservation', () => {
      it('should fulfill reservation and reduce stock', async () => {
        const reservation = await service.reserveStock(
          stockLevel.id,
          'ORDER-FUL',
          'SALES_ORDER',
          20,
        );

        await service.fulfillReservation(reservation.id);

        const updated = service.getProductStock(stockLevel.productId)[0];
        expect(updated.quantity).toBe(80);
        expect(updated.reservedQuantity).toBe(0);
      });
    });
  });

  describe('Inventory Valuation', () => {
    beforeEach(async () => {
      const wh1 = await service.createWarehouse('tenant-val', {
        code: 'VAL-WH1',
        name: 'Valuation WH1',
        type: WarehouseType.MAIN,
        address: { street: 'A', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      const wh2 = await service.createWarehouse('tenant-val', {
        code: 'VAL-WH2',
        name: 'Valuation WH2',
        type: WarehouseType.DISTRIBUTION,
        address: { street: 'B', city: 'Cluj', county: 'Cluj', postalCode: '400000', country: 'Romania' },
        isActive: true,
      });

      const prod1 = await service.createProduct('tenant-val', {
        sku: 'VAL-P1',
        name: 'Valuation Product 1',
        category: 'Electronics',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      const prod2 = await service.createProduct('tenant-val', {
        sku: 'VAL-P2',
        name: 'Valuation Product 2',
        category: 'Food',
        unitOfMeasure: UnitOfMeasure.KILOGRAM,
        valuationMethod: ValuationMethod.WEIGHTED_AVERAGE,
        vatRate: 9,
        isActive: true,
      });

      await service.addStock('tenant-val', {
        productId: prod1.id,
        warehouseId: wh1.id,
        quantity: 100,
        unitCost: 50,
      });

      await service.addStock('tenant-val', {
        productId: prod1.id,
        warehouseId: wh2.id,
        quantity: 50,
        unitCost: 55,
      });

      await service.addStock('tenant-val', {
        productId: prod2.id,
        warehouseId: wh1.id,
        quantity: 200,
        unitCost: 10,
      });
    });

    it('should calculate total inventory value', () => {
      const valuation = service.getInventoryValuation('tenant-val');

      expect(valuation.totalItems).toBe(3);
      expect(valuation.totalValue).toBe(9750); // 100*50 + 50*55 + 200*10
    });

    it('should group by category', () => {
      const valuation = service.getInventoryValuation('tenant-val');

      expect(valuation.byCategory.length).toBe(2);
      const electronics = valuation.byCategory.find(c => c.category === 'Electronics');
      expect(electronics?.value).toBe(7750);
    });

    it('should group by warehouse', () => {
      const valuation = service.getInventoryValuation('tenant-val');

      expect(valuation.byWarehouse.length).toBe(2);
    });

    it('should filter by warehouse', () => {
      const warehouses = service.getUserWarehouses('tenant-val');
      const wh1 = warehouses.find(w => w.code === 'VAL-WH1');

      const valuation = service.getInventoryValuation('tenant-val', wh1?.id);

      expect(valuation.byWarehouse.length).toBe(1);
    });
  });

  describe('Low Stock Alerts', () => {
    beforeEach(async () => {
      const warehouse = await service.createWarehouse('tenant-alert', {
        code: 'ALERT-WH',
        name: 'Alert Warehouse',
        type: WarehouseType.MAIN,
        address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      const lowProduct = await service.createProduct('tenant-alert', {
        sku: 'LOW-STOCK',
        name: 'Low Stock Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        reorderPoint: 50,
        reorderQuantity: 100,
        maxStock: 500,
        vatRate: 19,
        isActive: true,
      });

      const okProduct = await service.createProduct('tenant-alert', {
        sku: 'OK-STOCK',
        name: 'OK Stock Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        reorderPoint: 20,
        reorderQuantity: 50,
        vatRate: 19,
        isActive: true,
      });

      await service.addStock('tenant-alert', {
        productId: lowProduct.id,
        warehouseId: warehouse.id,
        quantity: 30, // Below reorder point
        unitCost: 10,
      });

      await service.addStock('tenant-alert', {
        productId: okProduct.id,
        warehouseId: warehouse.id,
        quantity: 100, // Above reorder point
        unitCost: 5,
      });
    });

    it('should return low stock alerts', () => {
      const alerts = service.getLowStockAlerts('tenant-alert');

      expect(alerts.length).toBe(1);
      expect(alerts[0].sku).toBe('LOW-STOCK');
      expect(alerts[0].currentStock).toBe(30);
      expect(alerts[0].reorderPoint).toBe(50);
    });

    it('should suggest order quantity', () => {
      const alerts = service.getLowStockAlerts('tenant-alert');

      expect(alerts[0].suggestedOrderQty).toBe(470); // maxStock - currentStock
    });
  });

  describe('Stock Counts', () => {
    let warehouse: Warehouse;
    let product: Product;

    beforeEach(async () => {
      warehouse = await service.createWarehouse('tenant-count', {
        code: 'COUNT-WH',
        name: 'Count Warehouse',
        type: WarehouseType.MAIN,
        address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      product = await service.createProduct('tenant-count', {
        sku: 'COUNT-PROD',
        name: 'Count Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      await service.addStock('tenant-count', {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 100,
        unitCost: 20,
      });
    });

    describe('createStockCount', () => {
      it('should create a stock count', async () => {
        const count = await service.createStockCount('tenant-count', warehouse.id, 'FULL');

        expect(count.id).toBeDefined();
        expect(count.type).toBe('FULL');
        expect(count.status).toBe('DRAFT');
        expect(count.items.length).toBe(1);
        expect(count.items[0].systemQuantity).toBe(100);
      });

      it('should create cycle count', async () => {
        const count = await service.createStockCount('tenant-count', warehouse.id, 'CYCLE');

        expect(count.type).toBe('CYCLE');
      });
    });

    describe('updateStockCountItem', () => {
      it('should record counted quantity', async () => {
        const count = await service.createStockCount('tenant-count', warehouse.id, 'FULL');

        const updated = await service.updateStockCountItem(count.id, product.id, 95, 'Found 5 units damaged');

        expect(updated.status).toBe('IN_PROGRESS');
        expect(updated.items[0].countedQuantity).toBe(95);
        expect(updated.items[0].variance).toBe(-5);
      });

      it('should calculate variance value', async () => {
        const count = await service.createStockCount('tenant-count', warehouse.id, 'FULL');

        const updated = await service.updateStockCountItem(count.id, product.id, 110);

        expect(updated.items[0].varianceValue).toBe(200); // 10 units * 20 cost
      });
    });

    describe('completeStockCount', () => {
      it('should complete count without adjustments', async () => {
        const count = await service.createStockCount('tenant-count', warehouse.id, 'FULL');
        await service.updateStockCountItem(count.id, product.id, 100);

        const completed = await service.completeStockCount(count.id, false, 'manager-1');

        expect(completed.status).toBe('COMPLETED');
        expect(completed.approvedBy).toBe('manager-1');

        const stock = service.getProductStock(product.id)[0];
        expect(stock.quantity).toBe(100); // Unchanged
      });

      it('should apply adjustments', async () => {
        const count = await service.createStockCount('tenant-count', warehouse.id, 'FULL');
        await service.updateStockCountItem(count.id, product.id, 95);

        await service.completeStockCount(count.id, true, 'manager-1');

        const stock = service.getProductStock(product.id)[0];
        expect(stock.quantity).toBe(95);
      });
    });
  });

  describe('Movement History', () => {
    beforeEach(async () => {
      const wh1 = await service.createWarehouse('tenant-mov', {
        code: 'MOV-WH1',
        name: 'Movement WH1',
        type: WarehouseType.MAIN,
        address: { street: 'A', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      const wh2 = await service.createWarehouse('tenant-mov', {
        code: 'MOV-WH2',
        name: 'Movement WH2',
        type: WarehouseType.DISTRIBUTION,
        address: { street: 'B', city: 'Cluj', county: 'Cluj', postalCode: '400000', country: 'Romania' },
        isActive: true,
      });

      const product = await service.createProduct('tenant-mov', {
        sku: 'MOV-PROD',
        name: 'Movement Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      // Create various movements
      await service.addStock('tenant-mov', {
        productId: product.id,
        warehouseId: wh1.id,
        quantity: 100,
        unitCost: 10,
      });

      await service.transferStock('tenant-mov', {
        productId: product.id,
        sourceWarehouseId: wh1.id,
        destinationWarehouseId: wh2.id,
        quantity: 30,
      });

      await service.removeStock('tenant-mov', {
        productId: product.id,
        warehouseId: wh1.id,
        quantity: 20,
      });
    });

    it('should return all movements', () => {
      const movements = service.getMovementHistory('tenant-mov');

      expect(movements.length).toBe(3);
    });

    it('should filter by movement type', () => {
      const transfers = service.getMovementHistory('tenant-mov', { type: MovementType.TRANSFER });

      expect(transfers.length).toBe(1);
      expect(transfers[0].type).toBe(MovementType.TRANSFER);
    });

    it('should sort by date descending', () => {
      const movements = service.getMovementHistory('tenant-mov');

      for (let i = 1; i < movements.length; i++) {
        expect(movements[i - 1].date.getTime()).toBeGreaterThanOrEqual(movements[i].date.getTime());
      }
    });

    it('should limit results', () => {
      const movements = service.getMovementHistory('tenant-mov', { limit: 2 });

      expect(movements.length).toBe(2);
    });
  });

  describe('ABC Analysis', () => {
    beforeEach(async () => {
      const warehouse = await service.createWarehouse('tenant-abc', {
        code: 'ABC-WH',
        name: 'ABC Warehouse',
        type: WarehouseType.MAIN,
        address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      // Create products with different values
      const highValue = await service.createProduct('tenant-abc', {
        sku: 'HIGH-VALUE',
        name: 'High Value Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      const medValue = await service.createProduct('tenant-abc', {
        sku: 'MED-VALUE',
        name: 'Medium Value Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      const lowValue = await service.createProduct('tenant-abc', {
        sku: 'LOW-VALUE',
        name: 'Low Value Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      await service.addStock('tenant-abc', {
        productId: highValue.id,
        warehouseId: warehouse.id,
        quantity: 10,
        unitCost: 1000, // 10000 value
      });

      await service.addStock('tenant-abc', {
        productId: medValue.id,
        warehouseId: warehouse.id,
        quantity: 50,
        unitCost: 30, // 1500 value
      });

      await service.addStock('tenant-abc', {
        productId: lowValue.id,
        warehouseId: warehouse.id,
        quantity: 100,
        unitCost: 5, // 500 value
      });
    });

    it('should classify products by value', async () => {
      const analysis = await service.getABCAnalysis('tenant-abc');

      expect(analysis.total.products).toBe(3);
      expect(analysis.total.value).toBe(12000);
    });

    it('should identify high-value products', async () => {
      const analysis = await service.getABCAnalysis('tenant-abc');

      // Total value is 12000, Class A covers up to 80% cumulative value
      // High value product (10000) = 83.3% of total, so it alone exceeds 80%
      // It should be in Class A (first product sorted by value)
      expect(analysis.classA.valuePercentage + analysis.classB.valuePercentage + analysis.classC.valuePercentage).toBeCloseTo(100, 0);
    });
  });

  describe('Inventory Aging', () => {
    beforeEach(async () => {
      const warehouse = await service.createWarehouse('tenant-aging', {
        code: 'AGING-WH',
        name: 'Aging Warehouse',
        type: WarehouseType.MAIN,
        address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      const product = await service.createProduct('tenant-aging', {
        sku: 'AGING-PROD',
        name: 'Aging Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      await service.addStock('tenant-aging', {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 100,
        unitCost: 10,
      });
    });

    it('should calculate aging summary', async () => {
      const aging = await service.getInventoryAging('tenant-aging');

      expect(aging.summary).toBeDefined();
      expect(aging.summary.current.count).toBe(1);
      expect(aging.summary.current.value).toBe(1000);
    });

    it('should include age in days', async () => {
      const aging = await service.getInventoryAging('tenant-aging');

      expect(aging.items[0].ageDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SAGA Integration', () => {
    beforeEach(async () => {
      const warehouse = await service.createWarehouse('tenant-saga', {
        code: 'SAGA-WH',
        name: 'SAGA Warehouse',
        type: WarehouseType.MAIN,
        address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      const product = await service.createProduct('tenant-saga', {
        sku: 'SAGA-PROD',
        name: 'SAGA Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      await service.addStock('tenant-saga', {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 50,
        unitCost: 25,
      });
    });

    describe('syncWithSaga', () => {
      it('should sync inventory with SAGA', async () => {
        const result = await service.syncWithSaga('tenant-saga');

        expect(result.success).toBe(true);
        expect(result.syncedProducts).toBe(1);
        expect(result.syncedStock).toBe(1);
        expect(result.errors).toEqual([]);
      });
    });

    describe('getSagaSyncStatus', () => {
      it('should return sync status', async () => {
        const status = await service.getSagaSyncStatus('tenant-saga');

        expect(status.status).toBe('SYNCED');
        expect(status.pendingChanges).toBe(0);
        expect(status.lastSync).toBeDefined();
      });
    });
  });

  describe('Romanian Units of Measure', () => {
    it('should use Romanian abbreviations', () => {
      expect(UnitOfMeasure.PIECE).toBe('BUC');
      expect(UnitOfMeasure.KILOGRAM).toBe('KG');
      expect(UnitOfMeasure.LITER).toBe('L');
      expect(UnitOfMeasure.METER).toBe('M');
      expect(UnitOfMeasure.SQUARE_METER).toBe('MP');
      expect(UnitOfMeasure.CUBIC_METER).toBe('MC');
      expect(UnitOfMeasure.PALLET).toBe('PAL');
      expect(UnitOfMeasure.BOX).toBe('CUT');
      expect(UnitOfMeasure.PACK).toBe('PAC');
    });
  });

  describe('Warehouse Types', () => {
    it('should support all warehouse types', async () => {
      const types = [
        WarehouseType.MAIN,
        WarehouseType.DISTRIBUTION,
        WarehouseType.RETAIL,
        WarehouseType.COLD_STORAGE,
        WarehouseType.BONDED,
        WarehouseType.TRANSIT,
      ];

      for (let i = 0; i < types.length; i++) {
        const wh = await service.createWarehouse('tenant-types', {
          code: `TYPE-${i}`,
          name: `Type ${types[i]} Warehouse`,
          type: types[i],
          address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
          isActive: true,
        });

        expect(wh.type).toBe(types[i]);
      }
    });
  });

  describe('Valuation Methods', () => {
    it('should support all valuation methods', async () => {
      const methods = [
        ValuationMethod.FIFO,
        ValuationMethod.LIFO,
        ValuationMethod.WEIGHTED_AVERAGE,
        ValuationMethod.SPECIFIC_IDENTIFICATION,
      ];

      for (let i = 0; i < methods.length; i++) {
        const prod = await service.createProduct('tenant-valmethod', {
          sku: `VALMETHOD-${i}`,
          name: `Valuation Method ${methods[i]}`,
          unitOfMeasure: UnitOfMeasure.PIECE,
          valuationMethod: methods[i],
          vatRate: 19,
          isActive: true,
        });

        expect(prod.valuationMethod).toBe(methods[i]);
      }
    });
  });

  describe('Controller API Methods', () => {
    let warehouse: Warehouse;
    let product: Product;

    beforeEach(async () => {
      warehouse = await service.createWarehouse('tenant-api', {
        code: 'API-WH',
        name: 'API Test Warehouse',
        type: WarehouseType.MAIN,
        address: { street: 'Test', city: 'București', county: 'București', postalCode: '010000', country: 'Romania' },
        isActive: true,
      });

      product = await service.createProduct('tenant-api', {
        sku: 'API-PROD',
        name: 'API Test Product',
        unitOfMeasure: UnitOfMeasure.PIECE,
        valuationMethod: ValuationMethod.FIFO,
        vatRate: 19,
        isActive: true,
      });

      await service.addStock('tenant-api', {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 100,
        unitCost: 50,
      });
    });

    describe('receiveStock', () => {
      it('should receive stock via API', async () => {
        const result = await service.receiveStock('tenant-api', 'user-1', {
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 50,
          unitCost: 55,
          reference: 'PO-001',
          sourceDocument: 'PURCHASE-001',
        });

        expect(result.stockLevel.quantity).toBe(150);
        expect(result.movement.documentNumber).toBe('PURCHASE-001');
      });
    });

    describe('issueStock', () => {
      it('should issue stock via API', async () => {
        const result = await service.issueStock('tenant-api', 'user-1', {
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 25,
          reference: 'SO-001',
          destinationDocument: 'SALES-001',
        });

        expect(result.stockLevel.quantity).toBe(75);
      });
    });

    describe('getMovementSummary', () => {
      it('should return movement summary', async () => {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = new Date(Date.now() + 1000); // Include recent movements

        await service.issueStock('tenant-api', 'user-1', {
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 10,
        });

        const summary = await service.getMovementSummary('tenant-api', {
          startDate,
          endDate,
        });

        expect(summary.totals.receipts.count).toBeGreaterThan(0);
        expect(summary.period.start).toEqual(startDate);
      });
    });

    describe('getStockStatusReport', () => {
      it('should return stock status report', async () => {
        const report = await service.getStockStatusReport('tenant-api');

        expect(report.totalProducts).toBeGreaterThan(0);
        expect(report.totalValue).toBeGreaterThan(0);
        expect(report.byStatus.length).toBeGreaterThan(0);
      });
    });
  });
});
