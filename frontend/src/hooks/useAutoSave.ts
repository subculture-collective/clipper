import { useEffect, useRef, useState, useCallback } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  /** Auto-save interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Callback to save the content */
  onSave: (content: string) => void | Promise<void>;
  /** Minimum content length to trigger auto-save (default: 1) */
  minLength?: number;
  /** Debounce delay after user stops typing (default: 2000ms) */
  debounceDelay?: number;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  forceSave: () => void;
}

/**
 * Hook to auto-save content at regular intervals
 * Saves content to localStorage and optionally to a backend
 */
export function useAutoSave(
  content: string,
  options: UseAutoSaveOptions
): UseAutoSaveReturn {
  const {
    interval = 30000,
    onSave,
    minLength = 1,
    debounceDelay = 2000,
  } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const lastContentRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSave = useCallback(async () => {
    // Don't save if content is too short or hasn't changed
    if (content.trim().length < minLength || content === lastContentRef.current) {
      return;
    }

    setStatus('saving');

    try {
      await onSave(content);
      lastContentRef.current = content;
      setStatus('saved');
      setLastSaved(new Date());

      // Reset status after 2 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setStatus('error');
      
      // Reset error status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    }
  }, [content, minLength, onSave]);

  const forceSave = useCallback(() => {
    performSave();
  }, [performSave]);

  // Debounced save after user stops typing
  useEffect(() => {
    if (content === lastContentRef.current) {
      return;
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, debounceDelay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, debounceDelay, performSave]);

  // Periodic auto-save
  useEffect(() => {
    intervalTimerRef.current = setInterval(() => {
      performSave();
    }, interval);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [interval, performSave]);

  return {
    status,
    lastSaved,
    forceSave,
  };
}

/**
 * Hook to manage draft storage in localStorage
 */
export function useDraftStorage(key: string) {
  const saveDraft = useCallback((content: string) => {
    if (content.trim().length > 0) {
      localStorage.setItem(key, content);
    }
  }, [key]);

  const loadDraft = useCallback((): string | null => {
    return localStorage.getItem(key);
  }, [key]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
  };
}
