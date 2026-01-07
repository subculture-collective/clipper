import { useState, useEffect } from 'react';
import { Alert } from '../ui/Alert';

export interface SearchErrorAlertProps {
  /**
   * Type of search error/failover state
   */
  type: 'failover' | 'error' | 'none';
  /**
   * Custom error message (optional)
   */
  message?: string;
  /**
   * Callback when retry button is clicked
   */
  onRetry?: () => void;
  /**
   * Whether retry is in progress
   */
  isRetrying?: boolean;
  /**
   * Callback when alert is dismissed
   */
  onDismiss?: () => void;
  /**
   * Auto-dismiss duration in milliseconds (for failover warnings)
   * @default 10000 for failover, never for errors
   */
  autoDismissMs?: number;
}

const ERROR_MESSAGES = {
  failover: {
    title: 'Using Backup Search',
    description: "We're experiencing issues with our primary search service. We've automatically switched to backup search. Results may be limited.",
  },
  error: {
    title: 'Search Temporarily Unavailable',
    description: 'Search is currently unavailable. Please try again in a moment.',
  },
};

/**
 * SearchErrorAlert - Displays search failover and error states
 * 
 * Handles different error states:
 * - failover: Warning when backup search is being used (auto-dismisses)
 * - error: Error when search is completely unavailable (manual retry)
 * - none: No error (component hidden)
 */
export function SearchErrorAlert({
  type,
  message,
  onRetry,
  isRetrying = false,
  onDismiss,
  autoDismissMs = 10000,
}: SearchErrorAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastType, setLastType] = useState(type);

  // Reset dismissed state when error type changes
  if (type !== lastType && type !== 'none') {
    setIsDismissed(false);
    setLastType(type);
  }

  // Auto-dismiss failover warnings
  useEffect(() => {
    if (type === 'failover' && autoDismissMs > 0) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
        onDismiss?.();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }
  }, [type, autoDismissMs, onDismiss]);

  if (type === 'none' || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleRetry = () => {
    if (onRetry && !isRetrying) {
      onRetry();
    }
  };

  const errorConfig = ERROR_MESSAGES[type];
  const displayMessage = message || errorConfig.description;

  return (
    <div
      className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200"
      data-testid={type === 'failover' ? 'search-failover-warning' : 'search-error-alert'}
      role="alert"
      aria-live="polite"
    >
      <Alert
        variant={type === 'failover' ? 'warning' : 'error'}
        title={errorConfig.title}
        dismissible={type === 'failover'}
        onDismiss={handleDismiss}
      >
        <div className="space-y-3">
          <p>{displayMessage}</p>
          
          {type === 'error' && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="retry-search"
              aria-label={isRetrying ? 'Retrying search...' : 'Retry search'}
            >
              {isRetrying ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Retrying...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Try Again</span>
                </>
              )}
            </button>
          )}
        </div>
      </Alert>
    </div>
  );
}
