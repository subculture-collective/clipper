# Migration Example: Enhanced Error Handling

This document shows how to enhance existing services to use the new error handling features.

## Before: Basic Error Handling

```typescript
// services/clips.ts - BEFORE
import { api } from '@/lib/api';

export async function listClips(params: ListClipsParams = {}) {
    const res = await api.get<PaginatedResponse<ClipListItem>>('/clips', {
        params,
    });
    return res.data;
}

export async function getClip(id: string) {
    const res = await api.get<ApiResponse<ClipDetail>>(`/clips/${id}`);
    return res.data.data;
}
```

## After: Enhanced Error Handling

```typescript
// services/clips.ts - AFTER
import { api, ApiError, ErrorType } from '@/lib/api';

export async function listClips(params: ListClipsParams = {}) {
    try {
        const res = await api.get<PaginatedResponse<ClipListItem>>('/clips', {
            params,
        });
        return res.data;
    } catch (error) {
        if (error instanceof ApiError) {
            // Log for debugging
            console.error('[listClips] API Error:', {
                type: error.type,
                statusCode: error.statusCode,
                message: error.message,
            });

            // Handle specific error types if needed
            if (error.type === ErrorType.OFFLINE) {
                console.log('[listClips] User is offline, showing cached data');
                // Could return cached data here
            }
        }
        throw error; // Re-throw to let caller handle
    }
}

export async function getClip(id: string) {
    try {
        const res = await api.get<ApiResponse<ClipDetail>>(`/clips/${id}`);
        return res.data.data;
    } catch (error) {
        if (error instanceof ApiError) {
            console.error('[getClip] API Error:', {
                type: error.type,
                statusCode: error.statusCode,
                message: error.message,
            });
        }
        throw error;
    }
}
```

## In React Components: Display User-Friendly Errors

```typescript
// BEFORE - Component with basic error handling
import { useEffect, useState } from 'react';
import { listClips } from '@/services/clips';

function ClipsScreen() {
    const [clips, setClips] = useState([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadClips();
    }, []);

    async function loadClips() {
        try {
            setLoading(true);
            const data = await listClips();
            setClips(data.data);
        } catch (error) {
            setError('Failed to load clips');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <Text>Loading...</Text>;
    if (error) return <Text>{error}</Text>;

    return <FlatList data={clips} />;
}
```

```typescript
// AFTER - Component with enhanced error handling
import { useEffect, useState } from 'react';
import { listClips } from '@/services/clips';
import { ApiError, ErrorType } from '@/lib/api';

function ClipsScreen() {
    const [clips, setClips] = useState([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRetryable, setIsRetryable] = useState(false);

    useEffect(() => {
        loadClips();
    }, []);

    async function loadClips() {
        try {
            setLoading(true);
            setError(null);
            const data = await listClips();
            setClips(data.data);
        } catch (error) {
            if (error instanceof ApiError) {
                // Use user-friendly message
                setError(error.userMessage);
                setIsRetryable(error.retryable);

                // Log for debugging
                console.error('[ClipsScreen] Error loading clips:', {
                    type: error.type,
                    statusCode: error.statusCode,
                    retryable: error.retryable,
                });

                // Handle specific error types
                switch (error.type) {
                    case ErrorType.AUTH:
                        // Redirect to login
                        router.push('/login');
                        break;
                    
                    case ErrorType.OFFLINE:
                        // Show offline indicator, maybe load from cache
                        setError('You are offline. Showing cached clips.');
                        // loadCachedClips();
                        break;
                }
            } else {
                setError('An unexpected error occurred');
                console.error('[ClipsScreen] Unexpected error:', error);
            }
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <Text>Loading...</Text>;
    
    if (error) {
        return (
            <View>
                <Text>{error}</Text>
                {isRetryable && (
                    <Button title="Retry" onPress={loadClips} />
                )}
            </View>
        );
    }

    return <FlatList data={clips} />;
}
```

## Mutation Example: Create Clip with Offline Support

```typescript
// services/clips.ts - Enhanced POST request
import { api, ApiError, ErrorType, apiClient } from '@/lib/api';

export async function createClip(clipData: CreateClipParams) {
    try {
        const res = await api.post<ApiResponse<ClipDetail>>('/clips', clipData);
        return res.data.data;
    } catch (error) {
        if (error instanceof ApiError) {
            console.error('[createClip] API Error:', {
                type: error.type,
                statusCode: error.statusCode,
                message: error.message,
            });

            // If offline, request is automatically queued
            if (error.type === ErrorType.OFFLINE) {
                console.log('[createClip] Request queued for when online');
                // Could show a message to user that it will be created when online
            }
        }
        throw error;
    }
}
```

```typescript
// Component using createClip
import { useState } from 'react';
import { createClip } from '@/services/clips';
import { ApiError, ErrorType, apiClient } from '@/lib/api';

function CreateClipScreen() {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(clipData: CreateClipParams) {
        try {
            setSubmitting(true);
            setError(null);

            const clip = await createClip(clipData);
            
            // Success - navigate to clip detail
            router.push(`/clip/${clip.id}`);
        } catch (error) {
            if (error instanceof ApiError) {
                // Show user-friendly message
                setError(error.userMessage);

                // Handle specific error types
                if (error.type === ErrorType.OFFLINE) {
                    // Request is queued, show success message
                    Alert.alert(
                        'Queued for Upload',
                        'Your clip will be submitted when you\'re back online',
                        [{ text: 'OK', onPress: () => router.back() }]
                    );
                    return; // Don't show error
                } else if (error.type === ErrorType.VALIDATION) {
                    // Show validation errors
                    setError('Please check your input and try again');
                } else if (error.type === ErrorType.RATE_LIMIT) {
                    // Show rate limit message
                    setError('Please slow down and try again in a moment');
                }
            } else {
                setError('An unexpected error occurred');
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <View>
            {/* Form fields */}
            {error && <Text style={styles.error}>{error}</Text>}
            <Button 
                title={submitting ? 'Submitting...' : 'Create Clip'}
                onPress={() => handleSubmit(formData)}
                disabled={submitting}
            />
        </View>
    );
}
```

## Network Status UI Component

```typescript
// components/NetworkStatusBanner.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { apiClient } from '@/lib/api';

export function NetworkStatusBanner() {
    const [isOnline, setIsOnline] = useState(apiClient.isOnline());
    const [queueCount, setQueueCount] = useState(apiClient.getQueuedRequestCount());

    useEffect(() => {
        const unsubscribe = apiClient.onQueueChange(() => {
            setIsOnline(apiClient.isOnline());
            setQueueCount(apiClient.getQueuedRequestCount());
        });

        return () => unsubscribe();
    }, []);

    if (isOnline && queueCount === 0) {
        return null; // Don't show banner when online with empty queue
    }

    return (
        <View style={[styles.banner, isOnline ? styles.syncing : styles.offline]}>
            <Text style={styles.text}>
                {isOnline 
                    ? `Syncing ${queueCount} pending request(s)...`
                    : `Offline. ${queueCount} request(s) queued.`
                }
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        padding: 12,
        alignItems: 'center',
    },
    offline: {
        backgroundColor: '#ff9800',
    },
    syncing: {
        backgroundColor: '#4caf50',
    },
    text: {
        color: 'white',
        fontWeight: '600',
    },
});
```

## Auth Service: Enhanced Token Refresh

```typescript
// services/auth.ts - Enhanced auth with better error handling
import { api, ApiError, ErrorType } from '@/lib/api';

export async function getCurrentUser(): Promise<User> {
    try {
        const response = await api.get<CurrentUserResponse>('/auth/me');
        return response.data;
    } catch (error) {
        if (error instanceof ApiError) {
            console.error('[getCurrentUser] API Error:', {
                type: error.type,
                statusCode: error.statusCode,
            });

            // If unauthorized, clear local user data
            if (error.type === ErrorType.AUTH) {
                console.log('[getCurrentUser] Auth error, clearing user data');
                // Clear local state
                await clearAuthData();
            }
        }
        throw error;
    }
}

export async function refreshAccessToken(): Promise<void> {
    try {
        const response = await api.post<RefreshResponse>('/auth/refresh');
        
        if (!response.data.message) {
            throw new Error('Failed to refresh token');
        }
    } catch (error) {
        if (error instanceof ApiError) {
            console.error('[refreshAccessToken] API Error:', {
                type: error.type,
                statusCode: error.statusCode,
            });

            // If refresh fails, clear tokens and redirect to login
            if (error.type === ErrorType.AUTH) {
                await clearAuthData();
                // Navigation will be handled by the API client's token refresh handler
            }
        }
        throw error;
    }
}

async function clearAuthData() {
    // Clear local auth state
    // This is already handled by the API client, but you might have additional state
}
```

## Key Takeaways

1. **Always catch and check for ApiError**: Provides rich error information
2. **Use error.userMessage**: Pre-generated user-friendly messages
3. **Check error.retryable**: Show retry button only for retryable errors
4. **Handle specific error types**: Different UX for AUTH, OFFLINE, VALIDATION, etc.
5. **Trust the offline queue**: POST requests are automatically queued when offline
6. **Monitor network status**: Show UI indicators for offline/syncing states
7. **Log for debugging**: Keep technical details in console logs
