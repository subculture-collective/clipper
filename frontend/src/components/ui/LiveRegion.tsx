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
    const [isCleared, setIsCleared] = useState(false);

    useEffect(() => {
        // Reset the cleared state whenever the message changes so updates are immediate
        setIsCleared(false);

        if (message && clearAfter > 0) {
            const timer = setTimeout(() => {
                setIsCleared(true);
            }, clearAfter);

            return () => clearTimeout(timer);
        }
    }, [message, clearAfter]);

    const displayMessage = isCleared ? '' : message;

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
