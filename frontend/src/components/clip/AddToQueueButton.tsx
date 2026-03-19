import { useAddToQueue, useQueue } from '@/hooks/useQueue';
import { useIsAuthenticated, useToast } from '@/hooks';
import { useAuth } from '@/context/AuthContext';
import { AxiosError } from 'axios';

interface AddToQueueButtonProps {
    clipId: string;
}

export function AddToQueueButton({ clipId }: AddToQueueButtonProps) {
    const isAuthenticated = useIsAuthenticated();
    const { user } = useAuth();
    const addToQueue = useAddToQueue();
    const { data: queue } = useQueue(100, !!user);
    const toast = useToast();

    // Check if clip is already in queue
    const isInQueue = queue?.items?.some(item => item.clip_id === clipId) ?? false;

    const handleAddToQueue = async () => {
        if (!isAuthenticated) {
            toast.info('Please log in to add clips to queue');
            return;
        }

        if (isInQueue) {
            toast.info('This clip is already in your queue');
            return;
        }

        try {
            await addToQueue.mutateAsync({
                clip_id: clipId,
                at_end: true,
            });
            toast.success('Added to queue');
        } catch (error) {
            let message = 'Failed to add to queue';
            if (
                error instanceof AxiosError &&
                error.response?.data?.error?.message
            ) {
                message = error.response.data.error.message;
            } else if (error instanceof Error) {
                message = error.message;
            }
            toast.error(message);
        }
    };

    return (
        <button
            onClick={handleAddToQueue}
            disabled={!isAuthenticated || addToQueue.isPending || isInQueue}
            className={`flex items-center gap-1.5 transition-colors touch-target min-h-11 ${
                isInQueue ?
                    'text-brand cursor-default'
                : !isAuthenticated ?
                    'text-muted-foreground opacity-50 cursor-not-allowed hover:bg-transparent'
                :   'text-muted-foreground hover:text-foreground cursor-pointer'
            }`}
            aria-label={
                isInQueue ? 'Already in queue'
                : !isAuthenticated ? 'Log in to add to queue'
                : 'Add to queue'
            }
            aria-disabled={!isAuthenticated || isInQueue}
            title={
                isInQueue ? 'Already in queue'
                : !isAuthenticated ? 'Log in to add to queue'
                : 'Add to queue'
            }
        >
            <svg
                className='w-5 h-5 shrink-0'
                fill={isInQueue ? 'currentColor' : 'none'}
                stroke='currentColor'
                viewBox='0 0 24 24'
            >
                {isInQueue ? (
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                    />
                ) : (
                    <>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 4v16m8-8H4'
                        />
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2M15 5h2a2 2 0 012 2v10a2 2 0 01-2 2h-2'
                        />
                    </>
                )}
            </svg>
            <span className='hidden sm:inline'>
                {isInQueue ? 'In Queue' : 'Add to Queue'}
            </span>
        </button>
    );
}
