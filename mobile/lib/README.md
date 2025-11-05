# Mobile API Client Library

This directory contains the enhanced API client for the mobile app with comprehensive error handling, retry logic, and network awareness.

## Files Overview

### Core Implementation
- **`enhanced-api-client.ts`** - Main implementation of the enhanced API client with all features
- **`api.ts`** - Public API exports (use this in your code)

### Documentation
- **`API_CLIENT_GUIDE.md`** - Complete guide covering all features, usage patterns, and best practices
- **`MIGRATION_EXAMPLE.md`** - Before/after examples showing how to enhance existing code
- **`demo-api-usage.ts`** - Executable demos showing all features in action
- **`README.md`** - This file

## Quick Start

### Basic Usage

```typescript
import { api } from '@/lib/api';

// Make requests as usual - automatically gets retry, error handling, etc.
const response = await api.get('/clips');
```

### Enhanced Error Handling

```typescript
import { api, ApiError, ErrorType } from '@/lib/api';

try {
    const response = await api.get('/clips');
    console.log(response.data);
} catch (error) {
    if (error instanceof ApiError) {
        // Show user-friendly message
        alert(error.userMessage);
        
        // Handle specific error types
        if (error.type === ErrorType.AUTH) {
            router.push('/login');
        }
    }
}
```

### Network Status

```typescript
import { apiClient } from '@/lib/api';

// Check if online
if (apiClient.isOnline()) {
    // Make API call
}

// Get detailed network info
const status = apiClient.getNetworkStatus();
console.log('Connected:', status.isConnected);
console.log('Type:', status.type); // 'wifi', 'cellular', etc.

// Monitor queue
console.log('Queued requests:', apiClient.getQueuedRequestCount());
```

## Key Features

✅ **Automatic Retry** - Failed requests are automatically retried with exponential backoff
✅ **Network Awareness** - Monitors network status and queues requests when offline
✅ **Smart Error Handling** - 8 error types with user-friendly messages
✅ **Token Refresh** - Automatic token refresh on 401 errors
✅ **Offline Queue** - Mutations queued when offline, retried when online
✅ **Backward Compatible** - Existing code works without changes

## Error Types

| Type | Retryable | When It Happens |
|------|-----------|----------------|
| `NETWORK` | ✅ | Network connectivity issues |
| `TIMEOUT` | ✅ | Request timeout |
| `OFFLINE` | ✅ | Device offline |
| `RATE_LIMIT` | ✅ | 429 Too Many Requests |
| `SERVER` | ✅ | 5xx server errors |
| `AUTH` | ❌ | 401/403 authentication errors |
| `VALIDATION` | ❌ | 4xx client errors |
| `UNKNOWN` | ❌ | Unexpected errors |

## Documentation

📖 **Start here**: [API_CLIENT_GUIDE.md](./API_CLIENT_GUIDE.md) - Complete reference guide

📖 **Migrating?**: [MIGRATION_EXAMPLE.md](./MIGRATION_EXAMPLE.md) - See before/after examples

🎮 **Try it out**: [demo-api-usage.ts](./demo-api-usage.ts) - Run demos to see features in action

## Common Patterns

### React Component with Error Handling

```typescript
import { useState } from 'react';
import { api, ApiError, ErrorType } from '@/lib/api';

function MyScreen() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [isRetryable, setIsRetryable] = useState(false);
    
    async function loadData() {
        try {
            const response = await api.get('/data');
            setData(response.data);
        } catch (error) {
            if (error instanceof ApiError) {
                setError(error.userMessage);
                setIsRetryable(error.retryable);
                
                // Handle auth errors
                if (error.type === ErrorType.AUTH) {
                    router.push('/login');
                }
            }
        }
    }
    
    return (
        <View>
            {error && (
                <View>
                    <Text>{error}</Text>
                    {isRetryable && <Button onPress={loadData}>Retry</Button>}
                </View>
            )}
            {/* ... rest of UI */}
        </View>
    );
}
```

### Network Status Hook

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(apiClient.isOnline());
    const [queueCount, setQueueCount] = useState(apiClient.getQueuedRequestCount());
    
    useEffect(() => {
        const unsubscribe = apiClient.onQueueChange(() => {
            setIsOnline(apiClient.isOnline());
            setQueueCount(apiClient.getQueuedRequestCount());
        });
        
        return () => unsubscribe();
    }, []);
    
    return { isOnline, queueCount };
}
```

### Offline Banner Component

```typescript
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function OfflineBanner() {
    const { isOnline, queueCount } = useNetworkStatus();
    
    if (isOnline && queueCount === 0) return null;
    
    return (
        <View style={styles.banner}>
            <Text>
                {isOnline 
                    ? `Syncing ${queueCount} request(s)...`
                    : `Offline. ${queueCount} request(s) queued.`
                }
            </Text>
        </View>
    );
}
```

## Testing

### Manual Testing Checklist

Since the mobile app lacks automated test infrastructure, use this checklist for manual testing:

- [ ] **Network Transitions**
  - Turn off wifi → verify offline detection
  - Turn on wifi → verify queued requests retry
  - Switch wifi ↔ cellular → verify network type detection

- [ ] **Retry Behavior**
  - Return 500 from backend → verify automatic retry
  - Return 429 from backend → verify rate limit handling
  - Verify exponential backoff with jitter

- [ ] **Offline Queue**
  - Make POST request while offline → verify queued
  - Go back online → verify request sent
  - Make multiple requests offline → verify all queued and sent

- [ ] **Error Handling**
  - Test each error type (NETWORK, TIMEOUT, AUTH, etc.)
  - Verify user-friendly messages shown
  - Verify retryable errors show retry button

- [ ] **Token Refresh**
  - Make request with expired token → verify refresh
  - Verify subsequent requests use new token
  - Verify multiple simultaneous requests during refresh

### Testing in Development

```typescript
// In your component or test file
import { runAllDemos } from '@/lib/demo-api-usage';

// Run all demos to see features in action
runAllDemos();
```

## Configuration

Default configuration (can be customized):

```typescript
{
    maxRetries: 3,
    retryDelay: exponential with jitter (1s to 10s),
    timeout: 15000ms,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryableMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']
}
```

## Troubleshooting

### "Request not retrying"
- Only idempotent methods retry (GET, HEAD, OPTIONS, PUT, DELETE)
- POST requests don't retry by design (use offline queue instead)
- Check if status code is retryable

### "Queue not working"
- GET requests don't queue (they fail immediately when offline)
- Check `apiClient.isOnline()` to verify offline detection
- Check `apiClient.getQueuedRequestCount()` to see queue

### "Token not refreshing"
- Ensure tokens are in expo-secure-store with correct keys
- Check if `/auth/refresh` endpoint exists
- Verify refresh response format

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Your Components                     │
│  (Use api, ApiError, ErrorType, apiClient)      │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│             api.ts (Public API)                  │
│  Exports: api, apiClient, ApiError, ErrorType    │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│      enhanced-api-client.ts (Core)              │
│  • EnhancedMobileApiClient class                 │
│  • Retry logic with axios-retry                  │
│  • Network monitoring with expo-network          │
│  • Token refresh handling                        │
│  • Offline queue management                      │
│  • Error transformation                          │
└─────────────────┬───────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           External Dependencies                  │
│  • axios - HTTP client                           │
│  • axios-retry - Retry logic                     │
│  • expo-network - Network status                 │
│  • expo-secure-store - Token storage             │
└─────────────────────────────────────────────────┘
```

## Dependencies

- **axios** (^1.13.2) - HTTP client
- **axios-retry** (^4.5.0) - Retry logic with exponential backoff
- **expo-network** (^8.0.7) - Network status monitoring
- **expo-secure-store** (^15.0.7) - Secure token storage

## Support

For questions or issues:
1. Read [API_CLIENT_GUIDE.md](./API_CLIENT_GUIDE.md) for detailed documentation
2. Check [MIGRATION_EXAMPLE.md](./MIGRATION_EXAMPLE.md) for code examples
3. Run [demo-api-usage.ts](./demo-api-usage.ts) to see features in action
4. Open an issue on GitHub if problems persist

## License

Part of the Clipper project - see root LICENSE file.
