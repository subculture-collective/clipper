import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    useQueue,
    useMarkAsPlayed,
    useRemoveFromQueue,
    useReorderQueue,
} from '@/hooks/useQueue';
import { PlaylistTheatreMode } from '@/components/playlist/PlaylistTheatreMode';
import { Spinner } from '@/components/ui';
import { SEO } from '@/components/SEO';
import type { PlaylistItem } from '@/components/playlist/PlaylistTheatreMode';
import type { QueueItemWithClip } from '@/types/queue';

export function QueueTheatrePage() {
    const navigate = useNavigate();
    const { data: queue, isLoading, isError } = useQueue(500);
    const markAsPlayed = useMarkAsPlayed();
    const removeFromQueue = useRemoveFromQueue();
    const reorderQueue = useReorderQueue();
    const queryClient = useQueryClient();

    const [currentItemId, setCurrentItemId] = useState<string | null>(null);

    // Convert queue items to playlist items format
    const playlistItems: PlaylistItem[] =
        queue?.items.map(item => ({
            id: item.id,
            clip: item.clip,
            clip_id: item.clip_id,
            played_at: item.played_at,
        })) || [];

    // Set first unplayed item as current if none selected
    if (!currentItemId && playlistItems.length > 0) {
        const firstUnplayed = playlistItems.find(item => !item.played_at);
        if (firstUnplayed) {
            setCurrentItemId(firstUnplayed.id);
        } else if (playlistItems.length > 0) {
            setCurrentItemId(playlistItems[0].id);
        }
    }

    const handleItemClick = useCallback(
        (item: PlaylistItem) => {
            setCurrentItemId(item.id);
            // Mark as played
            markAsPlayed.mutate(item.id);
        },
        [markAsPlayed],
    );

    const handleItemRemove = useCallback(
        (itemId: string) => {
            // If removing current item, move to next unplayed
            if (itemId === currentItemId) {
                const currentIndex = playlistItems.findIndex(
                    item => item.id === itemId,
                );
                const nextItem = playlistItems
                    .slice(currentIndex + 1)
                    .find(item => !item.played_at);

                if (nextItem) {
                    setCurrentItemId(nextItem.id);
                } else {
                    setCurrentItemId(null);
                }
            }
            removeFromQueue.mutate(itemId);
        },
        [currentItemId, playlistItems, removeFromQueue],
    );

    const handleReorder = useCallback(
        (itemId: string, newPosition: number) => {
            reorderQueue.mutate({
                item_id: itemId,
                new_position: newPosition + 1, // API uses 1-based indexing
            });
        },
        [reorderQueue],
    );

    const handleClose = useCallback(() => {
        navigate('/queue');
    }, [navigate]);

    const handleClipUpdated = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['queue'] });
    }, [queryClient]);

    if (isLoading) {
        return (
            <>
                <SEO title='Queue Theatre Mode' />
                <div className='fixed inset-0 bg-black flex items-center justify-center'>
                    <Spinner size='lg' />
                </div>
            </>
        );
    }

    if (isError) {
        return (
            <>
                <SEO title='Queue Theatre Mode' />
                <div className='fixed inset-0 bg-black flex items-center justify-center text-white'>
                    <div className='text-center'>
                        <p className='text-xl mb-4'>Failed to load queue</p>
                        <button
                            onClick={() => navigate('/queue')}
                            className='px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors'
                        >
                            Back to Queue
                        </button>
                    </div>
                </div>
            </>
        );
    }

    if (!queue || playlistItems.length === 0) {
        return (
            <>
                <SEO title='Queue Theatre Mode' />
                <div className='fixed inset-0 bg-black flex items-center justify-center text-white'>
                    <div className='text-center'>
                        <p className='text-xl mb-4'>Your queue is empty</p>
                        <button
                            onClick={() => navigate('/')}
                            className='px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors'
                        >
                            Browse Clips
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <SEO
                title='Queue Theatre Mode'
                description='Watch your queue in theatre mode'
            />
            <PlaylistTheatreMode
                title='My Queue'
                items={playlistItems}
                currentItemId={currentItemId}
                onItemClick={handleItemClick}
                onItemRemove={handleItemRemove}
                onReorder={handleReorder}
                onClipUpdated={handleClipUpdated}
                onClose={handleClose}
                isQueue={true}
            />
        </>
    );
}
