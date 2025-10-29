import { Skeleton } from './Skeleton';

/**
 * Skeleton loader for leaderboard entries
 */
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-4">
            {/* Rank */}
            <Skeleton variant="text" width={40} height={24} />
            
            {/* Avatar */}
            <Skeleton variant="circular" width={48} height={48} />
            
            {/* User Info */}
            <div className="flex-1">
              <Skeleton variant="text" width="40%" height={20} className="mb-2" />
              <Skeleton variant="text" width="30%" height={16} />
            </div>
            
            {/* Score */}
            <Skeleton variant="text" width={80} height={28} />
          </div>
        </div>
      ))}
    </div>
  );
}
