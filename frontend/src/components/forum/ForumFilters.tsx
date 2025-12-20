import { cn } from '@/lib/utils';
import type { ForumFilters as ForumFiltersType } from '@/types/forum';

interface ForumFiltersProps {
  filters: ForumFiltersType;
  onFilterChange: (filters: ForumFiltersType) => void;
  className?: string;
}

export function ForumFilters({
  filters,
  onFilterChange,
  className,
}: ForumFiltersProps) {
  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    
    onFilterChange({ ...filters, tags: newTags });
  };

  const handleClearFilters = () => {
    onFilterChange({ game_id: undefined, tags: [] });
  };

  const hasActiveFilters = filters.game_id || (filters.tags && filters.tags.length > 0);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleTagToggle('help')}
          className={cn(
            'px-3 py-1.5 text-sm rounded-lg border transition-colors',
            filters.tags?.includes('help')
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          )}
        >
          Help
        </button>
        <button
          type="button"
          onClick={() => handleTagToggle('discussion')}
          className={cn(
            'px-3 py-1.5 text-sm rounded-lg border transition-colors',
            filters.tags?.includes('discussion')
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          )}
        >
          Discussion
        </button>
        <button
          type="button"
          onClick={() => handleTagToggle('suggestion')}
          className={cn(
            'px-3 py-1.5 text-sm rounded-lg border transition-colors',
            filters.tags?.includes('suggestion')
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          )}
        >
          Suggestion
        </button>
        <button
          type="button"
          onClick={() => handleTagToggle('bug')}
          className={cn(
            'px-3 py-1.5 text-sm rounded-lg border transition-colors',
            filters.tags?.includes('bug')
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          )}
        >
          Bug Report
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
