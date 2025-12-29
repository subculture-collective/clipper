/**
 * React hook for background sync manager
 *
 * Provides access to sync state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { getSyncManager } from '@/lib/sync-manager';
import type { SyncState } from '@/lib/sync-manager';

export function useSyncManager() {
  const syncManager = getSyncManager();
  const [syncState, setSyncState] = useState<SyncState>(syncManager.getSyncState());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Subscribe to sync state changes
    const unsubscribe = syncManager.onSyncStateChange((state) => {
      queueMicrotask(() => {
        setSyncState(state);
        setPendingCount(syncManager.getPendingOperationCount());
      });
    });

    // Initialize sync manager
    syncManager.initialize().catch(err => {
      console.error('[useSyncManager] Failed to initialize:', err);
    });

    // Update initial pending count
    queueMicrotask(() => {
      setPendingCount(syncManager.getPendingOperationCount());
    });

    return unsubscribe;
  }, [syncManager]);

  const triggerSync = useCallback(async () => {
    await syncManager.syncNow();
  }, [syncManager]);

  const clearPending = useCallback(async () => {
    await syncManager.clearPendingOperations();
    setPendingCount(0);
  }, [syncManager]);

  return {
    syncState,
    pendingCount,
    triggerSync,
    clearPending,
  };
}
