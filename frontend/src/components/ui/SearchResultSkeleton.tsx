import { Skeleton } from './Skeleton';

/**
 * Skeleton loader for search results
 */
export function SearchResultSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <Skeleton variant="rectangular" width={160} height={90} className="rounded-lg flex-shrink-0" />
            
            {/* Content */}
            <div className="flex-1">
              {/* Title */}
              <Skeleton variant="text" width="85%" height={24} className="mb-2" />
              
              {/* Description */}
              <Skeleton variant="text" width="100%" height={16} className="mb-1" />
              <Skeleton variant="text" width="70%" height={16} className="mb-3" />
              
              {/* Metadata */}
              <div className="flex gap-4">
                <Skeleton variant="text" width={80} height={16} />
                <Skeleton variant="text" width={100} height={16} />
                <Skeleton variant="text" width={60} height={16} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
