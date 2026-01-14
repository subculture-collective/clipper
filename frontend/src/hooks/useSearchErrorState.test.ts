import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useSearchErrorState } from './useSearchErrorState';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as telemetry from '@/lib/telemetry';

// Mock telemetry
vi.mock('@/lib/telemetry', () => ({
  trackEvent: vi.fn(),
}));

describe('useSearchErrorState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with no error state', () => {
    const { result } = renderHook(() => useSearchErrorState());
    
    expect(result.current.errorState).toEqual({
      type: 'none',
      message: undefined,
      retryCount: 0,
      isRetrying: false,
    });
  });

  describe('error detection', () => {
    it('should detect failover via x-search-failover header', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        response: {
          headers: { 'x-search-failover': 'true' },
          status: 200,
          statusText: 'OK',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      
      result.current.handleSearchError(error);
      
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('failover');
      });
      expect(result.current.errorState.message).toContain('backup search');
    });

    it('should detect failover via x-search-status header', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        response: {
          headers: { 'x-search-status': 'degraded' },
          status: 200,
          statusText: 'OK',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      
      result.current.handleSearchError(error);
      
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('failover');
      });
    });

    it('should detect complete failure on 503 status', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        response: {
          headers: {},
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      
      result.current.handleSearchError(error);
      
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('error');
      });
      expect(result.current.errorState.message).toContain('temporarily unavailable');
    });

    it('should detect complete failure on 504 status', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        response: {
          headers: {},
          status: 504,
          statusText: 'Gateway Timeout',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      
      result.current.handleSearchError(error);
      
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('error');
      });
    });

    it('should detect network errors', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
      };
      
      result.current.handleSearchError(error);
      
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('error');
      });
      expect(result.current.errorState.message).toContain('connection');
    });

    it('should handle unknown errors gracefully', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      result.current.handleSearchError(new Error('Unknown error'));
      
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('error');
      });
    });

    it('should track analytics event on error', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        response: {
          headers: {},
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      
      result.current.handleSearchError(error);
      
      await waitFor(() => {
        expect(telemetry.trackEvent).toHaveBeenCalledWith('search_error', expect.objectContaining({
          error_type: 'error',
          retry_count: 0,
        }));
      });
    });
  });

  describe('retry logic', () => {
    it('should implement exponential backoff', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      const searchFn = vi.fn().mockResolvedValue(undefined);
      
      // Start retry
      const retryPromise = result.current.retry(searchFn);
      
      // Wait for retrying state
      await waitFor(() => {
        expect(result.current.errorState.isRetrying).toBe(true);
        expect(result.current.errorState.retryCount).toBe(1);
      });
      
      // Fast-forward 1 second (first delay)
      vi.advanceTimersByTime(1000);
      await vi.runOnlyPendingTimersAsync();
      
      // Wait for retry to complete
      await retryPromise;
      
      expect(searchFn).toHaveBeenCalledTimes(1);
    });

    it('should stop after max retry attempts', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      const searchFn = vi.fn().mockRejectedValue(new Error('Search failed'));
      
      // First retry
      result.current.retry(searchFn);
      vi.advanceTimersByTime(1000);
      await vi.runOnlyPendingTimersAsync();
      await vi.waitFor(() => expect(result.current.errorState.retryCount).toBe(1));
      
      // Second retry
      result.current.retry(searchFn);
      vi.advanceTimersByTime(2000);
      await vi.runOnlyPendingTimersAsync();
      await vi.waitFor(() => expect(result.current.errorState.retryCount).toBe(2));
      
      // Third retry
      result.current.retry(searchFn);
      vi.advanceTimersByTime(4000);
      await vi.runOnlyPendingTimersAsync();
      await vi.waitFor(() => expect(result.current.errorState.retryCount).toBe(3));
      
      // Fourth retry should be blocked
      result.current.retry(searchFn);
      await vi.runOnlyPendingTimersAsync();
      
      expect(result.current.errorState.message).toContain('Maximum retry');
    });

    it('should track retry analytics event', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      const searchFn = vi.fn().mockResolvedValue(undefined);
      
      const retryPromise = result.current.retry(searchFn);
      
      expect(telemetry.trackEvent).toHaveBeenCalledWith('search_retry', expect.objectContaining({
        retry_count: 1,
      }));
      
      vi.advanceTimersByTime(1000);
      await vi.runOnlyPendingTimersAsync();
      await retryPromise;
    });

    it('should clear error on successful retry', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      const searchFn = vi.fn().mockResolvedValue(undefined);
      
      // Set error state first
      const error: Partial<AxiosError> = {
        response: {
          headers: {},
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      result.current.handleSearchError(error);
      
      // Retry
      const retryPromise = result.current.retry(searchFn);
      vi.advanceTimersByTime(1000);
      await vi.runOnlyPendingTimersAsync();
      await retryPromise;
      
      expect(result.current.errorState.type).toBe('none');
      expect(result.current.errorState.retryCount).toBe(0);
    });

    it('should cleanup timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const { result, unmount } = renderHook(() => useSearchErrorState());
      const searchFn = vi.fn().mockResolvedValue(undefined);
      
      result.current.retry(searchFn);
      
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('state transitions', () => {
    it('should transition from none to error', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        response: {
          headers: {},
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      
      expect(result.current.errorState.type).toBe('none');
      result.current.handleSearchError(error);
      
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('error');
      });
    });

    it('should transition from error to none on success', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        response: {
          headers: {},
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      
      result.current.handleSearchError(error);
      
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('error');
      });
      
      result.current.handleSearchSuccess();
      expect(result.current.errorState.type).toBe('none');
    });

    it('should dismiss error', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        response: {
          headers: {},
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      
      result.current.handleSearchError(error);
      
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('error');
      });
      
      result.current.dismissError();
      expect(result.current.errorState.type).toBe('none');
    });

    it('should track dismiss analytics event', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        response: {
          headers: {},
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      
      result.current.handleSearchError(error);
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('error');
      });
      
      vi.clearAllMocks();
      
      result.current.dismissError();
      
      expect(telemetry.trackEvent).toHaveBeenCalledWith('search_error_dismissed', expect.objectContaining({
        error_type: 'error',
      }));
    });
  });

  describe('handleSearchSuccess', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useSearchErrorState());
      
      const error: Partial<AxiosError> = {
        response: {
          headers: {},
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          config: {} as unknown as InternalAxiosRequestConfig,
        },
      };
      
      result.current.handleSearchError(error);
      await waitFor(() => {
        expect(result.current.errorState.type).toBe('error');
      });
      
      result.current.handleSearchSuccess();
      
      expect(result.current.errorState).toEqual({
        type: 'none',
        message: undefined,
        retryCount: 0,
        isRetrying: false,
      });
    });

    it('should clear pending retry timeout', async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const { result } = renderHook(() => useSearchErrorState());
      const searchFn = vi.fn().mockResolvedValue(undefined);
      
      result.current.retry(searchFn);
      await waitFor(() => {
        expect(result.current.errorState.retryCount).toBe(1);
      });
      
      result.current.handleSearchSuccess();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
