import { useCallback, useRef } from 'react';
import { useToast } from '@/context/ToastContext';

export interface ShareData {
  title: string;
  text?: string;
  url: string;
}

export function useShare() {
  const toast = useToast();
  const isShareInProgressRef = useRef(false);

  const share = useCallback(
    async (data: ShareData) => {
      // Prevent concurrent share operations
      if (isShareInProgressRef.current) {
        return { success: false, error: new Error('Share operation already in progress') };
      }

      try {
        isShareInProgressRef.current = true;

        // Check if Web Share API is available and can share this data
        if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(data)) {
          await navigator.share(data);
          return { success: true, method: 'native' };
        }

        // Fallback to clipboard
        await navigator.clipboard.writeText(data.url);
        toast.success('Link copied to clipboard!');
        return { success: true, method: 'clipboard' };
      } catch (err) {
        // User cancelled share or error occurred
        if (err instanceof Error && err.name === 'AbortError') {
          // User cancelled, don't show error
          return { success: false, cancelled: true };
        }

        console.error('Error sharing:', err);
        toast.error('Failed to share');
        return { success: false, error: err };
      } finally {
        isShareInProgressRef.current = false;
      }
    },
    [toast]
  );

  return { share };
}
