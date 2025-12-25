import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SyncOperation = 'create' | 'update' | 'delete' | 'patch';
export type ConflictResolutionStrategy = 'client_wins' | 'server_wins' | 'latest_wins' | 'merge' | 'manual';
export type SyncPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed' | 'cancelled';
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface OfflineRecord<T = any> {
  id: string;
  entityType: string;
  entityId: string;
  data: T;
  version: number;
  checksum: string;
  createdAt: Date;
  modifiedAt: Date;
  syncedAt?: Date;
  expiresAt?: Date;
  isDeleted: boolean;
  metadata: Record<string, any>;
}

export interface SyncQueueItem {
  id: string;
  userId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  data: any;
  previousData?: any;
  version: number;
  priority: SyncPriority;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  scheduledAt: Date;
  lastAttemptAt?: Date;
  completedAt?: Date;
  error?: string;
  conflictData?: ConflictData;
  dependencies?: string[]; // IDs of queue items that must complete first
}

export interface ConflictData {
  clientVersion: number;
  serverVersion: number;
  clientData: any;
  serverData: any;
  conflictFields: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  resolutionStrategy?: ConflictResolutionStrategy;
  resolvedData?: any;
}

export interface SyncResult {
  success: boolean;
  itemId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  serverVersion?: number;
  error?: string;
  conflictResolved?: boolean;
}

export interface BatchSyncResult {
  total: number;
  successful: number;
  failed: number;
  conflicts: number;
  skipped: number;
  results: SyncResult[];
  duration: number;
}

export interface OfflineStorageStats {
  totalRecords: number;
  totalSize: number;
  byEntityType: Record<string, { count: number; size: number }>;
  pendingSyncItems: number;
  conflictCount: number;
  oldestRecord?: Date;
  newestRecord?: Date;
}

export interface SyncConfiguration {
  userId: string;
  tenantId: string;
  entityTypes: EntitySyncConfig[];
  conflictStrategy: ConflictResolutionStrategy;
  syncIntervalSeconds: number;
  maxBatchSize: number;
  retryDelaySeconds: number;
  maxRetries: number;
  syncOnReconnect: boolean;
  backgroundSyncEnabled: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface EntitySyncConfig {
  entityType: string;
  syncEnabled: boolean;
  priority: SyncPriority;
  conflictStrategy?: ConflictResolutionStrategy;
  ttlSeconds?: number;
  maxOfflineRecords?: number;
  syncFields?: string[];
  excludeFields?: string[];
}

export interface DeltaSync {
  entityType: string;
  lastSyncVersion: number;
  lastSyncAt: Date;
  changes: DeltaChange[];
}

export interface DeltaChange {
  entityId: string;
  operation: SyncOperation;
  version: number;
  data?: any;
  changedFields?: string[];
  timestamp: Date;
}

export interface MergeResult {
  success: boolean;
  mergedData: any;
  conflictingFields: string[];
  autoResolved: string[];
  manualResolutionRequired: string[];
}

export interface SyncCheckpoint {
  id: string;
  userId: string;
  tenantId: string;
  entityType: string;
  version: number;
  timestamp: Date;
  checksum: string;
}

export interface ConnectionState {
  isOnline: boolean;
  quality: ConnectionQuality;
  latency: number;
  bandwidth?: number;
  lastCheckedAt: Date;
  reconnectedAt?: Date;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

@Injectable()
export class OfflineSyncService {
  private readonly logger = new Logger(OfflineSyncService.name);

  // In-memory storage (would be IndexedDB/SQLite on client, database on server)
  private offlineStore: Map<string, OfflineRecord> = new Map();
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private configurations: Map<string, SyncConfiguration> = new Map();
  private checkpoints: Map<string, SyncCheckpoint> = new Map();
  private connectionStates: Map<string, ConnectionState> = new Map();
  private serverVersions: Map<string, number> = new Map(); // entityType:entityId -> version

  // Conflict resolution handlers
  private conflictHandlers: Map<string, (conflict: ConflictData) => Promise<any>> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeDefaultEntityConfigs();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializeDefaultEntityConfigs(): void {
    // Default entity type configurations
    this.logger.log('Offline sync service initialized');
  }

  // ============================================================================
  // OFFLINE STORAGE MANAGEMENT
  // ============================================================================

  storeOffline<T>(params: {
    userId: string;
    tenantId: string;
    entityType: string;
    entityId: string;
    data: T;
    ttlSeconds?: number;
    metadata?: Record<string, any>;
  }): OfflineRecord<T> {
    const key = this.getStoreKey(params.userId, params.entityType, params.entityId);
    const existing = this.offlineStore.get(key) as OfflineRecord<T> | undefined;

    const record: OfflineRecord<T> = {
      id: key,
      entityType: params.entityType,
      entityId: params.entityId,
      data: params.data,
      version: (existing?.version || 0) + 1,
      checksum: this.calculateChecksum(params.data),
      createdAt: existing?.createdAt || new Date(),
      modifiedAt: new Date(),
      syncedAt: undefined,
      expiresAt: params.ttlSeconds
        ? new Date(Date.now() + params.ttlSeconds * 1000)
        : undefined,
      isDeleted: false,
      metadata: { ...existing?.metadata, ...params.metadata, tenantId: params.tenantId },
    };

    this.offlineStore.set(key, record);
    this.logger.debug(`Stored offline record: ${key} (v${record.version})`);
    return record;
  }

  private getStoreKey(userId: string, entityType: string, entityId: string): string {
    return `${userId}:${entityType}:${entityId}`;
  }

  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  getOfflineRecord<T>(userId: string, entityType: string, entityId: string): OfflineRecord<T> | null {
    const key = this.getStoreKey(userId, entityType, entityId);
    const record = this.offlineStore.get(key) as OfflineRecord<T> | undefined;

    if (!record) return null;

    // Check expiration
    if (record.expiresAt && new Date() > record.expiresAt) {
      this.offlineStore.delete(key);
      return null;
    }

    return record.isDeleted ? null : record;
  }

  getAllOfflineRecords(userId: string, entityType?: string): OfflineRecord[] {
    const records: OfflineRecord[] = [];
    const prefix = entityType ? `${userId}:${entityType}:` : `${userId}:`;

    this.offlineStore.forEach((record, key) => {
      if (key.startsWith(prefix) && !record.isDeleted) {
        // Check expiration
        if (!record.expiresAt || new Date() <= record.expiresAt) {
          records.push(record);
        }
      }
    });

    return records;
  }

  markAsDeleted(userId: string, entityType: string, entityId: string): boolean {
    const key = this.getStoreKey(userId, entityType, entityId);
    const record = this.offlineStore.get(key);
    if (!record) return false;

    record.isDeleted = true;
    record.modifiedAt = new Date();
    record.version++;
    this.offlineStore.set(key, record);
    return true;
  }

  purgeOfflineRecord(userId: string, entityType: string, entityId: string): boolean {
    const key = this.getStoreKey(userId, entityType, entityId);
    return this.offlineStore.delete(key);
  }

  purgeExpiredRecords(): number {
    const now = new Date();
    let purged = 0;

    this.offlineStore.forEach((record, key) => {
      if (record.expiresAt && now > record.expiresAt) {
        this.offlineStore.delete(key);
        purged++;
      }
    });

    this.logger.log(`Purged ${purged} expired offline records`);
    return purged;
  }

  getStorageStats(userId: string): OfflineStorageStats {
    const byEntityType: Record<string, { count: number; size: number }> = {};
    let totalSize = 0;
    let oldestRecord: Date | undefined;
    let newestRecord: Date | undefined;
    let totalRecords = 0;

    this.offlineStore.forEach((record, key) => {
      if (!key.startsWith(`${userId}:`)) return;
      if (record.isDeleted) return;

      totalRecords++;
      const size = JSON.stringify(record.data).length;
      totalSize += size;

      if (!byEntityType[record.entityType]) {
        byEntityType[record.entityType] = { count: 0, size: 0 };
      }
      byEntityType[record.entityType].count++;
      byEntityType[record.entityType].size += size;

      if (!oldestRecord || record.createdAt < oldestRecord) {
        oldestRecord = record.createdAt;
      }
      if (!newestRecord || record.createdAt > newestRecord) {
        newestRecord = record.createdAt;
      }
    });

    const pendingSyncItems = Array.from(this.syncQueue.values())
      .filter((item) => item.userId === userId && item.status === 'pending').length;
    const conflictCount = Array.from(this.syncQueue.values())
      .filter((item) => item.userId === userId && item.status === 'conflict').length;

    return {
      totalRecords,
      totalSize,
      byEntityType,
      pendingSyncItems,
      conflictCount,
      oldestRecord,
      newestRecord,
    };
  }

  // ============================================================================
  // SYNC QUEUE MANAGEMENT
  // ============================================================================

  queueForSync(params: {
    userId: string;
    tenantId: string;
    entityType: string;
    entityId: string;
    operation: SyncOperation;
    data: any;
    previousData?: any;
    priority?: SyncPriority;
    dependencies?: string[];
  }): SyncQueueItem {
    const id = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config = this.getConfiguration(params.userId);
    const entityConfig = config?.entityTypes.find((e) => e.entityType === params.entityType);

    const item: SyncQueueItem = {
      id,
      userId: params.userId,
      tenantId: params.tenantId,
      entityType: params.entityType,
      entityId: params.entityId,
      operation: params.operation,
      data: params.data,
      previousData: params.previousData,
      version: this.getNextVersion(params.entityType, params.entityId),
      priority: params.priority || entityConfig?.priority || 'normal',
      status: 'pending',
      retryCount: 0,
      maxRetries: config?.maxRetries || 3,
      createdAt: new Date(),
      scheduledAt: new Date(),
      dependencies: params.dependencies,
    };

    this.syncQueue.set(id, item);
    this.logger.debug(`Queued sync item: ${id} (${params.operation} ${params.entityType}:${params.entityId})`);
    return item;
  }

  private getNextVersion(entityType: string, entityId: string): number {
    const key = `${entityType}:${entityId}`;
    const current = this.serverVersions.get(key) || 0;
    const next = current + 1;
    this.serverVersions.set(key, next);
    return next;
  }

  getSyncQueueItem(itemId: string): SyncQueueItem | null {
    return this.syncQueue.get(itemId) || null;
  }

  getPendingSyncItems(userId: string, entityType?: string): SyncQueueItem[] {
    const items: SyncQueueItem[] = [];

    this.syncQueue.forEach((item) => {
      if (item.userId === userId && item.status === 'pending') {
        if (!entityType || item.entityType === entityType) {
          items.push(item);
        }
      }
    });

    // Sort by priority and creation time
    return items.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3, background: 4 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  cancelSyncItem(itemId: string): boolean {
    const item = this.syncQueue.get(itemId);
    if (!item || item.status !== 'pending') return false;

    item.status = 'cancelled';
    this.syncQueue.set(itemId, item);
    return true;
  }

  retrySyncItem(itemId: string): SyncQueueItem | null {
    const item = this.syncQueue.get(itemId);
    if (!item || (item.status !== 'failed' && item.status !== 'conflict')) return null;

    item.status = 'pending';
    item.retryCount++;
    item.scheduledAt = new Date();
    item.error = undefined;
    this.syncQueue.set(itemId, item);
    return item;
  }

  clearSyncQueue(userId: string, status?: SyncStatus): number {
    let cleared = 0;

    this.syncQueue.forEach((item, id) => {
      if (item.userId === userId && (!status || item.status === status)) {
        this.syncQueue.delete(id);
        cleared++;
      }
    });

    return cleared;
  }

  // ============================================================================
  // SYNC EXECUTION
  // ============================================================================

  async syncItem(itemId: string): Promise<SyncResult> {
    const item = this.syncQueue.get(itemId);
    if (!item) {
      return { success: false, itemId, entityType: '', entityId: '', operation: 'update', error: 'Item not found' };
    }

    item.status = 'syncing';
    item.lastAttemptAt = new Date();
    this.syncQueue.set(itemId, item);

    try {
      // Check for conflicts
      const serverVersion = this.serverVersions.get(`${item.entityType}:${item.entityId}`) || 0;

      if (serverVersion > 0 && item.version <= serverVersion && item.operation !== 'create') {
        // Potential conflict - simulate server data fetch
        const conflict = await this.detectConflict(item, serverVersion);
        if (conflict) {
          item.status = 'conflict';
          item.conflictData = conflict;
          this.syncQueue.set(itemId, item);
          return {
            success: false,
            itemId,
            entityType: item.entityType,
            entityId: item.entityId,
            operation: item.operation,
            error: 'Conflict detected',
            conflictResolved: false,
          };
        }
      }

      // Simulate sync to server
      const result = await this.performSync(item);

      if (result.success) {
        item.status = 'synced';
        item.completedAt = new Date();
        this.serverVersions.set(`${item.entityType}:${item.entityId}`, result.serverVersion || item.version);

        // Update offline record sync status
        const storeKey = this.getStoreKey(item.userId, item.entityType, item.entityId);
        const record = this.offlineStore.get(storeKey);
        if (record) {
          record.syncedAt = new Date();
          record.version = result.serverVersion || item.version;
          this.offlineStore.set(storeKey, record);
        }
      } else {
        item.status = 'failed';
        item.error = result.error;
      }

      this.syncQueue.set(itemId, item);
      return result;
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : 'Unknown error';
      this.syncQueue.set(itemId, item);

      return {
        success: false,
        itemId,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        error: item.error,
      };
    }
  }

  private async detectConflict(item: SyncQueueItem, serverVersion: number): Promise<ConflictData | null> {
    // Simulate conflict detection
    // In real implementation, would compare with actual server data
    if (item.version < serverVersion) {
      const serverData = { ...item.data, _serverModified: true };
      const conflictFields = this.findConflictingFields(item.data, serverData);

      if (conflictFields.length > 0) {
        return {
          clientVersion: item.version,
          serverVersion,
          clientData: item.data,
          serverData,
          conflictFields,
          detectedAt: new Date(),
        };
      }
    }
    return null;
  }

  private findConflictingFields(clientData: any, serverData: any): string[] {
    const conflicts: string[] = [];
    const allKeys = new Set([...Object.keys(clientData || {}), ...Object.keys(serverData || {})]);

    allKeys.forEach((key) => {
      if (key.startsWith('_')) return; // Skip metadata fields
      if (JSON.stringify(clientData?.[key]) !== JSON.stringify(serverData?.[key])) {
        conflicts.push(key);
      }
    });

    return conflicts;
  }

  private async performSync(item: SyncQueueItem): Promise<SyncResult> {
    // Simulate sync operation with 95% success rate
    const success = Math.random() < 0.95;
    const serverVersion = item.version + 1;

    return {
      success,
      itemId: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      serverVersion: success ? serverVersion : undefined,
      error: success ? undefined : 'Simulated sync failure',
    };
  }

  async syncBatch(userId: string, maxItems?: number): Promise<BatchSyncResult> {
    const startTime = Date.now();
    const items = this.getPendingSyncItems(userId).slice(0, maxItems || 50);
    const results: SyncResult[] = [];

    let successful = 0;
    let failed = 0;
    let conflicts = 0;
    let skipped = 0;

    for (const item of items) {
      // Check dependencies
      if (item.dependencies?.length) {
        const depsComplete = item.dependencies.every((depId) => {
          const dep = this.syncQueue.get(depId);
          return dep && dep.status === 'synced';
        });
        if (!depsComplete) {
          skipped++;
          continue;
        }
      }

      const result = await this.syncItem(item.id);
      results.push(result);

      if (result.success) {
        successful++;
      } else if (result.error === 'Conflict detected') {
        conflicts++;
      } else {
        failed++;
      }
    }

    return {
      total: items.length,
      successful,
      failed,
      conflicts,
      skipped,
      results,
      duration: Date.now() - startTime,
    };
  }

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  async resolveConflict(
    itemId: string,
    strategy: ConflictResolutionStrategy,
    manualData?: any,
  ): Promise<SyncResult> {
    const item = this.syncQueue.get(itemId);
    if (!item || item.status !== 'conflict' || !item.conflictData) {
      return {
        success: false,
        itemId,
        entityType: '',
        entityId: '',
        operation: 'update',
        error: 'No conflict to resolve',
      };
    }

    let resolvedData: any;

    switch (strategy) {
      case 'client_wins':
        resolvedData = item.conflictData.clientData;
        break;
      case 'server_wins':
        resolvedData = item.conflictData.serverData;
        break;
      case 'latest_wins':
        // Compare timestamps if available
        resolvedData = item.conflictData.clientData;
        break;
      case 'merge':
        const mergeResult = this.mergeData(item.conflictData);
        if (!mergeResult.success) {
          return {
            success: false,
            itemId,
            entityType: item.entityType,
            entityId: item.entityId,
            operation: item.operation,
            error: `Merge failed: ${mergeResult.manualResolutionRequired.join(', ')} require manual resolution`,
          };
        }
        resolvedData = mergeResult.mergedData;
        break;
      case 'manual':
        if (!manualData) {
          return {
            success: false,
            itemId,
            entityType: item.entityType,
            entityId: item.entityId,
            operation: item.operation,
            error: 'Manual data required for manual resolution',
          };
        }
        resolvedData = manualData;
        break;
    }

    item.conflictData.resolvedAt = new Date();
    item.conflictData.resolutionStrategy = strategy;
    item.conflictData.resolvedData = resolvedData;
    item.data = resolvedData;
    item.version = item.conflictData.serverVersion + 1;
    item.status = 'pending';
    this.syncQueue.set(itemId, item);

    // Retry sync with resolved data
    return this.syncItem(itemId);
  }

  private mergeData(conflict: ConflictData): MergeResult {
    const merged: any = { ...conflict.serverData };
    const autoResolved: string[] = [];
    const manualRequired: string[] = [];

    conflict.conflictFields.forEach((field) => {
      const clientValue = conflict.clientData[field];
      const serverValue = conflict.serverData[field];

      // Simple merge rules
      if (clientValue === undefined || clientValue === null) {
        merged[field] = serverValue;
        autoResolved.push(field);
      } else if (serverValue === undefined || serverValue === null) {
        merged[field] = clientValue;
        autoResolved.push(field);
      } else if (Array.isArray(clientValue) && Array.isArray(serverValue)) {
        // Merge arrays (union)
        merged[field] = [...new Set([...serverValue, ...clientValue])];
        autoResolved.push(field);
      } else if (typeof clientValue === 'object' && typeof serverValue === 'object') {
        // Nested objects need manual resolution
        manualRequired.push(field);
      } else {
        // Primitive conflict - needs manual resolution
        manualRequired.push(field);
      }
    });

    return {
      success: manualRequired.length === 0,
      mergedData: merged,
      conflictingFields: conflict.conflictFields,
      autoResolved,
      manualResolutionRequired: manualRequired,
    };
  }

  registerConflictHandler(entityType: string, handler: (conflict: ConflictData) => Promise<any>): void {
    this.conflictHandlers.set(entityType, handler);
  }

  getConflicts(userId: string): SyncQueueItem[] {
    return Array.from(this.syncQueue.values())
      .filter((item) => item.userId === userId && item.status === 'conflict');
  }

  // ============================================================================
  // DELTA SYNC
  // ============================================================================

  getDeltaChanges(userId: string, entityType: string, sinceVersion: number): DeltaSync {
    const changes: DeltaChange[] = [];
    const prefix = `${userId}:${entityType}:`;

    this.offlineStore.forEach((record, key) => {
      if (!key.startsWith(prefix)) return;
      if (record.version > sinceVersion) {
        changes.push({
          entityId: record.entityId,
          operation: record.isDeleted ? 'delete' : 'update',
          version: record.version,
          data: record.isDeleted ? undefined : record.data,
          timestamp: record.modifiedAt,
        });
      }
    });

    // Sort by version
    changes.sort((a, b) => a.version - b.version);

    return {
      entityType,
      lastSyncVersion: sinceVersion,
      lastSyncAt: new Date(),
      changes,
    };
  }

  applyDeltaChanges(userId: string, delta: DeltaSync): { applied: number; conflicts: number } {
    let applied = 0;
    let conflicts = 0;

    for (const change of delta.changes) {
      const key = this.getStoreKey(userId, delta.entityType, change.entityId);
      const existing = this.offlineStore.get(key);

      if (existing && existing.version >= change.version) {
        conflicts++;
        continue;
      }

      if (change.operation === 'delete') {
        if (existing) {
          existing.isDeleted = true;
          existing.version = change.version;
          existing.modifiedAt = change.timestamp;
          this.offlineStore.set(key, existing);
        }
      } else if (change.data) {
        this.offlineStore.set(key, {
          id: key,
          entityType: delta.entityType,
          entityId: change.entityId,
          data: change.data,
          version: change.version,
          checksum: this.calculateChecksum(change.data),
          createdAt: existing?.createdAt || change.timestamp,
          modifiedAt: change.timestamp,
          syncedAt: new Date(),
          isDeleted: false,
          metadata: existing?.metadata || {},
        });
      }
      applied++;
    }

    return { applied, conflicts };
  }

  // ============================================================================
  // CHECKPOINTS
  // ============================================================================

  createCheckpoint(userId: string, tenantId: string, entityType: string): SyncCheckpoint {
    const records = this.getAllOfflineRecords(userId, entityType);
    const maxVersion = records.reduce((max, r) => Math.max(max, r.version), 0);
    const dataToHash = records.map((r) => `${r.entityId}:${r.version}`).join('|');

    const checkpoint: SyncCheckpoint = {
      id: `checkpoint-${Date.now()}`,
      userId,
      tenantId,
      entityType,
      version: maxVersion,
      timestamp: new Date(),
      checksum: this.calculateChecksum(dataToHash),
    };

    const key = `${userId}:${entityType}`;
    this.checkpoints.set(key, checkpoint);
    return checkpoint;
  }

  getCheckpoint(userId: string, entityType: string): SyncCheckpoint | null {
    return this.checkpoints.get(`${userId}:${entityType}`) || null;
  }

  validateCheckpoint(userId: string, entityType: string): { valid: boolean; currentChecksum: string; storedChecksum: string } {
    const checkpoint = this.getCheckpoint(userId, entityType);
    if (!checkpoint) {
      return { valid: false, currentChecksum: '', storedChecksum: '' };
    }

    const records = this.getAllOfflineRecords(userId, entityType);
    const dataToHash = records.map((r) => `${r.entityId}:${r.version}`).join('|');
    const currentChecksum = this.calculateChecksum(dataToHash);

    return {
      valid: currentChecksum === checkpoint.checksum,
      currentChecksum,
      storedChecksum: checkpoint.checksum,
    };
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  setConfiguration(config: SyncConfiguration): void {
    this.configurations.set(config.userId, config);
  }

  getConfiguration(userId: string): SyncConfiguration | null {
    return this.configurations.get(userId) || null;
  }

  updateEntityConfig(userId: string, entityConfig: EntitySyncConfig): boolean {
    const config = this.configurations.get(userId);
    if (!config) return false;

    const index = config.entityTypes.findIndex((e) => e.entityType === entityConfig.entityType);
    if (index >= 0) {
      config.entityTypes[index] = entityConfig;
    } else {
      config.entityTypes.push(entityConfig);
    }

    this.configurations.set(userId, config);
    return true;
  }

  // ============================================================================
  // CONNECTION STATE
  // ============================================================================

  updateConnectionState(userId: string, state: Partial<ConnectionState>): ConnectionState {
    const current = this.connectionStates.get(userId) || {
      isOnline: true,
      quality: 'good' as ConnectionQuality,
      latency: 0,
      lastCheckedAt: new Date(),
    };

    const wasOffline = !current.isOnline;
    const updated: ConnectionState = {
      ...current,
      ...state,
      lastCheckedAt: new Date(),
    };

    if (wasOffline && updated.isOnline) {
      updated.reconnectedAt = new Date();
    }

    this.connectionStates.set(userId, updated);
    return updated;
  }

  getConnectionState(userId: string): ConnectionState {
    return this.connectionStates.get(userId) || {
      isOnline: true,
      quality: 'good',
      latency: 0,
      lastCheckedAt: new Date(),
    };
  }

  shouldSync(userId: string): boolean {
    const connection = this.getConnectionState(userId);
    const config = this.getConfiguration(userId);

    if (!connection.isOnline) return false;
    if (connection.quality === 'poor' && config?.backgroundSyncEnabled === false) return false;

    return true;
  }

  // ============================================================================
  // BACKGROUND SYNC
  // ============================================================================

  async performBackgroundSync(userId: string): Promise<BatchSyncResult | null> {
    if (!this.shouldSync(userId)) {
      return null;
    }

    const config = this.getConfiguration(userId);
    const maxBatch = config?.maxBatchSize || 20;

    return this.syncBatch(userId, maxBatch);
  }

  getNextSyncTime(userId: string): Date {
    const config = this.getConfiguration(userId);
    const interval = config?.syncIntervalSeconds || 300;
    return new Date(Date.now() + interval * 1000);
  }

  // ============================================================================
  // DATA COMPRESSION & ENCRYPTION (Stubs)
  // ============================================================================

  compressData(data: any): { compressed: string; originalSize: number; compressedSize: number } {
    const original = JSON.stringify(data);
    // Simple stub - in real impl would use actual compression
    const compressed = Buffer.from(original).toString('base64');
    return {
      compressed,
      originalSize: original.length,
      compressedSize: compressed.length,
    };
  }

  decompressData(compressed: string): any {
    const decompressed = Buffer.from(compressed, 'base64').toString('utf-8');
    return JSON.parse(decompressed);
  }

  encryptData(data: any, key: string): string {
    // Stub - in real impl would use actual encryption
    const json = JSON.stringify(data);
    return Buffer.from(json).toString('base64');
  }

  decryptData(encrypted: string, key: string): any {
    // Stub - in real impl would use actual decryption
    const json = Buffer.from(encrypted, 'base64').toString('utf-8');
    return JSON.parse(json);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  getSyncQueueStats(userId: string): {
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    conflicts: number;
    byEntityType: Record<string, number>;
  } {
    const stats = {
      pending: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
      conflicts: 0,
      byEntityType: {} as Record<string, number>,
    };

    this.syncQueue.forEach((item) => {
      if (item.userId !== userId) return;

      stats[item.status as keyof typeof stats]++;
      if (typeof stats.byEntityType[item.entityType] !== 'number') {
        stats.byEntityType[item.entityType] = 0;
      }
      stats.byEntityType[item.entityType]++;
    });

    return stats;
  }

  exportOfflineData(userId: string): { records: OfflineRecord[]; queue: SyncQueueItem[]; checkpoints: SyncCheckpoint[] } {
    const records = this.getAllOfflineRecords(userId);
    const queue = Array.from(this.syncQueue.values()).filter((i) => i.userId === userId);
    const checkpoints = Array.from(this.checkpoints.values()).filter((c) => c.userId === userId);

    return { records, queue, checkpoints };
  }

  importOfflineData(userId: string, data: { records: OfflineRecord[]; queue: SyncQueueItem[]; checkpoints: SyncCheckpoint[] }): {
    recordsImported: number;
    queueImported: number;
    checkpointsImported: number;
  } {
    let recordsImported = 0;
    let queueImported = 0;
    let checkpointsImported = 0;

    data.records.forEach((record) => {
      const key = this.getStoreKey(userId, record.entityType, record.entityId);
      this.offlineStore.set(key, record);
      recordsImported++;
    });

    data.queue.forEach((item) => {
      this.syncQueue.set(item.id, item);
      queueImported++;
    });

    data.checkpoints.forEach((cp) => {
      this.checkpoints.set(`${userId}:${cp.entityType}`, cp);
      checkpointsImported++;
    });

    return { recordsImported, queueImported, checkpointsImported };
  }
}
