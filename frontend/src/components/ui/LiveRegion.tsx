import React, { useEffect, useState } from 'react';

export interface LiveRegionProps {
  /**
   * The message to announce
   */
  message: string;
  /**
   * Priority of the announcement
   * @default 'polite'
   */
  priority?: 'polite' | 'assertive';
  /**
   * Time in milliseconds after which to clear the message
   * @default 1000
   */
  clearAfter?: number;
}

/**
 * LiveRegion component for announcing dynamic content updates to screen readers
 * Uses ARIA live regions to provide real-time feedback
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  priority = 'polite',
  clearAfter = 1000,
}) => {
  const [currentMessage, setCurrentMessage] = useState(message);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);

      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          setCurrentMessage('');
        }, clearAfter);

        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
};

LiveRegion.displayName = 'LiveRegion';

/**
 * Hook to manage live region announcements
 */
export function useLiveRegion() {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = (text: string, announcePriority: 'polite' | 'assertive' = 'polite') => {
    setPriority(announcePriority);
    setMessage(text);
  };

  const clear = () => {
    setMessage('');
  };

  return {
    message,
    priority,
    announce,
    clear,
  };
}
