import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    useQueue,
    useRemoveFromQueue,
    useMarkAsPlayed,
    useQueueCount,
} from '@/hooks/useQueue';
import { useAuth } from '@/context/AuthContext';
import { formatDuration, cn } from '@/lib/utils';
import {
    X,
    ChevronUp,
    ChevronDown,
    Play,
    SkipForward,
    Maximize2,
    ListMusic,
    Trash2,
} from 'lucide-react';
import type { QueueItemWithClip } from '@/types/queue';

type WidgetState = 'collapsed' | 'expanded' | 'playing';

export function QueueWidget() {
    const { user } = useAuth();
    const isAuthenticated = !!user;
    const { data: queue } = useQueue(20, isAuthenticated);
    const { data: queueCount } = useQueueCount(isAuthenticated);
    const removeFromQueue = useRemoveFromQueue();
    const markAsPlayed = useMarkAsPlayed();

    const [widgetState, setWidgetState] = useState<WidgetState>('collapsed');
    const [currentClip, setCurrentClip] = useState<QueueItemWithClip | null>(
        null,
    );
    const [currentItemId, setCurrentItemId] = useState<string | null>(null);

    const queueItems = queue?.items || [];
    const remainingItems =
        currentItemId ?
            queueItems.filter(item => item.id !== currentItemId)
        :   queueItems;

    const handlePlayClip = useCallback(
        (item: QueueItemWithClip) => {
            setCurrentClip(item);
            setCurrentItemId(item.id);
            setWidgetState('playing');
            markAsPlayed.mutate(item.id);
        },
        [markAsPlayed],
    );

    const handlePlayNext = useCallback(() => {
        const items =
            currentItemId ?
                (queue?.items || []).filter(item => item.id !== currentItemId)
            :   queue?.items || [];
        if (items.length > 0) {
            setCurrentClip(items[0]);
            setCurrentItemId(items[0].id);
            setWidgetState('playing');
            markAsPlayed.mutate(items[0].id);
        } else {
            // Queue exhausted
            setCurrentClip(null);
            setCurrentItemId(null);
            setWidgetState('collapsed');
        }
    }, [queue?.items, currentItemId, markAsPlayed]);

    const handleRemoveItem = useCallback(
        (itemId: string) => {
            removeFromQueue.mutate(itemId);
            if (itemId === currentItemId) {
                handlePlayNext();
            }
        },
        [removeFromQueue, currentItemId, handlePlayNext],
    );

    const handleClose = useCallback(() => {
        setWidgetState('collapsed');
    }, []);

    const handleExpand = useCallback(() => {
        setWidgetState('expanded');
    }, []);

    const handleMinimizeToPlayer = useCallback(() => {
        if (currentClip) {
            setWidgetState('playing');
        } else {
            setWidgetState('collapsed');
        }
    }, [currentClip]);

    // Don't show for logged out users or empty queues
    if (!user || !queueCount || queueCount === 0) {
        return null;
    }

    // Collapsed state - small button
    if (widgetState === 'collapsed') {
        return (
            <button
                onClick={handleExpand}
                className='fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg transition-all hover:scale-105 cursor-pointer'
                aria-label='Open queue'
            >
                <ListMusic className='h-5 w-5' />
                <span className='font-medium'>{queueCount}</span>
            </button>
        );
    }

    // Playing state - miniplayer with queue
    if (widgetState === 'playing' && currentClip?.clip) {
        const parentDomain =
            typeof window !== 'undefined' ?
                window.location.hostname
            :   'localhost';
        const embedUrl = `https://clips.twitch.tv/embed?clip=${currentClip.clip.twitch_clip_id}&parent=${parentDomain}&autoplay=true&muted=false`;

        return (
            <div className='fixed bottom-6 right-6 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden'>
                {/* Header */}
                <div className='flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border'>
                    <div className='flex items-center gap-2'>
                        <ListMusic className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm font-medium'>Now Playing</span>
                    </div>
                    <div className='flex items-center gap-1'>
                        <button
                            onClick={handleExpand}
                            className='p-1 hover:bg-muted rounded transition-colors cursor-pointer'
                            aria-label='Expand queue'
                        >
                            <ChevronUp className='h-4 w-4' />
                        </button>
                        <button
                            onClick={handleClose}
                            className='p-1 hover:bg-muted rounded transition-colors cursor-pointer'
                            aria-label='Close player'
                        >
                            <X className='h-4 w-4' />
                        </button>
                    </div>
                </div>

                {/* Miniplayer */}
                <div className='relative aspect-video bg-black'>
                    <iframe
                        src={embedUrl}
                        className='absolute inset-0 w-full h-full'
                        allowFullScreen
                        title={currentClip.clip.title}
                        allow='autoplay; fullscreen'
                    />
                </div>

                {/* Clip Info & Controls */}
                <div className='p-3'>
                    <h3 className='font-medium text-sm line-clamp-1'>
                        {currentClip.clip.title}
                    </h3>
                    <p className='text-xs text-muted-foreground mt-0.5 line-clamp-1'>
                        {currentClip.clip.broadcaster_name}
                        {currentClip.clip.game_name &&
                            ` • ${currentClip.clip.game_name}`}
                    </p>

                    <div className='flex items-center justify-between mt-3'>
                        <div className='flex items-center gap-2'>
                            <button
                                onClick={handlePlayNext}
                                disabled={remainingItems.length === 0}
                                className='flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                                aria-label='Skip to next'
                            >
                                <SkipForward className='h-3 w-3' />
                                Next
                            </button>
                            <span className='text-xs text-muted-foreground'>
                                {remainingItems.length} more
                            </span>
                        </div>
                        <Link
                            to={`/clip/${currentClip.clip_id}`}
                            className='flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors'
                            aria-label='Theater mode'
                        >
                            <Maximize2 className='h-3 w-3' />
                            Theater
                        </Link>
                    </div>
                </div>

                {/* Up Next Preview */}
                {remainingItems.length > 0 && (
                    <div className='border-t border-border p-2'>
                        <p className='text-xs text-muted-foreground px-1 mb-1'>
                            Up Next
                        </p>
                        <div
                            onClick={() => handlePlayClip(remainingItems[0])}
                            className='flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer'
                        >
                            {remainingItems[0].clip?.thumbnail_url && (
                                <img
                                    src={remainingItems[0].clip.thumbnail_url}
                                    alt=''
                                    className='w-12 h-8 object-cover rounded'
                                />
                            )}
                            <div className='flex-1 min-w-0'>
                                <p className='text-xs font-medium line-clamp-1'>
                                    {remainingItems[0].clip?.title ||
                                        'Unknown Clip'}
                                </p>
                                <p className='text-xs text-muted-foreground line-clamp-1'>
                                    {remainingItems[0].clip?.broadcaster_name}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Expanded state - full queue list
    return (
        <div className='fixed bottom-6 right-6 z-50 w-80 max-h-[70vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col'>
            {/* Header */}
            <div className='flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border shrink-0'>
                <div className='flex items-center gap-2'>
                    <ListMusic className='h-4 w-4 text-muted-foreground' />
                    <span className='text-sm font-medium'>Queue</span>
                    <span className='text-xs text-muted-foreground'>
                        ({queueCount})
                    </span>
                </div>
                <div className='flex items-center gap-1'>
                    {currentClip && (
                        <button
                            onClick={handleMinimizeToPlayer}
                            className='p-1 hover:bg-muted rounded transition-colors cursor-pointer'
                            aria-label='Back to player'
                        >
                            <ChevronDown className='h-4 w-4' />
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className='p-1 hover:bg-muted rounded transition-colors cursor-pointer'
                        aria-label='Close queue'
                    >
                        <X className='h-4 w-4' />
                    </button>
                </div>
            </div>

            {/* Queue List */}
            <div className='flex-1 overflow-y-auto'>
                {queueItems.length === 0 ?
                    <div className='p-6 text-center text-muted-foreground'>
                        <ListMusic className='h-8 w-8 mx-auto mb-2 opacity-50' />
                        <p className='text-sm'>Your queue is empty</p>
                    </div>
                :   <div className='divide-y divide-border'>
                        {queueItems.map((item, idx) => (
                            <div
                                key={item.id}
                                className={cn(
                                    'flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors group',
                                    item.id === currentItemId &&
                                        'bg-primary-500/10',
                                )}
                            >
                                {/* Position */}
                                <span className='text-xs text-muted-foreground w-4 text-center shrink-0'>
                                    {idx + 1}
                                </span>

                                {/* Thumbnail with play button */}
                                <div
                                    onClick={() => handlePlayClip(item)}
                                    className='relative w-14 h-9 shrink-0 rounded overflow-hidden cursor-pointer group/thumb'
                                >
                                    {item.clip?.thumbnail_url && (
                                        <img
                                            src={item.clip.thumbnail_url}
                                            alt=''
                                            className='w-full h-full object-cover'
                                        />
                                    )}
                                    <div className='absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity'>
                                        <Play className='h-4 w-4 text-white fill-white' />
                                    </div>
                                    {item.clip?.duration && (
                                        <span className='absolute bottom-0.5 right-0.5 text-[10px] bg-black/75 text-white px-0.5 rounded'>
                                            {formatDuration(item.clip.duration)}
                                        </span>
                                    )}
                                </div>

                                {/* Clip info */}
                                <div className='flex-1 min-w-0'>
                                    <p className='text-xs font-medium line-clamp-1'>
                                        {item.clip?.title || 'Unknown Clip'}
                                    </p>
                                    <p className='text-[10px] text-muted-foreground line-clamp-1'>
                                        {item.clip?.broadcaster_name}
                                    </p>
                                </div>

                                {/* Remove button */}
                                <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className='p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all cursor-pointer text-muted-foreground hover:text-error-600'
                                    aria-label='Remove from queue'
                                >
                                    <Trash2 className='h-3 w-3' />
                                </button>
                            </div>
                        ))}
                    </div>
                }
            </div>

            {/* Footer */}
            <div className='shrink-0 border-t border-border p-2 flex items-center justify-between bg-muted/30'>
                <Link
                    to='/queue'
                    onClick={handleClose}
                    className='text-xs text-primary-600 hover:text-primary-700 hover:underline'
                >
                    View full queue
                </Link>
                {queueItems.length > 0 && !currentClip && (
                    <button
                        onClick={() => handlePlayClip(queueItems[0])}
                        className='flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors cursor-pointer'
                    >
                        <Play className='h-3 w-3 fill-current' />
                        Play All
                    </button>
                )}
            </div>
        </div>
    );
}
