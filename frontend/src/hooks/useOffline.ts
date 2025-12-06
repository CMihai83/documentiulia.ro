/**
 * useOffline Hook
 * Provides offline status and sync capabilities to components
 */

import { useState, useEffect, useCallback } from 'react';
import { syncService } from '../services/syncService';
import { offlineStorage } from '../services/offlineStorage';

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  syncError: string | null;
}

interface OfflineActions {
  manualSync: () => Promise<void>;
  clearPending: () => Promise<void>;
  getStorageStats: () => Promise<{
    recordCount: number;
    pendingCount: number;
    syncQueueLength: number;
    cacheEntries: number;
  }>;
}

export function useOffline(): OfflineState & OfflineActions {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    syncError: null,
  });

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await syncService.getPendingCount();
      setState(prev => ({ ...prev, pendingCount: count }));
    } catch {
      // Ignore errors
    }
  }, []);

  // Subscribe to sync events
  useEffect(() => {
    const unsubscribe = syncService.subscribe((event) => {
      switch (event.type) {
        case 'start':
          setState(prev => ({
            ...prev,
            isSyncing: true,
            syncError: null,
          }));
          break;
        case 'progress':
          setState(prev => ({
            ...prev,
            pendingCount: (event.total || 0) - (event.synced || 0),
          }));
          break;
        case 'complete':
          setState(prev => ({
            ...prev,
            isSyncing: false,
            lastSyncTime: new Date().toISOString(),
          }));
          updatePendingCount();
          break;
        case 'error':
          setState(prev => ({
            ...prev,
            isSyncing: false,
            syncError: event.error || 'Sync failed',
          }));
          break;
      }
    });

    return () => unsubscribe();
  }, [updatePendingCount]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true, syncError: null }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial count
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updatePendingCount]);

  const manualSync = useCallback(async () => {
    await syncService.sync();
    await updatePendingCount();
  }, [updatePendingCount]);

  const clearPending = useCallback(async () => {
    await offlineStorage.clearAll();
    setState(prev => ({ ...prev, pendingCount: 0 }));
  }, []);

  const getStorageStats = useCallback(async () => {
    return offlineStorage.getStorageStats();
  }, []);

  return {
    ...state,
    manualSync,
    clearPending,
    getStorageStats,
  };
}

export default useOffline;
