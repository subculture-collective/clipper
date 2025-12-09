import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
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
    { value: 'discussed', label: 'Discussed' },
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
            className={cn(
              'cursor-pointer',
              sort === option.value && 'font-bold shadow-md'
            )}
          >
            {sort === option.value && (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
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
              className={cn(
                'cursor-pointer',
                timeframe === option.value && 'font-bold shadow-md'
              )}
            >
              {timeframe === option.value && (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
