/**
 * React hook for monitoring network status
 * Provides real-time network connectivity information
 */

import { useState, useEffect } from 'react';
import type { NetworkStatus } from '@/lib/mobile-api-client';
import { getMobileApiClient } from '@/lib/mobile-api-client';

export interface UseNetworkStatusResult {
  online: boolean;
  networkStatus: NetworkStatus;
  queuedRequestCount: number;
  retryQueue: () => Promise<void>;
  clearQueue: () => void;
}

export function useNetworkStatus(): UseNetworkStatusResult {
  const mobileClient = getMobileApiClient();
  
  const [online, setOnline] = useState<boolean>(mobileClient.isOnline());
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    mobileClient.getNetworkStatus()
  );
  const [queuedRequestCount, setQueuedRequestCount] = useState<number>(
    mobileClient.getQueuedRequestCount()
  );

  useEffect(() => {
    // Update state when network status changes
    const handleOnline = () => {
      setOnline(true);
      setNetworkStatus(mobileClient.getNetworkStatus());
      setQueuedRequestCount(mobileClient.getQueuedRequestCount());
    };

    const handleOffline = () => {
      setOnline(false);
      setNetworkStatus(mobileClient.getNetworkStatus());
    };

    // Listen to browser events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll for queue count changes
    const intervalId = setInterval(() => {
      const count = mobileClient.getQueuedRequestCount();
      setQueuedRequestCount(count);
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [mobileClient]);

  const retryQueue = async () => {
    await mobileClient.retryOfflineQueue();
    setQueuedRequestCount(mobileClient.getQueuedRequestCount());
  };

  const clearQueue = () => {
    mobileClient.clearOfflineQueue();
    setQueuedRequestCount(0);
  };

  return {
    online,
    networkStatus,
    queuedRequestCount,
    retryQueue,
    clearQueue,
  };
}
