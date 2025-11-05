/**
 * Mobile API Client
 * 
 * This module provides the enhanced API client for the mobile app with:
 * - Retry logic with exponential backoff and jitter
 * - Network status awareness
 * - Offline request queueing
 * - Standardized error handling
 * - Token refresh handling
 */

import { getApiClient, ApiError, ErrorType } from './enhanced-api-client';

// Export the axios instance for backward compatibility
export const api = getApiClient().getAxiosInstance();

// Export enhanced client for advanced usage
export const apiClient = getApiClient();

// Re-export types and utilities
export { ApiError, ErrorType, getUserFriendlyMessage } from './enhanced-api-client';
export type { ErrorTypeValue, NetworkStatus, QueuedRequest } from './enhanced-api-client';
