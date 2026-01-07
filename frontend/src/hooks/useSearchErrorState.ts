import { useState, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';

export type SearchErrorType = 'failover' | 'error' | 'none';

export interface SearchErrorState {
  type: SearchErrorType;
  message?: string;
  retryCount: number;
  isRetrying: boolean;
}

export interface UseSearchErrorStateReturn {
  errorState: SearchErrorState;
  handleSearchError: (error: unknown) => void;
  handleSearchSuccess: () => void;
  retry: (searchFn: () => Promise<void>) => Promise<void>;
  dismissError: () => void;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

/**
 * Custom hook to manage search error states and retry logic
 * 
 * Features:
 * - Detects failover vs complete failure from API responses
 * - Implements exponential backoff for retries
 * - Tracks retry attempts
 * - Provides error state management
 * 
 * @example
 * ```tsx
 * const { errorState, handleSearchError, retry, dismissError } = useSearchErrorState();
 * 
 * const performSearch = async () => {
 *   try {
 *     const result = await searchApi.search(params);
 *     handleSearchSuccess();
 *   } catch (error) {
 *     handleSearchError(error);
 *   }
 * };
 * ```
 */
export function useSearchErrorState(): UseSearchErrorStateReturn {
  const [errorState, setErrorState] = useState<SearchErrorState>({
    type: 'none',
    message: undefined,
    retryCount: 0,
    isRetrying: false,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Analyze error to determine if it's a failover or complete failure
   */
  const analyzeError = useCallback((error: unknown): { type: SearchErrorType; message?: string } => {
    if (!error) {
      return { type: 'none' };
    }

    // Check if it's an Axios error with response
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const axiosError = error as AxiosError;
      const response = axiosError.response;
      
      if (response) {
        // Check for failover header from backend
        const failoverHeader = response.headers['x-search-failover'];
        const searchStatus = response.headers['x-search-status'];
        
        if (failoverHeader === 'true' || searchStatus === 'degraded') {
          return {
            type: 'failover',
            message: "We're using backup search. Results may be limited.",
          };
        }

        // Check status codes
        const status = response.status;
        
        // Service Unavailable or Gateway Timeout indicates complete failure
        if (status === 503 || status === 504) {
          return {
            type: 'error',
            message: 'Search service is temporarily unavailable.',
          };
        }

        // Other 5xx errors also indicate failure
        if (status >= 500) {
          return {
            type: 'error',
            message: 'An error occurred while searching. Please try again.',
          };
        }
      }

      // Network error (no response)
      if (!response && axiosError.code === 'ERR_NETWORK') {
        return {
          type: 'error',
          message: 'Unable to reach search service. Please check your connection.',
        };
      }
    }

    // Default to generic error for unknown errors
    return {
      type: 'error',
      message: 'An unexpected error occurred.',
    };
  }, []);

  /**
   * Handle search error and update state accordingly
   */
  const handleSearchError = useCallback((error: unknown) => {
    const { type, message } = analyzeError(error);
    
    setErrorState(prev => {
      // Track analytics event with current retry count
      if (typeof window !== 'undefined') {
        const analytics = (window as Window & { analytics?: { track: (event: string, properties: Record<string, unknown>) => void } }).analytics;
        if (analytics) {
          analytics.track('search_error', {
            error_type: type,
            retry_count: prev.retryCount,
            message,
          });
        }
      }

      return {
        type,
        message,
        retryCount: prev.retryCount,
        isRetrying: false,
      };
    });
  }, [analyzeError]);

  /**
   * Handle successful search and clear error state
   */
  const handleSearchSuccess = useCallback(() => {
    setErrorState({
      type: 'none',
      message: undefined,
      retryCount: 0,
      isRetrying: false,
    });

    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = undefined;
    }
  }, []);

  /**
   * Retry search with exponential backoff
   */
  const retry = useCallback(async (searchFn: () => Promise<void>) => {
    const currentRetryCount = errorState.retryCount;
    
    // Check if max retries exceeded
    if (currentRetryCount >= MAX_RETRY_ATTEMPTS) {
      setErrorState(prev => ({
        ...prev,
        type: 'error',
        message: 'Maximum retry attempts reached. Please try again later.',
        isRetrying: false,
      }));
      return;
    }

    // Set retrying state
    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
    }));

    // Track analytics event
    if (typeof window !== 'undefined') {
      const analytics = (window as Window & { analytics?: { track: (event: string, properties: Record<string, unknown>) => void } }).analytics;
      if (analytics) {
        analytics.track('search_retry', {
          retry_count: currentRetryCount + 1,
        });
      }
    }

    // Apply exponential backoff delay
    const delay = RETRY_DELAYS[Math.min(currentRetryCount, RETRY_DELAYS.length - 1)];
    
    await new Promise(resolve => {
      retryTimeoutRef.current = setTimeout(resolve, delay);
    });

    // Attempt the search
    try {
      await searchFn();
      handleSearchSuccess();
    } catch (error) {
      handleSearchError(error);
    }
  }, [errorState.retryCount, handleSearchError, handleSearchSuccess]);

  /**
   * Manually dismiss the error
   */
  const dismissError = useCallback(() => {
    setErrorState(prev => {
      // Track analytics event with current state before dismissing
      if (typeof window !== 'undefined') {
        const analytics = (window as Window & { analytics?: { track: (event: string, properties: Record<string, unknown>) => void } }).analytics;
        if (analytics) {
          analytics.track('search_error_dismissed', {
            error_type: prev.type,
            retry_count: prev.retryCount,
          });
        }
      }

      return {
        ...prev,
        type: 'none',
        isRetrying: false,
      };
    });
  }, []);

  return {
    errorState,
    handleSearchError,
    handleSearchSuccess,
    retry,
    dismissError,
  };
}
