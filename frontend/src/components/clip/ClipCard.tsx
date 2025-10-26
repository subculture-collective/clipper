import { TagList } from '@/components/tag/TagList';
import { Badge } from '@/components/ui';
import { useClipFavorite, useClipVote } from '@/hooks/useClips';
import { useIsAuthenticated, useToast } from '@/hooks';
import { cn } from '@/lib/utils';
import type { Clip } from '@/types/clip';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { TwitchEmbed } from './TwitchEmbed';

interface ClipCardProps {
    clip: Clip;
}

export function ClipCard({ clip }: ClipCardProps) {
    const isAuthenticated = useIsAuthenticated();
    const voteMutation = useClipVote();
    const favoriteMutation = useClipFavorite();
    const toast = useToast();

    const handleVote = (voteType: 1 | -1) => {
        if (!isAuthenticated) {
            toast.info('Please log in to vote on clips');
            return;
        }
        voteMutation.mutate({ clip_id: clip.id, vote_type: voteType });
    };

    const handleFavorite = () => {
        if (!isAuthenticated) {
            toast.info('Please log in to favorite clips');
            return;
        }
        favoriteMutation.mutate({ clip_id: clip.id });
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    const voteColor =
        clip.vote_score > 0
            ? 'text-green-600 dark:text-green-400'
            : clip.vote_score < 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-muted-foreground';

    return (
        <div className='bg-card border-border rounded-xl hover:shadow-lg transition-shadow border'>
            <div className='flex gap-4 p-4'>
                {/* Vote sidebar */}
                <div className='shrink-0 flex flex-col items-center w-10 gap-2'>
                    <button
                        onClick={() => handleVote(1)}
                        disabled={!isAuthenticated}
                        className={cn(
                            'w-8 h-8 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors',
                            clip.user_vote === 1 &&
                                'text-green-600 dark:text-green-400',
                            !isAuthenticated &&
                                'opacity-50 cursor-not-allowed hover:bg-transparent'
                        )}
                        aria-label={isAuthenticated ? 'Upvote' : 'Log in to upvote'}
                        aria-disabled={!isAuthenticated}
                        title={isAuthenticated ? 'Upvote' : 'Log in to vote'}
                    >
                        <svg
                            className='w-6 h-6'
                            fill='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path d='M12 4l8 8h-6v8h-4v-8H4z' />
                        </svg>
                    </button>

                    <span className={cn('text-sm font-bold', voteColor)}>
                        {formatNumber(clip.vote_score)}
                    </span>

                    <button
                        onClick={() => handleVote(-1)}
                        disabled={!isAuthenticated}
                        className={cn(
                            'w-8 h-8 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors',
                            clip.user_vote === -1 &&
                                'text-red-600 dark:text-red-400',
                            !isAuthenticated &&
                                'opacity-50 cursor-not-allowed hover:bg-transparent'
                        )}
                        aria-label={isAuthenticated ? 'Downvote' : 'Log in to downvote'}
                        aria-disabled={!isAuthenticated}
                        title={isAuthenticated ? 'Downvote' : 'Log in to vote'}
                    >
                        <svg
                            className='w-6 h-6'
                            fill='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path d='M12 20l-8-8h6V4h4v8h6z' />
                        </svg>
                    </button>
                </div>

                {/* Main content */}
                <div className='flex-1 min-w-0'>
                    {/* Thumbnail/Embed */}
                    <div className='relative mb-3'>
                        <TwitchEmbed
                            clipId={clip.twitch_clip_id}
                            thumbnailUrl={clip.thumbnail_url}
                            title={clip.title}
                        />

                        {/* Duration badge */}
                        {clip.duration && (
                            <div className='bottom-2 right-2 absolute px-2 py-1 text-xs font-medium text-white bg-black bg-opacity-75 rounded'>
                                {formatDuration(clip.duration)}
                            </div>
                        )}

                        {/* NSFW badge */}
                        {clip.is_nsfw && (
                            <div className='top-2 left-2 absolute'>
                                <Badge variant='error'>NSFW</Badge>
                            </div>
                        )}

                        {/* Featured badge */}
                        {clip.is_featured && (
                            <div className='top-2 right-2 absolute'>
                                <Badge variant='default'>Featured</Badge>
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <Link
                        to={`/clip/${clip.id}`}
                        className='hover:text-primary-600 dark:hover:text-primary-400 block mb-2 transition-colors'
                    >
                        <h3 className='line-clamp-2 text-lg font-semibold'>
                            {clip.title}
                        </h3>
                    </Link>

                    {/* Metadata */}
                    <div className='text-muted-foreground flex flex-wrap gap-2 mb-3 text-sm'>
                        <Link
                            to={`/creator/${clip.creator_id}`}
                            className='hover:text-foreground transition-colors'
                        >
                            {clip.creator_name}
                        </Link>
                        <span>•</span>
                        {clip.game_name && (
                            <>
                                <Link
                                    to={`/game/${clip.game_id}`}
                                    className='hover:text-foreground transition-colors'
                                >
                                    {clip.game_name}
                                </Link>
                                <span>•</span>
                            </>
                        )}
                        <span>
                            {formatDistanceToNow(new Date(clip.created_at), {
                                addSuffix: true,
                            })}
                        </span>
                    </div>

                    {/* Tags */}
                    <div className='mb-3'>
                        <TagList
                            clipId={clip.id}
                            maxVisible={5}
                        />
                    </div>

                    {/* Action bar */}
                    <div className='flex flex-wrap items-center gap-4 text-sm'>
                        <Link
                            to={`/clip/${clip.id}#comments`}
                            className='text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors'
                        >
                            <svg
                                className='w-5 h-5'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
                                />
                            </svg>
                            <span>
                                {formatNumber(clip.comment_count)} comments
                            </span>
                        </Link>

                        <button
                            onClick={handleFavorite}
                            disabled={!isAuthenticated}
                            className={cn(
                                'flex items-center gap-1 transition-colors',
                                clip.is_favorited
                                    ? 'text-red-500 hover:text-red-400'
                                    : 'text-muted-foreground hover:text-foreground',
                                !isAuthenticated &&
                                    'opacity-50 cursor-not-allowed hover:bg-transparent'
                            )}
                            aria-label={
                                !isAuthenticated
                                    ? 'Log in to favorite'
                                    : clip.is_favorited
                                    ? 'Remove from favorites'
                                    : 'Add to favorites'
                            }
                            aria-disabled={!isAuthenticated}
                            title={!isAuthenticated ? 'Log in to favorite' : undefined}
                        >
                            <svg
                                className='w-5 h-5'
                                fill={
                                    clip.is_favorited ? 'currentColor' : 'none'
                                }
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                                />
                            </svg>
                            <span>{formatNumber(clip.favorite_count)}</span>
                        </button>

                        <button
                            className='text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors'
                            onClick={() => {
                                navigator.clipboard.writeText(
                                    `${window.location.origin}/clip/${clip.id}`
                                );
                            }}
                            aria-label='Share'
                        >
                            <svg
                                className='w-5 h-5'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z'
                                />
                            </svg>
                            <span>Share</span>
                        </button>

                        <span className='text-muted-foreground flex items-center gap-1'>
                            <svg
                                className='w-5 h-5'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                                />
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                                />
                            </svg>
                            <span>{formatNumber(clip.view_count)}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
