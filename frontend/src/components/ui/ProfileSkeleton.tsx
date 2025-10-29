import { Skeleton } from './Skeleton';

/**
 * Skeleton loader for user profile sections
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Skeleton variant="circular" width={80} height={80} />
          
          <div className="flex-1">
            {/* Username */}
            <Skeleton variant="text" width="60%" height={28} className="mb-2" />
            
            {/* Bio */}
            <Skeleton variant="text" width="90%" height={20} className="mb-1" />
            <Skeleton variant="text" width="70%" height={20} className="mb-4" />
            
            {/* Stats */}
            <div className="flex gap-6">
              <Skeleton variant="text" width={100} height={20} />
              <Skeleton variant="text" width={100} height={20} />
              <Skeleton variant="text" width={100} height={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="text" width={100} height={40} className="mb-2" />
        ))}
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6">
            <Skeleton variant="text" width="80%" height={24} className="mb-3" />
            <Skeleton variant="text" width="100%" height={16} className="mb-2" />
            <Skeleton variant="text" width="90%" height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}
