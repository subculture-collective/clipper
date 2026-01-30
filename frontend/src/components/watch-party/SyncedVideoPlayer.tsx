import { useQuery } from '@tanstack/react-query';
import { fetchClipById } from '@/lib/clip-api';
import { VideoPlayer } from '@/components/video';

export interface SyncedVideoPlayerProps {
  clipId: string | undefined;
  currentPosition: number;
  isPlaying: boolean;
  className?: string;
}

/**
 * Video player component for watch parties with synchronized playback
 * Fetches clip data and displays video player that responds to sync events
 * 
 * Note: Currently uses Twitch iframe embed which doesn't support programmatic sync.
 * Future enhancement: Implement HLS player with custom controls for full sync support.
 */
export function SyncedVideoPlayer({
  clipId,
  className = '',
}: SyncedVideoPlayerProps) {
  // Fetch clip data when clipId is available
  const { data: clip, isLoading, error } = useQuery({
    queryKey: ['clip', clipId],
    queryFn: () => fetchClipById(clipId!),
    enabled: !!clipId,
  });

  // No clip selected state
  if (!clipId) {
    return (
      <div className={`relative bg-surface-secondary rounded-lg aspect-video flex items-center justify-center ${className}`}>
        <div className="text-center text-content-secondary">
          <p className="text-lg mb-2">No Video Selected</p>
          <p className="text-sm">The host hasn't selected a video yet</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`relative bg-surface-secondary rounded-lg aspect-video flex items-center justify-center ${className}`}>
        <div className="text-center text-content-secondary">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-sm">Loading video...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !clip) {
    return (
      <div className={`relative bg-surface-secondary rounded-lg aspect-video flex items-center justify-center ${className}`}>
        <div className="text-center text-content-secondary">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-error-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-semibold mb-2">Failed to Load Video</p>
          <p className="text-sm">
            {error instanceof Error ? error.message : 'Unable to load the video clip'}
          </p>
        </div>
      </div>
    );
  }

  // Render video player
  // Note: VideoPlayer uses Twitch iframe embed which handles its own playback.
  // Full synchronized playback control requires implementing an HLS player with
  // custom controls that can respond to WebSocket sync events.
  return (
    <div className={`relative ${className}`}>
      <VideoPlayer
        clipId={clip.id}
        title={clip.title}
        embedUrl={clip.embed_url}
      />
    </div>
  );
}
