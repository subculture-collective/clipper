/**
 * React hooks for offline cache integration
 *
 * Provides hooks to integrate offline cache with React Query and components
 */

import { useState, useEffect, useCallback } from 'react';
import { getOfflineCache } from '@/lib/offline-cache';
import type { Clip } from '@/types/clip';
import type { Comment } from '@/types/comment';

// ============================================================================
// useOfflineCacheInit - Initialize cache on app start
// ============================================================================

export function useOfflineCacheInit() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cache = getOfflineCache();

    cache.init()
      .then(() => {
        setIsReady(true);
        // Clean up expired entries on init
        return cache.clearExpired();
      })
      .catch((err) => {
        console.error('[useOfflineCache] Failed to initialize cache:', err);
        setError(err);
      });
  }, []);

  return { isReady, error };
}

// ============================================================================
// useOfflineCacheStats - Get cache statistics
// ============================================================================

export function useOfflineCacheStats() {
  const [stats, setStats] = useState({ clips: 0, comments: 0, feeds: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const cache = getOfflineCache();
      const newStats = await cache.getStats();
      setStats(newStats);
    } catch (err) {
      console.error('[useOfflineCache] Failed to get stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}

// ============================================================================
// useCachedClip - Get a single clip with cache fallback
// ============================================================================

export function useCachedClip(clipId: string | undefined) {
  const [cachedClip, setCachedClip] = useState<Clip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clipId) {
      queueMicrotask(() => {
        setCachedClip(null);
        setLoading(false);
      });
      return;
    }

    const cache = getOfflineCache();

    cache.getClip(clipId)
      .then((clip) => {
        queueMicrotask(() => {
          setCachedClip(clip);
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error('[useCachedClip] Failed to get clip:', err);
        queueMicrotask(() => {
          setLoading(false);
        });
      });
  }, [clipId]);

  return { cachedClip, loading };
}

// ============================================================================
// useCachedComments - Get comments for a clip with cache fallback
// ============================================================================

export function useCachedComments(clipId: string | undefined) {
  const [cachedComments, setCachedComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clipId) {
      queueMicrotask(() => {
        setCachedComments([]);
        setLoading(false);
      });
      return;
    }

    const cache = getOfflineCache();

    cache.getCommentsByClipId(clipId)
      .then((comments) => {
        queueMicrotask(() => {
          setCachedComments(comments);
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error('[useCachedComments] Failed to get comments:', err);
        queueMicrotask(() => {
          setLoading(false);
        });
      });
  }, [clipId]);

  return { cachedComments, loading };
}

// ============================================================================
// useCachePersist - Persist data to cache
// ============================================================================

export function useCachePersist() {
  const persistClip = useCallback(async (clip: Clip, ttl?: number) => {
    try {
      const cache = getOfflineCache();
      await cache.setClip(clip, ttl);
    } catch (err) {
      console.error('[useCachePersist] Failed to persist clip:', err);
    }
  }, []);

  const persistClips = useCallback(async (clips: Clip[], ttl?: number) => {
    try {
      const cache = getOfflineCache();
      await cache.setClips(clips, ttl);
    } catch (err) {
      console.error('[useCachePersist] Failed to persist clips:', err);
    }
  }, []);

  const persistComment = useCallback(async (comment: Comment, ttl?: number) => {
    try {
      const cache = getOfflineCache();
      await cache.setComment(comment, ttl);
    } catch (err) {
      console.error('[useCachePersist] Failed to persist comment:', err);
    }
  }, []);

  const persistComments = useCallback(async (comments: Comment[], ttl?: number) => {
    try {
      const cache = getOfflineCache();
      await cache.setComments(comments, ttl);
    } catch (err) {
      console.error('[useCachePersist] Failed to persist comments:', err);
    }
  }, []);

  return {
    persistClip,
    persistClips,
    persistComment,
    persistComments,
  };
}

// ============================================================================
// useCacheClear - Clear cache utilities
// ============================================================================

export function useCacheClear() {
  const clearAll = useCallback(async () => {
    try {
      const cache = getOfflineCache();
      await cache.clear();
    } catch (err) {
      console.error('[useCacheClear] Failed to clear cache:', err);
    }
  }, []);

  const clearExpired = useCallback(async () => {
    try {
      const cache = getOfflineCache();
      await cache.clearExpired();
    } catch (err) {
      console.error('[useCacheClear] Failed to clear expired:', err);
    }
  }, []);

  return {
    clearAll,
    clearExpired,
  };
}
