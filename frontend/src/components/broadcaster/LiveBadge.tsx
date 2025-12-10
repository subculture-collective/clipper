import { formatDistanceToNow } from 'date-fns';
import { Eye } from 'lucide-react';
import type { BroadcasterLiveStatus } from '@/lib/broadcaster-api';

interface LiveBadgeProps {
  liveStatus?: BroadcasterLiveStatus | null;
  showViewers?: boolean;
  showDuration?: boolean;
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onClick?: () => void;
}

/**
 * LiveBadge component displays a live streaming indicator with optional viewer count and duration
 */
export function LiveBadge({
  liveStatus,
  showViewers = true,
  showDuration = true,
  size = 'md',
  clickable = false,
  onClick,
}: LiveBadgeProps) {
  if (!liveStatus || !liveStatus.is_live) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const duration = liveStatus.started_at
    ? formatDistanceToNow(new Date(liveStatus.started_at), { addSuffix: false })
    : null;

  const formattedViewers =
    liveStatus.viewer_count >= 1_000_000
      ? `${(liveStatus.viewer_count / 1_000_000).toFixed(1)}M`
      : liveStatus.viewer_count >= 1000
      ? `${(liveStatus.viewer_count / 1000).toFixed(1)}K`
      : liveStatus.viewer_count.toString();

  return (
    <div
      className={`inline-flex items-center gap-2 bg-red-600 text-white font-semibold rounded ${
        sizeClasses[size]
      } ${clickable ? 'cursor-pointer hover:bg-red-700 transition-colors' : ''}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>
      <span>LIVE</span>

      {showViewers && liveStatus.viewer_count > 0 && (
        <span className="flex items-center gap-1">
          <Eye size={iconSizes[size]} />
          <span>{formattedViewers}</span>
        </span>
      )}

      {showDuration && duration && (
        <span className="text-white/90">• {duration}</span>
      )}
    </div>
  );
}

/**
 * LiveIndicatorDot component displays a simple red dot indicator for live status
 */
export function LiveIndicatorDot({ isLive }: { isLive: boolean }) {
  if (!isLive) {
    return null;
  }

  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
    </span>
  );
}
