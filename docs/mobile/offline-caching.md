---
title: "Offline Caching and Background Sync"
summary: "This document describes the offline caching and background sync implementation for the Clipper mobil"
tags: ['mobile']
area: "mobile"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Offline Caching and Background Sync

This document describes the offline caching and background sync implementation for the Clipper mobile web application.

## Overview

The offline caching system provides a robust offline-first experience by:

- Caching viewed clips and comments in IndexedDB for offline access
- Queuing write operations (votes, favorites, comments) when offline
- Automatically syncing queued operations when connectivity is restored
- Providing user feedback on sync status and pending operations

## Architecture

### Components

1. **OfflineCache** (`src/lib/offline-cache.ts`)
   - Normalized entity storage using IndexedDB
   - Stores clips, comments, and feed metadata
   - Automatic cache expiration (default 24 hours)
   - Efficient batch operations

2. **SyncManager** (`src/lib/sync-manager.ts`)
   - Manages background synchronization
   - Queues offline operations
   - Handles conflict resolution
   - Periodic sync (every 30 seconds)

3. **Offline-aware API Wrappers**
   - `offline-clip-api.ts` - Clip operations with cache fallback
   - `offline-comment-api.ts` - Comment operations with cache fallback
   - Optimistic updates for instant UI feedback

4. **React Hooks**
   - `useOfflineCache` - Cache initialization and utilities
   - `useSyncManager` - Sync state and operations
   - `useNetworkStatus` - Network connectivity monitoring

5. **UI Components**
   - `OfflineIndicator` - Visual feedback on offline/sync status

## Features

### 1. Normalized Cache

The cache stores entities by ID with relationships:

- **Clips**: Individual clip details
- **Comments**: Comments with clip_id index
- **Feeds**: List references to clip IDs
- **Metadata**: App state and pending operations

Example:

```typescript
import { getOfflineCache } from '@/lib/offline-cache';

const cache = getOfflineCache();
await cache.init();

// Cache a clip
await cache.setClip(clip);

// Retrieve a clip
const cachedClip = await cache.getClip('clip-id');

// Cache multiple clips
await cache.setClips([clip1, clip2, clip3]);

// Get comments for a clip
const comments = await cache.getCommentsByClipId('clip-id');
```

### 2. Background Sync

Operations are queued when offline and automatically synced:

```typescript
import { getSyncManager } from '@/lib/sync-manager';

const syncManager = getSyncManager();

// Queue an operation
await syncManager.queueOperation({
  type: 'create',
  entity: 'vote',
  data: { clip_id: 'clip-123', vote_type: 1 }
});

// Manual sync trigger
await syncManager.syncNow();

// Subscribe to sync state changes
const unsubscribe = syncManager.onSyncStateChange((state) => {
  console.log('Sync status:', state.status);
  console.log('Pending operations:', state.pendingCount);
});
```

### 3. Conflict Resolution

The system includes conflict resolution strategies:

- **Server-wins** (default): Server data takes precedence
- **Client-wins**: Local changes take precedence
- **Merge**: Intelligent merge of both versions
- **Manual**: Let user resolve the conflict

Example:

```typescript
import { resolveClipConflict } from '@/lib/sync-manager';

const resolved = resolveClipConflict(
  clientClip,
  serverClip,
  { strategy: 'merge' }
);
```

### 4. Optimistic Updates

Write operations update the cache immediately for instant UI feedback:

```typescript
import { voteOnClipOfflineAware } from '@/lib/offline-clip-api';

// Vote is applied to cache immediately
// Operation queued if offline
await voteOnClipOfflineAware('clip-id', 1);
```

### 5. Cache Expiration

Cache entries expire automatically:

- Default TTL: 24 hours
- Custom TTL per operation
- Automatic cleanup on app start and periodically

```typescript
// Set clip with 1 hour TTL
await cache.setClip(clip, 1000 * 60 * 60);

// Clean expired entries
await cache.clearExpired();
```

## Usage

### Initialization

The cache and sync manager are automatically initialized when the app starts via `AppLayout`:

```typescript
// In AppLayout.tsx
useOfflineCacheInit(); // Initializes IndexedDB
useSyncManager();      // Starts sync manager
```

### Using Offline-Aware APIs

Replace standard API calls with offline-aware versions:

```typescript
// Before
import { fetchClipById } from '@/lib/clip-api';
const clip = await fetchClipById('clip-id');

// After
import { fetchClipByIdOfflineAware } from '@/lib/offline-clip-api';
const clip = await fetchClipByIdOfflineAware('clip-id');
```

The offline-aware version:

1. Checks cache first for faster loading
2. Fetches from server if online
3. Updates cache with fresh data
4. Falls back to cache if offline or error

### Using in React Query

Integrate with TanStack Query:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchClipByIdOfflineAware } from '@/lib/offline-clip-api';

function useClip(clipId: string) {
  return useQuery({
    queryKey: ['clip', clipId],
    queryFn: () => fetchClipByIdOfflineAware(clipId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (error.type === 'OFFLINE') return false;
      return failureCount < 3;
    },
  });
}
```

### Network Status Monitoring

Display network status to users:

```typescript
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function MyComponent() {
  const { online, queuedRequestCount } = useNetworkStatus();

  return (
    <div>
      {!online && <div>You are offline</div>}
      {queuedRequestCount > 0 && (
        <div>{queuedRequestCount} operations pending</div>
      )}
    </div>
  );
}
```

## User Experience

### Offline Indicator

The `OfflineIndicator` component provides visual feedback:

**When Offline:**

- Orange banner: "You're offline"
- Shows count of pending operations
- Disappears when back online

**When Syncing:**

- Loading spinner
- "Syncing X changes..."
- Retry button if sync fails

**When Sync Complete:**

- Green checkmark
- "All changes synced"
- Shows last sync time

### Offline Functionality

**What Works Offline:**

- View previously loaded clips
- Read cached comments
- Vote/favorite (queued for sync)
- Post comments (queued for sync)
- Navigate between cached pages

**What Requires Connection:**

- Search
- Loading new content
- Submitting new clips
- Uploading media

## Testing

### Unit Tests

Test the cache layer:

```bash
npm test -- offline-cache.test.ts
```

### Integration Tests

Test offline scenarios:

```typescript
import { render, screen } from '@testing-library/react';
import { server } from './test/mocks/server';

it('shows cached clip when offline', async () => {
  // Go offline
  server.use(
    http.get('/api/v1/clips/:id', () => {
      return new Response(null, { status: 503 });
    })
  );

  // Pre-populate cache
  const cache = getOfflineCache();
  await cache.setClip(mockClip);

  render(<ClipDetailPage />);

  // Should show cached data
  expect(screen.getByText(mockClip.title)).toBeInTheDocument();
});
```

### Manual Testing

1. **Test Offline Access:**
   - Load a clip while online
   - Open DevTools > Network tab
   - Check "Offline" checkbox
   - Navigate to the clip - should load from cache

2. **Test Offline Writes:**
   - Go offline
   - Vote on a clip
   - Post a comment
   - Check OfflineIndicator shows pending operations
   - Go back online
   - Verify operations sync automatically

3. **Test Sync Recovery:**
   - Go offline
   - Perform several operations
   - Close app
   - Reopen app online
   - Verify operations sync on startup

## Performance

### Cache Statistics

Monitor cache usage:

```typescript
import { useOfflineCacheStats } from '@/hooks/useOfflineCache';

function CacheStats() {
  const { stats, loading, refresh } = useOfflineCacheStats();

  return (
    <div>
      <p>Cached clips: {stats.clips}</p>
      <p>Cached comments: {stats.comments}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### Storage Limits

IndexedDB storage limits:

- Desktop Chrome: ~60% of free disk space
- Mobile Safari: 50MB (can request more)
- Mobile Chrome: ~60% of free space

The app manages storage by:

- Expiring old entries (24h default)
- Periodic cleanup
- Allowing manual cache clear

### Performance Targets

- Cache write: <10ms
- Cache read: <5ms
- Sync batch: <2s for 100 operations
- Memory usage: <50MB for 1000 cached items

## Maintenance

### Clear Cache

Users can clear cache from settings:

```typescript
import { useCacheClear } from '@/hooks/useOfflineCache';

function Settings() {
  const { clearAll } = useCacheClear();

  return (
    <button onClick={clearAll}>
      Clear Offline Cache
    </button>
  );
}
```

### Cache Versioning

When database schema changes:

1. Increment version in `offline-cache.ts`
2. Add migration logic in `upgrade` callback
3. Test migration from previous version

```typescript
const cache = new OfflineCache({
  version: 2, // Increment version
});
```

## Troubleshooting

### Cache Not Working

1. Check IndexedDB support:

```typescript
const supported = 'indexedDB' in window;
console.log('IndexedDB supported:', supported);
```

2. Check storage permissions:

```typescript
navigator.storage.estimate().then(({usage, quota}) => {
  console.log(`Using ${usage} of ${quota} bytes.`);
});
```

3. Clear and reinitialize:

```typescript
const cache = getOfflineCache();
await cache.clear();
await cache.init();
```

### Sync Issues

1. Check network status:

```typescript
const client = getMobileApiClient();
console.log('Online:', client.isOnline());
```

2. Check pending operations:

```typescript
const syncManager = getSyncManager();
console.log('Pending:', syncManager.getPendingOperationCount());
```

3. Manually trigger sync:

```typescript
await syncManager.syncNow();
```

## Future Enhancements

Potential improvements:

- [ ] Background Sync API for true background sync
- [ ] Periodic Background Sync for automatic updates
- [ ] Cache preloading based on user patterns
- [ ] Differential sync to minimize bandwidth
- [ ] Compression of cached data
- [ ] Multiple cache strategies (cache-first, network-first, etc.)
- [ ] Push notifications for sync status
- [ ] Advanced conflict resolution UI

## References

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [idb library](https://github.com/jakearchibald/idb)
