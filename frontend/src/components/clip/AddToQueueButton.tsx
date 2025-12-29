import { useAddToQueue } from '@/hooks/useQueue';
import { useIsAuthenticated, useToast } from '@/hooks';

interface AddToQueueButtonProps {
    clipId: string;
}

export function AddToQueueButton({
    clipId,
}: AddToQueueButtonProps) {
    const isAuthenticated = useIsAuthenticated();
    const addToQueue = useAddToQueue();
    const toast = useToast();

    const handleAddToQueue = async () => {
        if (!isAuthenticated) {
            toast.info('Please log in to add clips to queue');
            return;
        }

        try {
            await addToQueue.mutateAsync({
                clip_id: clipId,
                at_end: true,
            });
            toast.success('Added to queue');
        } catch {
            toast.error('Failed to add to queue');
        }
    };

    return (
        <button
            onClick={handleAddToQueue}
            disabled={!isAuthenticated || addToQueue.isPending}
            className={`text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors touch-target min-h-11 ${
                !isAuthenticated ?
                    'opacity-50 cursor-not-allowed hover:bg-transparent'
                :   'cursor-pointer'
            }`}
            aria-label={
                !isAuthenticated ?
                    'Log in to add to queue'
                :   'Add to queue'
            }
            aria-disabled={!isAuthenticated}
            title={
                !isAuthenticated ? 'Log in to add to queue' : 'Add to queue'
            }
        >
            <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                />
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2M15 5h2a2 2 0 012 2v10a2 2 0 01-2 2h-2"
                />
            </svg>
        </button>
    );
}
