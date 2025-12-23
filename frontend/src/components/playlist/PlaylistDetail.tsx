import { Badge, Button } from '@/components/ui';
import { ClipCard } from '@/components/clip/ClipCard';
import { useToast } from '@/hooks';
import { usePlaylist, useLikePlaylist, useUnlikePlaylist } from '@/hooks/usePlaylist';
import { useParams } from 'react-router-dom';
import { Heart, Lock, Globe, Users } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';

export function PlaylistDetail() {
    const { id } = useParams<{ id: string }>();
    const { data, isLoading } = usePlaylist(id || '', 1, 20);
    const likeMutation = useLikePlaylist();
    const unlikeMutation = useUnlikePlaylist();
    const toast = useToast();

    if (!id) {
        return <div className="text-center py-12 text-zinc-500">Playlist not found</div>;
    }

    if (isLoading) {
        return <div className="text-center py-12 text-zinc-500">Loading...</div>;
    }

    if (!data?.data) {
        return <div className="text-center py-12 text-zinc-500">Playlist not found</div>;
    }

    const playlist = data.data;

    const handleLike = async () => {
        try {
            if (playlist.is_liked) {
                await unlikeMutation.mutateAsync(id);
                toast.success('Playlist unliked');
            } else {
                await likeMutation.mutateAsync(id);
                toast.success('Playlist liked');
            }
        } catch {
            toast.error('Failed to update like status');
        }
    };

    const getVisibilityIcon = () => {
        switch (playlist.visibility) {
            case 'private':
                return <Lock className="h-4 w-4" />;
            case 'public':
                return <Globe className="h-4 w-4" />;
            case 'unlisted':
                return <Users className="h-4 w-4" />;
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
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                {/* Cover Image */}
                <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg mb-6 flex items-center justify-center">
                    {playlist.cover_url ? (
                        <img
                            src={playlist.cover_url}
                            alt={playlist.title}
                            className="w-full h-full object-cover rounded-lg"
                        />
                    ) : (
                        <div className="text-zinc-600 text-6xl">🎵</div>
                    )}
                </div>

                {/* Title and Metadata */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-zinc-100 mb-2">{playlist.title}</h1>

                        {playlist.description && (
                            <p className="text-zinc-400 mb-4">{playlist.description}</p>
                        )}

                        {/* Creator Info */}
                        {playlist.creator && (
                            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-3">
                                <span>Created by</span>
                                <span className="text-zinc-300 font-medium">
                                    {playlist.creator.display_name}
                                </span>
                                <span>•</span>
                                <span>{formatTimestamp(playlist.created_at)}</span>
                            </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-zinc-500">
                            <span>{playlist.clip_count} clips</span>
                            <div className="flex items-center gap-1">
                                <Heart className="h-4 w-4" />
                                <span>{playlist.like_count}</span>
                            </div>
                            <Badge variant="outline" className="flex items-center gap-1">
                                {getVisibilityIcon()}
                                <span>{getVisibilityLabel()}</span>
                            </Badge>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleLike}
                            variant={playlist.is_liked ? 'default' : 'outline'}
                            disabled={likeMutation.isPending || unlikeMutation.isPending}
                        >
                            <Heart className={`h-4 w-4 mr-2 ${playlist.is_liked ? 'fill-current' : ''}`} />
                            {playlist.is_liked ? 'Liked' : 'Like'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Clips */}
            <div>
                <h2 className="text-xl font-bold text-zinc-100 mb-4">Clips</h2>
                {!playlist.clips || playlist.clips.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        This playlist doesn't have any clips yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {playlist.clips.map((clip) => (
                            <ClipCard key={clip.id} clip={clip} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
