import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheatreMode } from './useTheatreMode';

describe('useTheatreMode', () => {
  const STORAGE_KEY = 'clipper_theatre_mode';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear any fullscreen state
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should default to false when no preference is stored', () => {
      const { result } = renderHook(() => useTheatreMode());
      
      expect(result.current.isTheatreMode).toBe(false);
    });

    it('should load stored theatre mode preference from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      
      const { result } = renderHook(() => useTheatreMode());
      
      expect(result.current.isTheatreMode).toBe(true);
    });

    it('should default to false if stored value is not "true"', () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      
      const { result } = renderHook(() => useTheatreMode());
      
      expect(result.current.isTheatreMode).toBe(false);
    });

    it('should initialize other states correctly', () => {
      const { result } = renderHook(() => useTheatreMode());
      
      expect(result.current.isFullscreen).toBe(false);
      expect(result.current.isPictureInPicture).toBe(false);
      expect(result.current.containerRef).toBeDefined();
      expect(result.current.videoRef).toBeDefined();
    });
  });

  describe('Toggle Theatre Mode', () => {
    it('should toggle theatre mode when toggleTheatreMode is called', () => {
      const { result } = renderHook(() => useTheatreMode());
      
      expect(result.current.isTheatreMode).toBe(false);
      
      act(() => {
        result.current.toggleTheatreMode();
      });
      
      expect(result.current.isTheatreMode).toBe(true);
      
      act(() => {
        result.current.toggleTheatreMode();
      });
      
      expect(result.current.isTheatreMode).toBe(false);
    });

    it('should persist theatre mode to localStorage when toggled', () => {
      const { result } = renderHook(() => useTheatreMode());
      
      act(() => {
        result.current.toggleTheatreMode();
      });
      
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
      
      act(() => {
        result.current.toggleTheatreMode();
      });
      
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });
  });

  describe('Exit Theatre Mode', () => {
    it('should exit theatre mode when exitTheatreMode is called', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useTheatreMode());
      
      expect(result.current.isTheatreMode).toBe(true);
      
      act(() => {
        result.current.exitTheatreMode();
      });
      
      expect(result.current.isTheatreMode).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('should do nothing if already not in theatre mode', () => {
      const { result } = renderHook(() => useTheatreMode());
      
      expect(result.current.isTheatreMode).toBe(false);
      
      act(() => {
        result.current.exitTheatreMode();
      });
      
      expect(result.current.isTheatreMode).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should persist theatre mode across hook remounts', () => {
      const { result, unmount } = renderHook(() => useTheatreMode());
      
      act(() => {
        result.current.toggleTheatreMode();
      });
      
      unmount();
      
      const { result: result2 } = renderHook(() => useTheatreMode());
      expect(result2.current.isTheatreMode).toBe(true);
    });

    it('should restore theatre mode from localStorage on mount', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      
      const { result } = renderHook(() => useTheatreMode());
      
      expect(result.current.isTheatreMode).toBe(true);
    });

    it('should maintain separate theatre mode state across different hook instances', () => {
      const { result: result1 } = renderHook(() => useTheatreMode());
      const { result: result2 } = renderHook(() => useTheatreMode());
      
      // Both should start with the same persisted state
      expect(result1.current.isTheatreMode).toBe(result2.current.isTheatreMode);
      
      act(() => {
        result1.current.toggleTheatreMode();
      });
      
      // After toggle, localStorage is updated but result2 won't auto-update
      // This is expected behavior - localStorage is just for persistence
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });
  });

  describe('Control Functions', () => {
    it('should provide all expected control functions', () => {
      const { result } = renderHook(() => useTheatreMode());
      
      expect(typeof result.current.toggleTheatreMode).toBe('function');
      expect(typeof result.current.toggleFullscreen).toBe('function');
      expect(typeof result.current.togglePictureInPicture).toBe('function');
      expect(typeof result.current.exitTheatreMode).toBe('function');
    });
  });
});
