import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api';

// Generate a unique session ID for tracking watch sessions
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface UseWatchHistoryOptions {
  clipId: string;
  duration: number;
  enabled?: boolean;
}

export interface UseWatchHistoryReturn {
  progress: number;
  hasProgress: boolean;
  isLoading: boolean;
  recordProgress: (currentTime: number) => void;
  recordProgressOnPause: (currentTime: number) => void;
}

/**
 * Hook for managing watch history and playback resumption
 */
export function useWatchHistory({
  clipId,
  duration,
  enabled = true,
}: UseWatchHistoryOptions): UseWatchHistoryReturn {
  const [progress, setProgress] = useState(0);
  const [hasProgress, setHasProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRecordedTimestamp, setLastRecordedTimestamp] = useState(0);
  const sessionId = useMemo(() => generateSessionId(), []);

  // Fetch resume position on mount
  useEffect(() => {
    if (!enabled || !clipId) {
      setIsLoading(false);
      return;
    }

    const fetchResumePosition = async () => {
      try {
        const { data } = await apiClient.get(`/clips/${clipId}/progress`);
        if (data.has_progress) {
          setProgress(data.progress_seconds);
          setHasProgress(true);
        }
      } catch (error) {
        console.error('Error fetching resume position:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResumePosition();
  }, [clipId, enabled]);

  // Record progress with debouncing (every 30 seconds)
  const recordProgress = useCallback(
    (currentTime: number) => {
      if (!enabled || !clipId || duration <= 0) return;

      // Only record if at least 30 seconds have passed since last record (wall-clock time)
      const now = Date.now();
      const timeSinceLastRecord = now - lastRecordedTimestamp;
      if (timeSinceLastRecord < 30000) return; // 30 seconds in milliseconds

      const progressSeconds = Math.floor(currentTime);
      const durationSeconds = Math.floor(duration);

      setLastRecordedTimestamp(now);

      apiClient.post('/watch-history', {
        clip_id: clipId,
        progress_seconds: progressSeconds,
        duration_seconds: durationSeconds,
        session_id: sessionId,
      }).catch((error) => {
        console.error('Error recording watch progress:', error);
      });
    },
    [clipId, duration, sessionId, enabled, lastRecordedTimestamp]
  );

  // Record progress immediately (on pause or unmount)
  const recordProgressOnPause = useCallback(
    (currentTime: number) => {
      if (!enabled || !clipId || duration <= 0) return;

      const progressSeconds = Math.floor(currentTime);
      const durationSeconds = Math.floor(duration);

      // Update timestamp to prevent duplicate recordings
      setLastRecordedTimestamp(Date.now());

      apiClient.post('/watch-history', {
        clip_id: clipId,
        progress_seconds: progressSeconds,
        duration_seconds: durationSeconds,
        session_id: sessionId,
      }).catch((error) => {
        console.error('Error recording watch progress on pause:', error);
      });
    },
    [clipId, duration, sessionId, enabled]
  );

  return {
    progress,
    hasProgress,
    isLoading,
    recordProgress,
    recordProgressOnPause,
  };
}

export default useWatchHistory;
