import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn, formatDuration } from '@/lib/utils';
import { TheatreMode, VideoPlayer } from '@/components/video';
import {
    Play,
    X,
    GripVertical,
    SkipForward,
    Minimize2,
    ChevronLeft,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui';
import type { Clip } from '@/types/clip';

export interface PlaylistItem {
    id: string;
    clip?: Clip;
    clip_id: string;
    order?: number;
    played_at?: string;
}

interface PlaylistTheatreModeProps {
    title: string;
    items: PlaylistItem[];
    currentItemId: string | null;
    onItemClick: (item: PlaylistItem) => void;
    onItemRemove?: (itemId: string) => void;
    onReorder?: (itemId: string, newPosition: number) => void;
    onClipUpdated?: (clipId: string) => void;
    onClose?: () => void;
    isQueue?: boolean; // True for queue, false for playlist
    contained?: boolean; // True for embedded mode, false for full-screen
    className?: string;
}

export function PlaylistTheatreMode({
    title,
    items,
    currentItemId,
    onItemClick,
    onItemRemove,
    onReorder,
    onClipUpdated,
    onClose,
    isQueue = false,
    contained = false,
    className,
}: PlaylistTheatreModeProps) {
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    // Find current item and clip
    const currentItem = useMemo(
        () => items.find(item => item.id === currentItemId),
        [items, currentItemId],
    );
    const currentClip = currentItem?.clip;

    // Auto-advance to next unplayed clip (HLS only)
    const handleClipEnd = useCallback(() => {
        const currentIndex = items.findIndex(item => item.id === currentItemId);
        if (currentIndex === -1) return;

        // Find next unplayed item
        const nextItem = items
            .slice(currentIndex + 1)
            .find(item => !item.played_at);

        if (nextItem) {
            onItemClick(nextItem);
        }
    }, [items, currentItemId, onItemClick]);

    // Skip to next clip
    const handleSkipNext = useCallback(() => {
        const currentIndex = items.findIndex(item => item.id === currentItemId);
        if (currentIndex < items.length - 1) {
            onItemClick(items[currentIndex + 1]);
        }
    }, [items, currentItemId, onItemClick]);

    // Drag and drop handlers
    const handleDragStart = useCallback((id: string) => {
        setDraggedId(id);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
        e.preventDefault();
        setDragOverId(id);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverId(null);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent, targetId: string) => {
            e.preventDefault();

            if (!draggedId || !onReorder || draggedId === targetId) {
                setDraggedId(null);
                setDragOverId(null);
                return;
            }

            const draggedIndex = items.findIndex(item => item.id === draggedId);
            const targetIndex = items.findIndex(item => item.id === targetId);

            if (draggedIndex === -1 || targetIndex === -1) {
                setDraggedId(null);
                setDragOverId(null);
                return;
            }

            onReorder(draggedId, targetIndex);

            setDraggedId(null);
            setDragOverId(null);
        },
        [draggedId, items, onReorder],
    );

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown' || e.key === 'n') {
                e.preventDefault();
                handleSkipNext();
            }
            if (e.key === 's') {
                e.preventDefault();
                setShowSidebar(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSkipNext]);

    return (
        <div
            className={cn(
                contained ?
                    'relative w-full bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800'
                :   'fixed inset-0 z-50 bg-black',
                className,
            )}
        >
            {/* Main container */}
            <div
                className={cn(
                    'relative w-full flex',
                    contained ? 'h-[600px]' : 'h-full',
                )}
            >
                {/* Video player area */}
                <div className='flex-1 flex flex-col items-center justify-center transition-all'>
                    {/* Video player */}
                    <div className='w-full flex-1 flex items-center justify-center overflow-hidden'>
                        {currentClip ?
                            currentClip.video_url ?
                                <TheatreMode
                                    title={currentClip.title}
                                    hlsUrl={currentClip.video_url}
                                    onEnded={handleClipEnd}
                                    fit='height'
                                />
                            :   <VideoPlayer
                                    clipId={currentClip.id}
                                    title={currentClip.title}
                                    embedUrl={currentClip.embed_url}
                                    fit='height'
                                    className='max-h-full'
                                />

                        :   <div className='text-center text-white/60'>
                                <p className='text-lg'>No clip selected</p>
                                <p className='text-sm mt-2'>
                                    Select a clip from the{' '}
                                    {isQueue ? 'queue' : 'playlist'} to start
                                    watching
                                </p>
                            </div>
                        }
                    </div>
                </div>

                {/* Sidebar toggle when hidden */}
                {!showSidebar && (
                    <button
                        onClick={() => setShowSidebar(true)}
                        className='absolute top-4 right-4 z-10 p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors'
                        aria-label='Show playlist'
                    >
                        <ChevronLeft className='h-5 w-5 text-white rotate-180' />
                    </button>
                )}

                {/* Playlist/Queue sidebar */}
                {showSidebar && (
                    <div
                        className={cn(
                            'h-full bg-neutral-900 border-l border-neutral-800 flex flex-col',
                            contained ? 'w-80' : 'w-96',
                        )}
                    >
                        {/* Sidebar header */}
                        <div className='p-4 border-b border-neutral-800'>
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-2'>
                                    {onClose && (
                                        <button
                                            onClick={onClose}
                                            className='p-1.5 hover:bg-white/10 rounded-lg transition-colors'
                                            aria-label='Exit theatre mode'
                                        >
                                            <Minimize2 className='h-4 w-4 text-white' />
                                        </button>
                                    )}
                                    <div>
                                        <h2 className='text-white font-semibold'>
                                            {isQueue ? 'Queue' : 'Playlist'}
                                        </h2>
                                        <p className='text-white/60 text-sm'>
                                            {items.findIndex(
                                                item => item.id === currentItemId,
                                            ) + 1}{' '}
                                            / {items.length}{' '}
                                            {items.length === 1 ? 'clip' : 'clips'}
                                        </p>
                                    </div>
                                </div>
                                <div className='flex items-center gap-1'>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={handleSkipNext}
                                        disabled={
                                            items.findIndex(
                                                item => item.id === currentItemId,
                                            ) ===
                                            items.length - 1
                                        }
                                        className='text-white hover:bg-white/10'
                                    >
                                        <SkipForward className='h-4 w-4 mr-1' />
                                        Next
                                    </Button>
                                    <button
                                        onClick={() => setShowSidebar(false)}
                                        className='p-1.5 hover:bg-white/10 rounded-lg transition-colors'
                                        aria-label='Hide sidebar'
                                    >
                                        <ChevronLeft className='h-4 w-4 text-white rotate-180' />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable items list */}
                        <div className='flex-1 overflow-y-auto'>
                            {items.map((item, idx) => {
                                const isCurrentItem = item.id === currentItemId;
                                const isPlayed = !!item.played_at;

                                return (
                                    <div
                                        key={item.id}
                                        draggable={!!onReorder}
                                        onDragStart={() =>
                                            handleDragStart(item.id)
                                        }
                                        onDragOver={e =>
                                            handleDragOver(e, item.id)
                                        }
                                        onDragLeave={handleDragLeave}
                                        onDrop={e => handleDrop(e, item.id)}
                                        className={cn(
                                            'group relative border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors',
                                            isCurrentItem &&
                                                'bg-primary-500/20',
                                            draggedId === item.id &&
                                                'opacity-50',
                                            dragOverId === item.id &&
                                                'border-t-2 border-primary-500',
                                        )}
                                    >
                                        <div className='flex gap-2 p-3'>
                                            {/* Drag handle and number */}
                                            <div className='flex items-center gap-2 text-white/40'>
                                                {onReorder && (
                                                    <GripVertical className='h-4 w-4 cursor-grab active:cursor-grabbing' />
                                                )}
                                                <span className='text-xs font-mono w-6 text-right'>
                                                    {idx + 1}
                                                </span>
                                            </div>

                                            {/* Thumbnail */}
                                            <button
                                                onClick={() =>
                                                    onItemClick(item)
                                                }
                                                className='relative w-20 h-12 shrink-0 rounded overflow-hidden group/thumb'
                                            >
                                                {item.clip?.thumbnail_url && (
                                                    <img
                                                        src={
                                                            item.clip
                                                                .thumbnail_url
                                                        }
                                                        alt={item.clip.title}
                                                        className='w-full h-full object-cover'
                                                    />
                                                )}
                                                <div className='absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center'>
                                                    <Play className='h-5 w-5 text-white fill-white' />
                                                </div>
                                                {item.clip?.duration && (
                                                    <div className='absolute bottom-0.5 right-0.5 px-1 py-0.5 text-xs text-white bg-black/75 rounded'>
                                                        {formatDuration(
                                                            item.clip.duration,
                                                        )}
                                                    </div>
                                                )}
                                                {isCurrentItem && (
                                                    <div className='absolute top-0.5 left-0.5 p-1 bg-primary-500 rounded'>
                                                        <Play className='h-3 w-3 text-white fill-white' />
                                                    </div>
                                                )}
                                            </button>

                                            {/* Info */}
                                            <div className='flex-1 min-w-0'>
                                                <button
                                                    onClick={() =>
                                                        onItemClick(item)
                                                    }
                                                    className='text-left w-full'
                                                >
                                                    <p
                                                        className={cn(
                                                            'text-sm font-medium line-clamp-2',
                                                            isCurrentItem ?
                                                                'text-primary-400'
                                                            :   'text-white',
                                                            isPlayed &&
                                                                'opacity-60',
                                                        )}
                                                    >
                                                        {item.clip?.title ||
                                                            'Unknown Clip'}
                                                    </p>
                                                    <p className='text-xs text-white/60 mt-0.5'>
                                                        {
                                                            item.clip
                                                                ?.broadcaster_name
                                                        }
                                                    </p>
                                                </button>
                                                {isPlayed && (
                                                    <div className='flex items-center gap-1 text-xs text-white/40 mt-1'>
                                                        <Check className='h-3 w-3' />
                                                        Watched
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {onItemRemove && (
                                                <button
                                                    onClick={() =>
                                                        onItemRemove(item.id)
                                                    }
                                                    className='p-1.5 opacity-0 group-hover:opacity-100 hover:bg-error-500/20 text-error-400 rounded transition-all'
                                                    aria-label='Remove from playlist'
                                                >
                                                    <X className='h-4 w-4' />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {items.length === 0 && (
                                <div className='text-center py-12 text-white/40'>
                                    <p>
                                        No clips in{' '}
                                        {isQueue ? 'queue' : 'playlist'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Keyboard shortcuts hint */}
                        <div className='p-3 border-t border-neutral-800 bg-neutral-950/50'>
                            <p className='text-xs text-white/40'>
                                <kbd className='px-1.5 py-0.5 bg-neutral-800 rounded text-white/60'>
                                    N
                                </kbd>{' '}
                                Next clip
                                {' • '}
                                <kbd className='px-1.5 py-0.5 bg-neutral-800 rounded text-white/60'>
                                    S
                                </kbd>{' '}
                                Toggle sidebar
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
