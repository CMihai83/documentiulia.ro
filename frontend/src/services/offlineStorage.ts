/**
 * Offline Storage Service using IndexedDB
 * Provides local storage for invoices, expenses, contacts when offline
 */

const DB_NAME = 'documentiulia_offline';
const DB_VERSION = 1;

interface OfflineRecord {
  id: string;
  type: 'invoice' | 'expense' | 'contact' | 'project' | 'product';
  data: Record<string, unknown>;
  syncStatus: 'pending' | 'synced' | 'conflict';
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  type: string;
  endpoint: string;
  payload: Record<string, unknown>;
  retries: number;
  createdAt: string;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private isReady = false;

  async init(): Promise<void> {
    if (this.isReady) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('records')) {
          const recordsStore = db.createObjectStore('records', { keyPath: 'id' });
          recordsStore.createIndex('type', 'type', { unique: false });
          recordsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          recordsStore.createIndex('type_status', ['type', 'syncStatus'], { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  private getStore(
    storeName: string,
    mode: IDBTransactionMode = 'readonly'
  ): IDBObjectStore {
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Record operations
  async saveRecord(record: Omit<OfflineRecord, 'createdAt' | 'updatedAt'>): Promise<void> {
    await this.init();
    const store = this.getStore('records', 'readwrite');
    const now = new Date().toISOString();

    const fullRecord: OfflineRecord = {
      ...record,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(fullRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getRecord(id: string): Promise<OfflineRecord | null> {
    await this.init();
    const store = this.getStore('records');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getRecordsByType(type: string): Promise<OfflineRecord[]> {
    await this.init();
    const store = this.getStore('records');
    const index = store.index('type');

    return new Promise((resolve, reject) => {
      const request = index.getAll(type);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingRecords(): Promise<OfflineRecord[]> {
    await this.init();
    const store = this.getStore('records');
    const index = store.index('syncStatus');

    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecord(id: string): Promise<void> {
    await this.init();
    const store = this.getStore('records', 'readwrite');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(id: string): Promise<void> {
    const record = await this.getRecord(id);
    if (record) {
      record.syncStatus = 'synced';
      record.syncedAt = new Date().toISOString();
      await this.saveRecord(record);
    }
  }

  // Sync queue operations
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>): Promise<string> {
    await this.init();
    const store = this.getStore('syncQueue', 'readwrite');

    const fullItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      retries: 0,
      createdAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(fullItem);
      request.onsuccess = () => resolve(fullItem.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    await this.init();
    const store = this.getStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncItem(id: string): Promise<void> {
    await this.init();
    const store = this.getStore('syncQueue', 'readwrite');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async incrementRetry(id: string): Promise<void> {
    await this.init();
    const store = this.getStore('syncQueue', 'readwrite');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retries++;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Cache operations for API responses
  async setCache(key: string, data: unknown, ttlMinutes = 60): Promise<void> {
    await this.init();
    const store = this.getStore('cache', 'readwrite');

    const cacheEntry = {
      key,
      data,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cacheEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache<T>(key: string): Promise<T | null> {
    await this.init();
    const store = this.getStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && new Date(result.expiresAt) > new Date()) {
          resolve(result.data as T);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<void> {
    await this.init();
    const store = this.getStore('cache', 'readwrite');
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.expiresAt < now) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Metadata operations
  async setMetadata(key: string, value: unknown): Promise<void> {
    await this.init();
    const store = this.getStore('metadata', 'readwrite');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value, updatedAt: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata<T>(key: string): Promise<T | null> {
    await this.init();
    const store = this.getStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Utility methods
  async getStorageStats(): Promise<{
    recordCount: number;
    pendingCount: number;
    syncQueueLength: number;
    cacheEntries: number;
  }> {
    await this.init();

    const [records, pending, syncQueue, cache] = await Promise.all([
      new Promise<number>((resolve) => {
        const request = this.getStore('records').count();
        request.onsuccess = () => resolve(request.result);
      }),
      this.getPendingRecords(),
      this.getSyncQueue(),
      new Promise<number>((resolve) => {
        const request = this.getStore('cache').count();
        request.onsuccess = () => resolve(request.result);
      }),
    ]);

    return {
      recordCount: records,
      pendingCount: pending.length,
      syncQueueLength: syncQueue.length,
      cacheEntries: cache,
    };
  }

  async clearAll(): Promise<void> {
    await this.init();

    const stores = ['records', 'syncQueue', 'cache', 'metadata'];
    await Promise.all(
      stores.map(
        (storeName) =>
          new Promise<void>((resolve, reject) => {
            const request = this.getStore(storeName, 'readwrite').clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
      )
    );
  }
}

export const offlineStorage = new OfflineStorage();
export type { OfflineRecord, SyncQueueItem };
