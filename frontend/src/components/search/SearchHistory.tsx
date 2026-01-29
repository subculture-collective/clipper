import { useNavigate } from 'react-router-dom';
import { useSearchHistory } from '../../hooks/useSearchHistory';

interface SearchHistoryProps {
  className?: string;
  maxItems?: number;
}

export function SearchHistory({ className = '', maxItems = 10 }: SearchHistoryProps) {
  const { history, loading, clearHistory } = useSearchHistory();
  const navigate = useNavigate();

  const handleSearchClick = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleClearHistory = async () => {
    // TODO: Replace with proper modal component for better UX
    if (confirm('Clear search history?')) {
      await clearHistory();
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-3"></div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return null;
  }

  const displayHistory = history.slice(0, maxItems);

  return (
    <div className={className} data-testid="search-history">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Recent Searches
        </h3>
        <button
          onClick={handleClearHistory}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          data-testid="clear-history-button"
        >
          Clear
        </button>
      </div>
      <div className="space-y-1">
        {displayHistory.map((item, index) => (
          <button
            key={`${item.query}-${index}`}
            onClick={() => handleSearchClick(item.query)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            data-testid={`history-item-${index}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-900 dark:text-white truncate flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {item.query}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.result_count > 0 ? `${item.result_count}` : '0'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
