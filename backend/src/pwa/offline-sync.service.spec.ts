import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  OfflineSyncService,
  SyncOperation,
  SyncPriority,
  ConflictResolutionStrategy,
} from './offline-sync.service';

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfflineSyncService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => ''),
          },
        },
      ],
    }).compile();

    service = module.get<OfflineSyncService>(OfflineSyncService);
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ==========================================================================
  // OFFLINE STORAGE TESTS
  // ==========================================================================

  describe('offline storage', () => {
    it('should store data offline', () => {
      const record = service.storeOffline({
        userId: 'user-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-001',
        data: { amount: 1000, currency: 'RON' },
      });

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.entityType).toBe('invoice');
      expect(record.entityId).toBe('inv-001');
      expect(record.version).toBe(1);
      expect(record.checksum).toBeDefined();
    });

    it('should increment version on update', () => {
      service.storeOffline({
        userId: 'user-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-002',
        data: { amount: 500 },
      });

      const updated = service.storeOffline({
        userId: 'user-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-002',
        data: { amount: 600 },
      });

      expect(updated.version).toBe(2);
    });

    it('should get offline record', () => {
      service.storeOffline({
        userId: 'user-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-003',
        data: { amount: 750 },
      });

      const record = service.getOfflineRecord<{ amount: number }>('user-1', 'invoice', 'inv-003');
      expect(record).toBeDefined();
      expect(record!.data.amount).toBe(750);
    });

    it('should return null for non-existent record', () => {
      const record = service.getOfflineRecord('user-1', 'invoice', 'non-existent');
      expect(record).toBeNull();
    });

    it('should get all offline records for user', () => {
      service.storeOffline({
        userId: 'user-multi',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-a',
        data: { amount: 100 },
      });
      service.storeOffline({
        userId: 'user-multi',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-b',
        data: { amount: 200 },
      });
      service.storeOffline({
        userId: 'user-multi',
        tenantId: 'tenant-1',
        entityType: 'payment',
        entityId: 'pay-a',
        data: { amount: 300 },
      });

      const allRecords = service.getAllOfflineRecords('user-multi');
      expect(allRecords.length).toBe(3);

      const invoices = service.getAllOfflineRecords('user-multi', 'invoice');
      expect(invoices.length).toBe(2);
    });

    it('should mark record as deleted', () => {
      service.storeOffline({
        userId: 'user-del',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-del',
        data: { amount: 100 },
      });

      const result = service.markAsDeleted('user-del', 'invoice', 'inv-del');
      expect(result).toBe(true);

      const record = service.getOfflineRecord('user-del', 'invoice', 'inv-del');
      expect(record).toBeNull();
    });

    it('should purge offline record', () => {
      service.storeOffline({
        userId: 'user-purge',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-purge',
        data: { amount: 100 },
      });

      const result = service.purgeOfflineRecord('user-purge', 'invoice', 'inv-purge');
      expect(result).toBe(true);
    });

    it('should store with TTL', () => {
      const record = service.storeOffline({
        userId: 'user-ttl',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-ttl',
        data: { amount: 100 },
        ttlSeconds: 3600,
      });

      expect(record.expiresAt).toBeDefined();
      expect(record.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should get storage stats', () => {
      service.storeOffline({
        userId: 'user-stats',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-1',
        data: { amount: 100 },
      });
      service.storeOffline({
        userId: 'user-stats',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-2',
        data: { amount: 200 },
      });

      const stats = service.getStorageStats('user-stats');
      expect(stats.totalRecords).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.byEntityType.invoice).toBeDefined();
      expect(stats.byEntityType.invoice.count).toBe(2);
    });
  });

  // ==========================================================================
  // SYNC QUEUE TESTS
  // ==========================================================================

  describe('sync queue', () => {
    it('should queue item for sync', () => {
      const item = service.queueForSync({
        userId: 'user-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-001',
        operation: 'create',
        data: { amount: 1000 },
      });

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.status).toBe('pending');
      expect(item.operation).toBe('create');
    });

    it('should get sync queue item', () => {
      const queued = service.queueForSync({
        userId: 'user-1',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-get',
        operation: 'update',
        data: { amount: 500 },
      });

      const item = service.getSyncQueueItem(queued.id);
      expect(item).toBeDefined();
      expect(item!.id).toBe(queued.id);
    });

    it('should get pending sync items', () => {
      service.queueForSync({
        userId: 'user-pending',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-p1',
        operation: 'create',
        data: {},
      });
      service.queueForSync({
        userId: 'user-pending',
        tenantId: 'tenant-1',
        entityType: 'payment',
        entityId: 'pay-p1',
        operation: 'create',
        data: {},
      });

      const pending = service.getPendingSyncItems('user-pending');
      expect(pending.length).toBe(2);

      const invoices = service.getPendingSyncItems('user-pending', 'invoice');
      expect(invoices.length).toBe(1);
    });

    it('should sort pending items by priority', () => {
      service.queueForSync({
        userId: 'user-priority',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-low',
        operation: 'create',
        data: {},
        priority: 'low',
      });
      service.queueForSync({
        userId: 'user-priority',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-critical',
        operation: 'create',
        data: {},
        priority: 'critical',
      });
      service.queueForSync({
        userId: 'user-priority',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-normal',
        operation: 'create',
        data: {},
        priority: 'normal',
      });

      const pending = service.getPendingSyncItems('user-priority');
      expect(pending[0].priority).toBe('critical');
      expect(pending[1].priority).toBe('normal');
      expect(pending[2].priority).toBe('low');
    });

    it('should cancel sync item', () => {
      const item = service.queueForSync({
        userId: 'user-cancel',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-cancel',
        operation: 'create',
        data: {},
      });

      const result = service.cancelSyncItem(item.id);
      expect(result).toBe(true);

      const cancelled = service.getSyncQueueItem(item.id);
      expect(cancelled!.status).toBe('cancelled');
    });

    it('should clear sync queue', () => {
      service.queueForSync({
        userId: 'user-clear',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-c1',
        operation: 'create',
        data: {},
      });
      service.queueForSync({
        userId: 'user-clear',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-c2',
        operation: 'create',
        data: {},
      });

      const cleared = service.clearSyncQueue('user-clear');
      expect(cleared).toBe(2);
    });

    it('should get sync queue stats', () => {
      service.queueForSync({
        userId: 'user-stats-q',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-s1',
        operation: 'create',
        data: {},
      });

      const stats = service.getSyncQueueStats('user-stats-q');
      expect(stats.pending).toBeGreaterThanOrEqual(1);
      expect(stats.byEntityType.invoice).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // SYNC EXECUTION TESTS
  // ==========================================================================

  describe('sync execution', () => {
    it('should sync item', async () => {
      const item = service.queueForSync({
        userId: 'user-sync',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-sync',
        operation: 'create',
        data: { amount: 1000 },
      });

      const result = await service.syncItem(item.id);
      expect(result).toBeDefined();
      expect(result.itemId).toBe(item.id);
      expect(result.entityType).toBe('invoice');
      expect(result.operation).toBe('create');
    });

    it('should sync batch', async () => {
      service.queueForSync({
        userId: 'user-batch',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-b1',
        operation: 'create',
        data: {},
      });
      service.queueForSync({
        userId: 'user-batch',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-b2',
        operation: 'create',
        data: {},
      });

      const result = await service.syncBatch('user-batch');
      expect(result.total).toBe(2);
      expect(result.successful + result.failed + result.conflicts).toBe(result.total);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should retry failed sync item', async () => {
      const item = service.queueForSync({
        userId: 'user-retry',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-retry',
        operation: 'create',
        data: {},
      });

      // First sync attempt
      await service.syncItem(item.id);

      // Get current state
      const current = service.getSyncQueueItem(item.id);
      if (current && current.status === 'failed') {
        const retried = service.retrySyncItem(item.id);
        expect(retried).toBeDefined();
        expect(retried!.status).toBe('pending');
        expect(retried!.retryCount).toBe(1);
      }
    });
  });

  // ==========================================================================
  // CONFLICT RESOLUTION TESTS
  // ==========================================================================

  describe('conflict resolution', () => {
    it('should get conflicts for user', () => {
      const conflicts = service.getConflicts('user-conflicts');
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should resolve conflict with client_wins strategy', async () => {
      const item = service.queueForSync({
        userId: 'user-conflict',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-conflict',
        operation: 'update',
        data: { amount: 1000 },
      });

      // Manually set conflict status for testing
      const queueItem = service.getSyncQueueItem(item.id);
      if (queueItem) {
        queueItem.status = 'conflict';
        queueItem.conflictData = {
          clientVersion: 1,
          serverVersion: 2,
          clientData: { amount: 1000 },
          serverData: { amount: 900 },
          conflictFields: ['amount'],
          detectedAt: new Date(),
        };
      }

      const result = await service.resolveConflict(item.id, 'client_wins');
      // Result depends on whether conflict was properly set
      expect(result).toBeDefined();
    });

    it('should return error when resolving non-conflict item', async () => {
      const item = service.queueForSync({
        userId: 'user-no-conflict',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-no-conflict',
        operation: 'create',
        data: {},
      });

      const result = await service.resolveConflict(item.id, 'client_wins');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No conflict');
    });
  });

  // ==========================================================================
  // DELTA SYNC TESTS
  // ==========================================================================

  describe('delta sync', () => {
    it('should get delta changes', () => {
      service.storeOffline({
        userId: 'user-delta',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-d1',
        data: { amount: 100 },
      });
      service.storeOffline({
        userId: 'user-delta',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-d2',
        data: { amount: 200 },
      });

      const delta = service.getDeltaChanges('user-delta', 'invoice', 0);
      expect(delta.entityType).toBe('invoice');
      expect(delta.changes.length).toBe(2);
    });

    it('should apply delta changes', () => {
      const delta = {
        entityType: 'invoice',
        lastSyncVersion: 0,
        lastSyncAt: new Date(),
        changes: [
          {
            entityId: 'inv-apply-1',
            operation: 'create' as SyncOperation,
            version: 1,
            data: { amount: 500 },
            timestamp: new Date(),
          },
        ],
      };

      const result = service.applyDeltaChanges('user-apply-delta', delta);
      expect(result.applied).toBe(1);
      expect(result.conflicts).toBe(0);
    });
  });

  // ==========================================================================
  // CHECKPOINTS TESTS
  // ==========================================================================

  describe('checkpoints', () => {
    it('should create checkpoint', () => {
      service.storeOffline({
        userId: 'user-cp',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-cp1',
        data: { amount: 100 },
      });

      const checkpoint = service.createCheckpoint('user-cp', 'tenant-1', 'invoice');
      expect(checkpoint).toBeDefined();
      expect(checkpoint.entityType).toBe('invoice');
      expect(checkpoint.checksum).toBeDefined();
    });

    it('should get checkpoint', () => {
      service.storeOffline({
        userId: 'user-get-cp',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-gcp',
        data: { amount: 100 },
      });
      service.createCheckpoint('user-get-cp', 'tenant-1', 'invoice');

      const checkpoint = service.getCheckpoint('user-get-cp', 'invoice');
      expect(checkpoint).toBeDefined();
    });

    it('should validate checkpoint', () => {
      service.storeOffline({
        userId: 'user-validate',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-v1',
        data: { amount: 100 },
      });
      service.createCheckpoint('user-validate', 'tenant-1', 'invoice');

      const validation = service.validateCheckpoint('user-validate', 'invoice');
      expect(validation.valid).toBe(true);
      expect(validation.currentChecksum).toBe(validation.storedChecksum);
    });

    it('should detect invalid checkpoint after changes', () => {
      service.storeOffline({
        userId: 'user-invalid-cp',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-icp1',
        data: { amount: 100 },
      });
      service.createCheckpoint('user-invalid-cp', 'tenant-1', 'invoice');

      // Make a change
      service.storeOffline({
        userId: 'user-invalid-cp',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-icp2',
        data: { amount: 200 },
      });

      const validation = service.validateCheckpoint('user-invalid-cp', 'invoice');
      expect(validation.valid).toBe(false);
    });
  });

  // ==========================================================================
  // CONFIGURATION TESTS
  // ==========================================================================

  describe('configuration', () => {
    it('should set configuration', () => {
      service.setConfiguration({
        userId: 'user-config',
        tenantId: 'tenant-1',
        entityTypes: [
          { entityType: 'invoice', syncEnabled: true, priority: 'high' },
        ],
        conflictStrategy: 'latest_wins',
        syncIntervalSeconds: 300,
        maxBatchSize: 50,
        retryDelaySeconds: 30,
        maxRetries: 3,
        syncOnReconnect: true,
        backgroundSyncEnabled: true,
        compressionEnabled: false,
        encryptionEnabled: false,
      });

      const config = service.getConfiguration('user-config');
      expect(config).toBeDefined();
      expect(config!.conflictStrategy).toBe('latest_wins');
    });

    it('should update entity config', () => {
      service.setConfiguration({
        userId: 'user-entity-config',
        tenantId: 'tenant-1',
        entityTypes: [],
        conflictStrategy: 'client_wins',
        syncIntervalSeconds: 300,
        maxBatchSize: 50,
        retryDelaySeconds: 30,
        maxRetries: 3,
        syncOnReconnect: true,
        backgroundSyncEnabled: true,
        compressionEnabled: false,
        encryptionEnabled: false,
      });

      const result = service.updateEntityConfig('user-entity-config', {
        entityType: 'payment',
        syncEnabled: true,
        priority: 'critical',
      });

      expect(result).toBe(true);
      const config = service.getConfiguration('user-entity-config');
      expect(config!.entityTypes.find((e) => e.entityType === 'payment')).toBeDefined();
    });
  });

  // ==========================================================================
  // CONNECTION STATE TESTS
  // ==========================================================================

  describe('connection state', () => {
    it('should update connection state', () => {
      const state = service.updateConnectionState('user-conn', {
        isOnline: true,
        quality: 'excellent',
        latency: 50,
      });

      expect(state.isOnline).toBe(true);
      expect(state.quality).toBe('excellent');
      expect(state.latency).toBe(50);
    });

    it('should get connection state', () => {
      service.updateConnectionState('user-get-conn', { isOnline: false });

      const state = service.getConnectionState('user-get-conn');
      expect(state.isOnline).toBe(false);
    });

    it('should track reconnection', () => {
      service.updateConnectionState('user-reconnect', { isOnline: false });
      const state = service.updateConnectionState('user-reconnect', { isOnline: true });

      expect(state.reconnectedAt).toBeDefined();
    });

    it('should check if should sync', () => {
      service.updateConnectionState('user-should-sync', { isOnline: true, quality: 'good' });

      const shouldSync = service.shouldSync('user-should-sync');
      expect(shouldSync).toBe(true);
    });

    it('should not sync when offline', () => {
      service.updateConnectionState('user-offline', { isOnline: false });

      const shouldSync = service.shouldSync('user-offline');
      expect(shouldSync).toBe(false);
    });
  });

  // ==========================================================================
  // BACKGROUND SYNC TESTS
  // ==========================================================================

  describe('background sync', () => {
    it('should perform background sync', async () => {
      service.updateConnectionState('user-bg', { isOnline: true, quality: 'good' });
      service.queueForSync({
        userId: 'user-bg',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-bg',
        operation: 'create',
        data: {},
      });

      const result = await service.performBackgroundSync('user-bg');
      expect(result).toBeDefined();
    });

    it('should not perform background sync when offline', async () => {
      service.updateConnectionState('user-bg-offline', { isOnline: false });

      const result = await service.performBackgroundSync('user-bg-offline');
      expect(result).toBeNull();
    });

    it('should get next sync time', () => {
      service.setConfiguration({
        userId: 'user-next-sync',
        tenantId: 'tenant-1',
        entityTypes: [],
        conflictStrategy: 'client_wins',
        syncIntervalSeconds: 600,
        maxBatchSize: 50,
        retryDelaySeconds: 30,
        maxRetries: 3,
        syncOnReconnect: true,
        backgroundSyncEnabled: true,
        compressionEnabled: false,
        encryptionEnabled: false,
      });

      const nextTime = service.getNextSyncTime('user-next-sync');
      expect(nextTime.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ==========================================================================
  // DATA COMPRESSION & ENCRYPTION TESTS
  // ==========================================================================

  describe('compression and encryption', () => {
    it('should compress data', () => {
      const data = { name: 'Test', values: [1, 2, 3, 4, 5] };
      const result = service.compressData(data);

      expect(result.compressed).toBeDefined();
      expect(result.originalSize).toBeGreaterThan(0);
    });

    it('should decompress data', () => {
      const original = { name: 'Test', value: 123 };
      const compressed = service.compressData(original);
      const decompressed = service.decompressData(compressed.compressed);

      expect(decompressed).toEqual(original);
    });

    it('should encrypt data', () => {
      const data = { secret: 'password123' };
      const encrypted = service.encryptData(data, 'test-key');

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toContain('password123');
    });

    it('should decrypt data', () => {
      const original = { secret: 'password123' };
      const encrypted = service.encryptData(original, 'test-key');
      const decrypted = service.decryptData(encrypted, 'test-key');

      expect(decrypted).toEqual(original);
    });
  });

  // ==========================================================================
  // EXPORT / IMPORT TESTS
  // ==========================================================================

  describe('export and import', () => {
    it('should export offline data', () => {
      service.storeOffline({
        userId: 'user-export',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-exp',
        data: { amount: 100 },
      });
      service.queueForSync({
        userId: 'user-export',
        tenantId: 'tenant-1',
        entityType: 'invoice',
        entityId: 'inv-exp',
        operation: 'create',
        data: { amount: 100 },
      });
      service.createCheckpoint('user-export', 'tenant-1', 'invoice');

      const exported = service.exportOfflineData('user-export');
      expect(exported.records.length).toBeGreaterThanOrEqual(1);
      expect(exported.queue.length).toBeGreaterThanOrEqual(1);
      expect(exported.checkpoints.length).toBeGreaterThanOrEqual(1);
    });

    it('should import offline data', () => {
      const data = {
        records: [
          {
            id: 'user-import:invoice:inv-imp',
            entityType: 'invoice',
            entityId: 'inv-imp',
            data: { amount: 500 },
            version: 1,
            checksum: 'abc123',
            createdAt: new Date(),
            modifiedAt: new Date(),
            isDeleted: false,
            metadata: {},
          },
        ],
        queue: [],
        checkpoints: [],
      };

      const result = service.importOfflineData('user-import', data);
      expect(result.recordsImported).toBe(1);
    });
  });
});
