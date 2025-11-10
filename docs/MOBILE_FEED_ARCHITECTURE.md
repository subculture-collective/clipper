# Mobile Feed Architecture

## Component Hierarchy

```
HomePage
  └─ ClipFeed
      ├─ FeedHeader (title, description)
      ├─ FeedFilters (sort, timeframe)
      ├─ Pull-to-Refresh Indicator (mobile only)
      ├─ Loading State (ClipCardSkeleton × 5)
      ├─ Error State (EmptyState with error message)
      ├─ Empty State (EmptyState with no results)
      └─ Clips Container
          ├─ MemoizedClipCard (for each clip)
          │   ├─ TwitchEmbed (lazy loaded)
          │   ├─ Vote Buttons (optimized touch targets)
          │   ├─ Metadata (creator, game, time)
          │   ├─ Tags (TagList)
          │   └─ Actions (comments, favorite)
          ├─ Load More Trigger (IntersectionObserver)
          ├─ Loading Spinner (when fetching next page)
          └─ End Message ("You've reached the end!")
```

## Data Flow

```
User Interaction
    │
    ├─ Scroll Down
    │   └─→ IntersectionObserver detects
    │       └─→ fetchNextPage()
    │           └─→ TanStack Query fetches from API
    │               └─→ Append to existing pages
    │                   └─→ ClipFeed re-renders with new data
    │                       └─→ Only new MemoizedClipCards render
    │
    ├─ Pull Down (at top)
    │   └─→ Touch handlers detect gesture
    │       └─→ Update pull distance
    │           └─→ Show refresh indicator
    │               └─→ Release (if > 80px)
    │                   └─→ refetch()
    │                       └─→ Reset all pages with fresh data
    │
    ├─ Change Filter
    │   └─→ Update URL params
    │       └─→ New filters trigger query key change
    │           └─→ TanStack Query fetches fresh data
    │               └─→ ClipFeed shows new results
    │
    └─ Vote/Favorite
        └─→ Optimistic update (instant UI feedback)
            └─→ API call in background
                ├─→ Success: Keep optimistic update
                └─→ Error: Rollback to previous state
```

## State Management

### React Query (TanStack Query)

```typescript
useInfiniteQuery({
  queryKey: ['clips', filters],
  queryFn: ({ pageParam }) => fetchClips({ pageParam, filters }),
  getNextPageParam: (lastPage) => lastPage.has_more ? lastPage.page + 1 : undefined,
  initialPageParam: 1,
})
```

**Benefits:**

- Automatic caching (5 minutes default)
- Deduplication (multiple components can use same query)
- Background refetching (keeps data fresh)
- Optimistic updates (instant UI feedback)

### Local State (useState)

```typescript
const [isRefreshing, setIsRefreshing] = useState(false);
const [pullDistance, setPullDistance] = useState(0);
```

**Purpose:**

- Pull-to-refresh UI state
- Touch gesture tracking

### URL State (useSearchParams)

```typescript
const sort = searchParams.get('sort') || defaultSort;
const timeframe = searchParams.get('timeframe') || defaultTimeframe;
```

**Benefits:**

- Shareable URLs
- Browser back/forward support
- Deep linking

## Performance Strategy

### Rendering Optimization

```
┌─────────────────────────────────────┐
│ User scrolls down                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ React re-renders ClipFeed           │
│ ✓ FeedHeader (no props change)     │
│ ✓ FeedFilters (no props change)    │
│ ✓ Existing ClipCards (memoized)    │
│ ✗ New ClipCards (first render)     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Browser applies optimizations       │
│ • content-visibility: auto          │
│   - Off-screen cards not painted    │
│ • transform: translateZ(0)          │
│   - GPU acceleration enabled        │
│ • will-change: transform            │
│   - Browser preallocates resources  │
└─────────────────────────────────────┘
```

### Memory Management

```
┌──────────────────────────────────────┐
│ Feed grows to 100 items              │
│ Memory Usage: ~50MB                  │
├──────────────────────────────────────┤
│ With content-visibility:             │
│ • Visible: 5 cards (~2.5MB)         │
│ • Near viewport: 3 cards (~1.5MB)   │
│ • Off-screen: 92 cards (minimal)    │
│                                      │
│ Actual Memory: ~15MB (70% savings)  │
└──────────────────────────────────────┘
```

## Touch Interaction Flow

```
┌─────────────┐
│ Touch Start │
│  (at top)   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Record touch Y position │
└──────┬──────────────────┘
       │
       ▼
┌─────────────┐
│ Touch Move  │
└──────┬──────┘
       │
       ├─→ Calculate distance
       │   └─→ Update UI (0-80px)
       │       └─→ Show indicator
       │
       ▼
┌─────────────┐
│ Touch End   │
└──────┬──────┘
       │
       ├─→ Distance > 80px?
       │   ├─→ Yes: Trigger refresh
       │   │   └─→ Show spinner
       │   │       └─→ Fetch new data
       │   │           └─→ Reset UI
       │   │
       │   └─→ No: Reset UI
       │       └─→ Animate to 0
       │
       ▼
    [Done]
```

## API Integration

```
Frontend                    Backend
   │                           │
   ├─ GET /clips?              │
   │  page=1&limit=10          │
   │  sort=hot                 │
   │  language=en              │
   │  ─────────────────────►   │
   │                           │
   │  ◄─────────────────────   │
   │  {                        │
   │    clips: [...],          │
   │    meta: {                │
   │      page: 1,             │
   │      has_next: true       │
   │    }                      │
   │  }                        │
   │                           │
   ├─ GET /clips?              │
   │  page=2&limit=10          │
   │  ─────────────────────►   │
   │                           │
   │  ◄─────────────────────   │
   │  { clips: [...], ... }   │
   │                           │
   └─ Append to cache          │
```

## CSS Performance Layers

```
Layer 1: Layout (Expensive)
  └─ Container queries
  └─ Grid/Flexbox calculations

Layer 2: Paint (Moderate)
  └─ Background colors
  └─ Borders
  └─ Shadows

Layer 3: Composite (Cheap - GPU)
  └─ transform               ← We use this!
  └─ opacity                 ← We use this!
  └─ filter
```

**Strategy:** Use only transform and opacity for animations

- Browser creates separate layer
- GPU handles all changes
- No layout recalculation needed
- Smooth 60fps guaranteed

## Error Handling

```
┌─────────────────┐
│ API Call Failed │
└────────┬────────┘
         │
         ├─→ Network Error
         │   └─→ Show "Check your connection"
         │
         ├─→ 4xx Error
         │   └─→ Show "Error loading clips"
         │
         ├─→ 5xx Error
         │   └─→ Show "Server error, try later"
         │
         └─→ Timeout
             └─→ Retry with exponential backoff
```

## Accessibility Features

```
Touch Targets
  ├─ Minimum: 44×44px
  ├─ Vote buttons: Yes ✓
  ├─ Favorite button: Yes ✓
  ├─ Comment link: Yes ✓
  └─ Card link: Yes ✓

Screen Reader Support
  ├─ Semantic HTML
  ├─ ARIA labels
  ├─ Skip links
  └─ Focus management

Keyboard Navigation
  ├─ Tab order
  ├─ Enter/Space activation
  └─ Escape handling
```

## Monitoring Points

```
Performance
  ├─ First Contentful Paint (FCP)
  ├─ Largest Contentful Paint (LCP)
  ├─ Time to Interactive (TTI)
  └─ Total Blocking Time (TBT)

User Experience
  ├─ Scroll jank (frame drops)
  ├─ Pull-to-refresh success rate
  ├─ Load more trigger rate
  └─ Average scroll depth

Errors
  ├─ API failure rate
  ├─ Retry attempts
  └─ Cache hit/miss ratio

Resource Usage
  ├─ Memory consumption
  ├─ Network bandwidth
  └─ Battery impact (mobile)
```
