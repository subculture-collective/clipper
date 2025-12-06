import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('works with number values', () => {
    const { result } = renderHook(() => useDebounce(42, 100));
    expect(result.current).toBe(42);
  });

  it('works with object values', () => {
    const obj = { id: 1, name: 'test' };
    const { result } = renderHook(() => useDebounce(obj, 100));
    expect(result.current).toEqual(obj);
  });

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useDebounce('test', 500));
    
    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('handles value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'first', delay: 100 },
      }
    );

    expect(result.current).toBe('first');

    // Rerender with new value
    rerender({ value: 'second', delay: 100 });

    // Initial value should still be there (debounced)
    expect(result.current).toBe('first');
  });
});
