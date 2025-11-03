import { useCallback } from 'react';
import { useToast } from '@/context/ToastContext';

export interface ShareData {
  title: string;
  text?: string;
  url: string;
}

export function useShare() {
  const toast = useToast();

  const share = useCallback(
    async (data: ShareData) => {
      try {
        // Check if Web Share API is available and can share this data
        if (navigator.share && navigator.canShare && navigator.canShare(data)) {
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
      }
    },
    [toast]
  );

  return { share };
}
