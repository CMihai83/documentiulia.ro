import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  OfflineSyncService,
  OfflineRecord,
  SyncQueueItem,
  SyncResult,
  BatchSyncResult,
  ConflictResolutionStrategy,
  SyncPriority,
  SyncOperation,
  SyncConfiguration,
  EntitySyncConfig,
  DeltaSync,
  SyncCheckpoint,
  ConnectionState,
  ConnectionQuality,
  OfflineStorageStats,
  ConflictData,
} from './offline-sync.service';

// ============================================================================
// DTOs
// ============================================================================

class StoreOfflineDto {
  userId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  data: any;
  ttlSeconds?: number;
  metadata?: Record<string, any>;
}

class QueueForSyncDto {
  userId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  data: any;
  previousData?: any;
  priority?: SyncPriority;
  dependencies?: string[];
}

class ResolveConflictDto {
  strategy: ConflictResolutionStrategy;
  manualData?: any;
}

class SetConfigurationDto {
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

class UpdateEntityConfigDto {
  entityType: string;
  syncEnabled: boolean;
  priority: SyncPriority;
  conflictStrategy?: ConflictResolutionStrategy;
  ttlSeconds?: number;
  maxOfflineRecords?: number;
  syncFields?: string[];
  excludeFields?: string[];
}

class UpdateConnectionStateDto {
  isOnline?: boolean;
  quality?: ConnectionQuality;
  latency?: number;
  bandwidth?: number;
}

class ApplyDeltaChangesDto {
  userId: string;
  delta: DeltaSync;
}

class ImportDataDto {
  userId: string;
  data: {
    records: OfflineRecord[];
    queue: SyncQueueItem[];
    checkpoints: SyncCheckpoint[];
  };
}

class CompressDataDto {
  data: any;
}

class EncryptDataDto {
  data: any;
  key: string;
}

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller('offline-sync')
export class OfflineSyncController {
  constructor(private readonly offlineSyncService: OfflineSyncService) {}

  // ==========================================================================
  // OFFLINE STORAGE
  // ==========================================================================

  @Post('store')
  storeOffline(@Body() dto: StoreOfflineDto): OfflineRecord {
    return this.offlineSyncService.storeOffline(dto);
  }

  @Get('record/:userId/:entityType/:entityId')
  getOfflineRecord(
    @Param('userId') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): OfflineRecord | null {
    return this.offlineSyncService.getOfflineRecord(userId, entityType, entityId);
  }

  @Get('records/:userId')
  getAllOfflineRecords(
    @Param('userId') userId: string,
    @Query('entityType') entityType?: string,
  ): OfflineRecord[] {
    return this.offlineSyncService.getAllOfflineRecords(userId, entityType);
  }

  @Delete('record/:userId/:entityType/:entityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsDeleted(
    @Param('userId') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): void {
    this.offlineSyncService.markAsDeleted(userId, entityType, entityId);
  }

  @Delete('record/:userId/:entityType/:entityId/purge')
  @HttpCode(HttpStatus.NO_CONTENT)
  purgeOfflineRecord(
    @Param('userId') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): void {
    this.offlineSyncService.purgeOfflineRecord(userId, entityType, entityId);
  }

  @Post('purge-expired')
  purgeExpiredRecords(): { purged: number } {
    const purged = this.offlineSyncService.purgeExpiredRecords();
    return { purged };
  }

  @Get('stats/:userId')
  getStorageStats(@Param('userId') userId: string): OfflineStorageStats {
    return this.offlineSyncService.getStorageStats(userId);
  }

  // ==========================================================================
  // SYNC QUEUE
  // ==========================================================================

  @Post('queue')
  queueForSync(@Body() dto: QueueForSyncDto): SyncQueueItem {
    return this.offlineSyncService.queueForSync(dto);
  }

  @Get('queue/item/:itemId')
  getSyncQueueItem(@Param('itemId') itemId: string): SyncQueueItem | null {
    return this.offlineSyncService.getSyncQueueItem(itemId);
  }

  @Get('queue/pending/:userId')
  getPendingSyncItems(
    @Param('userId') userId: string,
    @Query('entityType') entityType?: string,
  ): SyncQueueItem[] {
    return this.offlineSyncService.getPendingSyncItems(userId, entityType);
  }

  @Delete('queue/item/:itemId')
  cancelSyncItem(@Param('itemId') itemId: string): { success: boolean } {
    const result = this.offlineSyncService.cancelSyncItem(itemId);
    return { success: result };
  }

  @Post('queue/item/:itemId/retry')
  retrySyncItem(@Param('itemId') itemId: string): SyncQueueItem | null {
    return this.offlineSyncService.retrySyncItem(itemId);
  }

  @Delete('queue/:userId')
  clearSyncQueue(
    @Param('userId') userId: string,
    @Query('status') status?: string,
  ): { cleared: number } {
    const cleared = this.offlineSyncService.clearSyncQueue(userId, status as any);
    return { cleared };
  }

  @Get('queue/stats/:userId')
  getSyncQueueStats(@Param('userId') userId: string): {
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    conflicts: number;
    byEntityType: Record<string, number>;
  } {
    return this.offlineSyncService.getSyncQueueStats(userId);
  }

  // ==========================================================================
  // SYNC EXECUTION
  // ==========================================================================

  @Post('sync/item/:itemId')
  async syncItem(@Param('itemId') itemId: string): Promise<SyncResult> {
    return this.offlineSyncService.syncItem(itemId);
  }

  @Post('sync/batch/:userId')
  async syncBatch(
    @Param('userId') userId: string,
    @Query('maxItems') maxItems?: number,
  ): Promise<BatchSyncResult> {
    return this.offlineSyncService.syncBatch(userId, maxItems);
  }

  @Post('sync/background/:userId')
  async performBackgroundSync(@Param('userId') userId: string): Promise<BatchSyncResult | null> {
    return this.offlineSyncService.performBackgroundSync(userId);
  }

  @Get('sync/next-time/:userId')
  getNextSyncTime(@Param('userId') userId: string): { nextSyncTime: Date } {
    return { nextSyncTime: this.offlineSyncService.getNextSyncTime(userId) };
  }

  @Get('sync/should-sync/:userId')
  shouldSync(@Param('userId') userId: string): { shouldSync: boolean } {
    return { shouldSync: this.offlineSyncService.shouldSync(userId) };
  }

  // ==========================================================================
  // CONFLICT RESOLUTION
  // ==========================================================================

  @Post('conflicts/:itemId/resolve')
  async resolveConflict(
    @Param('itemId') itemId: string,
    @Body() dto: ResolveConflictDto,
  ): Promise<SyncResult> {
    return this.offlineSyncService.resolveConflict(itemId, dto.strategy, dto.manualData);
  }

  @Get('conflicts/:userId')
  getConflicts(@Param('userId') userId: string): SyncQueueItem[] {
    return this.offlineSyncService.getConflicts(userId);
  }

  // ==========================================================================
  // DELTA SYNC
  // ==========================================================================

  @Get('delta/:userId/:entityType')
  getDeltaChanges(
    @Param('userId') userId: string,
    @Param('entityType') entityType: string,
    @Query('sinceVersion') sinceVersion: number,
  ): DeltaSync {
    return this.offlineSyncService.getDeltaChanges(userId, entityType, sinceVersion || 0);
  }

  @Post('delta/apply')
  applyDeltaChanges(@Body() dto: ApplyDeltaChangesDto): { applied: number; conflicts: number } {
    return this.offlineSyncService.applyDeltaChanges(dto.userId, dto.delta);
  }

  // ==========================================================================
  // CHECKPOINTS
  // ==========================================================================

  @Post('checkpoints/:userId/:tenantId/:entityType')
  createCheckpoint(
    @Param('userId') userId: string,
    @Param('tenantId') tenantId: string,
    @Param('entityType') entityType: string,
  ): SyncCheckpoint {
    return this.offlineSyncService.createCheckpoint(userId, tenantId, entityType);
  }

  @Get('checkpoints/:userId/:entityType')
  getCheckpoint(
    @Param('userId') userId: string,
    @Param('entityType') entityType: string,
  ): SyncCheckpoint | null {
    return this.offlineSyncService.getCheckpoint(userId, entityType);
  }

  @Get('checkpoints/:userId/:entityType/validate')
  validateCheckpoint(
    @Param('userId') userId: string,
    @Param('entityType') entityType: string,
  ): { valid: boolean; currentChecksum: string; storedChecksum: string } {
    return this.offlineSyncService.validateCheckpoint(userId, entityType);
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  @Put('config')
  setConfiguration(@Body() dto: SetConfigurationDto): { success: boolean } {
    this.offlineSyncService.setConfiguration(dto);
    return { success: true };
  }

  @Get('config/:userId')
  getConfiguration(@Param('userId') userId: string): SyncConfiguration | null {
    return this.offlineSyncService.getConfiguration(userId);
  }

  @Put('config/:userId/entity')
  updateEntityConfig(
    @Param('userId') userId: string,
    @Body() dto: UpdateEntityConfigDto,
  ): { success: boolean } {
    const result = this.offlineSyncService.updateEntityConfig(userId, dto);
    return { success: result };
  }

  // ==========================================================================
  // CONNECTION STATE
  // ==========================================================================

  @Put('connection/:userId')
  updateConnectionState(
    @Param('userId') userId: string,
    @Body() dto: UpdateConnectionStateDto,
  ): ConnectionState {
    return this.offlineSyncService.updateConnectionState(userId, dto);
  }

  @Get('connection/:userId')
  getConnectionState(@Param('userId') userId: string): ConnectionState {
    return this.offlineSyncService.getConnectionState(userId);
  }

  // ==========================================================================
  // DATA COMPRESSION & ENCRYPTION
  // ==========================================================================

  @Post('compress')
  compressData(@Body() dto: CompressDataDto): { compressed: string; originalSize: number; compressedSize: number } {
    return this.offlineSyncService.compressData(dto.data);
  }

  @Post('decompress')
  decompressData(@Body('compressed') compressed: string): any {
    return this.offlineSyncService.decompressData(compressed);
  }

  @Post('encrypt')
  encryptData(@Body() dto: EncryptDataDto): { encrypted: string } {
    return { encrypted: this.offlineSyncService.encryptData(dto.data, dto.key) };
  }

  @Post('decrypt')
  decryptData(@Body() body: { encrypted: string; key: string }): any {
    return this.offlineSyncService.decryptData(body.encrypted, body.key);
  }

  // ==========================================================================
  // EXPORT / IMPORT
  // ==========================================================================

  @Get('export/:userId')
  exportOfflineData(@Param('userId') userId: string): {
    records: OfflineRecord[];
    queue: SyncQueueItem[];
    checkpoints: SyncCheckpoint[];
  } {
    return this.offlineSyncService.exportOfflineData(userId);
  }

  @Post('import')
  importOfflineData(@Body() dto: ImportDataDto): {
    recordsImported: number;
    queueImported: number;
    checkpointsImported: number;
  } {
    return this.offlineSyncService.importOfflineData(dto.userId, dto.data);
  }
}
