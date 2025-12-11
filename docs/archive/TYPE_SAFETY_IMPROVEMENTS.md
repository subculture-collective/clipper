<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Type Safety Improvements for failedQueue](#type-safety-improvements-for-failedqueue)
  - [Issue Reference](#issue-reference)
  - [Problem](#problem)
  - [Solution](#solution)
  - [Benefits](#benefits)
    - [1. Full Type Safety](#1-full-type-safety)
    - [2. Better Developer Experience](#2-better-developer-experience)
    - [3. Clearer Intent](#3-clearer-intent)
    - [4. Error Handling](#4-error-handling)
  - [Implementation Details](#implementation-details)
    - [Type Definitions](#type-definitions)
    - [Queue Processing](#queue-processing)
    - [Queue Usage](#queue-usage)
  - [Additional Fixes](#additional-fixes)
    - [useClips.ts](#useclipsts)
    - [Import Organization](#import-organization)
  - [Testing](#testing)
    - [Validation Steps](#validation-steps)
    - [Build Output](#build-output)
  - [Security Considerations](#security-considerations)
  - [Files Changed](#files-changed)
  - [Compatibility](#compatibility)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Type Safety Improvements for failedQueue

## Issue Reference

This change addresses the type safety issue identified in [PR #48 review comment #r2451713544](https://github.com/subculture-collective/clipper/pull/48#discussion_r2451713544).

## Problem

The `failedQueue` array in `frontend/src/lib/api.ts` was using `unknown` for resolve/reject function parameters, which loses type safety:

```typescript
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];
```

## Solution

Created a dedicated `QueuedRequest` interface with properly typed resolve/reject functions:

```typescript
interface QueuedRequest {
  resolve: (value: AxiosResponse) => void;
  reject: (reason: AxiosError) => void;
}

let failedQueue: QueuedRequest[] = [];
```

## Benefits

### 1. Full Type Safety

- The queue now maintains complete type information through the Promise chain
- TypeScript can properly infer types in callbacks
- No need for type assertions or casts

### 2. Better Developer Experience

- IDE autocomplete works correctly
- Hovering over functions shows proper types
- Compile-time error detection

### 3. Clearer Intent

- The interface name `QueuedRequest` clearly indicates what's being queued
- Type signatures document the expected behavior
- Easier to understand and maintain

### 4. Error Handling

- Using `AxiosError` instead of `unknown` provides:
  - Structured error information
  - HTTP status codes
  - Response data
  - Request configuration

## Implementation Details

### Type Definitions

```typescript
// Type-safe queue item for failed requests during token refresh
interface QueuedRequest {
  resolve: (value: AxiosResponse) => void;
  reject: (reason: AxiosError) => void;
}
```

### Queue Processing

```typescript
const processQueue = (error: AxiosError | null, token: AxiosResponse | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);  // Properly typed as AxiosError
    } else if (token) {
      prom.resolve(token); // Properly typed as AxiosResponse
    }
  });
  failedQueue = [];
};
```

### Queue Usage

```typescript
if (isRefreshing) {
  // Type inference works correctly here
  return new Promise<AxiosResponse>((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  })
    .then(() => apiClient(originalRequest))
    .catch((err) => Promise.reject(err));
}
```

## Additional Fixes

### useClips.ts

Fixed TypeScript issues in `frontend/src/hooks/useClips.ts`:

1. Added missing `useQuery` import
2. Removed invalid `initialPageParam` and `getNextPageParam` (only valid for `useInfiniteQuery`)

### Import Organization

Used type-only imports for better compliance with `verbatimModuleSyntax`:

```typescript
import axios, { AxiosError } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
```

## Testing

### Validation Steps

1. ✅ TypeScript compilation - no errors
2. ✅ ESLint - no warnings
3. ✅ Production build - successful
4. ✅ CodeQL security scan - 0 vulnerabilities

### Build Output

```
> tsc -b && vite build
✓ built in 753ms
```

## Security Considerations

This change enhances security by:

- Preventing type-related runtime errors
- Making error handling more predictable
- Ensuring proper type flow through async operations
- No new vulnerabilities introduced (verified by CodeQL)

## Files Changed

- `frontend/src/lib/api.ts` - Main type safety improvements
- `frontend/src/hooks/useClips.ts` - Fixed related TypeScript issues

## Compatibility

This change is fully backward compatible as it only strengthens type safety without changing runtime behavior.
