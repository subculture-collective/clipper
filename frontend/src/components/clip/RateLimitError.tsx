import { useEffect, useState } from 'react';
import { Alert } from '../ui/Alert';

export interface RateLimitErrorProps {
  /**
   * Unix timestamp (in seconds) when the rate limit will expire
   */
  retryAfter: number;
  /**
   * Number of submissions allowed in the time window
   */
  limit: number;
  /**
   * Time window in seconds (e.g., 3600 for 1 hour)
   */
  window: number;
  /**
   * Callback when rate limit expires
   */
  onExpire?: () => void;
  /**
   * Callback to dismiss the error
   */
  onDismiss?: () => void;
}

/**
 * Format seconds into human-readable time string
 * Examples: "5 minutes 23 seconds", "47 seconds", "1 hour 5 minutes"
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0 seconds';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);
  }

  // Join with "and" for better readability, but only show first 2 parts
  const displayParts = parts.slice(0, 2);
  if (displayParts.length === 2) {
    return displayParts.join(' ');
  }
  return displayParts[0] || '0 seconds';
}

/**
 * RateLimitError Component
 * 
 * Displays a rate limit error message with a countdown timer.
 * Shows time remaining until the user can submit again.
 */
export function RateLimitError({
  retryAfter,
  limit,
  window,
  onExpire,
  onDismiss,
}: RateLimitErrorProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    // Calculate initial time remaining (in seconds)
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, retryAfter - now);
  });

  useEffect(() => {
    // Update countdown every second
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, retryAfter - now);
      setTimeRemaining(remaining);

      // Call onExpire when timer reaches 0
      if (remaining === 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [retryAfter, onExpire]);

  // Format window time for display
  const windowHours = Math.floor(window / 3600);
  const windowDisplay =
    windowHours >= 1 ? `${windowHours} hour${windowHours > 1 ? 's' : ''}` : `${Math.floor(window / 60)} minutes`;

  return (
    <Alert
      variant="warning"
      title="Submission Rate Limit Reached"
      dismissible={timeRemaining === 0}
      onDismiss={onDismiss}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="space-y-2">
        <p>
          You've submitted {limit} clips in the past {windowDisplay}.{' '}
          {timeRemaining > 0 ? (
            <>
              You can submit again in{' '}
              <strong
                className="font-semibold"
                aria-label={`Time remaining: ${formatTimeRemaining(timeRemaining)}`}
              >
                {formatTimeRemaining(timeRemaining)}
              </strong>
              .
            </>
          ) : (
            <strong className="font-semibold text-success-600 dark:text-success-400">
              You can submit again now!
            </strong>
          )}
        </p>
        <p className="text-xs opacity-80">
          <a
            href="/help/rate-limits"
            className="underline hover:opacity-70 transition-opacity"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn about rate limits
          </a>
        </p>
      </div>
    </Alert>
  );
}
