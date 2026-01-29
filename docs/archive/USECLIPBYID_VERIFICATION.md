---
title: useClipById Hook Verification
summary: PR #48 changed `useClipById` from using `useInfiniteQuery` to `useQuery`, removing the `initialPageParam` and `getNextPageParam` parameters. This...
tags: ['testing', 'archive', 'implementation']
area: docs
status: archived
owner: team-core
version: "1.0"
last_reviewed: 2026-01-29
---


# useClipById Hook Verification

## Issue Summary

PR #48 changed `useClipById` from using `useInfiniteQuery` to `useQuery`, removing the `initialPageParam` and `getNextPageParam` parameters. This document verifies that this change is correct and the hook functions as expected.

## Analysis

### Original Implementation (Incorrect)

```typescript
export const useClipById = (clipId: string) => {
  return useInfiniteQuery({
    queryKey: ['clips', clipId],
    queryFn: () => {
      const clip = MOCK_CLIPS.find((c) => c.id === clipId);
      if (!clip) throw new Error('Clip not found');
      return clip;
    },
    initialPageParam: 1,           // ❌ Not needed for single fetch
    getNextPageParam: () => undefined, // ❌ Not needed for single fetch
  });
};
```

### New Implementation (Correct)

```typescript
export const useClipById = (clipId: string) => {
  return useQuery({
    queryKey: ['clips', clipId],
    queryFn: () => fetchClipById(clipId),
    enabled: !!clipId, // ✅ Only run query if clipId is provided
  });
};
```

## Why This Change is Correct

### 1. Purpose Alignment

- **useQuery**: Designed for fetching a single resource
- **useInfiniteQuery**: Designed for fetching paginated data

Since `useClipById` fetches a **single clip** by ID, `useQuery` is the correct hook to use.

### 2. Return Value Structure

**useQuery returns:**

```typescript
{
  data: Clip,              // Single clip object
  isLoading: boolean,
  error: Error | null,
  refetch: () => void,
  // ... other standard query props
}
```

**useInfiniteQuery returns:**

```typescript
{
  data: {
    pages: Clip[],         // Array of pages (not applicable for single clip)
    pageParams: unknown[]  // Pagination parameters (not needed)
  },
  isLoading: boolean,
  error: Error | null,
  fetchNextPage: () => void,  // Not needed for single clip
  hasNextPage: boolean,       // Not applicable
  // ... other infinite query props
}
```

### 3. Parameter Requirements

**useInfiniteQuery requires:**

- `initialPageParam` - Starting page parameter (meaningless for single resource)
- `getNextPageParam` - Function to determine next page (no pagination for single resource)

**useQuery does not need these** because it fetches a single resource, not paginated data.

### 4. Usage Pattern

**Correct usage with useQuery:**

```typescript
function ClipDetailPage() {
  const { id } = useParams();
  const { data: clip, isLoading, error } = useClipById(id!);
  
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!clip) return <NotFound />;
  
  return <ClipDetails clip={clip} />;
}
```

**If we incorrectly used useInfiniteQuery:**

```typescript
function ClipDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useClipById(id!);
  
  // ❌ Problem: data.pages[0] is awkward for single resource
  const clip = data?.pages[0]; // Unnecessary complexity
  
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!clip) return <NotFound />;
  
  return <ClipDetails clip={clip} />;
}
```

## Verification Results

✅ **Build**: TypeScript compilation successful
✅ **Lint**: ESLint passes with no errors
✅ **Type Safety**: Correct type inference for single Clip object
✅ **API Alignment**: Hook signature matches single resource fetching pattern
✅ **Query Key**: Properly scoped to individual clip: `['clips', clipId]`
✅ **Enabled Guard**: Only runs when clipId is truthy

## Conclusion

The change from `useInfiniteQuery` to `useQuery` for `useClipById` is **correct and necessary**. The hook fetches a single clip resource, not paginated data, so `useQuery` is the appropriate React Query hook to use. The removal of `initialPageParam` and `getNextPageParam` is correct because these parameters are only relevant for pagination.

## Related Hooks

For comparison, `useClipsFeed` correctly uses `useInfiniteQuery` because it fetches paginated clip data:

```typescript
export const useClipsFeed = (filters?: ClipFeedFilters) => {
  return useInfiniteQuery({
    queryKey: ['clips', 'feed', filters],
    queryFn: ({ pageParam }) => fetchClipsFeed(pageParam, filters),
    initialPageParam: 1,                    // ✅ Needed for pagination
    getNextPageParam: (lastPage) =>         // ✅ Needed for pagination
      lastPage.has_next ? lastPage.page + 1 : undefined,
  });
};
```

This demonstrates the correct usage of both hooks in the same file.
