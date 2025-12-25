import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AssetManagementService,
  Asset,
  AssetCategory,
  AssetStatus,
  AssetCondition,
} from './asset-management.service';

describe('AssetManagementService', () => {
  let service: AssetManagementService;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const tenantId = 'tenant-123';
  const userId = 'user-123';

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetManagementService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AssetManagementService>(AssetManagementService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with sample data', async () => {
      const result = await service.getAssets('system');
      expect(result.total).toBeGreaterThan(0);
    });
  });

  // =================== ASSET CRUD ===================

  describe('createAsset', () => {
    it('should create an asset with required fields', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Test Laptop',
        category: 'it_hardware',
        createdBy: userId,
      });

      expect(asset).toBeDefined();
      expect(asset.id).toBeDefined();
      expect(asset.name).toBe('Test Laptop');
      expect(asset.category).toBe('it_hardware');
    });

    it('should generate unique asset tag', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Test Asset',
        category: 'equipment',
        createdBy: userId,
      });

      expect(asset.assetTag).toBeDefined();
      expect(asset.assetTag).toMatch(/^AT-/);
    });

    it('should default status to active', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Test Asset',
        category: 'equipment',
        createdBy: userId,
      });

      expect(asset.status).toBe('active');
    });

    it('should default condition to good', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Test Asset',
        category: 'equipment',
        createdBy: userId,
      });

      expect(asset.condition).toBe('good');
    });

    it('should default depreciation method to straight_line', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Test Asset',
        category: 'equipment',
        createdBy: userId,
      });

      expect(asset.depreciationMethod).toBe('straight_line');
    });

    it('should set currentValue to purchasePrice', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Test Asset',
        category: 'equipment',
        purchasePrice: 5000,
        createdBy: userId,
      });

      expect(asset.currentValue).toBe(5000);
    });

    it('should emit asset.created event', async () => {
      await service.createAsset({
        tenantId,
        name: 'Test Asset',
        category: 'equipment',
        createdBy: userId,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'asset.created',
        expect.objectContaining({ asset: expect.any(Object) }),
      );
    });

    it('should accept all optional fields', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Complete Asset',
        category: 'vehicle',
        description: 'Company car',
        serialNumber: 'SN-123',
        manufacturer: 'Toyota',
        model: 'Camry',
        status: 'active',
        condition: 'excellent',
        locationId: 'loc-1',
        locationName: 'Headquarters',
        departmentId: 'dept-1',
        departmentName: 'Sales',
        purchaseDate: new Date('2024-01-01'),
        purchasePrice: 30000,
        salvageValue: 5000,
        usefulLifeMonths: 120,
        tags: ['company-car', 'sales'],
        createdBy: userId,
      });

      expect(asset.serialNumber).toBe('SN-123');
      expect(asset.manufacturer).toBe('Toyota');
      expect(asset.locationName).toBe('Headquarters');
    });
  });

  describe('getAsset', () => {
    it('should return asset by ID', async () => {
      const created = await service.createAsset({
        tenantId,
        name: 'Test Asset',
        category: 'equipment',
        createdBy: userId,
      });

      const asset = await service.getAsset(created.id);

      expect(asset).toBeDefined();
      expect(asset?.id).toBe(created.id);
    });

    it('should return null for non-existent asset', async () => {
      const asset = await service.getAsset('non-existent');

      expect(asset).toBeNull();
    });
  });

  describe('getAssetByTag', () => {
    it('should return asset by tag', async () => {
      const created = await service.createAsset({
        tenantId,
        name: 'Test Asset',
        category: 'equipment',
        createdBy: userId,
      });

      const asset = await service.getAssetByTag(created.assetTag);

      expect(asset).toBeDefined();
      expect(asset?.assetTag).toBe(created.assetTag);
    });

    it('should return null for non-existent tag', async () => {
      const asset = await service.getAssetByTag('INVALID-TAG');

      expect(asset).toBeNull();
    });
  });

  describe('getAssets', () => {
    beforeEach(async () => {
      await service.createAsset({
        tenantId,
        name: 'Laptop 1',
        category: 'it_hardware',
        status: 'active',
        condition: 'good',
        createdBy: userId,
      });
      await service.createAsset({
        tenantId,
        name: 'Laptop 2',
        category: 'it_hardware',
        status: 'maintenance',
        condition: 'fair',
        createdBy: userId,
      });
      await service.createAsset({
        tenantId,
        name: 'Vehicle 1',
        category: 'vehicle',
        status: 'active',
        condition: 'excellent',
        createdBy: userId,
      });
    });

    it('should return all assets for tenant', async () => {
      const result = await service.getAssets(tenantId);

      expect(result.assets.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by category', async () => {
      const result = await service.getAssets(tenantId, { category: 'it_hardware' });

      result.assets.forEach((a) => expect(a.category).toBe('it_hardware'));
    });

    it('should filter by status', async () => {
      const result = await service.getAssets(tenantId, { status: 'maintenance' });

      result.assets.forEach((a) => expect(a.status).toBe('maintenance'));
    });

    it('should filter by condition', async () => {
      const result = await service.getAssets(tenantId, { condition: 'excellent' });

      result.assets.forEach((a) => expect(a.condition).toBe('excellent'));
    });

    it('should search by name', async () => {
      const result = await service.getAssets(tenantId, { search: 'Laptop' });

      result.assets.forEach((a) =>
        expect(a.name.toLowerCase()).toContain('laptop'),
      );
    });

    it('should search by serial number', async () => {
      await service.createAsset({
        tenantId,
        name: 'Special Item',
        category: 'equipment',
        serialNumber: 'UNIQUE-SN-123',
        createdBy: userId,
      });

      const result = await service.getAssets(tenantId, { search: 'UNIQUE-SN' });

      expect(result.assets.length).toBeGreaterThan(0);
    });

    it('should support pagination with limit', async () => {
      const result = await service.getAssets(tenantId, { limit: 2 });

      expect(result.assets.length).toBe(2);
    });

    it('should support pagination with offset', async () => {
      const all = await service.getAssets(tenantId);
      const offset = await service.getAssets(tenantId, { offset: 1 });

      expect(offset.assets.length).toBe(all.assets.length - 1);
    });

    it('should sort by createdAt descending', async () => {
      const result = await service.getAssets(tenantId);

      for (let i = 1; i < result.assets.length; i++) {
        expect(result.assets[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          result.assets[i].createdAt.getTime(),
        );
      }
    });

    it('should filter by tags', async () => {
      await service.createAsset({
        tenantId,
        name: 'Tagged Asset',
        category: 'equipment',
        tags: ['important', 'test'],
        createdBy: userId,
      });

      const result = await service.getAssets(tenantId, { tags: ['important'] });

      expect(result.assets.some((a) => a.tags?.includes('important'))).toBe(true);
    });
  });

  describe('updateAsset', () => {
    let assetId: string;

    beforeEach(async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Original Name',
        category: 'equipment',
        status: 'active',
        createdBy: userId,
      });
      assetId = asset.id;
    });

    it('should update asset fields', async () => {
      const updated = await service.updateAsset(assetId, {
        name: 'Updated Name',
        status: 'maintenance',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.status).toBe('maintenance');
    });

    it('should preserve immutable fields', async () => {
      const original = await service.getAsset(assetId);
      await service.updateAsset(assetId, {
        name: 'Updated',
        id: 'new-id',
        tenantId: 'new-tenant',
        assetTag: 'NEW-TAG',
        createdBy: 'other-user',
      } as any);

      const updated = await service.getAsset(assetId);

      expect(updated?.id).toBe(original?.id);
      expect(updated?.tenantId).toBe(original?.tenantId);
      expect(updated?.assetTag).toBe(original?.assetTag);
      expect(updated?.createdBy).toBe(original?.createdBy);
    });

    it('should update updatedAt timestamp', async () => {
      const original = await service.getAsset(assetId);
      await new Promise((r) => setTimeout(r, 10));

      const updated = await service.updateAsset(assetId, { name: 'Updated' });

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        original!.updatedAt.getTime(),
      );
    });

    it('should emit asset.updated event', async () => {
      mockEventEmitter.emit.mockClear();

      await service.updateAsset(assetId, { name: 'Updated' });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'asset.updated',
        expect.objectContaining({
          asset: expect.any(Object),
          previousStatus: 'active',
        }),
      );
    });

    it('should return null for non-existent asset', async () => {
      const updated = await service.updateAsset('non-existent', { name: 'New' });

      expect(updated).toBeNull();
    });
  });

  describe('deleteAsset', () => {
    it('should delete existing asset', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'To Delete',
        category: 'equipment',
        createdBy: userId,
      });

      const deleted = await service.deleteAsset(asset.id);

      expect(deleted).toBe(true);
      expect(await service.getAsset(asset.id)).toBeNull();
    });

    it('should return false for non-existent asset', async () => {
      const deleted = await service.deleteAsset('non-existent');

      expect(deleted).toBe(false);
    });

    it('should emit asset.deleted event', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'To Delete',
        category: 'equipment',
        createdBy: userId,
      });
      mockEventEmitter.emit.mockClear();

      await service.deleteAsset(asset.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'asset.deleted',
        expect.objectContaining({ assetId: asset.id }),
      );
    });
  });

  // =================== ASSET CHECKOUT ===================

  describe('checkoutAsset', () => {
    let assetId: string;

    beforeEach(async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Checkout Test Asset',
        category: 'it_hardware',
        createdBy: userId,
      });
      assetId = asset.id;
    });

    it('should create checkout record', async () => {
      const checkout = await service.checkoutAsset({
        tenantId,
        assetId,
        checkedOutTo: 'user',
        targetId: 'target-user',
        targetName: 'John Doe',
        checkedOutBy: userId,
      });

      expect(checkout).toBeDefined();
      expect(checkout.id).toBeDefined();
      expect(checkout.status).toBe('checked_out');
    });

    it('should update asset assignment for user checkout', async () => {
      await service.checkoutAsset({
        tenantId,
        assetId,
        checkedOutTo: 'user',
        targetId: 'target-user',
        targetName: 'John Doe',
        checkedOutBy: userId,
      });

      const asset = await service.getAsset(assetId);

      expect(asset?.assignedToUserId).toBe('target-user');
      expect(asset?.assignedToUserName).toBe('John Doe');
    });

    it('should update asset location for location checkout', async () => {
      await service.checkoutAsset({
        tenantId,
        assetId,
        checkedOutTo: 'location',
        targetId: 'warehouse-1',
        targetName: 'Main Warehouse',
        checkedOutBy: userId,
      });

      const asset = await service.getAsset(assetId);

      expect(asset?.locationId).toBe('warehouse-1');
      expect(asset?.locationName).toBe('Main Warehouse');
    });

    it('should update asset department for department checkout', async () => {
      await service.checkoutAsset({
        tenantId,
        assetId,
        checkedOutTo: 'department',
        targetId: 'dept-sales',
        targetName: 'Sales Department',
        checkedOutBy: userId,
      });

      const asset = await service.getAsset(assetId);

      expect(asset?.departmentId).toBe('dept-sales');
      expect(asset?.departmentName).toBe('Sales Department');
    });

    it('should throw error for non-existent asset', async () => {
      await expect(
        service.checkoutAsset({
          tenantId,
          assetId: 'non-existent',
          checkedOutTo: 'user',
          targetId: 'user-1',
          targetName: 'User',
          checkedOutBy: userId,
        }),
      ).rejects.toThrow('Asset not found');
    });

    it('should emit asset.checked_out event', async () => {
      mockEventEmitter.emit.mockClear();

      await service.checkoutAsset({
        tenantId,
        assetId,
        checkedOutTo: 'user',
        targetId: 'user-1',
        targetName: 'User',
        checkedOutBy: userId,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'asset.checked_out',
        expect.any(Object),
      );
    });

    it('should accept expected return date', async () => {
      const expectedReturn = new Date('2025-12-31');

      const checkout = await service.checkoutAsset({
        tenantId,
        assetId,
        checkedOutTo: 'user',
        targetId: 'user-1',
        targetName: 'User',
        expectedReturn,
        checkedOutBy: userId,
      });

      expect(checkout.expectedReturn).toEqual(expectedReturn);
    });
  });

  describe('checkinAsset', () => {
    let checkoutId: string;
    let assetId: string;

    beforeEach(async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Checkin Test Asset',
        category: 'it_hardware',
        createdBy: userId,
      });
      assetId = asset.id;

      const checkout = await service.checkoutAsset({
        tenantId,
        assetId,
        checkedOutTo: 'user',
        targetId: 'user-1',
        targetName: 'User',
        checkedOutBy: userId,
      });
      checkoutId = checkout.id;
    });

    it('should checkin asset and set status to returned', async () => {
      const checkout = await service.checkinAsset(checkoutId, {});

      expect(checkout?.status).toBe('returned');
      expect(checkout?.actualReturn).toBeDefined();
    });

    it('should update asset condition if provided', async () => {
      await service.checkinAsset(checkoutId, { condition: 'fair' });

      const asset = await service.getAsset(assetId);

      expect(asset?.condition).toBe('fair');
    });

    it('should return null for non-existent checkout', async () => {
      const checkout = await service.checkinAsset('non-existent', {});

      expect(checkout).toBeNull();
    });

    it('should emit asset.checked_in event', async () => {
      mockEventEmitter.emit.mockClear();

      await service.checkinAsset(checkoutId, {});

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'asset.checked_in',
        expect.any(Object),
      );
    });
  });

  describe('getCheckouts', () => {
    beforeEach(async () => {
      const asset1 = await service.createAsset({
        tenantId,
        name: 'Asset 1',
        category: 'it_hardware',
        createdBy: userId,
      });
      const asset2 = await service.createAsset({
        tenantId,
        name: 'Asset 2',
        category: 'it_hardware',
        createdBy: userId,
      });

      await service.checkoutAsset({
        tenantId,
        assetId: asset1.id,
        checkedOutTo: 'user',
        targetId: 'user-1',
        targetName: 'User 1',
        checkedOutBy: userId,
      });
      await service.checkoutAsset({
        tenantId,
        assetId: asset2.id,
        checkedOutTo: 'department',
        targetId: 'dept-1',
        targetName: 'Dept 1',
        checkedOutBy: userId,
      });
    });

    it('should return all checkouts for tenant', async () => {
      const checkouts = await service.getCheckouts(tenantId);

      expect(checkouts.length).toBe(2);
    });

    it('should filter by asset ID', async () => {
      const all = await service.getCheckouts(tenantId);
      const firstAssetId = all[0].assetId;

      const filtered = await service.getCheckouts(tenantId, {
        assetId: firstAssetId,
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].assetId).toBe(firstAssetId);
    });

    it('should filter by checkedOutTo type', async () => {
      const checkouts = await service.getCheckouts(tenantId, {
        checkedOutTo: 'user',
      });

      checkouts.forEach((c) => expect(c.checkedOutTo).toBe('user'));
    });

    it('should apply limit', async () => {
      const checkouts = await service.getCheckouts(tenantId, { limit: 1 });

      expect(checkouts.length).toBe(1);
    });
  });

  describe('getOverdueCheckouts', () => {
    it('should return checkouts past expected return date', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Overdue Asset',
        category: 'it_hardware',
        createdBy: userId,
      });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      await service.checkoutAsset({
        tenantId,
        assetId: asset.id,
        checkedOutTo: 'user',
        targetId: 'user-1',
        targetName: 'User 1',
        expectedReturn: pastDate,
        checkedOutBy: userId,
      });

      const overdue = await service.getOverdueCheckouts(tenantId);

      expect(overdue.length).toBe(1);
    });

    it('should not include checkouts without expected return', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'No Return Date',
        category: 'it_hardware',
        createdBy: userId,
      });

      await service.checkoutAsset({
        tenantId,
        assetId: asset.id,
        checkedOutTo: 'user',
        targetId: 'user-1',
        targetName: 'User 1',
        checkedOutBy: userId,
      });

      const overdue = await service.getOverdueCheckouts(tenantId);

      expect(overdue.find((c) => c.assetId === asset.id)).toBeUndefined();
    });
  });

  // =================== ASSET CATEGORIES ===================

  describe('Asset Categories', () => {
    const categories: AssetCategory[] = [
      'equipment',
      'vehicle',
      'it_hardware',
      'furniture',
      'building',
      'land',
      'software',
      'intangible',
      'other',
    ];

    categories.forEach((category) => {
      it(`should create asset with ${category} category`, async () => {
        const asset = await service.createAsset({
          tenantId,
          name: `Test ${category}`,
          category,
          createdBy: userId,
        });

        expect(asset.category).toBe(category);
      });
    });
  });

  // =================== ASSET STATUS ===================

  describe('Asset Status', () => {
    const statuses: AssetStatus[] = [
      'active',
      'inactive',
      'maintenance',
      'disposed',
      'lost',
      'pending_disposal',
    ];

    statuses.forEach((status) => {
      it(`should set asset status to ${status}`, async () => {
        const asset = await service.createAsset({
          tenantId,
          name: `Test ${status}`,
          category: 'equipment',
          status,
          createdBy: userId,
        });

        expect(asset.status).toBe(status);
      });
    });
  });

  // =================== ASSET CONDITION ===================

  describe('Asset Condition', () => {
    const conditions: AssetCondition[] = [
      'excellent',
      'good',
      'fair',
      'poor',
      'broken',
    ];

    conditions.forEach((condition) => {
      it(`should set asset condition to ${condition}`, async () => {
        const asset = await service.createAsset({
          tenantId,
          name: `Test ${condition}`,
          category: 'equipment',
          condition,
          createdBy: userId,
        });

        expect(asset.condition).toBe(condition);
      });
    });
  });

  // =================== EDGE CASES ===================

  describe('Edge Cases', () => {
    it('should handle empty tenant assets list', async () => {
      const result = await service.getAssets('empty-tenant');

      // May include system assets
      expect(result.assets).toBeDefined();
    });

    it('should handle asset with all optional fields null', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Minimal Asset',
        category: 'other',
        createdBy: userId,
      });

      expect(asset).toBeDefined();
      expect(asset.description).toBeUndefined();
      expect(asset.serialNumber).toBeUndefined();
    });

    it('should handle very long asset names', async () => {
      const longName = 'A'.repeat(500);
      const asset = await service.createAsset({
        tenantId,
        name: longName,
        category: 'equipment',
        createdBy: userId,
      });

      expect(asset.name).toBe(longName);
    });

    it('should handle special characters in asset name', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Test Asset (Special) - 50% Off! @#$%',
        category: 'equipment',
        createdBy: userId,
      });

      expect(asset.name).toBe('Test Asset (Special) - 50% Off! @#$%');
    });

    it('should handle Romanian diacritics in names', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Echipament pentru ștanțare și prelucrare',
        category: 'equipment',
        createdBy: userId,
      });

      expect(asset.name).toContain('ș');
      expect(asset.name).toContain('ț');
    });

    it('should handle zero purchase price', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Free Asset',
        category: 'equipment',
        purchasePrice: 0,
        createdBy: userId,
      });

      expect(asset.purchasePrice).toBe(0);
      expect(asset.currentValue).toBe(0);
    });

    it('should handle high value assets', async () => {
      const asset = await service.createAsset({
        tenantId,
        name: 'Expensive Asset',
        category: 'building',
        purchasePrice: 50000000,
        createdBy: userId,
      });

      expect(asset.purchasePrice).toBe(50000000);
    });
  });
});
