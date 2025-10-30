import { useState } from 'react';

/**
 * Hook to manage live region announcements
 */
export function useLiveRegion() {
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

    const announce = (
        text: string,
        announcePriority: 'polite' | 'assertive' = 'polite'
    ) => {
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
