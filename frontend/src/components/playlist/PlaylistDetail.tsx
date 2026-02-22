import { Badge, Button } from '@/components/ui';
import { useAuth, useToast } from '@/hooks';
import {
    usePlaylist,
    useUpdatePlaylist,
    useCopyPlaylist,
    useLikePlaylist,
    useUnlikePlaylist,
    useRemoveClipFromPlaylist,
    useReorderPlaylistClips,
} from '@/hooks/usePlaylist';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Heart,
    Lock,
    Globe,
    Users,
    Maximize2,
    Share2,
    Copy,
} from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';
import { PlaylistTheatreMode } from './PlaylistTheatreMode';
import type { PlaylistItem } from './PlaylistTheatreMode';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ShareModal } from './ShareModal';
import { CollaboratorManager } from './CollaboratorManager';
import { PlaylistCopyModal } from './PlaylistCopyModal';

export function PlaylistDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data, isLoading } = usePlaylist(id || '', 1, 500);
    const likeMutation = useLikePlaylist();
    const unlikeMutation = useUnlikePlaylist();
    const removeClip = useRemoveClipFromPlaylist();
    const reorderClips = useReorderPlaylistClips();
    const updatePlaylist = useUpdatePlaylist();
    const copyPlaylist = useCopyPlaylist();
    const toast = useToast();
    const [currentItemId, setCurrentItemId] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [visibility, setVisibility] = useState<
        'private' | 'public' | 'unlisted'
    >('private');
    const queryClient = useQueryClient();

    // Convert playlist clips to playlist items format
    const playlistItems: PlaylistItem[] = useMemo(() => {
        if (!data?.data?.clips) return [];
        return data.data.clips.map(clip => ({
            id: `${data.data.id}-${clip.id}`,
            clip,
            clip_id: clip.id,
            order: clip.order,
        }));
    }, [data]);

    // Set first item as current if none selected
    useEffect(() => {
        if (!currentItemId && playlistItems.length > 0) {
            setCurrentItemId(playlistItems[0].id);
        }
    }, [currentItemId, playlistItems]);

    useEffect(() => {
        if (data?.data?.visibility) {
            setVisibility(data.data.visibility);
        }
    }, [data?.data?.visibility]);

    const handleItemClick = useCallback((item: PlaylistItem) => {
        setCurrentItemId(item.id);
    }, []);

    const handleItemRemove = useCallback(
        (itemId: string) => {
            if (!id) return;

            const item = playlistItems.find(i => i.id === itemId);
            if (!item) return;

            if (itemId === currentItemId) {
                const currentIndex = playlistItems.findIndex(
                    i => i.id === itemId,
                );
                if (currentIndex < playlistItems.length - 1) {
                    setCurrentItemId(playlistItems[currentIndex + 1].id);
                } else {
                    setCurrentItemId(null);
                }
            }

            removeClip.mutate({ playlistId: id, clipId: item.clip_id });
        },
        [id, currentItemId, playlistItems, removeClip],
    );

    const handleReorder = useCallback(
        (itemId: string, newPosition: number) => {
            if (!id) return;

            const item = playlistItems.find(i => i.id === itemId);
            if (!item) return;

            const draggedIndex = playlistItems.findIndex(i => i.id === itemId);
            if (draggedIndex === -1) return;

            const newOrder = [...playlistItems];
            const [draggedItem] = newOrder.splice(draggedIndex, 1);
            newOrder.splice(newPosition, 0, draggedItem);

            const clipIds = newOrder.map(i => i.clip_id);
            reorderClips.mutate({ id, data: { clip_ids: clipIds } });
        },
        [id, playlistItems, reorderClips],
    );

    const handleLike = useCallback(async () => {
        if (!id) return;
        try {
            if (data?.data?.is_liked) {
                await unlikeMutation.mutateAsync(id);
                toast.success('Playlist unliked');
            } else {
                await likeMutation.mutateAsync(id);
                toast.success('Playlist liked');
            }
        } catch {
            toast.error('Failed to update like status');
        }
    }, [id, data?.data?.is_liked, likeMutation, unlikeMutation, toast]);

    const handleClipUpdated = useCallback(() => {
        if (!id) return;
        queryClient.invalidateQueries({ queryKey: ['playlist', id] });
    }, [id, queryClient]);

    const copyInitialValues = useMemo(
        () =>
            data?.data ?
                {
                    title: `Copy of ${data.data.title}`,
                    description: data.data.description || '',
                    cover_url: data.data.cover_url || '',
                    visibility: 'private' as const,
                }
            :   {
                    title: '',
                    description: '',
                    cover_url: '',
                    visibility: 'private' as const,
                },
        [data?.data?.title, data?.data?.description, data?.data?.cover_url],
    );

    const handleVisibilityChange = useCallback(
        async (nextVisibility: 'private' | 'public' | 'unlisted') => {
            if (!id) return;
            const previous = visibility;
            setVisibility(nextVisibility);
            try {
                await updatePlaylist.mutateAsync({
                    id,
                    data: { visibility: nextVisibility },
                });
                toast.success('Visibility updated');
            } catch {
                setVisibility(previous);
                toast.error('Failed to update visibility');
            }
        },
        [id, updatePlaylist, toast, visibility],
    );

    if (!id) {
        return (
            <div className='text-center py-12 text-zinc-500'>
                Playlist not found
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className='text-center py-12 text-zinc-500'>Loading...</div>
        );
    }

    if (!data?.data) {
        return (
            <div className='text-center py-12 text-zinc-500'>
                Playlist not found
            </div>
        );
    }

    const playlist = data.data;
    const currentPermission = playlist.current_user_permission;
    const isOwner = user?.id === playlist.user_id;
    const canEdit =
        isOwner ||
        currentPermission === 'edit' ||
        currentPermission === 'admin';
    const canManageCollaborators = isOwner || currentPermission === 'admin';
    const canShare =
        isOwner ||
        currentPermission === 'edit' ||
        currentPermission === 'admin';
    const canCopy = !!user;

    const getVisibilityIcon = () => {
        switch (playlist.visibility) {
            case 'private':
                return <Lock className='h-4 w-4' />;
            case 'public':
                return <Globe className='h-4 w-4' />;
            case 'unlisted':
                return <Users className='h-4 w-4' />;
            default:
                return null;
        }
    };

    const getVisibilityLabel = () => {
        switch (playlist.visibility) {
            case 'private':
                return 'Private';
            case 'public':
                return 'Public';
            case 'unlisted':
                return 'Unlisted';
            default:
                return '';
        }
    };

    return (
        <div className='w-full'>
            {/* Theatre Mode Player */}
            {playlistItems.length > 0 && (
                <div className='mb-8'>
                    <PlaylistTheatreMode
                        title={playlist.title}
                        items={playlistItems}
                        currentItemId={currentItemId}
                        onItemClick={handleItemClick}
                        onItemRemove={canEdit ? handleItemRemove : undefined}
                        onReorder={canEdit ? handleReorder : undefined}
                        onClipUpdated={handleClipUpdated}
                        onClose={() => navigate(`/playlists/${id}/theatre`)}
                        isQueue={false}
                        contained={true}
                    />
                </div>
            )}

            {/* Header */}
            <div className='mb-8'>
                {/* Title and Metadata */}
                <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                        <h1 className='text-3xl font-bold text-zinc-100 mb-2'>
                            {playlist.title}
                        </h1>

                        {playlist.description && (
                            <p className='text-zinc-400 mb-4'>
                                {playlist.description}
                            </p>
                        )}

                        {/* Creator Info */}
                        {playlist.creator && (
                            <div className='flex items-center gap-2 text-sm text-zinc-500 mb-3'>
                                <span>Created by</span>
                                <span className='text-zinc-300 font-medium'>
                                    {playlist.creator.display_name}
                                </span>
                                <span>•</span>
                                <span
                                    title={
                                        formatTimestamp(playlist.created_at)
                                            .title
                                    }
                                >
                                    {
                                        formatTimestamp(playlist.created_at)
                                            .display
                                    }
                                </span>
                            </div>
                        )}

                        {/* Stats */}
                        <div className='flex items-center gap-4 text-sm text-zinc-500 mb-4'>
                            <span>{playlist.clip_count} clips</span>
                            <div className='flex items-center gap-1'>
                                <Heart className='h-4 w-4' />
                                <span>{playlist.like_count}</span>
                            </div>
                            <Badge
                                variant='default'
                                className='flex items-center gap-1'
                            >
                                {getVisibilityIcon()}
                                <span>{getVisibilityLabel()}</span>
                            </Badge>
                            {isOwner && (
                                <select
                                    value={visibility}
                                    onChange={e =>
                                        handleVisibilityChange(
                                            e.target.value as typeof visibility,
                                        )
                                    }
                                    className='bg-zinc-900 text-white border border-zinc-700 rounded px-2 py-1 text-xs'
                                >
                                    <option value='private'>Private</option>
                                    <option value='unlisted'>Unlisted</option>
                                    <option value='public'>Public</option>
                                </select>
                            )}
                            {playlist.script_id && (
                                <Badge
                                    variant='secondary'
                                    className='flex items-center gap-1 border-purple-500/40 text-purple-300/80'
                                >
                                    Scripted
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className='flex gap-2'>
                        <Button
                            onClick={() => navigate(`/playlists/${id}/theatre`)}
                            variant='secondary'
                        >
                            <Maximize2 className='h-4 w-4 mr-2' />
                            Full Screen
                        </Button>
                        {canShare && (
                            <Button
                                onClick={() => setShowShareModal(true)}
                                variant='secondary'
                            >
                                <Share2 className='h-4 w-4 mr-2' />
                                Share
                            </Button>
                        )}
                        {canCopy && (
                            <Button
                                onClick={() => setShowCopyModal(true)}
                                variant='secondary'
                            >
                                <Copy className='h-4 w-4 mr-2' />
                                Copy
                            </Button>
                        )}
                        <Button
                            onClick={handleLike}
                            variant={
                                playlist.is_liked ? 'primary' : 'secondary'
                            }
                            disabled={
                                likeMutation.isPending ||
                                unlikeMutation.isPending
                            }
                        >
                            <Heart
                                className={`h-4 w-4 mr-2 ${playlist.is_liked ? 'fill-current' : ''}`}
                            />
                            {playlist.is_liked ? 'Liked' : 'Like'}
                        </Button>
                    </div>
                </div>
            </div>

            {(isOwner || currentPermission) && (
                <div className='mb-8'>
                    <CollaboratorManager
                        playlistId={playlist.id}
                        isOwner={isOwner}
                        canManageCollaborators={canManageCollaborators}
                    />
                </div>
            )}

            {showShareModal && (
                <ShareModal
                    playlistId={playlist.id}
                    onClose={() => setShowShareModal(false)}
                />
            )}

            {showCopyModal && (
                <PlaylistCopyModal
                    initialValues={copyInitialValues}
                    isSubmitting={copyPlaylist.isPending}
                    onClose={() => setShowCopyModal(false)}
                    onSubmit={async values => {
                        if (!id) return;
                        try {
                            const copied = await copyPlaylist.mutateAsync({
                                id,
                                data: {
                                    title: values.title,
                                    description:
                                        values.description || undefined,
                                    cover_url: values.cover_url || undefined,
                                    visibility: values.visibility,
                                },
                            });
                            toast.success('Playlist copied');
                            setShowCopyModal(false);
                            navigate(`/playlists/${copied.id}`);
                        } catch {
                            toast.error('Failed to copy playlist');
                        }
                    }}
                />
            )}
        </div>
    );
}
