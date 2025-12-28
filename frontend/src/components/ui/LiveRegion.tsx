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
    const [displayMessage, setDisplayMessage] = useState('');

    useEffect(() => {
        queueMicrotask(() => {
            setDisplayMessage(message);
        });

        if (message && clearAfter > 0) {
            const timer = setTimeout(() => {
                setDisplayMessage('');
            }, clearAfter);

            return () => clearTimeout(timer);
        }
    }, [message, clearAfter]);

    return (
        <div
            role='status'
            aria-live={priority}
            aria-atomic='true'
            className='sr-only'
        >
            {displayMessage}
        </div>
    );
};

LiveRegion.displayName = 'LiveRegion';
