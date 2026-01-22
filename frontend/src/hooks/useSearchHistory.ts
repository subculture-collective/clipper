import { useState, useEffect, useCallback } from 'react';
import { searchApi } from '../lib/search-api';
import type { SearchHistoryItem } from '../types/search';

/**
 * Hook for managing search history with backend sync
 * Falls back to localStorage if user is not authenticated
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  // Load history from backend or localStorage
  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isAuthenticated) {
        // Load from backend
        const items = await searchApi.getSearchHistory(20);
        setHistory(items);
      } else {
        // Load from localStorage
        const localHistory = localStorage.getItem('searchHistory');
        if (localHistory) {
          const parsed = JSON.parse(localHistory);
          setHistory(parsed);
        } else {
          setHistory([]);
        }
      }
    } catch (err) {
      // Fallback to localStorage if backend fails
      const localHistory = localStorage.getItem('searchHistory');
      if (localHistory) {
        const parsed = JSON.parse(localHistory);
        setHistory(parsed);
      }
      
      if (err instanceof Error && !err.message.includes('401')) {
        setError('Failed to load search history');
        console.error('Error loading search history:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Add search to history
  const addToHistory = useCallback((query: string, resultCount: number = 0) => {
    const item: SearchHistoryItem = {
      query,
      result_count: resultCount,
      created_at: new Date().toISOString(),
    };

    // Update local state
    setHistory(prev => {
      const filtered = prev.filter(h => h.query !== query);
      return [item, ...filtered].slice(0, 20);
    });

    // Update localStorage as backup
    const localHistory = localStorage.getItem('searchHistory');
    let items: SearchHistoryItem[] = [];
    if (localHistory) {
      try {
        items = JSON.parse(localHistory);
      } catch {
        items = [];
      }
    }
    items = [item, ...items.filter(h => h.query !== query)].slice(0, 20);
    localStorage.setItem('searchHistory', JSON.stringify(items));

    // Backend sync happens automatically via search API tracking
  }, []);

  // Clear history
  const clearHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Clear localStorage
      localStorage.removeItem('searchHistory');
      
      // Clear backend if authenticated (would need DELETE endpoint)
      // For now, just clear local state
      setHistory([]);
    } catch (err) {
      setError('Failed to clear search history');
      console.error('Error clearing search history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and when auth state changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    error,
    addToHistory,
    clearHistory,
    refresh: loadHistory,
  };
}
