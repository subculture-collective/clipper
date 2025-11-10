# Mobile API Client

A comprehensive API client for mobile and PWA applications with built-in retry logic, offline queue management, network status awareness, and standardized error handling.

## Features

- 🔄 **Automatic Retry with Exponential Backoff**: Automatically retries failed requests with configurable backoff strategy
- 📡 **Network Status Detection**: Real-time monitoring of online/offline status and connection quality
- 📦 **Offline Queue Management**: Queues requests when offline and automatically retries when back online
- 🔐 **Token Refresh Handling**: Automatic token refresh on 401 errors with request queueing
- ⚠️ **Standardized Error Handling**: Type-safe error classes with user-friendly messages
- 🎯 **TypeScript Support**: Full TypeScript support with comprehensive type definitions

## Installation

The mobile API client is already integrated into the project. Simply import and use it:

```typescript
import { getMobileApiClient, mobileApiClient } from '@/lib/mobile-api-client';
```

## Basic Usage

### Using the Singleton Instance

```typescript
import { mobileApiClient } from '@/lib/mobile-api-client';

// Make requests using the axios instance
const response = await mobileApiClient.getAxiosInstance().get('/clips');
```

### Using the Hook (Recommended)

```typescript
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function MyComponent() {
  const { online, queuedRequestCount, retryQueue, clearQueue } = useNetworkStatus();

  return (
    <div>
      {!online && <p>You're offline. {queuedRequestCount} requests queued.</p>}
      {online && queuedRequestCount > 0 && (
        <button onClick={retryQueue}>Retry Queued Requests</button>
      )}
    </div>
  );
}
```

## Configuration

### Default Configuration

```typescript
{
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  timeout: 30000
}
```

### Custom Configuration

```typescript
import { MobileApiClient } from '@/lib/mobile-api-client';

const client = new MobileApiClient(
  'http://localhost:8080/api/v1',
  {
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 15000,
  },
  60000 // 60 second timeout
);
```

## Error Handling

### Error Types

The client provides standardized error types:

- `ErrorType.NETWORK`: Network connectivity issues
- `ErrorType.TIMEOUT`: Request timeout
- `ErrorType.OFFLINE`: Device is offline
- `ErrorType.AUTH`: Authentication errors (401, 403)
- `ErrorType.VALIDATION`: Validation errors (400-499)
- `ErrorType.SERVER`: Server errors (500-599)
- `ErrorType.UNKNOWN`: Unknown errors

### Error Boundary

Wrap your components with the ErrorBoundary to catch and display errors:

```typescript
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Custom Error Handling

```typescript
import { ApiError, ErrorType } from '@/lib/mobile-api-client';

try {
  const response = await mobileApiClient.getAxiosInstance().get('/api/endpoint');
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Error type:', error.type);
    console.log('User message:', error.userMessage);
    console.log('Is retryable:', error.retryable);
    
    if (error.type === ErrorType.OFFLINE) {
      // Handle offline scenario
    }
  }
}
```

## Network Status Monitoring

### Using the Hook

```typescript
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function NetworkIndicator() {
  const { online, networkStatus, queuedRequestCount } = useNetworkStatus();

  return (
    <div>
      <p>Status: {online ? 'Online' : 'Offline'}</p>
      {networkStatus.effectiveType && (
        <p>Connection: {networkStatus.effectiveType}</p>
      )}
      {queuedRequestCount > 0 && (
        <p>{queuedRequestCount} requests queued</p>
      )}
    </div>
  );
}
```

### Using the Client Directly

```typescript
import { mobileApiClient } from '@/lib/mobile-api-client';

// Check if online
const isOnline = mobileApiClient.isOnline();

// Get detailed network status
const status = mobileApiClient.getNetworkStatus();
console.log('Connection type:', status.type);
console.log('Effective type:', status.effectiveType);
console.log('Downlink speed:', status.downlink);
console.log('RTT:', status.rtt);
```

## Offline Queue Management

### Automatic Queue Processing

Requests are automatically queued when offline and retried when back online:

```typescript
// This request will be queued if offline
await mobileApiClient.getAxiosInstance().post('/api/vote', { vote: 1 });

// When connection is restored, the queue is automatically processed
```

### Manual Queue Management

```typescript
import { mobileApiClient } from '@/lib/mobile-api-client';

// Get queued request count
const count = mobileApiClient.getQueuedRequestCount();

// Manually retry queue
await mobileApiClient.retryOfflineQueue();

// Clear queue (reject all queued requests)
mobileApiClient.clearOfflineQueue();
```

## Retry Strategy

### Exponential Backoff

The client uses exponential backoff for retries:

```
Attempt 1: Wait 1000ms
Attempt 2: Wait 2000ms (1000 * 2^1)
Attempt 3: Wait 4000ms (1000 * 2^2)
Maximum: 10000ms (configurable)
```

### Retryable Conditions

Requests are retried when:

- Network errors occur
- Request timeout (ETIMEDOUT, ECONNABORTED)
- HTTP status codes: 408, 429, 500, 502, 503, 504

### Non-retryable Conditions

Requests are NOT retried for:

- Authentication errors (401, 403)
- Client errors (400-499, except 408 and 429)
- After max retries reached

## Token Refresh

The client automatically handles token refresh on 401 errors:

1. Request receives 401 response
2. Client attempts to refresh token
3. If successful, original request is retried
4. If failed, all queued requests are rejected
5. Multiple concurrent requests are queued during refresh

```typescript
// Token refresh is automatic, no action needed
const response = await mobileApiClient.getAxiosInstance().get('/protected-endpoint');
// If token is expired, it will be automatically refreshed
```

## Components

### NetworkStatusIndicator

Display a banner showing network status:

```typescript
import { NetworkStatusIndicator } from '@/components/error/NetworkStatusIndicator';

function App() {
  return (
    <>
      <NetworkStatusIndicator />
      <YourApp />
    </>
  );
}
```

The indicator shows:

- Yellow banner when offline
- Blue banner with retry button when there are queued requests
- Green banner briefly when coming back online

## Integration with Existing API

The mobile API client is designed to work alongside the existing `api.ts` client:

```typescript
// Legacy usage (still works)
import apiClient from '@/lib/api';
const response = await apiClient.get('/clips');

// Mobile-enhanced usage (recommended for PWA/mobile)
import { mobileApiClient } from '@/lib/mobile-api-client';
const response = await mobileApiClient.getAxiosInstance().get('/clips');
```

For a gradual migration:

1. Keep using existing `apiClient` for web
2. Use `mobileApiClient` for mobile/PWA features
3. Gradually migrate critical paths to `mobileApiClient`

## Best Practices

### 1. Use Error Boundaries

Always wrap your app with ErrorBoundary to catch and handle errors gracefully:

```typescript
<ErrorBoundary onError={(error) => logToSentry(error)}>
  <App />
</ErrorBoundary>
```

### 2. Monitor Network Status

Show network status to users, especially in mobile/PWA contexts:

```typescript
<NetworkStatusIndicator />
```

### 3. Handle Offline Scenarios

Design UI to work gracefully when offline:

```typescript
const { online } = useNetworkStatus();

if (!online) {
  return <OfflineMessage />;
}
```

### 4. Provide User Feedback

Show loading states and queue information:

```typescript
const { queuedRequestCount } = useNetworkStatus();

{queuedRequestCount > 0 && (
  <Toast>
    {queuedRequestCount} requests will be sent when you're back online
  </Toast>
)}
```

### 5. Test Offline Behavior

Use browser DevTools to simulate offline mode and test your implementation.

## Testing

The client includes comprehensive tests:

```bash
npm test mobile-api-client.test.ts
npm test useNetworkStatus.test.tsx
```

## API Reference

### MobileApiClient

#### Methods

- `getAxiosInstance()`: Get the underlying axios instance
- `isOnline()`: Check if device is online
- `getNetworkStatus()`: Get detailed network status
- `getQueuedRequestCount()`: Get number of queued requests
- `retryOfflineQueue()`: Manually retry queued requests
- `clearOfflineQueue()`: Clear all queued requests
- `cleanup()`: Clean up event listeners

### useNetworkStatus

#### Returns

```typescript
{
  online: boolean;
  networkStatus: NetworkStatus;
  queuedRequestCount: number;
  retryQueue: () => Promise<void>;
  clearQueue: () => void;
}
```

### ApiError

#### Properties

- `type: ErrorType`: The error type
- `statusCode?: number`: HTTP status code (if applicable)
- `originalError?: Error`: Original error object
- `userMessage: string`: User-friendly error message
- `retryable: boolean`: Whether the error is retryable
- `message: string`: Technical error message
- `name: string`: Error name ("ApiError")

## Migration Guide

### From api.ts to mobile-api-client.ts

```typescript
// Before
import apiClient from '@/lib/api';
const response = await apiClient.get('/clips');

// After
import { mobileApiClient } from '@/lib/mobile-api-client';
const response = await mobileApiClient.getAxiosInstance().get('/clips');
```

### Error Handling Migration

```typescript
// Before
try {
  await apiClient.get('/endpoint');
} catch (error) {
  console.error('Request failed:', error);
}

// After
import { ApiError, ErrorType } from '@/lib/mobile-api-client';

try {
  await mobileApiClient.getAxiosInstance().get('/endpoint');
} catch (error) {
  if (error instanceof ApiError) {
    // Show user-friendly message
    toast.error(error.userMessage);
    
    // Log technical details
    console.error('Error type:', error.type);
    
    // Handle specific error types
    if (error.type === ErrorType.OFFLINE) {
      // Show offline indicator
    }
  }
}
```

## Troubleshooting

### Queue Not Processing

If queued requests aren't being processed:

1. Check network status: `mobileApiClient.isOnline()`
2. Verify queue has items: `mobileApiClient.getQueuedRequestCount()`
3. Manually trigger retry: `await mobileApiClient.retryOfflineQueue()`

### Excessive Retries

If experiencing too many retries:

1. Check retry configuration
2. Verify retryable status codes
3. Consider increasing initial delay

### Memory Leaks

Always clean up when unmounting:

```typescript
useEffect(() => {
  return () => {
    client.cleanup();
  };
}, []);
```

## License

MIT
