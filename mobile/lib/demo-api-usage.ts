/**
 * Demo: Enhanced API Client Usage
 * 
 * This file demonstrates the key features of the enhanced mobile API client.
 * It's intended as a reference and can be imported in components or used for testing.
 */

import { api, apiClient, ApiError, ErrorType } from '@/lib/api';

// ============================================================================
// Example 1: Basic GET Request with Error Handling
// ============================================================================

export async function demoBasicGet() {
    console.log('\n=== Demo 1: Basic GET Request ===');
    
    try {
        const response = await api.get('/clips');
        console.log('✓ Success:', response.data);
        return response.data;
    } catch (error) {
        if (error instanceof ApiError) {
            console.log('✗ API Error Detected:');
            console.log('  - Type:', error.type);
            console.log('  - Status:', error.statusCode);
            console.log('  - Retryable:', error.retryable);
            console.log('  - User Message:', error.userMessage);
            console.log('  - Technical Message:', error.message);
        }
        throw error;
    }
}

// ============================================================================
// Example 2: POST Request with Offline Queue
// ============================================================================

export async function demoPostWithOfflineQueue() {
    console.log('\n=== Demo 2: POST Request with Offline Queue ===');
    
    const clipData = {
        title: 'Test Clip',
        url: 'https://clips.twitch.tv/example',
    };
    
    try {
        const response = await api.post('/clips', clipData);
        console.log('✓ Clip created:', response.data);
        return response.data;
    } catch (error) {
        if (error instanceof ApiError) {
            if (error.type === ErrorType.OFFLINE) {
                console.log('⏳ Request queued for when online');
                console.log('  - Queue count:', apiClient.getQueuedRequestCount());
                // The request will be retried automatically when network is restored
            } else {
                console.log('✗ Error:', error.userMessage);
            }
        }
        throw error;
    }
}

// ============================================================================
// Example 3: Network Status Monitoring
// ============================================================================

export function demoNetworkStatus() {
    console.log('\n=== Demo 3: Network Status Monitoring ===');
    
    // Get current network status
    const status = apiClient.getNetworkStatus();
    console.log('Network Status:');
    console.log('  - Connected:', status.isConnected);
    console.log('  - Type:', status.type || 'unknown');
    console.log('  - Internet Reachable:', status.isInternetReachable);
    
    // Simple online check
    console.log('\nIs Online?', apiClient.isOnline() ? '✓ Yes' : '✗ No');
    
    // Queue information
    console.log('Queued Requests:', apiClient.getQueuedRequestCount());
}

// ============================================================================
// Example 4: Listening to Network Changes
// ============================================================================

export function demoNetworkListener() {
    console.log('\n=== Demo 4: Network Change Listener ===');
    
    // Subscribe to queue changes (which happen on network state changes)
    const unsubscribe = apiClient.onQueueChange(() => {
        console.log('⚡ Network state changed!');
        console.log('  - Is Online:', apiClient.isOnline());
        console.log('  - Queue Count:', apiClient.getQueuedRequestCount());
    });
    
    console.log('✓ Listener registered');
    console.log('  Call unsubscribe() to remove listener');
    
    return unsubscribe;
}

// ============================================================================
// Example 5: Manual Queue Management
// ============================================================================

export async function demoQueueManagement() {
    console.log('\n=== Demo 5: Manual Queue Management ===');
    
    console.log('Initial queue count:', apiClient.getQueuedRequestCount());
    
    // Manually retry queued requests (usually happens automatically)
    if (apiClient.getQueuedRequestCount() > 0) {
        console.log('Retrying queued requests...');
        await apiClient.retryOfflineQueue();
        console.log('✓ Queue processed');
    }
    
    // Clear the queue (if needed)
    // apiClient.clearOfflineQueue();
    // console.log('✓ Queue cleared');
}

// ============================================================================
// Example 6: Handling Different Error Types
// ============================================================================

export async function demoErrorHandling() {
    console.log('\n=== Demo 6: Error Type Handling ===');
    
    try {
        // This might fail with various error types
        await api.get('/some-endpoint');
    } catch (error) {
        if (error instanceof ApiError) {
            switch (error.type) {
                case ErrorType.NETWORK:
                    console.log('🔌 Network Error - Check connection');
                    console.log('  Message:', error.userMessage);
                    console.log('  Retryable:', error.retryable);
                    break;
                    
                case ErrorType.TIMEOUT:
                    console.log('⏱️ Timeout Error - Request took too long');
                    console.log('  Message:', error.userMessage);
                    console.log('  Retryable:', error.retryable);
                    break;
                    
                case ErrorType.OFFLINE:
                    console.log('📵 Offline - Request queued');
                    console.log('  Message:', error.userMessage);
                    console.log('  Queue count:', apiClient.getQueuedRequestCount());
                    break;
                    
                case ErrorType.RATE_LIMIT:
                    console.log('🚫 Rate Limited - Too many requests');
                    console.log('  Message:', error.userMessage);
                    console.log('  Status:', error.statusCode);
                    break;
                    
                case ErrorType.AUTH:
                    console.log('🔒 Auth Error - Session expired');
                    console.log('  Message:', error.userMessage);
                    console.log('  Redirect to login needed');
                    break;
                    
                case ErrorType.VALIDATION:
                    console.log('❌ Validation Error - Check input');
                    console.log('  Message:', error.userMessage);
                    console.log('  Status:', error.statusCode);
                    break;
                    
                case ErrorType.SERVER:
                    console.log('🔥 Server Error - Backend issue');
                    console.log('  Message:', error.userMessage);
                    console.log('  Status:', error.statusCode);
                    console.log('  Retryable:', error.retryable);
                    break;
                    
                default:
                    console.log('❓ Unknown Error');
                    console.log('  Message:', error.userMessage);
            }
        }
    }
}

// ============================================================================
// Example 7: React Hook Pattern
// ============================================================================

/**
 * Example React Hook for network status
 * Use this pattern in your components
 */
export function useNetworkStatusExample() {
    // This is a pseudo-code example - actual implementation would need React imports
    /*
    import { useState, useEffect } from 'react';
    
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
    */
    
    console.log('\n=== Demo 7: React Hook Pattern ===');
    console.log('See source code for useNetworkStatusExample()');
    console.log('This demonstrates how to create a custom hook for network status');
}

// ============================================================================
// Example 8: Retry Behavior Demonstration
// ============================================================================

export async function demoRetryBehavior() {
    console.log('\n=== Demo 8: Retry Behavior ===');
    
    console.log('The API client automatically retries failed requests with:');
    console.log('  - Exponential backoff (1s, 2s, 4s)');
    console.log('  - ±25% jitter to prevent thundering herd problem');
    console.log('  - Max 3 retry attempts');
    console.log('  - Only for idempotent methods (GET, HEAD, OPTIONS, DELETE)');
    console.log('  - Only for retryable status codes (408, 429, 500, 502, 503, 504)');
    console.log('\nWatch the console for retry messages when a request fails!');
}

// ============================================================================
// Example 9: Complete Component Example
// ============================================================================

/**
 * Example component showing complete integration
 * This is pseudo-code to demonstrate the pattern
 */
export function exampleComponentPattern() {
    console.log('\n=== Demo 9: Complete Component Pattern ===');
    console.log('Example pattern for components:');
    console.log(`
    function ClipsScreen() {
        const [clips, setClips] = useState([]);
        const [error, setError] = useState(null);
        const [loading, setLoading] = useState(true);
        const [isRetryable, setIsRetryable] = useState(false);
        const { isOnline, queueCount } = useNetworkStatus();
        
        async function loadClips() {
            try {
                setLoading(true);
                setError(null);
                const response = await api.get('/clips');
                setClips(response.data.data);
            } catch (error) {
                if (error instanceof ApiError) {
                    setError(error.userMessage);
                    setIsRetryable(error.retryable);
                    
                    if (error.type === ErrorType.AUTH) {
                        router.push('/login');
                    }
                }
            } finally {
                setLoading(false);
            }
        }
        
        return (
            <View>
                {!isOnline && (
                    <Banner>Offline - {queueCount} requests queued</Banner>
                )}
                {error && (
                    <View>
                        <Text>{error}</Text>
                        {isRetryable && <Button onPress={loadClips}>Retry</Button>}
                    </View>
                )}
                {loading ? <Spinner /> : <ClipsList data={clips} />}
            </View>
        );
    }
    `);
}

// ============================================================================
// Run All Demos
// ============================================================================

export async function runAllDemos() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          Enhanced API Client Feature Demos                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    try {
        // Demo basic features
        demoNetworkStatus();
        demoNetworkListener();
        await demoQueueManagement();
        
        // Demo error handling pattern
        await demoErrorHandling();
        
        // Show informational demos
        demoRetryBehavior();
        useNetworkStatusExample();
        exampleComponentPattern();
        
        // Try actual requests (these might fail if not connected to backend)
        // await demoBasicGet();
        // await demoPostWithOfflineQueue();
        
        console.log('\n✓ All demos completed!');
        console.log('\nNext steps:');
        console.log('  1. Try the actual API calls (uncomment demoBasicGet, etc.)');
        console.log('  2. Test network transitions (turn off/on wifi)');
        console.log('  3. Test retry behavior (return 500 from backend)');
        console.log('  4. Implement the patterns in your components');
        
    } catch (error) {
        console.error('\n✗ Demo error:', error);
    }
}

// Export all for individual testing
export default {
    demoBasicGet,
    demoPostWithOfflineQueue,
    demoNetworkStatus,
    demoNetworkListener,
    demoQueueManagement,
    demoErrorHandling,
    demoRetryBehavior,
    runAllDemos,
};
