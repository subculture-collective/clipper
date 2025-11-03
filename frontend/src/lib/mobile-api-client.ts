/**
 * Mobile API Client with retry logic, offline queue, and network status awareness
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Offline request queueing
 * - Network status detection
 * - Standardized error handling
 * - Request/response interceptors
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

export interface QueuedRequest {
  config: InternalAxiosRequestConfig;
  resolve: (value: AxiosResponse) => void;
  reject: (reason: ApiError) => void;
  retryCount: number;
  timestamp: number;
}

export interface NetworkStatus {
  online: boolean;
  type?: string; // wifi, cellular, etc.
  effectiveType?: string; // 4g, 3g, 2g, slow-2g
  downlink?: number;
  rtt?: number;
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN',
}

export class ApiError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode?: number;
  public readonly originalError?: Error;
  public readonly userMessage: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: ErrorType,
    statusCode?: number,
    originalError?: Error,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.retryable = retryable;
    this.userMessage = getUserFriendlyMessage(type, statusCode);
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

const DEFAULT_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Mobile API Client Class
// ============================================================================

export class MobileApiClient {
  private axiosInstance: AxiosInstance;
  private retryConfig: RetryConfig;
  private offlineQueue: QueuedRequest[] = [];
  private networkStatus: NetworkStatus = { online: navigator.onLine };
  private isRefreshingToken = false;
  private refreshQueue: Array<{
    resolve: (value: AxiosResponse) => void;
    reject: (reason: ApiError) => void;
  }> = [];

  constructor(
    baseURL: string,
    retryConfig: Partial<RetryConfig> = {},
    timeout: number = DEFAULT_TIMEOUT
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Send cookies with requests
    });

    // Setup interceptors
    this.setupRequestInterceptors();
    this.setupResponseInterceptors();
    
    // Setup network status monitoring
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
    return this.networkStatus.online;
  }

  public async retryOfflineQueue(): Promise<void> {
    if (!this.isOnline() || this.offlineQueue.length === 0) {
      return;
    }

    console.log(`[MobileAPI] Retrying ${this.offlineQueue.length} queued requests`);
    
    // Process queue in order
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

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
  }

  public clearOfflineQueue(): void {
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    queue.forEach(item => {
      item.reject(new ApiError(
        'Request cancelled',
        ErrorType.OFFLINE,
        undefined,
        undefined,
        false
      ));
    });
  }

  public getQueuedRequestCount(): number {
    return this.offlineQueue.length;
  }

  // ============================================================================
  // Private Methods - Interceptors
  // ============================================================================

  private setupRequestInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add timestamp for timeout tracking
        (config as InternalAxiosRequestConfig & { requestStartTime?: number }).requestStartTime = Date.now();
        
        // Check if offline before making request
        if (!this.isOnline() && this.shouldQueueRequest(config)) {
          throw new ApiError(
            'Device is offline',
            ErrorType.OFFLINE,
            undefined,
            undefined,
            true
          );
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
          _retryCount?: number;
        };

        // Handle token refresh on 401
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          return this.handleTokenRefresh(error, originalRequest);
        }

        // Handle retry logic
        if (this.shouldRetry(error, originalRequest)) {
          return this.retryRequest(error, originalRequest);
        }

        // Transform and reject error
        return Promise.reject(this.transformError(error));
      }
    );
  }

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
      // Refresh failed
      this.isRefreshingToken = false;
      const apiError = this.transformError(refreshError);
      this.processRefreshQueue(apiError);
      return Promise.reject(apiError);
    }
  }

  private processRefreshQueue(error: ApiError | null): void {
    this.refreshQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        // Token refreshed, resolve promises so they can retry
        promise.resolve({} as AxiosResponse);
      }
    });
    this.refreshQueue = [];
  }

  private shouldRetry(
    error: AxiosError,
    config?: InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number }
  ): boolean {
    if (!config) return false;
    
    const retryCount = config._retryCount || 0;
    if (retryCount >= this.retryConfig.maxRetries) return false;

    // Don't retry if already handling token refresh
    if (config._retry) return false;

    // Check if error is retryable
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    if (error.response) {
      return this.retryConfig.retryableStatusCodes.includes(error.response.status);
    }

    // Network errors are retryable
    return !error.response;
  }

  private async retryRequest(
    error: AxiosError,
    config: InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number }
  ): Promise<AxiosResponse> {
    config._retryCount = (config._retryCount || 0) + 1;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, config._retryCount - 1),
      this.retryConfig.maxDelayMs
    );

    console.log(
      `[MobileAPI] Retrying request (attempt ${config._retryCount}/${this.retryConfig.maxRetries}) after ${delay}ms`,
      config.url
    );

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));

    // If went offline during wait, queue the request
    if (!this.isOnline()) {
      return new Promise<AxiosResponse>((resolve, reject) => {
        this.offlineQueue.push({
          config,
          resolve,
          reject: reject as (reason: ApiError) => void,
          retryCount: config._retryCount || 0,
          timestamp: Date.now(),
        });
      });
    }

    // Retry the request
    return this.axiosInstance.request(config);
  }

  private shouldQueueRequest(config: AxiosRequestConfig): boolean {
    // Don't queue GET requests or auth requests
    const method = (config.method || 'get').toLowerCase();
    const isAuthRequest = config.url?.includes('/auth');
    
    return !isAuthRequest && method !== 'get';
  }

  // ============================================================================
  // Private Methods - Error Handling
  // ============================================================================

  private transformError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network errors
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

      // HTTP errors
      const status = axiosError.response.status;
      
      if (status === 401 || status === 403) {
        return new ApiError(
          'Authentication error',
          ErrorType.AUTH,
          status,
          axiosError,
          false
        );
      }

      if (status >= 400 && status < 500) {
        return new ApiError(
          'Validation error',
          ErrorType.VALIDATION,
          status,
          axiosError,
          false
        );
      }

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

  // ============================================================================
  // Private Methods - Network Monitoring
  // ============================================================================

  private setupNetworkMonitoring(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Monitor connection quality if available
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { 
        connection?: EventTarget & { 
          type?: string;
          effectiveType?: string;
          downlink?: number;
          rtt?: number;
        } 
      }).connection;
      if (connection) {
        this.updateNetworkStatus();
        connection.addEventListener('change', this.handleConnectionChange);
      }
    }
  }

  private handleOnline = (): void => {
    console.log('[MobileAPI] Network status: ONLINE');
    this.networkStatus.online = true;
    this.updateNetworkStatus();
    
    // Automatically retry queued requests
    this.retryOfflineQueue();
  };

  private handleOffline = (): void => {
    console.log('[MobileAPI] Network status: OFFLINE');
    this.networkStatus.online = false;
    this.updateNetworkStatus();
  };

  private handleConnectionChange = (): void => {
    this.updateNetworkStatus();
  };

  private updateNetworkStatus(): void {
    const connection = (navigator as Navigator & { 
      connection?: { 
        type?: string;
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
      } 
    }).connection;
    if (connection) {
      this.networkStatus = {
        online: navigator.onLine,
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
      
      console.log('[MobileAPI] Network status updated:', this.networkStatus);
    }
  }

  public cleanup(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { 
        connection?: EventTarget & { 
          type?: string;
          effectiveType?: string;
          downlink?: number;
          rtt?: number;
        } 
      }).connection;
      if (connection) {
        connection.removeEventListener('change', this.handleConnectionChange);
      }
    }
  }
}

// ============================================================================
// User-Friendly Error Messages
// ============================================================================

export function getUserFriendlyMessage(type: ErrorType, statusCode?: number): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'Unable to connect. Please check your internet connection and try again.';
    
    case ErrorType.TIMEOUT:
      return 'The request took too long. Please try again.';
    
    case ErrorType.OFFLINE:
      return 'You are currently offline. Your request will be sent when you reconnect.';
    
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

let mobileApiClientInstance: MobileApiClient | null = null;

export function getMobileApiClient(): MobileApiClient {
  if (!mobileApiClientInstance) {
    mobileApiClientInstance = new MobileApiClient(API_BASE_URL);
  }
  return mobileApiClientInstance;
}

export function resetMobileApiClient(): void {
  if (mobileApiClientInstance) {
    mobileApiClientInstance.cleanup();
    mobileApiClientInstance = null;
  }
}

// Export default instance
export const mobileApiClient = getMobileApiClient();
