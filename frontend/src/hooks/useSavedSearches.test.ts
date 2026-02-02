import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedSearches } from './useSavedSearches';

describe('useSavedSearches', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should initialize with empty saved searches', () => {
    const { result } = renderHook(() => useSavedSearches());

    expect(result.current.savedSearches).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should save a new search', () => {
    const { result } = renderHook(() => useSavedSearches());

    act(() => {
      result.current.saveSearch('test query', undefined, 'My Test Search');
    });

    expect(result.current.savedSearches).toHaveLength(1);
    expect(result.current.savedSearches[0].query).toBe('test query');
    expect(result.current.savedSearches[0].name).toBe('My Test Search');
  });

  it('should save a search with filters', () => {
    const { result } = renderHook(() => useSavedSearches());

    const filters = {
      language: 'en',
      gameId: 'game-1',
      minVotes: 5,
    };

    act(() => {
      result.current.saveSearch('filtered query', filters, 'Filtered Search');
    });

    expect(result.current.savedSearches).toHaveLength(1);
    expect(result.current.savedSearches[0].filters).toEqual(filters);
  });

  it('should delete a saved search', () => {
    const { result } = renderHook(() => useSavedSearches());

    // Save a search first
    act(() => {
      result.current.saveSearch('test query', undefined, 'My Test Search');
    });

    const searchId = result.current.savedSearches[0].id;

    // Delete the search
    act(() => {
      result.current.deleteSavedSearch(searchId);
    });

    expect(result.current.savedSearches).toHaveLength(0);
  });

  it('should clear all saved searches', () => {
    const { result } = renderHook(() => useSavedSearches());

    // Save multiple searches
    act(() => {
      result.current.saveSearch('query 1', undefined, 'Search 1');
      result.current.saveSearch('query 2', undefined, 'Search 2');
      result.current.saveSearch('query 3', undefined, 'Search 3');
    });

    expect(result.current.savedSearches).toHaveLength(3);

    // Clear all
    act(() => {
      result.current.clearSavedSearches();
    });

    expect(result.current.savedSearches).toHaveLength(0);
  });

  it('should load saved searches from localStorage on mount', () => {
    // Pre-populate localStorage
    const mockSearches = [
      {
        id: '1',
        query: 'existing query',
        name: 'Existing Search',
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem('savedSearches', JSON.stringify(mockSearches));

    const { result } = renderHook(() => useSavedSearches());

    expect(result.current.savedSearches).toHaveLength(1);
    expect(result.current.savedSearches[0].query).toBe('existing query');
  });

  it('should persist saved searches to localStorage', () => {
    const { result } = renderHook(() => useSavedSearches());

    act(() => {
      result.current.saveSearch('persistent query', undefined, 'Persistent Search');
    });

    const storedSearches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    expect(storedSearches).toHaveLength(1);
    expect(storedSearches[0].query).toBe('persistent query');
  });

  it('should handle corrupted localStorage data gracefully', () => {
    // Set invalid JSON in localStorage
    localStorage.setItem('savedSearches', 'invalid json');

    const { result } = renderHook(() => useSavedSearches());

    // Should return empty array instead of crashing
    expect(result.current.savedSearches).toEqual([]);
  });

  it('should refresh saved searches', () => {
    const { result } = renderHook(() => useSavedSearches());

    // Save a search
    act(() => {
      result.current.saveSearch('query 1', undefined, 'Search 1');
    });

    // Manually modify localStorage
    const mockSearches = [
      {
        id: '2',
        query: 'external query',
        name: 'External Search',
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem('savedSearches', JSON.stringify(mockSearches));

    // Refresh should load the new data
    act(() => {
      result.current.refresh();
    });

    expect(result.current.savedSearches).toHaveLength(1);
    expect(result.current.savedSearches[0].query).toBe('external query');
  });
});
