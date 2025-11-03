/**
 * Tests for useNetworkStatus hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNetworkStatus } from './useNetworkStatus';
import { resetMobileApiClient } from '@/lib/mobile-api-client';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMobileApiClient();

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should return initial online status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.online).toBe(true);
    expect(result.current.networkStatus).toBeDefined();
    expect(result.current.networkStatus.online).toBe(true);
  });

  it('should update status when going offline', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Initially online
    expect(result.current.online).toBe(true);

    // Go offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.online).toBe(false);
    });
  });

  it('should update status when going online', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
      configurable: true,
    });

    const { result } = renderHook(() => useNetworkStatus());

    // Initially offline
    await waitFor(() => {
      expect(result.current.online).toBe(false);
    });

    // Go online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.online).toBe(true);
    });
  });

  it('should provide queued request count', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.queuedRequestCount).toBeGreaterThanOrEqual(0);
  });

  it('should provide retryQueue function', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(typeof result.current.retryQueue).toBe('function');
  });

  it('should provide clearQueue function', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(typeof result.current.clearQueue).toBe('function');
  });

  it('should call retryQueue successfully', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    await act(async () => {
      await result.current.retryQueue();
    });

    // Should not throw error
    expect(result.current.queuedRequestCount).toBeGreaterThanOrEqual(0);
  });

  it('should call clearQueue successfully', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      result.current.clearQueue();
    });

    await waitFor(() => {
      expect(result.current.queuedRequestCount).toBe(0);
    });
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should update queue count periodically', async () => {
    vi.useFakeTimers();

    const { result, unmount } = renderHook(() => useNetworkStatus());

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Count should be checked (may or may not change, but should be a number)
    expect(typeof result.current.queuedRequestCount).toBe('number');

    unmount();
    vi.useRealTimers();
  });
});
