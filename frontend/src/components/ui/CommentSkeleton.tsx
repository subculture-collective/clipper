import { Skeleton } from './Skeleton';

/**
 * Skeleton loader for comment sections
 */
export function CommentSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {/* Avatar */}
          <Skeleton variant="circular" width={40} height={40} className="flex-shrink-0" />
          
          {/* Comment Content */}
          <div className="flex-1">
            <div className="bg-card border border-border rounded-lg p-4">
              {/* Author and timestamp */}
              <div className="flex items-center gap-2 mb-2">
                <Skeleton variant="text" width={120} height={16} />
                <Skeleton variant="text" width={80} height={14} />
              </div>
              
              {/* Comment text */}
              <Skeleton variant="text" width="100%" height={16} className="mb-1" />
              <Skeleton variant="text" width="95%" height={16} className="mb-1" />
              <Skeleton variant="text" width="70%" height={16} className="mb-3" />
              
              {/* Actions */}
              <div className="flex gap-4">
                <Skeleton variant="text" width={60} height={16} />
                <Skeleton variant="text" width={60} height={16} />
                <Skeleton variant="text" width={60} height={16} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
