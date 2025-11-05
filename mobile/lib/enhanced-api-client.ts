/**
 * Enhanced Mobile API Client with retry logic, network awareness, and error handling
 * 
 * Features:
 * - Automatic retry with exponential backoff and jitter
 * - Network status awareness via expo-network
 * - Standardized error handling with user-friendly messages
 * - Request/response interceptors with token refresh
 * - Offline queue for mutations
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, isAxiosError } from 'axios';
import axiosRetry, { IAxiosRetryConfig, exponentialDelay } from 'axios-retry';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/constants/config';

// ============================================================================
// Types and Interfaces
// ============================================================================

export const ErrorType = {
    NETWORK: 'NETWORK',
    AUTH: 'AUTH',
    VALIDATION: 'VALIDATION',
    SERVER: 'SERVER',
    TIMEOUT: 'TIMEOUT',
    OFFLINE: 'OFFLINE',
    RATE_LIMIT: 'RATE_LIMIT',
    UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorTypeValue = (typeof ErrorType)[keyof typeof ErrorType];

export class ApiError extends Error {
    public readonly type: ErrorTypeValue;
    public readonly statusCode?: number;
    public readonly originalError?: Error;
    public readonly userMessage: string;
    public readonly retryable: boolean;

    constructor(
        message: string,
        type: ErrorTypeValue,
        statusCode?: number,
        originalError?: Error,
        retryable = false
    ) {
        super(message);
        this.name = 'ApiError';
        this.type = type;
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.retryable = retryable;
        this.userMessage = getUserFriendlyMessage(type, statusCode);

        // Maintains proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
    }
}

export interface NetworkStatus {
    isConnected: boolean;
    type?: Network.NetworkStateType;
    isInternetReachable?: boolean;
}

export interface QueuedRequest {
    config: InternalAxiosRequestConfig;
    resolve: (value: AxiosResponse) => void;
    reject: (reason: ApiError) => void;
    timestamp: number;
}

export interface RetryConfig {
    retries: number;
    retryDelay: (retryCount: number, error: AxiosError) => number;
    retryCondition: (error: AxiosError) => boolean;
}

// ============================================================================
// Enhanced Mobile API Client Class
// ============================================================================

export class EnhancedMobileApiClient {
    private axiosInstance: AxiosInstance;
    private networkStatus: NetworkStatus = { isConnected: true };
    private offlineQueue: QueuedRequest[] = [];
    private isRefreshingToken = false;
    private refreshQueue: {
        resolve: () => void;
        reject: (reason: ApiError) => void;
    }[] = [];
    private queueChangeListeners: (() => void)[] = [];

    constructor(
        baseURL: string = API_BASE_URL,
        timeout: number = REQUEST_TIMEOUT_MS
    ) {
        // Create axios instance
        this.axiosInstance = axios.create({
            baseURL,
            timeout,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Setup retry logic with exponential backoff and jitter
        this.setupRetryLogic();

        // Setup interceptors
        this.setupRequestInterceptors();
        this.setupResponseInterceptors();

        // Setup network monitoring
        this.setupNetworkMonitoring();
    }

    // ============================================================================
    // Public Methods
    // ============================================================================

    public getAxiosInstance(): AxiosInstance {
        return this.axiosInstance;
    }

    public getNetworkStatus(): NetworkStatus {
        return { ...this.networkStatus };
    }

    public isOnline(): boolean {
        return this.networkStatus.isConnected === true;
    }

    public getQueuedRequestCount(): number {
        return this.offlineQueue.length;
    }

    public async retryOfflineQueue(): Promise<void> {
        if (!this.isOnline() || this.offlineQueue.length === 0) {
            return;
        }

        console.log(`[EnhancedAPI] Retrying ${this.offlineQueue.length} queued requests`);

        const queue = [...this.offlineQueue];
        this.offlineQueue = [];
        this.notifyQueueChange();

        for (const item of queue) {
            try {
                const response = await this.axiosInstance.request(item.config);
                item.resolve(response);
            } catch (error) {
                const apiError = this.transformError(error);

                // Re-queue if still offline and retryable
                if (!this.isOnline() && apiError.retryable) {
                    this.offlineQueue.push(item);
                } else {
                    item.reject(apiError);
                }
            }
        }

        this.notifyQueueChange();
    }

    public clearOfflineQueue(): void {
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];
        this.notifyQueueChange();

        queue.forEach(item => {
            item.reject(
                new ApiError(
                    'Request cancelled',
                    ErrorType.OFFLINE,
                    undefined,
                    undefined,
                    false
                )
            );
        });
    }

    public onQueueChange(listener: () => void): () => void {
        this.queueChangeListeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = this.queueChangeListeners.indexOf(listener);
            if (index > -1) {
                this.queueChangeListeners.splice(index, 1);
            }
        };
    }

    // ============================================================================
    // Private Methods - Setup
    // ============================================================================

    private setupRetryLogic(): void {
        const retryConfig: IAxiosRetryConfig = {
            retries: 3,
            retryDelay: (retryCount, error) => {
                // Exponential backoff with jitter
                const delay = exponentialDelay(retryCount, error);
                // Add jitter: randomize delay by ±25%
                const jitter = delay * 0.25 * (Math.random() * 2 - 1);
                const finalDelay = Math.max(1000, Math.min(delay + jitter, 10000));

                console.log(
                    `[EnhancedAPI] Retry attempt ${retryCount} after ${finalDelay}ms for ${error.config?.url}`
                );

                return finalDelay;
            },
            retryCondition: (error: AxiosError) => {
                // Don't retry if explicitly marked as non-retryable
                if ((error.config as any)?._skipRetry) {
                    return false;
                }

                // Only retry idempotent methods
                // Note: PUT is generally idempotent per HTTP spec, but excluded here
                // to match offline queue behavior (PUT is queued when offline)
                const method = error.config?.method?.toUpperCase();
                const isIdempotent = ['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(
                    method || ''
                );

                if (!isIdempotent) {
                    return false;
                }

                // Retry network errors
                if (!error.response) {
                    return true;
                }

                // Retry specific status codes
                const status = error.response.status;
                const retryableStatuses = [408, 429, 500, 502, 503, 504];

                return retryableStatuses.includes(status);
            },
        };

        axiosRetry(this.axiosInstance, retryConfig);
    }

    private setupRequestInterceptors(): void {
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                // Add auth token
                try {
                    const token = await SecureStore.getItemAsync('auth_token');
                    if (token) {
                        if (!config.headers) {
                            config.headers = {} as any;
                        }
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                } catch (error) {
                    console.error('[EnhancedAPI] Failed to get auth token:', error);
                }

                // Check network status before making request
                if (!this.isOnline()) {
                    // Queue non-GET requests when offline
                    const method = config.method?.toUpperCase();
                    if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
                        throw new ApiError(
                            'Device is offline',
                            ErrorType.OFFLINE,
                            undefined,
                            undefined,
                            true
                        );
                    }
                }

                return config;
            },
            (error) => {
                return Promise.reject(this.transformError(error));
            }
        );
    }

    private setupResponseInterceptors(): void {
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & {
                    _retry?: boolean;
                };

                // Handle token refresh on 401
                if (
                    error.response?.status === 401 &&
                    originalRequest &&
                    !originalRequest._retry
                ) {
                    return this.handleTokenRefresh(error, originalRequest);
                }

                // Check if request should be queued due to offline
                if (!this.isOnline() && this.shouldQueueRequest(originalRequest)) {
                    return new Promise<AxiosResponse>((resolve, reject) => {
                        this.offlineQueue.push({
                            config: originalRequest,
                            resolve,
                            reject: (reason: ApiError) => reject(reason),
                            timestamp: Date.now(),
                        });
                        this.notifyQueueChange();
                    });
                }

                // Transform and reject error
                return Promise.reject(this.transformError(error));
            }
        );
    }

    private async setupNetworkMonitoring(): Promise<void> {
        try {
            // Get initial network state
            const networkState = await Network.getNetworkStateAsync();
            this.updateNetworkStatus(networkState);

            // Listen for network state changes
            Network.addNetworkStateListener((networkState) => {
                const wasOnline = this.isOnline();
                this.updateNetworkStatus(networkState);
                const isNowOnline = this.isOnline();

                // If we just came online, retry queued requests
                if (!wasOnline && isNowOnline) {
                    console.log('[EnhancedAPI] Network restored, retrying queued requests');
                    this.retryOfflineQueue();
                }
            });
        } catch (error) {
            console.error('[EnhancedAPI] Failed to setup network monitoring:', error);
        }
    }

    private updateNetworkStatus(networkState: Network.NetworkState): void {
        this.networkStatus = {
            isConnected: networkState.isConnected ?? true,
            type: networkState.type,
            isInternetReachable: networkState.isInternetReachable ?? undefined,
        };

        console.log('[EnhancedAPI] Network status updated:', this.networkStatus);
    }

    // ============================================================================
    // Private Methods - Token Refresh
    // ============================================================================

    private async handleTokenRefresh(
        error: AxiosError,
        originalRequest: InternalAxiosRequestConfig & { _retry?: boolean }
    ): Promise<AxiosResponse> {
        // Check if this is a refresh token request failing
        if (originalRequest.url === '/auth/refresh') {
            this.isRefreshingToken = false;
            this.processRefreshQueue(this.transformError(error));
            return Promise.reject(this.transformError(error));
        }

        // If already refreshing, queue this request
        if (this.isRefreshingToken) {
            return new Promise((resolve, reject) => {
                this.refreshQueue.push({ resolve, reject });
            }).then(() => this.axiosInstance.request(originalRequest));
        }

        originalRequest._retry = true;
        this.isRefreshingToken = true;

        try {
            // Try to refresh the token
            await this.axiosInstance.post('/auth/refresh');

            // Token refreshed successfully
            this.isRefreshingToken = false;
            this.processRefreshQueue(null);

            // Retry the original request
            return this.axiosInstance.request(originalRequest);
        } catch (refreshError) {
            // Refresh failed, clear tokens
            this.isRefreshingToken = false;
            const apiError = this.transformError(refreshError);
            this.processRefreshQueue(apiError);

            // Clear stored tokens
            try {
                await SecureStore.deleteItemAsync('auth_token');
                await SecureStore.deleteItemAsync('refresh_token');
                await SecureStore.deleteItemAsync('user_data');
            } catch (error) {
                console.error('[EnhancedAPI] Failed to clear tokens:', error);
            }

            return Promise.reject(apiError);
        }
    }

    private processRefreshQueue(error: ApiError | null): void {
        this.refreshQueue.forEach((promise) => {
            if (error) {
                promise.reject(error);
            } else {
                // Signal success - queued requests will retry themselves
                promise.resolve();
            }
        });
        this.refreshQueue = [];
    }

    // ============================================================================
    // Private Methods - Error Handling
    // ============================================================================

    private transformError(error: unknown): ApiError {
        if (error instanceof ApiError) {
            return error;
        }

        if (isAxiosError(error)) {
            const axiosError = error as AxiosError;

            // Network errors (no response)
            if (!axiosError.response) {
                if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
                    return new ApiError(
                        'Request timeout',
                        ErrorType.TIMEOUT,
                        undefined,
                        axiosError,
                        true
                    );
                }

                return new ApiError(
                    'Network error',
                    ErrorType.NETWORK,
                    undefined,
                    axiosError,
                    true
                );
            }

            // HTTP errors with response
            const status = axiosError.response.status;

            // Rate limiting
            if (status === 429) {
                return new ApiError(
                    'Rate limit exceeded',
                    ErrorType.RATE_LIMIT,
                    status,
                    axiosError,
                    true
                );
            }

            // Auth errors
            if (status === 401 || status === 403) {
                return new ApiError(
                    'Authentication error',
                    ErrorType.AUTH,
                    status,
                    axiosError,
                    false
                );
            }

            // Client errors
            if (status >= 400 && status < 500) {
                return new ApiError(
                    'Validation error',
                    ErrorType.VALIDATION,
                    status,
                    axiosError,
                    false
                );
            }

            // Server errors
            if (status >= 500) {
                return new ApiError(
                    'Server error',
                    ErrorType.SERVER,
                    status,
                    axiosError,
                    true
                );
            }
        }

        // Unknown error
        return new ApiError(
            'Unknown error',
            ErrorType.UNKNOWN,
            undefined,
            error as Error,
            false
        );
    }

    private shouldQueueRequest(config?: AxiosRequestConfig): boolean {
        if (!config) return false;

        // Don't queue GET requests or auth requests
        const method = (config.method || 'get').toLowerCase();
        const isAuthRequest = config.url?.includes('/auth');

        return !isAuthRequest && !['get', 'head', 'options'].includes(method);
    }

    private notifyQueueChange(): void {
        this.queueChangeListeners.forEach((listener) => listener());
    }

    public cleanup(): void {
        // Cleanup would be handled by expo-network automatically
        console.log('[EnhancedAPI] Cleanup complete');
    }
}

// ============================================================================
// User-Friendly Error Messages
// ============================================================================

export function getUserFriendlyMessage(type: ErrorTypeValue, statusCode?: number): string {
    switch (type) {
        case ErrorType.NETWORK:
            return 'Unable to connect. Please check your internet connection and try again.';

        case ErrorType.TIMEOUT:
            return 'The request took too long. Please try again.';

        case ErrorType.OFFLINE:
            return 'You are currently offline. Your request will be sent when you reconnect.';

        case ErrorType.RATE_LIMIT:
            return 'Too many requests. Please wait a moment and try again.';

        case ErrorType.AUTH:
            if (statusCode === 401) {
                return 'Your session has expired. Please log in again.';
            }
            return 'You do not have permission to perform this action.';

        case ErrorType.VALIDATION:
            return 'Please check your input and try again.';

        case ErrorType.SERVER:
            if (statusCode === 503) {
                return 'The service is temporarily unavailable. Please try again later.';
            }
            return 'Something went wrong on our end. Please try again later.';

        case ErrorType.UNKNOWN:
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let apiClientInstance: EnhancedMobileApiClient | null = null;

export function getApiClient(): EnhancedMobileApiClient {
    if (!apiClientInstance) {
        apiClientInstance = new EnhancedMobileApiClient();
    }
    return apiClientInstance;
}

export function resetApiClient(): void {
    if (apiClientInstance) {
        apiClientInstance.cleanup();
        apiClientInstance = null;
    }
}

// Export default instance
export const enhancedApi = getApiClient().getAxiosInstance();
