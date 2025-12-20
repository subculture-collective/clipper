import { ThreadCard } from './ThreadCard';
import type { ForumThread } from '@/types/forum';

interface ThreadListProps {
  threads: ForumThread[];
  loading?: boolean;
  className?: string;
}

export function ThreadList({ threads, loading, className }: ThreadListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-4 bg-gray-900 rounded-lg border border-gray-700 animate-pulse"
          >
            <div className="h-6 bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-700 rounded w-full mb-2" />
            <div className="h-4 bg-gray-700 rounded w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No threads found</p>
        <p className="text-gray-500 text-sm mt-2">
          Be the first to start a discussion!
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {threads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
      </div>
    </div>
  );
}
