import { Link } from 'react-router-dom';
import { MessageSquare, ThumbsUp, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/types/forum';

interface SearchResultCardProps {
  result: SearchResult;
  className?: string;
}

export function SearchResultCard({ result, className }: SearchResultCardProps) {
  // Determine the link based on result type
  const link = result.type === 'thread' 
    ? `/forum/threads/${result.id}`
    : `/forum/threads/${result.thread_id}#reply-${result.id}`;

  // Format the date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link
      to={link}
      className={cn(
        'block p-4 bg-gray-900 border border-gray-700 rounded-lg',
        'hover:bg-gray-800 hover:border-gray-600 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          {result.title && (
            <h3 className="text-lg font-semibold text-white mb-1 truncate">
              {result.title}
            </h3>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{result.author_name}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(result.created_at)}</span>
            </div>
            {result.vote_count !== 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{result.vote_count} votes</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded',
              result.type === 'thread'
                ? 'bg-blue-900/30 text-blue-400 border border-blue-800'
                : 'bg-purple-900/30 text-purple-400 border border-purple-800'
            )}
          >
            {result.type === 'thread' ? (
              <>
                <MessageSquare className="w-3 h-3" />
                <span>Thread</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3 h-3" />
                <span>Reply</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Highlighted snippet */}
      <div
        className="text-sm text-gray-300 line-clamp-3 search-highlight"
        dangerouslySetInnerHTML={{ __html: result.headline }}
      />
    </Link>
  );
}
