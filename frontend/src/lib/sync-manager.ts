/**
 * Background Sync Manager
 * 
 * Handles background synchronization of cached data with server
 * Features:
 * - Automatic sync on reconnection
 * - Conflict resolution for concurrent edits
 * - Sync status tracking
 * - Batch operations
 */

import { getMobileApiClient } from './mobile-api-client';
import { getOfflineCache } from './offline-cache';
import type { Clip } from '@/types/clip';
import type { Comment } from '@/types/comment';

// ============================================================================
// Types and Interfaces
// ============================================================================

export const SyncStatus = {
  IDLE: 'IDLE',
  SYNCING: 'SYNCING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
} as const;

export type SyncStatus = typeof SyncStatus[keyof typeof SyncStatus];

export interface SyncState {
  status: SyncStatus;
  lastSyncAt?: number;
  error?: Error;
  isSyncing: boolean;
}

export interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  mergeFunction?: (client: unknown, server: unknown) => unknown;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'clip' | 'comment' | 'vote' | 'favorite';
  data: unknown;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'success' | 'error';
  error?: string;
}

// ============================================================================
// Sync Manager Class
// ============================================================================

export class SyncManager {
  private mobileClient = getMobileApiClient();
  private cache = getOfflineCache();
  private syncState: SyncState = { status: SyncStatus.IDLE, isSyncing: false };
  private listeners: Array<(state: SyncState) => void> = [];
  private syncInterval: number | null = null;
  private pendingOperations: Map<string, SyncOperation> = new Map();

  constructor() {
    this.setupListeners();
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  public async initialize(): Promise<void> {
    await this.cache.init();
    await this.loadPendingOperations();
    
    // Start periodic sync check (every 30 seconds)
    this.startPeriodicSync(30000);
  }

  public getSyncState(): SyncState {
    return { ...this.syncState };
  }

  public onSyncStateChange(listener: (state: SyncState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public async syncNow(): Promise<void> {
    if (this.syncState.isSyncing) {
      console.log('[SyncManager] Sync already in progress');
      return;
    }

    if (!this.mobileClient.isOnline()) {
      console.log('[SyncManager] Cannot sync while offline');
      return;
    }

    await this.performSync();
  }

  public async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const id = `${operation.type}-${operation.entity}-${Date.now()}-${Math.random()}`;
    const syncOp: SyncOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.pendingOperations.set(id, syncOp);
    await this.savePendingOperations();

    // Try to sync immediately if online
    if (this.mobileClient.isOnline()) {
      this.syncNow().catch(err => {
        console.error('[SyncManager] Failed to sync after queuing operation:', err);
      });
    }

    return id;
  }

  public getPendingOperationCount(): number {
    return this.pendingOperations.size;
  }

  public async clearPendingOperations(): Promise<void> {
    this.pendingOperations.clear();
    await this.cache.setMetadata('pendingOperations', []);
  }

  public cleanup(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // ============================================================================
  // Cache Sync Operations
  // ============================================================================

  public async cacheClip(clip: Clip): Promise<void> {
    await this.cache.setClip(clip);
  }

  public async cacheClips(clips: Clip[]): Promise<void> {
    await this.cache.setClips(clips);
  }

  public async cacheComment(comment: Comment): Promise<void> {
    await this.cache.setComment(comment);
  }

  public async cacheComments(comments: Comment[]): Promise<void> {
    await this.cache.setComments(comments);
  }

  public async getCachedClip(clipId: string): Promise<Clip | null> {
    return this.cache.getClip(clipId);
  }

  public async getCachedComments(clipId: string): Promise<Comment[]> {
    return this.cache.getCommentsByClipId(clipId);
  }

  // ============================================================================
  // Private Methods - Sync Logic
  // ============================================================================

  private setupListeners(): void {
    // Listen for online events to trigger sync
    window.addEventListener('online', () => {
      console.log('[SyncManager] Network online, starting sync');
      this.syncNow().catch(err => {
        console.error('[SyncManager] Failed to sync on reconnection:', err);
      });
    });
  }

  private startPeriodicSync(interval: number): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(() => {
      if (this.mobileClient.isOnline() && !this.syncState.isSyncing) {
        this.syncNow().catch(err => {
          console.error('[SyncManager] Periodic sync failed:', err);
        });
      }
    }, interval);
  }

  private async performSync(): Promise<void> {
    this.updateSyncState({
      status: SyncStatus.SYNCING,
      isSyncing: true,
    });

    try {
      console.log('[SyncManager] Starting sync with server');

      // First, sync the mobile client's offline queue (write operations)
      await this.mobileClient.retryOfflineQueue();

      // Then process our pending operations
      await this.processPendingOperations();

      // Clean up expired cache entries
      await this.cache.clearExpired();

      this.updateSyncState({
        status: SyncStatus.SUCCESS,
        isSyncing: false,
        lastSyncAt: Date.now(),
        error: undefined,
      });

      console.log('[SyncManager] Sync completed successfully');
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
      
      this.updateSyncState({
        status: SyncStatus.ERROR,
        isSyncing: false,
        error: error as Error,
      });
    }
  }

  private async processPendingOperations(): Promise<void> {
    if (this.pendingOperations.size === 0) {
      return;
    }

    console.log(`[SyncManager] Processing ${this.pendingOperations.size} pending operations`);

    const operations = Array.from(this.pendingOperations.values());
    const results = await Promise.allSettled(
      operations.map(op => this.executeOperation(op))
    );

    // Remove successful operations
    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      const operation = operations[index];
      
      if (result.status === 'fulfilled') {
        this.pendingOperations.delete(operation.id);
        successCount++;
      } else {
        // Increment retry count
        operation.retryCount++;
        operation.status = 'error';
        operation.error = result.reason?.message || 'Unknown error';
        
        // Remove if max retries reached (3 attempts)
        if (operation.retryCount >= 3) {
          console.error(`[SyncManager] Operation ${operation.id} failed after 3 retries, removing`);
          this.pendingOperations.delete(operation.id);
        }
        
        errorCount++;
      }
    });

    console.log(`[SyncManager] Processed operations: ${successCount} success, ${errorCount} errors`);

    // Save updated pending operations
    await this.savePendingOperations();
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    console.log(`[SyncManager] Executing operation ${operation.type} ${operation.entity}:`, operation.id);
    
    operation.status = 'syncing';

    // This is a placeholder - actual implementation would call the appropriate API
    // For now, we just mark it as successful after a delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    operation.status = 'success';
  }

  private async loadPendingOperations(): Promise<void> {
    try {
      const operations = await this.cache.getMetadata<SyncOperation[]>('pendingOperations');
      if (operations && Array.isArray(operations)) {
        operations.forEach(op => {
          this.pendingOperations.set(op.id, op);
        });
        console.log(`[SyncManager] Loaded ${operations.length} pending operations`);
      }
    } catch (error) {
      console.error('[SyncManager] Failed to load pending operations:', error);
    }
  }

  private async savePendingOperations(): Promise<void> {
    try {
      const operations = Array.from(this.pendingOperations.values());
      await this.cache.setMetadata('pendingOperations', operations);
    } catch (error) {
      console.error('[SyncManager] Failed to save pending operations:', error);
    }
  }

  private updateSyncState(updates: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getSyncState());
      } catch (error) {
        console.error('[SyncManager] Listener error:', error);
      }
    });
  }
}

// ============================================================================
// Conflict Resolution Utilities
// ============================================================================

export function resolveClipConflict(
  clientClip: Clip,
  serverClip: Clip,
  resolution: ConflictResolution = { strategy: 'server-wins' }
): Clip {
  switch (resolution.strategy) {
    case 'client-wins':
      return clientClip;
    
    case 'server-wins':
      return serverClip;
    
    case 'merge':
      // Use custom merge function if provided
      if (resolution.mergeFunction) {
        return resolution.mergeFunction(clientClip, serverClip) as Clip;
      }
      
      // Default merge: take server data but keep client timestamps if newer
      return {
        ...serverClip,
        view_count: Math.max(clientClip.view_count || 0, serverClip.view_count || 0),
        vote_count: Math.max(clientClip.vote_count || 0, serverClip.vote_count || 0),
      };
    
    case 'manual':
      // Return server version and let user handle it
      return serverClip;
    
    default:
      return serverClip;
  }
}

export function resolveCommentConflict(
  clientComment: Comment,
  serverComment: Comment,
  resolution: ConflictResolution = { strategy: 'server-wins' }
): Comment {
  switch (resolution.strategy) {
    case 'client-wins':
      return clientComment;
    
    case 'server-wins':
      return serverComment;
    
    case 'merge':
      // Use custom merge function if provided
      if (resolution.mergeFunction) {
        return resolution.mergeFunction(clientComment, serverComment) as Comment;
      }
      
      // Default merge: take server data but keep client content if updated_at is newer
      const clientUpdated = new Date(clientComment.updated_at || clientComment.created_at).getTime();
      const serverUpdated = new Date(serverComment.updated_at || serverComment.created_at).getTime();
      
      return clientUpdated > serverUpdated ? clientComment : serverComment;
    
    case 'manual':
      return serverComment;
    
    default:
      return serverComment;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}

export function resetSyncManager(): void {
  if (syncManagerInstance) {
    syncManagerInstance.cleanup();
    syncManagerInstance = null;
  }
}

// Export default instance
export const syncManager = getSyncManager();
