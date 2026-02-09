import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useConvertQueueToPlaylist } from '@/hooks/useQueue';
import { useToast } from '@/context/ToastContext';
import { ListChecks, X } from 'lucide-react';

interface ConvertToPlaylistDialogProps {
    isOpen: boolean;
    onClose: () => void;
    queueItemCount: number;
}

export function ConvertToPlaylistDialog({
    isOpen,
    onClose,
    queueItemCount,
}: ConvertToPlaylistDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [onlyUnplayed, setOnlyUnplayed] = useState(false);
    const [clearQueue, setClearQueue] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();
    const convertMutation = useConvertQueueToPlaylist();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            showToast('Please enter a playlist title', 'error');
            return;
        }

        try {
            const playlist = await convertMutation.mutateAsync({
                title: title.trim(),
                description: description.trim() || undefined,
                only_unplayed: onlyUnplayed,
                clear_queue: clearQueue,
            });

            showToast('Queue converted to playlist successfully!', 'success');
            onClose();

            // Navigate to the new playlist
            navigate(`/playlists/${playlist.id}`);
        } catch (error) {
            const message =
                error instanceof Error ?
                    error.message
                :   'Failed to convert queue to playlist';
            showToast(message, 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
            <div className='bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6'>
                {/* Header */}
                <div className='flex items-center justify-between mb-6'>
                    <div className='flex items-center gap-2'>
                        <ListChecks className='h-5 w-5 text-primary-600' />
                        <h2 className='text-xl font-bold'>
                            Convert Queue to Playlist
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className='p-1 hover:bg-muted rounded-lg transition-colors'
                        aria-label='Close dialog'
                    >
                        <X className='h-5 w-5' />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className='space-y-4'>
                    {/* Title */}
                    <div>
                        <label
                            htmlFor='playlist-title'
                            className='block text-sm font-medium mb-1'
                        >
                            Playlist Title{' '}
                            <span className='text-error-600'>*</span>
                        </label>
                        <input
                            id='playlist-title'
                            type='text'
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder='My Awesome Playlist'
                            maxLength={255}
                            className='w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label
                            htmlFor='playlist-description'
                            className='block text-sm font-medium mb-1'
                        >
                            Description (optional)
                        </label>
                        <textarea
                            id='playlist-description'
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder='Describe your playlist...'
                            rows={3}
                            maxLength={2000}
                            className='w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none'
                        />
                    </div>

                    {/* Options */}
                    <div className='space-y-3 pt-2'>
                        <label className='flex items-start gap-3 cursor-pointer'>
                            <input
                                type='checkbox'
                                checked={onlyUnplayed}
                                onChange={e =>
                                    setOnlyUnplayed(e.target.checked)
                                }
                                className='mt-0.5 w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500'
                            />
                            <div className='flex-1'>
                                <span className='text-sm font-medium'>
                                    Only include unplayed clips
                                </span>
                                <p className='text-xs text-muted-foreground'>
                                    Exclude clips you've already watched
                                </p>
                            </div>
                        </label>

                        <label className='flex items-start gap-3 cursor-pointer'>
                            <input
                                type='checkbox'
                                checked={clearQueue}
                                onChange={e => setClearQueue(e.target.checked)}
                                className='mt-0.5 w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500'
                            />
                            <div className='flex-1'>
                                <span className='text-sm font-medium'>
                                    Clear queue after conversion
                                </span>
                                <p className='text-xs text-muted-foreground'>
                                    Remove all items from your queue
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Info */}
                    <div className='bg-muted/50 border border-border rounded-lg p-3'>
                        <p className='text-sm text-muted-foreground'>
                            {queueItemCount}{' '}
                            {queueItemCount === 1 ? 'clip' : 'clips'} in queue
                        </p>
                    </div>

                    {/* Actions */}
                    <div className='flex gap-3 pt-2'>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={onClose}
                            className='flex-1'
                            disabled={convertMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            variant='primary'
                            className='flex-1'
                            disabled={
                                convertMutation.isPending || !title.trim()
                            }
                        >
                            {convertMutation.isPending ?
                                'Converting...'
                            :   'Create Playlist'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
