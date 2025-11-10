# Enhanced Mobile API Client Guide

This guide explains how to use the enhanced mobile API client with retry logic, network awareness, and comprehensive error handling.

## Features

### 1. Automatic Retry with Exponential Backoff

- Retries failed requests automatically for idempotent methods (GET, HEAD, OPTIONS, DELETE)
- Uses exponential backoff with jitter to prevent thundering herd problem
- Configurable retry attempts (default: 3)
- Respects status codes: 408, 429, 500, 502, 503, 504
- Note: PUT is queued when offline rather than retried for consistency

### 2. Network Status Awareness

- Monitors network connectivity using expo-network
- Automatically queues non-idempotent requests when offline
- Retries queued requests when network is restored
- Provides network status information (connection type, reachability)

### 3. Unified Error Handling

- Standardized error types: NETWORK, AUTH, VALIDATION, SERVER, TIMEOUT, OFFLINE, RATE_LIMIT, UNKNOWN
- User-friendly error messages for each error type
- Retryable vs non-retryable error classification
- Original error preservation for debugging

### 4. Token Refresh Handling

- Automatic token refresh on 401 errors
- Request queuing during token refresh to prevent duplicate refresh attempts
- Secure token storage using expo-secure-store

### 5. Offline Request Queue

- Queues mutation requests (POST, PATCH, PUT, DELETE) when offline
- Automatically retries queued requests when network is restored
- Queue change listeners for UI updates
- Manual queue management (clear, retry)
- Note: PUT is treated as a mutation and queued rather than auto-retried

## Basic Usage

### Import the API Client

```typescript
import { api, apiClient, ApiError, ErrorType } from '@/lib/api';
```

### Making API Calls

The `api` object is an Axios instance with all enhancements applied:

```typescript
// GET request
try {
  const response = await api.get('/clips');
  console.log(response.data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.userMessage);
    console.error('Error Type:', error.type);
    console.error('Retryable:', error.retryable);
  }
}

// POST request
try {
  const response = await api.post('/clips', {
    title: 'New Clip',
    url: 'https://...',
  });
  console.log(response.data);
} catch (error) {
  if (error instanceof ApiError) {
    // Handle error appropriately
    if (error.type === ErrorType.OFFLINE) {
      // Request was queued for later
      console.log('Request queued for when you\'re back online');
    } else if (error.type === ErrorType.RATE_LIMIT) {
      // Too many requests
      console.log('Please slow down');
    }
  }
}
```

## Advanced Usage

### Checking Network Status

```typescript
const networkStatus = apiClient.getNetworkStatus();
console.log('Is Connected:', networkStatus.isConnected);
console.log('Connection Type:', networkStatus.type); // 'wifi', 'cellular', etc.
console.log('Internet Reachable:', networkStatus.isInternetReachable);

// Simple check
if (apiClient.isOnline()) {
  // Make API call
}
```

### Managing the Offline Queue

```typescript
// Get queue count
const queueCount = apiClient.getQueuedRequestCount();
console.log(`${queueCount} requests queued`);

// Listen to queue changes
const unsubscribe = apiClient.onQueueChange(() => {
  console.log('Queue changed:', apiClient.getQueuedRequestCount());
});

// Manually retry queued requests
await apiClient.retryOfflineQueue();

// Clear the queue (discards queued requests)
apiClient.clearOfflineQueue();

// Cleanup when done
unsubscribe();
```

### Error Handling Patterns

```typescript
import { api, ApiError, ErrorType, getUserFriendlyMessage } from '@/lib/api';

async function fetchData() {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      // Log for debugging
      console.error('[API Error]', {
        type: error.type,
        statusCode: error.statusCode,
        message: error.message,
        retryable: error.retryable,
      });

      // Show user-friendly message
      alert(error.userMessage);

      // Handle specific error types
      switch (error.type) {
        case ErrorType.AUTH:
          // Redirect to login
          router.push('/login');
          break;

        case ErrorType.OFFLINE:
          // Show offline banner
          showOfflineBanner();
          break;

        case ErrorType.RATE_LIMIT:
          // Inform user to slow down
          showRateLimitMessage();
          break;

        case ErrorType.VALIDATION:
          // Show form validation errors
          showValidationErrors(error);
          break;

        case ErrorType.SERVER:
        case ErrorType.NETWORK:
          // Show retry option for retryable errors
          if (error.retryable) {
            showRetryOption();
          }
          break;
      }
    } else {
      // Unknown error
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
    }
  }
}
```

### React Hooks Integration

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(apiClient.isOnline());
  const [queueCount, setQueueCount] = useState(apiClient.getQueuedRequestCount());

  useEffect(() => {
    // Listen to queue changes
    const unsubscribe = apiClient.onQueueChange(() => {
      setIsOnline(apiClient.isOnline());
      setQueueCount(apiClient.getQueuedRequestCount());
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, queueCount };
}

// Usage in component
function MyComponent() {
  const { isOnline, queueCount } = useNetworkStatus();

  return (
    <View>
      {!isOnline && (
        <Text>You are offline. {queueCount} requests queued.</Text>
      )}
      {/* Rest of component */}
    </View>
  );
}
```

## Error Types Reference

| Error Type | Description | Retryable | Example User Message |
|-----------|-------------|-----------|---------------------|
| NETWORK | Network connectivity issues | Yes | "Unable to connect. Please check your internet connection and try again." |
| TIMEOUT | Request took too long | Yes | "The request took too long. Please try again." |
| OFFLINE | Device is offline | Yes | "You are currently offline. Your request will be sent when you reconnect." |
| RATE_LIMIT | Too many requests (429) | Yes | "Too many requests. Please wait a moment and try again." |
| AUTH | Authentication error (401, 403) | No | "Your session has expired. Please log in again." |
| VALIDATION | Client error (400-499) | No | "Please check your input and try again." |
| SERVER | Server error (500-599) | Yes | "Something went wrong on our end. Please try again later." |
| UNKNOWN | Unexpected error | No | "An unexpected error occurred. Please try again." |

## Configuration

The API client is configured with sensible defaults:

- **Base URL**: From `@/constants/config` (API_BASE_URL)
- **Timeout**: From `@/constants/config` (REQUEST_TIMEOUT_MS, default: 15000ms)
- **Max Retries**: 3
- **Retry Delay**: Exponential backoff (1s to 10s) with ±25% jitter
- **Retryable Status Codes**: 408, 429, 500, 502, 503, 504
- **Retryable Methods**: GET, HEAD, OPTIONS, DELETE (PUT is queued when offline instead)

## Best Practices

### 1. Always Handle Errors Properly

```typescript
// ✅ Good
try {
  const response = await api.get('/data');
  return response.data;
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.userMessage);
    // Handle appropriately
  }
  throw error;
}

// ❌ Bad - Silent failures
try {
  const response = await api.get('/data');
  return response.data;
} catch (error) {
  // Ignoring errors
}
```

### 2. Show User-Friendly Error Messages

```typescript
// ✅ Good - Show user-friendly message
catch (error) {
  if (error instanceof ApiError) {
    alert(error.userMessage); // Pre-generated friendly message
  }
}

// ❌ Bad - Show technical error
catch (error) {
  alert(error.message); // "Request failed with status code 500"
}
```

### 3. Respect Retryable vs Non-Retryable Errors

```typescript
// ✅ Good - Only retry retryable errors
catch (error) {
  if (error instanceof ApiError && error.retryable) {
    // Show retry button
    showRetryButton(() => fetchData());
  } else {
    // Show error message without retry option
    showErrorMessage(error.userMessage);
  }
}
```

### 4. Monitor Offline Queue

```typescript
// ✅ Good - Show queue status to user
const { queueCount } = useNetworkStatus();

return (
  <View>
    {queueCount > 0 && (
      <Banner>
        {queueCount} request(s) will be sent when you're back online
      </Banner>
    )}
  </View>
);
```

### 5. Clean Up Network Listeners

```typescript
// ✅ Good - Clean up in useEffect
useEffect(() => {
  const unsubscribe = apiClient.onQueueChange(() => {
    // Handle queue change
  });

  return () => unsubscribe(); // Clean up
}, []);
```

## Migration from Old API Client

If you're migrating from the old `api` object, the new client is backward compatible:

```typescript
// Old code - still works!
import { api } from '@/lib/api';
const response = await api.get('/clips');

// New code - with enhanced features
import { api, apiClient, ApiError, ErrorType } from '@/lib/api';

// Use api for normal requests (same as before)
const response = await api.get('/clips');

// Use apiClient for advanced features
const isOnline = apiClient.isOnline();
const queueCount = apiClient.getQueuedRequestCount();

// Better error handling
try {
  const response = await api.post('/clips', data);
} catch (error) {
  if (error instanceof ApiError) {
    // New structured error handling
    console.log(error.userMessage);
  }
}
```

## Troubleshooting

### Request Not Retrying

- Check if the HTTP method is idempotent (GET, HEAD, OPTIONS, DELETE)
- POST, PUT, PATCH requests are queued when offline instead of auto-retried
- Check if the status code is retryable (408, 429, 500, 502, 503, 504)

### Queue Not Working

- Ensure the request is not a GET/HEAD/OPTIONS (these fail immediately when offline)
- Check network status: `apiClient.isOnline()`
- Verify queue count: `apiClient.getQueuedRequestCount()`

### Token Not Refreshing

- Ensure tokens are stored in expo-secure-store with keys: `auth_token`, `refresh_token`
- Check if `/auth/refresh` endpoint is available
- Verify the refresh endpoint returns the correct response

## Testing

When testing components that use the API client:

```typescript
// Mock the API client
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    // ... other methods
  },
  apiClient: {
    isOnline: jest.fn(() => true),
    getQueuedRequestCount: jest.fn(() => 0),
    onQueueChange: jest.fn(() => () => {}),
  },
}));

// In your test
import { api } from '@/lib/api';

it('fetches data', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { items: [] } });
  // ... test code
});
```

## Additional Resources

- [Axios Documentation](https://axios-http.com/)
- [expo-network Documentation](https://docs.expo.dev/versions/latest/sdk/network/)
- [expo-secure-store Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
