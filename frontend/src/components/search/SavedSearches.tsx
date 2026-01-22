import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../../lib/search-api';
import type { SavedSearch, SearchFilters } from '../../types/search';

interface SavedSearchesProps {
  className?: string;
}

export function SavedSearches({ className = '' }: SavedSearchesProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = () => {
    const searches = searchApi.getSavedSearches();
    setSavedSearches(searches);
  };

  const handleSearchClick = (search: SavedSearch) => {
    const params = new URLSearchParams({ q: search.query });
    
    if (search.filters) {
      const filters = search.filters;
      if (filters.gameId) params.append('game_id', filters.gameId);
      if (filters.language) params.append('language', filters.language);
      if (filters.minVotes) params.append('min_votes', filters.minVotes.toString());
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }
    }
    
    navigate(`/search?${params.toString()}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    searchApi.deleteSavedSearch(id);
    loadSavedSearches();
  };

  const handleClearAll = () => {
    if (confirm('Clear all saved searches?')) {
      searchApi.clearSavedSearches();
      loadSavedSearches();
    }
  };

  if (savedSearches.length === 0) {
    return null;
  }

  return (
    <div className={className} data-testid="saved-searches">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Saved Searches
        </h3>
        <button
          onClick={handleClearAll}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          data-testid="clear-saved-searches"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-1">
        {savedSearches.map((search) => (
          <div
            key={search.id}
            className="group relative"
            data-testid={`saved-search-${search.id}`}
          >
            <button
              onClick={() => handleSearchClick(search)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors pr-10"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-900 dark:text-white truncate">
                  {search.name || search.query}
                </span>
                {search.name && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {search.query}
                  </span>
                )}
                {search.filters && Object.keys(search.filters).length > 0 && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {Object.keys(search.filters).length} filter(s)
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={(e) => handleDelete(search.id, e)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
              title="Delete saved search"
              data-testid={`delete-saved-search-${search.id}`}
            >
              <svg
                className="w-4 h-4 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
