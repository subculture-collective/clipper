import { Skeleton } from './Skeleton';

/**
 * Skeleton loader for notification items
 */
export function NotificationSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 hover:bg-accent transition-colors">
          <div className="flex gap-3">
            {/* Icon/Avatar */}
            <Skeleton variant="circular" width={40} height={40} className="flex-shrink-0" />
            
            {/* Notification Content */}
            <div className="flex-1 min-w-0">
              {/* Message */}
              <Skeleton variant="text" width="90%" height={18} className="mb-2" />
              <Skeleton variant="text" width="70%" height={16} className="mb-2" />
              
              {/* Timestamp */}
              <Skeleton variant="text" width={100} height={14} />
            </div>
            
            {/* Unread indicator */}
            <Skeleton variant="circular" width={8} height={8} className="flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
