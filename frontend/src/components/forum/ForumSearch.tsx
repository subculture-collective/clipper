import { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForumSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function ForumSearch({
  onSearch,
  placeholder = 'Search threads and replies...',
  className,
}: ForumSearchProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700',
            'text-white placeholder-gray-400 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-200'
          )}
        />
      </div>
    </form>
  );
}
