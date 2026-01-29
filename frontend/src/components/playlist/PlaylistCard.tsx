import { Badge } from '@/components/ui';
import { formatTimestamp } from '@/lib/utils';
import type { Playlist } from '@/types/playlist';
import { Link } from 'react-router-dom';
import { Heart, Lock, Users, Globe, Share2, Eye } from 'lucide-react';

interface PlaylistCardProps {
    playlist: Playlist & { clip_count?: number };
    onShare?: (playlistId: string) => void;
}

export function PlaylistCard({ playlist, onShare }: PlaylistCardProps) {
    const getVisibilityIcon = () => {
        switch (playlist.visibility) {
            case 'private':
                return <Lock className="h-3 w-3" />;
            case 'public':
                return <Globe className="h-3 w-3" />;
            case 'unlisted':
                return <Users className="h-3 w-3" />;
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

    const handleShareClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onShare) {
            onShare(playlist.id);
        }
    };

    return (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 hover:border-purple-500/50 transition-all overflow-hidden relative group">
            <Link to={`/playlists/${playlist.id}`} className="block">
                {/* Cover Image */}
                <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-blue-900/20 flex items-center justify-center">
                    {playlist.cover_url ? (
                        <img
                            src={playlist.cover_url}
                            alt={playlist.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-zinc-600 text-4xl">🎵</div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-zinc-100 mb-1 truncate">
                        {playlist.title}
                    </h3>

                    {/* Description */}
                    {playlist.description && (
                        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                            {playlist.description}
                        </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                        <div className="flex items-center gap-3">
                            {/* Clip Count */}
                            {playlist.clip_count !== undefined && (
                                <span>{playlist.clip_count} clips</span>
                            )}

                            {/* Like Count */}
                            <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                <span>{playlist.like_count}</span>
                            </div>

                            {/* View Count */}
                            {playlist.view_count > 0 && (
                                <div className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    <span>{playlist.view_count}</span>
                                </div>
                            )}
                        </div>

                        {/* Visibility Badge */}
                        <Badge variant="outline" className="flex items-center gap-1">
                            {getVisibilityIcon()}
                            <span>{getVisibilityLabel()}</span>
                        </Badge>
                    </div>

                    {/* Footer with Created At and Share Button */}
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-600">
                            Created {formatTimestamp(playlist.created_at)}
                        </div>

                        {/* Share Button - only show for public/unlisted playlists or if onShare is provided */}
                        {onShare && playlist.visibility !== 'private' && (
                            <button
                                onClick={handleShareClick}
                                className="p-1.5 text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Share playlist"
                            >
                                <Share2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    );
}
