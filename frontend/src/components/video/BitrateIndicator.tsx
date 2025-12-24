import { cn } from '@/lib/utils';

export interface BitrateIndicatorProps {
  bandwidth?: number; // Mbps
  bufferHealth?: number; // 0-100
  currentQuality?: string;
  className?: string;
}

/**
 * Bitrate indicator showing current network status and video quality
 * Displays bandwidth, buffer health, and warning for poor connection
 */
export function BitrateIndicator({
  bandwidth,
  bufferHealth = 100,
  currentQuality,
  className,
}: BitrateIndicatorProps) {
  // Determine connection status
  const isGoodConnection = bandwidth !== undefined && bandwidth > 5 && bufferHealth > 60;
  const isPoorConnection = bandwidth !== undefined && (bandwidth < 3 || bufferHealth < 40);

  // Don't show if no data
  if (bandwidth === undefined && !currentQuality) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute top-4 right-4 px-3 py-2 rounded',
        'bg-black/70 text-white text-xs font-medium',
        'flex items-center gap-2',
        'transition-colors',
        isPoorConnection && 'bg-error-600/80',
        className
      )}
    >
      {/* Connection indicator dot */}
      {bandwidth !== undefined && (
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isGoodConnection && 'bg-success-500',
            !isGoodConnection && !isPoorConnection && 'bg-warning-500',
            isPoorConnection && 'bg-error-500'
          )}
          aria-label={
            isGoodConnection
              ? 'Good connection'
              : isPoorConnection
              ? 'Poor connection'
              : 'Fair connection'
          }
        />
      )}

      {/* Quality and bandwidth info */}
      <div className="flex items-center gap-2">
        {currentQuality && (
          <span className="font-semibold">{currentQuality}</span>
        )}
        {bandwidth !== undefined && (
          <span className="opacity-90">
            {bandwidth.toFixed(1)} Mbps
          </span>
        )}
      </div>

      {/* Warning for poor connection */}
      {isPoorConnection && (
        <svg
          className="w-4 h-4 text-error-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-label="Poor connection warning"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      )}
    </div>
  );
}
