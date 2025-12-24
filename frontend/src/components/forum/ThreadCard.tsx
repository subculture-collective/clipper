import { Link } from 'react-router-dom';
import { formatTimestamp, cn } from '@/lib/utils';
import type { ForumThread } from '@/types/forum';

interface ThreadCardProps {
  thread: ForumThread;
  className?: string;
}

export function ThreadCard({ thread, className }: ThreadCardProps) {
  const timestamp = formatTimestamp(thread.updated_at);

  return (
    <Link
      to={`/forum/threads/${thread.id}`}
      className={cn(
        'block p-4 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-700',
        'transition-colors duration-200',
        className
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {thread.pinned && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded">
                Pinned
              </span>
            )}
            {thread.locked && (
              <span className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs font-semibold rounded">
                Locked
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-white mb-1 truncate">
            {thread.title}
          </h3>
          
          <p className="text-sm text-gray-400 line-clamp-2 mb-2">
            {thread.content}
          </p>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>by {thread.username}</span>
            {thread.game_name && (
              <>
                <span>•</span>
                <span>{thread.game_name}</span>
              </>
            )}
          </div>

          {thread.tags && thread.tags.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {thread.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-right text-sm">
          <div className="text-gray-400 mb-1">
            <span className="font-semibold text-white">{thread.reply_count}</span> replies
          </div>
          <div className="text-gray-400 mb-1">
            <span className="font-semibold text-white">{thread.view_count}</span> views
          </div>
          <div className="text-xs text-gray-500" title={timestamp.title}>
            {timestamp.display}
          </div>
        </div>
      </div>
    </Link>
  );
}
