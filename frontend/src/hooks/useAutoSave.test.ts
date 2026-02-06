import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave, useDraftStorage } from './useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with idle status', () => {
    const mockSave = vi.fn();
    const { result } = renderHook(() =>
      useAutoSave('test content', { onSave: mockSave })
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.lastSaved).toBeNull();
  });

  it('should trigger save after debounce delay', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ content }) => useAutoSave(content, { onSave: mockSave, debounceDelay: 1000 }),
      { initialProps: { content: 'test' } }
    );

    // Update content
    rerender({ content: 'test content' });

    // Advance timers by debounce delay
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith('test content');
    }, { timeout: 500 });
  });

  it('should trigger save at regular intervals', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useAutoSave('test content', { onSave: mockSave, interval: 30000 })
    );

    // Advance timers by interval
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('should not save if content is below minimum length', async () => {
    const mockSave = vi.fn();
    renderHook(() =>
      useAutoSave('', { onSave: mockSave, minLength: 1, interval: 30000 })
    );

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should update status to saved after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave('test content', { onSave: mockSave, debounceDelay: 1000 })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    }, { timeout: 500 });
  });

  it('should allow force save', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave('test content', { onSave: mockSave })
    );

    await act(async () => {
      result.current.forceSave();
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith('test content');
    }, { timeout: 500 });
  });

  it('should handle save errors', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() =>
      useAutoSave('test content', { onSave: mockSave, debounceDelay: 1000 })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    }, { timeout: 500 });

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('useDraftStorage', () => {
  const TEST_KEY = 'test-draft';

  beforeEach(() => {
    localStorage.clear();
  });

  it('should save draft to localStorage', () => {
    const { result } = renderHook(() => useDraftStorage(TEST_KEY));

    act(() => {
      result.current.saveDraft('test content');
    });

    expect(localStorage.getItem(TEST_KEY)).toBe('test content');
  });

  it('should load draft from localStorage', () => {
    localStorage.setItem(TEST_KEY, 'saved content');

    const { result } = renderHook(() => useDraftStorage(TEST_KEY));

    expect(result.current.loadDraft()).toBe('saved content');
  });

  it('should clear draft from localStorage', () => {
    localStorage.setItem(TEST_KEY, 'saved content');

    const { result } = renderHook(() => useDraftStorage(TEST_KEY));

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it('should not save empty content', () => {
    const { result } = renderHook(() => useDraftStorage(TEST_KEY));

    act(() => {
      result.current.saveDraft('');
    });

    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it('should not save whitespace-only content', () => {
    const { result } = renderHook(() => useDraftStorage(TEST_KEY));

    act(() => {
      result.current.saveDraft('   ');
    });

    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });
});
