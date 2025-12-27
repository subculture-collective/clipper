# Mobile Feed Performance Optimization

This document describes the performance optimizations implemented for the mobile feed to achieve < 1.5s initial render time and 60fps scrolling performance.

## Overview

The mobile feed has been optimized through several key improvements:
1. **Batch API for Media URLs** - Eliminated N+1 API calls
2. **FlashList Virtualization** - Replaced FlatList with high-performance FlashList
3. **expo-image Caching** - Aggressive image caching with memory-disk strategy
4. **Performance Monitoring** - Sentry integration for tracking TTI and FPS
5. **Prefetching Strategy** - Background prefetching of media URLs

## Changes Made

### 1. Backend API - Batch Media Endpoint

**File**: `backend/internal/handlers/clip_handler.go`

Added a new batch endpoint `POST /clips/batch-media` that accepts an array of clip IDs and returns their media URLs in a single request.

```go
// BatchGetClipMedia handles POST /clips/batch-media
func (h *ClipHandler) BatchGetClipMedia(c *gin.Context) {
    // Accepts up to 100 clip IDs
    // Returns embed_url and thumbnail_url for each clip
}
```

**Benefits**:
- Reduces 10 API calls to 1 for a feed of 10 clips
- Lower latency and network overhead
- Better backend resource utilization

**File**: `backend/internal/services/clip_service.go`

```go
// BatchGetClipMedia retrieves media URLs for multiple clips efficiently
func (s *ClipService) BatchGetClipMedia(ctx context.Context, clipIDs []uuid.UUID) ([]ClipMediaInfo, error)
```

**File**: `backend/internal/repository/clip_repository.go`

```go
// GetClipsByIDs retrieves multiple clips by their IDs
func (r *ClipRepository) GetClipsByIDs(ctx context.Context, clipIDs []uuid.UUID) ([]models.Clip, error)
```

### 2. Mobile Services - Batch API Integration

**File**: `mobile/services/clips.ts`

Added batch fetching and prefetching functions:

```typescript
// Batch fetch media URLs for multiple clips
export async function batchGetClipMedia(clipIds: string[]): Promise<ClipMediaInfo[]>

// Prefetch media for improved performance
export async function prefetchClipMedia(clipIds: string[]): Promise<ClipMediaInfo[]>
```

**Usage in Feed**:

```typescript
// Batch fetch media URLs for all clips
const clipIds = useMemo(() => data?.data.map(clip => clip.id) ?? [], [data?.data]);

const { data: mediaData } = useQuery({
    queryKey: ['clips-media', clipIds],
    queryFn: () => batchGetClipMedia(clipIds),
    enabled: clipIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
});

// Create a map for O(1) lookup
const mediaMap = useMemo(() => {
    const map = new Map<string, ClipMediaInfo>();
    mediaData?.forEach(media => map.set(media.id, media));
    return map;
}, [mediaData]);
```

### 3. FlashList Integration

**Files**: 
- `mobile/app/(tabs)/index.tsx` (Feed screen)
- `mobile/app/(tabs)/search.tsx` (Search screen)

Replaced React Native's FlatList with Shopify's FlashList for better performance:

```typescript
import { FlashList } from '@shopify/flash-list';

<FlashList
    data={data?.data ?? []}
    estimatedItemSize={300}  // Estimated height for better recycling
    renderItem={({ item }) => {
        const media = mediaMap.get(item.id);
        return (
            <ClipListItemCard
                clip={item}
                videoUrl={media?.embed_url}
                thumbnailUrl={media?.thumbnail_url}
                onPress={() => handleClipPress(item.id)}
            />
        );
    }}
    contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
/>
```

**Benefits**:
- Up to 10x faster than FlatList on large lists
- Better memory usage through cell recycling
- Smoother 60fps scrolling
- Lower CPU usage

### 4. expo-image Optimization

**File**: `mobile/components/VideoClipCard.tsx`

Replaced standard image loading with expo-image for better caching:

```typescript
import { Image } from 'expo-image';

<Image
    source={{ uri: thumbnailUrl }}
    style={{ width: '100%', height: '100%' }}
    contentFit='cover'
    cachePolicy='memory-disk'  // Aggressive caching
    priority='high'            // High priority for visible images
    transition={200}           // Smooth fade-in
/>
```

**Features**:
- Memory + disk caching
- Automatic cache management
- Lazy loading with placeholders
- Smooth transitions
- Better memory efficiency

### 5. Performance Monitoring

**File**: `mobile/lib/performance.ts`

Added Sentry-based performance tracking:

```typescript
// Track feed initial render (TTI - Time to Interactive)
export function trackFeedInitialRender(): { finish: (clipCount: number) => void }

// Track scrolling performance (FPS measurement)
export function trackFeedScroll(itemCount: number): { 
    recordFrame: (fps: number) => void; 
    finish: () => void 
}

// Track memory usage for long sessions
export function trackFeedMemory(action: 'start' | 'end'): void
```

**Integration in Feed**:

```typescript
const renderTrackerRef = useRef<ReturnType<typeof trackFeedInitialRender> | null>(null);

// Start tracking when data loads
useEffect(() => {
    if (!isLoading && data?.data && !renderTrackerRef.current) {
        renderTrackerRef.current = trackFeedInitialRender();
    }
}, [isLoading, data?.data]);

// Finish tracking when media is loaded
useEffect(() => {
    if (renderTrackerRef.current && mediaData && data?.data) {
        renderTrackerRef.current.finish(data.data.length);
        renderTrackerRef.current = null;
    }
}, [mediaData, data?.data]);

// Track memory usage
useEffect(() => {
    trackFeedMemory('start');
    return () => {
        trackFeedMemory('end');
    };
}, []);
```

**Metrics Tracked**:
- `feed_tti`: Time to Interactive (target < 1500ms)
- `feed_avg_fps`: Average scrolling FPS (target 60fps)
- Memory usage breadcrumbs

### 6. Component Updates

**File**: `mobile/components/ClipListItemCard.tsx`

Simplified to accept media URLs directly instead of fetching individually:

```typescript
// Before: Made individual API call for each clip
const { data: detail } = useQuery({
    queryKey: ['clip', clip.id],
    queryFn: () => getClip(clip.id),
});

// After: Receives media from batch request
export default function ClipListItemCard({
    clip,
    videoUrl,      // Passed from parent
    thumbnailUrl,  // Passed from parent
    onPress,
}: {
    clip: ClipListItem;
    videoUrl?: string;
    thumbnailUrl?: string;
    onPress: () => void;
})
```

## Performance Targets

### Initial Render Time (TTI)
- **Target**: < 1.5 seconds
- **Measurement**: Time from component mount to media loaded
- **Optimization**: Batch API + FlashList + aggressive caching

### Scrolling Performance
- **Target**: 60 FPS
- **Measurement**: Frame rate during scroll events
- **Optimization**: FlashList virtualization + expo-image

### Network Efficiency
- **Before**: 10+ API calls for 10 clips (1 list + 10 individual)
- **After**: 2 API calls (1 list + 1 batch media)
- **Reduction**: 80-90% fewer API calls

### Memory Usage
- **Optimization**: Disk + memory caching with expo-image
- **Monitoring**: Session start/end breadcrumbs in Sentry
- **Target**: Stable memory usage during long sessions

## Testing Recommendations

### Manual Testing

1. **Initial Load Performance**
   ```bash
   # Open feed screen
   # Measure time from tap to full render
   # Should be < 1.5s on target devices
   ```

2. **Scrolling Performance**
   ```bash
   # Scroll through feed rapidly
   # Check for dropped frames
   # Should maintain 60fps
   ```

3. **Network Efficiency**
   ```bash
   # Open network inspector
   # Load feed
   # Verify only 2 API calls (list + batch-media)
   ```

4. **Memory Stability**
   ```bash
   # Use memory profiler
   # Scroll through 50+ items
   # Check for memory leaks
   # Memory should stabilize
   ```

### Performance Profiling

Using React Native Profiler:
```bash
cd mobile
npm run start
# Press 'd' in terminal
# Select "Enable Performance Monitor"
```

Using Sentry:
- Check Performance tab in Sentry dashboard
- Look for `Feed Initial Render` transactions
- Verify `feed_tti` < 1500ms
- Check `feed_avg_fps` ≥ 60

### Device Testing

Test on both:
- **iOS**: iPhone 12 or newer (target device)
- **Android**: Pixel 5 or equivalent (target device)

## Migration Guide

### For Other List Screens

To apply these optimizations to other screens:

1. **Install FlashList** (already done)
   ```bash
   npm install @shopify/flash-list
   ```

2. **Update List Component**
   ```typescript
   import { FlashList } from '@shopify/flash-list';
   
   // Replace FlatList with FlashList
   <FlashList
       data={items}
       estimatedItemSize={300}  // Estimate item height
       renderItem={renderItem}
   />
   ```

3. **Add Batch Media Fetching**
   ```typescript
   const clipIds = useMemo(() => 
       data?.data.map(clip => clip.id) ?? [], 
       [data?.data]
   );
   
   const { data: mediaData } = useQuery({
       queryKey: ['media', clipIds],
       queryFn: () => batchGetClipMedia(clipIds),
       enabled: clipIds.length > 0,
   });
   ```

4. **Update Child Components**
   - Pass media URLs as props
   - Remove individual media fetching queries

5. **Add Performance Tracking** (optional)
   ```typescript
   import { trackFeedInitialRender } from '@/lib/performance';
   
   // Add tracking hooks
   ```

## Known Issues

1. **FlashList TypeScript Types**
   - Current version has some type definition mismatches
   - Using `@ts-ignore` as temporary workaround
   - Runtime behavior is correct
   - Will be fixed in future FlashList updates

## Future Enhancements

1. **Infinite Scroll**
   - Add pagination with prefetching
   - Fetch next page when user nears end

2. **Image Prefetching**
   - Preload thumbnails for next N items
   - Use `Image.prefetch()` from expo-image

3. **Video Preloading**
   - Preload video URLs for better playback
   - Implement smart buffering strategy

4. **PostHog Integration**
   - Add custom events for user interactions
   - Track engagement metrics

5. **A/B Testing**
   - Compare FlashList vs FlatList performance
   - Measure user engagement improvements

## Resources

- [FlashList Documentation](https://shopify.github.io/flash-list/)
- [expo-image Documentation](https://docs.expo.dev/versions/latest/sdk/image/)
- [Sentry Performance Monitoring](https://docs.sentry.io/platforms/react-native/performance/)
- [React Query Documentation](https://tanstack.com/query/latest)

## Monitoring Dashboard

View performance metrics in Sentry:
1. Navigate to Performance tab
2. Filter by operation: `ui.render`
3. Look for transactions:
   - "Feed Initial Render"
   - "Feed Scroll Performance"
4. Check custom measurements:
   - `feed_tti`
   - `feed_avg_fps`

## Support

For issues or questions about feed performance:
1. Check Sentry for error traces
2. Review performance breadcrumbs
3. Verify batch API is working correctly
4. Check network tab for API calls
