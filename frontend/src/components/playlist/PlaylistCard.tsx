import { Badge } from '@/components/ui';
import { formatTimestamp, cn } from '@/lib/utils';
import type { Playlist, PlaylistWithClips } from '@/types/playlist';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Lock, Users, Globe, Share2, Eye, Play } from 'lucide-react';
import { PlaylistThumbnail } from './PlaylistThumbnail';

interface PlaylistCardProps {
    playlist: (Playlist & { clip_count?: number }) | PlaylistWithClips;
    onShare?: (playlistId: string) => void;
}

export function PlaylistCard({ playlist, onShare }: PlaylistCardProps) {
    const navigate = useNavigate();

    const getVisibilityIcon = () => {
        switch (playlist.visibility) {
            case 'private':
                return <Lock className='h-3 w-3' />;
            case 'public':
                return <Globe className='h-3 w-3' />;
            case 'unlisted':
                return <Users className='h-3 w-3' />;
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

    const handleTheatreClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/playlists/${playlist.id}/theatre`);
    };

    const clipsData =
        (
            'clips' in playlist &&
            Array.isArray(playlist.clips) &&
            playlist.clips.length > 0
        ) ?
            playlist.clips
        : (
            'preview_clips' in playlist &&
            Array.isArray(playlist.preview_clips) &&
            playlist.preview_clips.length > 0
        ) ?
            playlist.preview_clips
        :   null;
    const previewClips = clipsData ? clipsData.slice(0, 4) : [];
    const hasClips = previewClips.length > 0;

    return (
        <Link
            to={`/playlists/${playlist.id}`}
            className='block bg-card border border-border rounded-xl hover:shadow-lg transition-all hover:border-primary-500/30 overflow-hidden group'
        >
            {/* Mosaic or Cover Image */}
            {hasClips && previewClips.length > 0 ?
                <div className='grid grid-cols-2 gap-1 p-2 relative group/mosaic'>
                    {previewClips.map((clip, idx) => (
                        <div
                            key={clip.id}
                            className={cn(
                                'aspect-video rounded-lg overflow-hidden bg-accent',
                                previewClips.length === 1 && 'col-span-2',
                                previewClips.length === 3 &&
                                    idx === 0 &&
                                    'col-span-2',
                            )}
                        >
                            {clip.thumbnail_url ?
                                <img
                                    src={clip.thumbnail_url}
                                    alt={clip.title}
                                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                                    loading='lazy'
                                />
                            :   <div className='w-full h-full bg-linear-to-br from-accent to-accent/50' />
                            }
                        </div>
                    ))}
                    {/* Theatre Mode Button Overlay */}
                    <button
                        onClick={handleTheatreClick}
                        className='absolute inset-0 bg-black/60 opacity-0 group-hover/mosaic:opacity-100 transition-opacity flex items-center justify-center'
                        aria-label='Play in theatre mode'
                    >
                        <div className='bg-primary-500 hover:bg-primary-600 rounded-full p-4 transition-colors'>
                            <Play className='h-8 w-8 text-white fill-white' />
                        </div>
                    </button>
                </div>
            :   <div className='aspect-video overflow-hidden relative group/cover'>
                    {playlist.cover_url ?
                        <img
                            src={playlist.cover_url}
                            alt={playlist.title}
                            className='w-full h-full object-cover'
                        />
                    :   <PlaylistThumbnail
                            clips={
                                'clips' in playlist ? playlist.clips : undefined
                            }
                            title={playlist.title}
                            className='w-full h-full'
                        />
                    }
                    {/* Theatre Mode Button Overlay */}
                    {playlist.clip_count !== undefined &&
                        playlist.clip_count > 0 && (
                            <button
                                onClick={handleTheatreClick}
                                className='absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center'
                                aria-label='Play in theatre mode'
                            >
                                <div className='bg-primary-500 hover:bg-primary-600 rounded-full p-4 transition-colors'>
                                    <Play className='h-8 w-8 text-white fill-white' />
                                </div>
                            </button>
                        )}
                </div>
            }

            {/* Content */}
            <div className='p-4'>
                {/* Title */}
                <h3 className='text-lg font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary-500 transition-colors'>
                    {playlist.title}
                </h3>

                {/* Description */}
                {playlist.description && (
                    <p className='text-sm text-muted-foreground mb-3 line-clamp-2'>
                        {playlist.description}
                    </p>
                )}

                {/* Metadata */}
                <div className='flex items-center justify-between text-xs text-muted-foreground mb-2'>
                    <div className='flex items-center gap-3'>
                        {/* Clip Count */}
                        {playlist.clip_count !== undefined && (
                            <span>{playlist.clip_count} clips</span>
                        )}

                        {/* Like Count */}
                        <div className='flex items-center gap-1'>
                            <Heart className='h-3 w-3' />
                            <span>{playlist.like_count}</span>
                        </div>

                        {/* View Count */}
                        {playlist.view_count > 0 && (
                            <div className='flex items-center gap-1'>
                                <Eye className='h-3 w-3' />
                                <span>{playlist.view_count}</span>
                            </div>
                        )}
                    </div>

                    {/* Visibility Badge */}
                    <Badge
                        variant='secondary'
                        className='flex items-center gap-1'
                    >
                        {getVisibilityIcon()}
                        <span>{getVisibilityLabel()}</span>
                    </Badge>
                </div>

                {playlist.has_processing_clips && (
                    <div className='mb-2'>
                        <Badge
                            variant='secondary'
                            className='text-[10px] uppercase tracking-wide border-amber-500/40 text-amber-300/80'
                        >
                            Processing…
                        </Badge>
                    </div>
                )}

                {playlist.script_id && (
                    <div className='mb-2'>
                        <Badge
                            variant='secondary'
                            className='text-[10px] uppercase tracking-wide border-purple-500/40 text-purple-300/80'
                        >
                            Scripted
                        </Badge>
                    </div>
                )}

                {/* Footer with Created At and Share Button */}
                <div className='flex items-center justify-between'>
                    <div
                        className='text-xs text-muted-foreground'
                        title={formatTimestamp(playlist.created_at).title}
                    >
                        Created {formatTimestamp(playlist.created_at).display}
                    </div>

                    {/* Share Button - only show for public/unlisted playlists or if onShare is provided */}
                    {onShare && playlist.visibility !== 'private' && (
                        <button
                            onClick={handleShareClick}
                            className='p-1.5 text-muted-foreground hover:text-primary-500 hover:bg-accent rounded transition-colors opacity-0 group-hover:opacity-100'
                            title='Share playlist'
                        >
                            <Share2 className='h-4 w-4' />
                        </button>
                    )}
                </div>
            </div>
        </Link>
    );
}
