import { useState, useEffect, useCallback } from 'react';
import { searchApi } from '../lib/search-api';
import type { SavedSearch, SearchFilters } from '../types/search';

/**
 * Hook for managing saved searches with localStorage persistence
 * Provides reactive state updates when searches are saved or deleted
 */
export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);

  // Load saved searches from localStorage
  const loadSavedSearches = useCallback(() => {
    setLoading(true);
    try {
      const searches = searchApi.getSavedSearches();
      setSavedSearches(searches);
    } catch (error) {
      console.error('Error loading saved searches:', error);
      setSavedSearches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save a new search
  const saveSearch = useCallback((query: string, filters?: SearchFilters, name?: string) => {
    const newSearch = searchApi.saveSearch(query, filters, name);
    // Reload searches to get updated list
    loadSavedSearches();
    return newSearch;
  }, [loadSavedSearches]);

  // Delete a saved search
  const deleteSavedSearch = useCallback((id: string) => {
    searchApi.deleteSavedSearch(id);
    // Update local state immediately
    setSavedSearches(prev => prev.filter(s => s.id !== id));
  }, []);

  // Clear all saved searches
  const clearSavedSearches = useCallback(() => {
    searchApi.clearSavedSearches();
    setSavedSearches([]);
  }, []);

  // Load on mount
  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  // Listen for storage events from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'savedSearches') {
        loadSavedSearches();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadSavedSearches]);

  return {
    savedSearches,
    loading,
    saveSearch,
    deleteSavedSearch,
    clearSavedSearches,
    refresh: loadSavedSearches,
  };
}
