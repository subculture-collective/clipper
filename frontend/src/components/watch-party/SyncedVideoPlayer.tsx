import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchClipById } from '@/lib/clip-api';
import { VideoPlayer } from '@/components/video';
import type { WatchPartySyncEvent } from '@/types/watchParty';

export interface SyncedVideoPlayerProps {
  clipId: string | undefined;
  currentPosition: number;
  isPlaying: boolean;
  onSyncEvent?: (event: WatchPartySyncEvent) => void;
  className?: string;
}

/**
 * Video player component for watch parties with synchronized playback
 * Fetches clip data and displays video player that responds to sync events
 */
export function SyncedVideoPlayer({
  clipId,
  currentPosition,
  isPlaying,
  onSyncEvent,
  className = '',
}: SyncedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lastSyncTime, setLastSyncTime] = useState(0);

  // Fetch clip data when clipId is available
  const { data: clip, isLoading, error } = useQuery({
    queryKey: ['clip', clipId],
    queryFn: () => fetchClipById(clipId!),
    enabled: !!clipId,
  });

  // Apply sync events to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clip) return;

    // Only sync if we have a significant time difference (>1 second)
    // This prevents constant micro-adjustments
    const timeDiff = Math.abs(video.currentTime - currentPosition);
    if (timeDiff > 1) {
      video.currentTime = currentPosition;
      setLastSyncTime(Date.now());
    }

    // Sync play/pause state
    if (isPlaying && video.paused) {
      video.play().catch((err) => {
        console.error('Failed to play video:', err);
      });
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [currentPosition, isPlaying, clip]);

  // Loading state
  if (isLoading || !clipId) {
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

  // Render video player
  // For now, we use the simple VideoPlayer component with Twitch embed
  // Future enhancement: Support HLS playback with custom controls for better sync
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
