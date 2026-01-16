import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { getErrorMessage } from '@/lib/error-utils';
import {
    syncBansFromTwitch,
    checkSyncBansProgress,
    type SyncBansProgressResponse,
} from '@/lib/chat-api';

interface SyncBansModalProps {
    open: boolean;
    onClose: () => void;
    channelId: string;
    onSuccess?: () => void;
}

// Constants
const POLL_INTERVAL_MS = 2000;
const SUCCESS_DELAY_MS = 2000;

export function SyncBansModal({
    open,
    onClose,
    channelId,
    onSuccess,
}: SyncBansModalProps) {
    const [twitchChannelName, setTwitchChannelName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [syncProgress, setSyncProgress] =
        useState<SyncBansProgressResponse | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const resetFormState = () => {
        setTwitchChannelName('');
        setError(null);
        setSyncProgress(null);
        setJobId(null);
        setShowConfirmation(false);
    };

    // Poll for sync progress
    useEffect(() => {
        if (!jobId || !open) return;

        let isCancelled = false;

        const pollInterval = setInterval(async () => {
            try {
                const progress = await checkSyncBansProgress(channelId, jobId);

                if (isCancelled) {
                    return;
                }

                setSyncProgress(progress);

                if (
                    progress.status === 'completed' ||
                    progress.status === 'failed'
                ) {
                    clearInterval(pollInterval);
                    if (progress.status === 'completed' && onSuccess) {
                        setTimeout(() => {
                            if (!isCancelled) {
                                onSuccess();
                            }
                        }, SUCCESS_DELAY_MS);
                    }
                }
            } catch (err) {
                if (isCancelled) {
                    return;
                }
                console.error('Failed to check sync progress:', err);
                setError(getErrorMessage(err, 'Failed to check sync progress'));
                clearInterval(pollInterval);
            }
        }, POLL_INTERVAL_MS);

        return () => {
            isCancelled = true;
            clearInterval(pollInterval);
        };
    }, [jobId, open, channelId, onSuccess]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!twitchChannelName.trim()) {
            setError('Please enter a Twitch channel name');
            return;
        }

        setShowConfirmation(true);
    };

    const handleConfirmSync = async () => {
        setIsSubmitting(true);
        setError(null);
        setShowConfirmation(false);

        try {
            const result = await syncBansFromTwitch(channelId, {
                channel_name: twitchChannelName,
            });
            setJobId(result.job_id);
            setSyncProgress({
                job_id: result.job_id,
                status: 'in_progress',
                bans_added: 0,
                bans_existing: 0,
                total_processed: 0,
            });
        } catch (err: unknown) {
            setError(
                getErrorMessage(err, 'Failed to start sync. Please try again.')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting && syncProgress?.status !== 'in_progress') {
            resetFormState();
            onClose();
        }
    };

    const renderContent = () => {
        // Show sync results
        if (syncProgress?.status === 'completed') {
            return (
                <div className='py-8 space-y-4'>
                    <Alert
                        variant='success'
                        title='Sync Completed Successfully'
                    >
                        Twitch bans have been synchronized to your channel.
                    </Alert>

                    <div className='bg-muted p-4 rounded-lg space-y-3'>
                        <h3 className='font-semibold mb-2'>Sync Summary</h3>
                        <div className='space-y-2 text-sm'>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>
                                    New Bans Added:
                                </span>
                                <span className='font-medium text-success-600 dark:text-success-400'>
                                    +{syncProgress.bans_added}
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>
                                    Already Existing:
                                </span>
                                <span className='font-medium'>
                                    {syncProgress.bans_existing}
                                </span>
                            </div>
                            <div className='flex justify-between border-t pt-2'>
                                <span className='font-medium'>
                                    Total Processed:
                                </span>
                                <span className='font-medium'>
                                    {syncProgress.total_processed}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Show sync progress
        if (syncProgress?.status === 'in_progress') {
            return (
                <div className='py-8 space-y-4'>
                    <Alert variant='info' title='Synchronizing Bans'>
                        Please wait while we sync bans from Twitch. This may
                        take a few moments.
                    </Alert>

                    <div className='flex items-center justify-center py-8'>
                        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500'></div>
                    </div>

                    <div className='bg-muted p-4 rounded-lg'>
                        <div className='text-sm space-y-2'>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>
                                    Status:
                                </span>
                                <span className='font-medium'>
                                    In Progress...
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>
                                    Processed:
                                </span>
                                <span className='font-medium'>
                                    {syncProgress.total_processed}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Show error state
        if (syncProgress?.status === 'failed') {
            return (
                <div className='py-8 space-y-4'>
                    <div
                        role='alert'
                        className='rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4'
                    >
                        <h3 className='font-semibold text-red-800 dark:text-red-400 mb-2'>
                            Sync Failed
                        </h3>
                        <p className='text-sm text-red-700 dark:text-red-300'>
                            {syncProgress.error ||
                                'An error occurred while syncing bans. Please check the channel name and try again.'}
                        </p>
                    </div>

                    <div className='flex justify-end pt-4'>
                        <Button
                            type='button'
                            variant='secondary'
                            onClick={handleClose}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            );
        }

        // Show confirmation dialog
        if (showConfirmation) {
            return (
                <div className='space-y-6'>
                    <Alert variant='warning' title='Confirm Sync'>
                        You are about to sync all bans from the Twitch channel "
                        {twitchChannelName}". This will:
                        <ul className='list-disc list-inside mt-2 space-y-1'>
                            <li>Import all current bans from Twitch</li>
                            <li>Skip users who are already banned</li>
                            <li>Preserve existing ban reasons and durations</li>
                        </ul>
                    </Alert>

                    <ModalFooter>
                        <Button
                            type='button'
                            variant='secondary'
                            onClick={() => setShowConfirmation(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='button'
                            variant='primary'
                            onClick={handleConfirmSync}
                            loading={isSubmitting}
                        >
                            Confirm Sync
                        </Button>
                    </ModalFooter>
                </div>
            );
        }

        // Show initial form
        return (
            <form onSubmit={handleSubmit}>
                <div className='space-y-6'>
                    <div>
                        <p className='text-sm text-muted-foreground mb-4'>
                            Sync bans from your Twitch channel to keep your ban
                            list up to date.
                        </p>

                        {error && (
                            <div
                                role='alert'
                                className='rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-400 mb-4'
                            >
                                {error}
                            </div>
                        )}

                        <div className='mt-4'>
                            <label
                                htmlFor='channel-name'
                                className='block text-sm font-medium mb-2'
                            >
                                Twitch Channel Name *
                            </label>
                            <input
                                id='channel-name'
                                type='text'
                                value={twitchChannelName}
                                onChange={e =>
                                    setTwitchChannelName(e.target.value)
                                }
                                placeholder='Enter Twitch channel name'
                                className='w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background'
                                disabled={isSubmitting}
                                required
                            />
                            <p className='text-xs text-muted-foreground mt-1'>
                                Enter the exact Twitch channel name (e.g.,
                                "twitchdev")
                            </p>
                        </div>
                    </div>

                    <ModalFooter>
                        <Button
                            type='button'
                            variant='secondary'
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            variant='primary'
                            disabled={isSubmitting || !twitchChannelName.trim()}
                        >
                            Start Sync
                        </Button>
                    </ModalFooter>
                </div>
            </form>
        );
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title='Sync Bans from Twitch'
            size='lg'
            closeOnBackdrop={
                !isSubmitting && syncProgress?.status !== 'in_progress'
            }
        >
            {renderContent()}
        </Modal>
    );
}
