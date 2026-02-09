import { Link } from 'react-router-dom';
import {
    useQueue,
    useRemoveFromQueue,
    useClearQueue,
    useMarkAsPlayed,
    useReorderQueue,
} from '@/hooks/useQueue';
import { formatDuration, cn } from '@/lib/utils';
import {
    X,
    Trash2,
    Play,
    GripVertical,
    ListPlus,
    Maximize2,
} from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { SEO } from '@/components/SEO';
import { useState } from 'react';
import { ConvertToPlaylistDialog } from '@/components/queue/ConvertToPlaylistDialog';
import { useNavigate } from 'react-router-dom';

export function QueuePage() {
    const { data: queue, isLoading, isError } = useQueue(100);
    const removeFromQueue = useRemoveFromQueue();
    const clearQueue = useClearQueue();
    const markAsPlayed = useMarkAsPlayed();
    const reorderQueue = useReorderQueue();
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [showConvertDialog, setShowConvertDialog] = useState(false);
    const navigate = useNavigate();

    const handleRemove = (itemId: string) => {
        removeFromQueue.mutate(itemId);
    };

    const handleClearQueue = () => {
        if (
            window.confirm('Are you sure you want to clear the entire queue?')
        ) {
            clearQueue.mutate();
        }
    };

    const handlePlay = (itemId: string, clipId: string) => {
        markAsPlayed.mutate(itemId);
        window.open(`/clip/${clipId}`, '_blank');
    };

    const handleDragStart = (id: string) => {
        setDraggedId(id);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        setDragOverId(id);
    };

    const handleDragLeave = () => {
        setDragOverId(null);
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();

        if (!draggedId || draggedId === targetId) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }

        const items = queue?.items || [];
        const draggedIndex = items.findIndex(item => item.id === draggedId);
        const targetIndex = items.findIndex(item => item.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }

        // Use target position as the new position
        const newPosition = targetIndex;

        // Call the reorder API
        reorderQueue.mutate({
            item_id: draggedId,
            new_position: newPosition,
        });

        setDraggedId(null);
        setDragOverId(null);
    };

    const queueItems = queue?.items || [];
    const total = queue?.total || 0;

    return (
        <>
            <SEO
                title='My Queue'
                description="Your clip queue - clips you've saved to watch later"
            />

            <div className='max-w-4xl mx-auto px-4 py-8'>
                {/* Header */}
                <div className='flex items-center justify-between mb-6'>
                    <div>
                        <h1 className='text-2xl font-bold'>My Queue</h1>
                        <p className='text-muted-foreground mt-1'>
                            {total} {total === 1 ? 'clip' : 'clips'} saved for
                            later
                        </p>
                    </div>
                    {total > 0 && (
                        <div className='flex gap-2'>
                            <Button
                                variant='primary'
                                size='sm'
                                onClick={() => navigate('/queue/theatre')}
                            >
                                <Maximize2 className='h-4 w-4 mr-2' />
                                Theatre Mode
                            </Button>
                            <Button
                                variant='primary'
                                size='sm'
                                onClick={() => setShowConvertDialog(true)}
                            >
                                <ListPlus className='h-4 w-4 mr-2' />
                                Convert to Playlist
                            </Button>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={handleClearQueue}
                                className='text-error-600 hover:text-error-700 hover:border-error-600'
                            >
                                <Trash2 className='h-4 w-4 mr-2' />
                                Clear Queue
                            </Button>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className='flex items-center justify-center py-16'>
                        <Spinner size='lg' />
                    </div>
                )}

                {/* Error State */}
                {isError && (
                    <div className='text-center py-16'>
                        <p className='text-error-600 mb-4'>
                            Failed to load queue
                        </p>
                        <Button
                            variant='outline'
                            onClick={() => window.location.reload()}
                        >
                            Try Again
                        </Button>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !isError && queueItems.length === 0 && (
                    <div className='text-center py-16 bg-card rounded-xl border border-border'>
                        <div className='text-5xl mb-4'>📋</div>
                        <h2 className='text-xl font-semibold mb-2'>
                            Your queue is empty
                        </h2>
                        <p className='text-muted-foreground mb-6'>
                            Add clips to your queue to watch them later
                        </p>
                        <Link to='/'>
                            <Button variant='primary'>Browse Clips</Button>
                        </Link>
                    </div>
                )}

                {/* Queue Items */}
                {!isLoading && !isError && queueItems.length > 0 && (
                    <div className='space-y-2'>
                        {queueItems.map((item, idx) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={() => handleDragStart(item.id)}
                                onDragOver={e => handleDragOver(e, item.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={e => handleDrop(e, item.id)}
                                className={cn(
                                    'bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow',
                                    item.played_at && 'opacity-60',
                                    draggedId === item.id && 'opacity-50',
                                    dragOverId === item.id &&
                                        'border-t-2 border-primary',
                                )}
                            >
                                <div className='flex gap-4'>
                                    {/* Drag Handle & Position */}
                                    <div className='flex items-center gap-2 text-muted-foreground'>
                                        <GripVertical className='h-5 w-5 cursor-grab active:cursor-grabbing' />
                                        <span className='text-sm font-mono w-6'>
                                            {idx + 1}.
                                        </span>
                                    </div>

                                    {/* Thumbnail */}
                                    {item.clip?.thumbnail_url && (
                                        <Link
                                            to={`/clip/${item.clip_id}`}
                                            className='w-32 h-20 shrink-0 rounded-lg overflow-hidden relative group'
                                        >
                                            <img
                                                src={item.clip.thumbnail_url}
                                                alt={item.clip.title}
                                                className='w-full h-full object-cover'
                                            />
                                            <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                                                <Play className='h-8 w-8 text-white fill-white' />
                                            </div>
                                            {item.clip?.duration && (
                                                <div className='absolute bottom-1 right-1 px-1.5 py-0.5 text-xs font-medium text-white bg-black/75 rounded'>
                                                    {formatDuration(
                                                        item.clip.duration,
                                                    )}
                                                </div>
                                            )}
                                        </Link>
                                    )}

                                    {/* Clip Info */}
                                    <div className='flex-1 min-w-0'>
                                        <Link
                                            to={`/clip/${item.clip_id}`}
                                            className='font-medium hover:text-primary-600 transition-colors line-clamp-2'
                                        >
                                            {item.clip?.title || 'Unknown Clip'}
                                        </Link>
                                        <div className='flex items-center gap-2 text-sm text-muted-foreground mt-1'>
                                            {item.clip?.broadcaster_name && (
                                                <Link
                                                    to={`/broadcaster/${item.clip.broadcaster_name}`}
                                                    className='hover:text-foreground'
                                                >
                                                    {item.clip.broadcaster_name}
                                                </Link>
                                            )}
                                            {item.clip?.game_name && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        {item.clip.game_name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {item.played_at && (
                                            <div className='text-xs text-muted-foreground mt-2'>
                                                ✓ Watched
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            onClick={() =>
                                                handlePlay(
                                                    item.id,
                                                    item.clip_id,
                                                )
                                            }
                                            className='text-primary-600 hover:text-primary-700'
                                        >
                                            <Play className='h-4 w-4 mr-1 fill-current' />
                                            Play
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            onClick={() =>
                                                handleRemove(item.id)
                                            }
                                            className='text-muted-foreground hover:text-error-600'
                                        >
                                            <X className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Convert to Playlist Dialog */}
                <ConvertToPlaylistDialog
                    isOpen={showConvertDialog}
                    onClose={() => setShowConvertDialog(false)}
                    queueItemCount={total}
                />
            </div>
        </>
    );
}
