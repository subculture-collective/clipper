import { Button } from '@/components/ui';
import type { SortOption, TimeFrame } from '@/types/clip';

interface FeedFiltersProps {
  sort: SortOption;
  timeframe?: TimeFrame;
  onSortChange: (sort: SortOption) => void;
  onTimeframeChange: (timeframe: TimeFrame) => void;
}

export function FeedFilters({ 
  sort, 
  timeframe,
  onSortChange, 
  onTimeframeChange 
}: FeedFiltersProps) {
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'hot', label: 'Hot' },
    { value: 'new', label: 'New' },
    { value: 'top', label: 'Top' },
    { value: 'rising', label: 'Rising' },
  ];

  const timeframeOptions: { value: TimeFrame; label: string }[] = [
    { value: 'hour', label: 'Past Hour' },
    { value: 'day', label: 'Past Day' },
    { value: 'week', label: 'Past Week' },
    { value: 'month', label: 'Past Month' },
    { value: 'year', label: 'Past Year' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6">
      {/* Sort tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sortOptions.map((option) => (
          <Button
            key={option.value}
            variant={sort === option.value ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onSortChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Timeframe selector (shown when Top is selected) */}
      {sort === 'top' && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground flex items-center mr-2">
            Timeframe:
          </span>
          {timeframeOptions.map((option) => (
            <Button
              key={option.value}
              variant={timeframe === option.value ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onTimeframeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
