import { useEffect, useState, useRef } from 'react';
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
  // Only add seconds if we have fewer than 2 parts already, or if there are no other parts
  // This ensures we show only the first 2 most significant time units
  if (parts.length < 2 && (secs > 0 || parts.length === 0)) {
    parts.push(`${secs} ${secs === 1 ? 'second' : 'seconds'}`);
  }

  // Join with space for better readability
  return parts.join(' ') || '0 seconds';
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

  // Store onExpire in a ref to avoid recreating interval on every render
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    // Track if interval has already called onExpire to avoid double-calling
    let hasExpired = false;
    
    // Update countdown every second
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, retryAfter - now);
      setTimeRemaining(remaining);

      // Call onExpire when timer reaches 0 (only once)
      if (remaining === 0 && !hasExpired) {
        hasExpired = true;
        onExpireRef.current?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [retryAfter]);

  // Helper function to format window display time
  const formatWindowDisplay = (windowSeconds: number): string => {
    const hours = Math.floor(windowSeconds / 3600);
    if (hours >= 1) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    
    const minutes = Math.floor(windowSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  };

  const windowDisplay = formatWindowDisplay(window);

  return (
    <Alert
      variant="warning"
      title="Submission Rate Limit Reached"
      dismissible={timeRemaining === 0}
      onDismiss={onDismiss}
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
            aria-label="Learn about rate limits (opens in new window)"
          >
            Learn about rate limits
          </a>
        </p>
      </div>
    </Alert>
  );
}
