/**
 * Network Status Indicator Component
 * Displays network connectivity status and queued requests
 */

import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function NetworkStatusIndicator() {
  const { online, queuedRequestCount, retryQueue } = useNetworkStatus();
  const [show, setShow] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Show indicator when offline or when there are queued requests
  useEffect(() => {
    if (!online || queuedRequestCount > 0) {
      setShow(true);
    } else {
      // Keep showing for a moment after coming back online
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [online, queuedRequestCount]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryQueue();
    } finally {
      setIsRetrying(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 transition-transform duration-300"
      role="alert"
      aria-live="polite"
    >
      {!online ? (
        <div className="bg-yellow-500 dark:bg-yellow-600 text-white px-4 py-3 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
              </svg>
              <span className="font-medium">You're offline</span>
              {queuedRequestCount > 0 && (
                <span className="text-sm">
                  • {queuedRequestCount} request{queuedRequestCount !== 1 ? 's' : ''} queued
                </span>
              )}
            </div>
          </div>
        </div>
      ) : queuedRequestCount > 0 ? (
        <div className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-3 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-medium">
                {queuedRequestCount} pending request{queuedRequestCount !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? 'Retrying...' : 'Retry Now'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-green-500 dark:bg-green-600 text-white px-4 py-3 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2">
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Back online</span>
          </div>
        </div>
      )}
    </div>
  );
}
