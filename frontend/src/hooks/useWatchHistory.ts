import { useState, useEffect, useCallback, useMemo } from 'react';

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
  const [lastRecordedTime, setLastRecordedTime] = useState(0);
  const sessionId = useMemo(() => generateSessionId(), []);

  // Fetch resume position on mount
  useEffect(() => {
    if (!enabled || !clipId) {
      setIsLoading(false);
      return;
    }

    const fetchResumePosition = async () => {
      try {
        const response = await fetch(`/api/v1/clips/${clipId}/progress`, {
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('Failed to fetch resume position');
          return;
        }

        const data = await response.json();
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

      // Only record if at least 30 seconds have passed since last record
      const timeSinceLastRecord = currentTime - lastRecordedTime;
      if (timeSinceLastRecord < 30) return;

      const progressSeconds = Math.floor(currentTime);
      const durationSeconds = Math.floor(duration);

      setLastRecordedTime(currentTime);

      fetch('/api/v1/watch-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          clip_id: clipId,
          progress_seconds: progressSeconds,
          duration_seconds: durationSeconds,
          session_id: sessionId,
        }),
      }).catch((error) => {
        console.error('Error recording watch progress:', error);
      });
    },
    [clipId, duration, sessionId, enabled, lastRecordedTime]
  );

  // Record progress immediately (on pause or unmount)
  const recordProgressOnPause = useCallback(
    (currentTime: number) => {
      if (!enabled || !clipId || duration <= 0) return;

      const progressSeconds = Math.floor(currentTime);
      const durationSeconds = Math.floor(duration);

      fetch('/api/v1/watch-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          clip_id: clipId,
          progress_seconds: progressSeconds,
          duration_seconds: durationSeconds,
          session_id: sessionId,
        }),
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
