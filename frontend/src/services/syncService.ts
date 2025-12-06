/**
 * Background Sync Service
 * Handles synchronization of offline data when connection is restored
 */

import { offlineStorage, type SyncQueueItem } from './offlineStorage';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
}

interface SyncEventData {
  type: 'start' | 'progress' | 'complete' | 'error';
  synced?: number;
  total?: number;
  error?: string;
}

type SyncListener = (event: SyncEventData) => void;

class SyncService {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private maxRetries = 3;

  constructor() {
    // Set up online/offline listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onOnline());
      window.addEventListener('offline', () => this.onOffline());

      // Check connection periodically
      this.startPeriodicSync();
    }
  }

  private emit(event: SyncEventData): void {
    this.listeners.forEach((listener) => listener(event));
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private onOnline(): void {
    console.log('[SyncService] Connection restored, starting sync');
    this.sync();
  }

  private onOffline(): void {
    console.log('[SyncService] Connection lost');
    this.emit({ type: 'error', error: 'Offline - changes will sync when connected' });
  }

  private startPeriodicSync(): void {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, 5 * 60 * 1000);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync(): Promise<SyncResult> {
    if (this.isSyncing || !navigator.onLine) {
      return { success: false, synced: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    this.emit({ type: 'start' });

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
    };

    try {
      // Get all pending items in queue
      const queue = await offlineStorage.getSyncQueue();

      if (queue.length === 0) {
        this.emit({ type: 'complete', synced: 0, total: 0 });
        return result;
      }

      // Sort by creation time (oldest first)
      queue.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Process each item
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        this.emit({
          type: 'progress',
          synced: result.synced,
          total: queue.length,
        });

        try {
          const syncResult = await this.processQueueItem(item);

          if (syncResult.success) {
            await offlineStorage.removeSyncItem(item.id);
            result.synced++;
          } else if (syncResult.conflict) {
            result.conflicts++;
            // Mark as conflict, don't retry
            await offlineStorage.removeSyncItem(item.id);
          } else {
            // Failed, increment retry count
            if (item.retries >= this.maxRetries) {
              // Max retries reached, remove from queue
              await offlineStorage.removeSyncItem(item.id);
              result.failed++;
            } else {
              await offlineStorage.incrementRetry(item.id);
              result.failed++;
            }
          }
        } catch (error) {
          console.error('[SyncService] Error processing item:', error);
          result.failed++;
        }
      }

      this.emit({
        type: 'complete',
        synced: result.synced,
        total: queue.length,
      });

      result.success = result.failed === 0;
    } catch (error) {
      console.error('[SyncService] Sync error:', error);
      this.emit({ type: 'error', error: 'Sync failed' });
      result.success = false;
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private async processQueueItem(
    item: SyncQueueItem
  ): Promise<{ success: boolean; conflict?: boolean }> {
    const token = localStorage.getItem('token');
    const companyId = localStorage.getItem('companyId');

    if (!token) {
      return { success: false };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    if (companyId) {
      headers['X-Company-ID'] = companyId;
    }

    try {
      let method: string;
      let url = item.endpoint;

      switch (item.action) {
        case 'create':
          method = 'POST';
          break;
        case 'update':
          method = 'PUT';
          break;
        case 'delete':
          method = 'DELETE';
          break;
        default:
          return { success: false };
      }

      const response = await fetch(url, {
        method,
        headers,
        body: item.action !== 'delete' ? JSON.stringify(item.payload) : undefined,
      });

      if (response.ok) {
        // Update local record status
        const recordId = item.payload.id as string;
        if (recordId) {
          await offlineStorage.markSynced(recordId);
        }
        return { success: true };
      }

      if (response.status === 409) {
        // Conflict - server version is different
        return { success: false, conflict: true };
      }

      return { success: false };
    } catch (error) {
      console.error('[SyncService] Request failed:', error);
      return { success: false };
    }
  }

  async queueCreate(
    type: string,
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<string> {
    // Save to local storage first
    const id = data.id as string || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    data.id = id;

    await offlineStorage.saveRecord({
      id,
      type: type as 'invoice' | 'expense' | 'contact' | 'project' | 'product',
      data,
      syncStatus: 'pending',
    });

    // Add to sync queue
    await offlineStorage.addToSyncQueue({
      action: 'create',
      type,
      endpoint,
      payload: data,
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.sync();
    }

    return id;
  }

  async queueUpdate(
    type: string,
    endpoint: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Update local record
    const existing = await offlineStorage.getRecord(id);
    if (existing) {
      await offlineStorage.saveRecord({
        ...existing,
        data: { ...existing.data, ...data },
        syncStatus: 'pending',
      });
    }

    // Add to sync queue
    await offlineStorage.addToSyncQueue({
      action: 'update',
      type,
      endpoint,
      payload: { id, ...data },
    });

    if (navigator.onLine) {
      this.sync();
    }
  }

  async queueDelete(type: string, endpoint: string, id: string): Promise<void> {
    // Add to sync queue first
    await offlineStorage.addToSyncQueue({
      action: 'delete',
      type,
      endpoint,
      payload: { id },
    });

    // Delete local record
    await offlineStorage.deleteRecord(id);

    if (navigator.onLine) {
      this.sync();
    }
  }

  async getPendingCount(): Promise<number> {
    const queue = await offlineStorage.getSyncQueue();
    return queue.length;
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const syncService = new SyncService();
