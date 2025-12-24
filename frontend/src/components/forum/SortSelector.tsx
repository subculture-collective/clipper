import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ForumSort } from '@/types/forum';

interface SortSelectorProps {
  value: ForumSort;
  onChange: (sort: ForumSort) => void;
  className?: string;
}

const sortOptions: { value: ForumSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'most-replied', label: 'Most Replied' },
  { value: 'trending', label: 'Trending' },
  { value: 'hot', label: 'Hot' },
];

export function SortSelector({ value, onChange, className }: SortSelectorProps) {
  return (
    <div className={cn('relative inline-block', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ForumSort)}
        className={cn(
          'appearance-none pl-3 pr-10 py-2 bg-gray-800 border border-gray-700',
          'text-white rounded-lg cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-all duration-200'
        )}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            Sort: {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
