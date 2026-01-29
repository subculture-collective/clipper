import { useParams, Link } from 'react-router-dom';
import {
    Container,
    Spinner,
    CommentSection,
    SEO,
    VideoPlayer,
} from '../components';
import {
    useClipById,
    useUser,
    useClipVote,
    useClipFavorite,
    useIsAuthenticated,
    useToast,
    useShare,
} from '../hooks';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function ClipDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: clip, isLoading, error } = useClipById(id || '');
    const user = useUser();
    const isAuthenticated = useIsAuthenticated();
    const voteMutation = useClipVote();
    const favoriteMutation = useClipFavorite();
    const toast = useToast();
    const { share } = useShare();
    const [showShareMenu, setShowShareMenu] = useState(false);
    const isVoting = voteMutation.isPending;
    const isBanned = user?.is_banned;
    const banReason = user?.ban_reason;

    const clipUrl = clip ? `${window.location.origin}/clip/${clip.id}` : '';
    const shareTitle = clip ? clip.title : 'Check out this clip';
    const shareText =
        clip ?
            `${clip.title} - Clipped from ${clip.broadcaster_name}'s stream`
        :   '';
    // Show ban message if user is banned (before clip loading checks)
    if (isBanned) {
        return (
            <>
                <SEO title='Banned' noindex />
                <Container className='py-8'>
                    <div className='rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6 my-8'>
                        <h2 className='text-lg font-bold text-red-800 dark:text-red-400 mb-2'>
                            You are banned
                        </h2>
                        <p className='text-red-700 dark:text-red-300'>
                            You are banned and cannot interact with clips
                            {banReason ? `: ${banReason}` : ''}.
                        </p>
                    </div>
                </Container>
            </>
        );
    }

    const handleNativeShare = async () => {
        const clipUrl = `${window.location.origin}/clip/${clip?.id}`;
        await share({
            title: clip?.title || 'Check out this clip',
            text: `${clip?.title} - Clipped from ${clip?.broadcaster_name}'s stream`,
            url: clipUrl,
        });
        setShowShareMenu(false);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(clipUrl);
            toast.success('Link copied to clipboard!');
            setShowShareMenu(false);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const handleShareToTwitter = () => {
        const text = encodeURIComponent(shareText);
        const url = encodeURIComponent(clipUrl);
        window.open(
            `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
            '_blank',
            'noopener,noreferrer',
        );
        setShowShareMenu(false);
    };

    const handleShareToReddit = () => {
        const title = encodeURIComponent(shareTitle);
        const url = encodeURIComponent(clipUrl);
        window.open(
            `https://reddit.com/submit?title=${title}&url=${url}`,
            '_blank',
            'noopener,noreferrer',
        );
        setShowShareMenu(false);
    };

    const handleVote = (voteType: 1 | -1) => {
        if (!isAuthenticated) {
            toast.info('Please log in to vote on clips');
            return;
        }
        if (isBanned) {
            toast.error('You are banned and cannot interact with clips');
            return;
        }
        if (!clip || isVoting) return;
        if (clip.user_vote === voteType) return;
        voteMutation.mutate({ clip_id: clip.id, vote_type: voteType });
    };

    const handleFavorite = () => {
        if (!isAuthenticated) {
            toast.info('Please log in to favorite clips');
            return;
        }
        if (isBanned) {
            toast.error('You are banned and cannot interact with clips');
            return;
        }
        if (!clip) return;
        favoriteMutation.mutate({ clip_id: clip.id });
    };

    if (isLoading) {
        return (
            <>
                <SEO title='Loading Clip...' noindex />
                <Container className='py-8'>
                    <div className='flex justify-center items-center min-h-[400px]'>
                        <Spinner size='lg' />
                    </div>
                </Container>
            </>
        );
    }

    if (error) {
        return (
            <>
                <SEO title='Error Loading Clip' noindex />
                <Container className='py-8'>
                    <div className='text-center py-12'>
                        <h2 className='text-2xl font-bold text-error-600 mb-4'>
                            Error Loading Clip
                        </h2>
                        <p className='text-muted-foreground'>{error.message}</p>
                    </div>
                </Container>
            </>
        );
    }

    if (!clip) {
        return (
            <>
                <SEO title='Clip Not Found' noindex />
                <Container className='py-8'>
                    <div className='text-center py-12'>
                        <h2 className='text-2xl font-bold mb-4'>
                            Clip Not Found
                        </h2>
                        <p className='text-muted-foreground'>
                            The clip you're looking for doesn't exist.
                        </p>
                    </div>
                </Container>
            </>
        );
    }

    // Format duration for display
    const formatDuration = (seconds: number | null | undefined) => {
        if (!seconds) return '';
        return `PT${Math.round(seconds)}S`;
    };

    // Generate rich description
    const description = `Watch "${clip.title}" by ${clip.creator_name} on ${
        clip.broadcaster_name
    }'s channel${
        clip.game_name ? ` playing ${clip.game_name}` : ''
    }. ${clip.view_count.toLocaleString()} views, ${clip.vote_score} votes.`;

    // Schema.org VideoObject structured data
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: clip.title,
        description: description,
        thumbnailUrl: clip.thumbnail_url || '',
        uploadDate: clip.created_at,
        duration: formatDuration(clip.duration),
        embedUrl: clip.embed_url,
        contentUrl: clip.twitch_clip_url,
        interactionStatistic: [
            {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/WatchAction',
                userInteractionCount: clip.view_count,
            },
            {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/LikeAction',
                userInteractionCount: clip.vote_score > 0 ? clip.vote_score : 0,
            },
            {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/CommentAction',
                userInteractionCount: clip.comment_count,
            },
        ],
        creator: {
            '@type': 'Person',
            name: clip.creator_name,
        },
    };

    return (
        <>
            <SEO
                title={clip.title}
                description={description}
                canonicalUrl={`/clip/${clip.id}`}
                ogType='video.other'
                ogImage={clip.thumbnail_url || undefined}
                twitterCard='player'
                structuredData={structuredData}
            />
            <Container className='py-4 xs:py-6 md:py-8'>
                <div className='max-w-4xl mx-auto'>
                    <div className='mb-4 xs:mb-6'>
                        <h1 className='text-2xl xs:text-3xl font-bold mb-2'>
                            {clip.title}
                        </h1>
                        {isBanned && (
                            <div
                                role='alert'
                                className='mb-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-300'
                            >
                                You are banned and cannot interact with clips
                                {banReason ? `: ${banReason}` : ''}.
                            </div>
                        )}
                        <div className='flex flex-wrap gap-2 xs:gap-4 text-xs xs:text-sm text-muted-foreground'>
                            <span className='font-medium'>
                                <Link
                                    to={`/broadcaster/${
                                        clip.broadcaster_id ||
                                        clip.broadcaster_name
                                    }`}
                                    className='hover:text-foreground transition-colors'
                                >
                                    {clip.broadcaster_name}
                                </Link>
                            </span>
                            {clip.game_name && (
                                <>
                                    <span className='hidden xs:inline'>•</span>
                                    <span>
                                        <Link
                                            to={`/game/${clip.game_id}`}
                                            className='hover:text-foreground transition-colors'
                                        >
                                            {clip.game_name}
                                        </Link>
                                    </span>
                                </>
                            )}
                            {clip.submitted_by && (
                                <>
                                    <span className='hidden xs:inline'>•</span>
                                    <span>
                                        Submitted by{' '}
                                        <Link
                                            to={`/user/${clip.submitted_by.username}`}
                                            className='hover:text-foreground transition-colors'
                                        >
                                            {clip.submitted_by.display_name}
                                        </Link>
                                    </span>
                                </>
                            )}
                            {clip.creator_id &&
                                clip.creator_id.trim() !== '' &&
                                clip.creator_name && (
                                    <>
                                        <span className='hidden xs:inline'>
                                            •
                                        </span>
                                        <span>
                                            Clipped by{' '}
                                            <Link
                                                to={`/user/${clip.creator_id}`}
                                                className='hover:text-foreground transition-colors'
                                            >
                                                {clip.creator_name}
                                            </Link>
                                        </span>
                                    </>
                                )}
                            <span className='hidden xs:inline'>•</span>
                            <span>
                                {clip.view_count.toLocaleString()} views
                            </span>
                            <span className='hidden xs:inline'>•</span>
                            <span>{clip.vote_score} votes</span>
                        </div>
                    </div>

                    <div className='mb-4 xs:mb-6'>
                        <VideoPlayer
                            clipId={clip.id}
                            title={clip.title}
                            embedUrl={clip.embed_url}
                        />
                    </div>

                    <div className='grid grid-cols-1 xs:grid-cols-3 gap-3 xs:gap-4 mb-4 xs:mb-6'>
                        <button
                            onClick={() => handleVote(1)}
                            disabled={!isAuthenticated || isVoting || isBanned}
                            className={cn(
                                'px-4 py-3 rounded-md transition-colors touch-target',
                                clip.user_vote === 1 ?
                                    'bg-green-600 text-white hover:bg-green-700'
                                :   'bg-primary-500 text-white hover:bg-primary-600',
                                (!isAuthenticated || isVoting || isBanned) &&
                                    'opacity-50 cursor-not-allowed hover:bg-primary-500',
                            )}
                            aria-label={
                                isAuthenticated ?
                                    `Upvote, ${clip.vote_score} votes`
                                :   'Log in to upvote'
                            }
                            aria-disabled={
                                !isAuthenticated || isVoting || isBanned
                            }
                            title={
                                isAuthenticated ? undefined : 'Log in to vote'
                            }
                        >
                            Upvote ({clip.vote_score})
                        </button>
                        <button
                            className={cn(
                                'px-4 py-3 border border-border rounded-md hover:bg-muted transition-colors touch-target',
                                isBanned && 'opacity-50 cursor-not-allowed',
                            )}
                            aria-label={`Comment, ${clip.comment_count} comments`}
                            onClick={() => {
                                if (isBanned) return;
                                document
                                    .getElementById('comments')
                                    ?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            disabled={isBanned}
                        >
                            Comment ({clip.comment_count})
                        </button>
                        <button
                            onClick={() => handleFavorite()}
                            disabled={!isAuthenticated || isBanned}
                            className={cn(
                                'px-4 py-3 rounded-md transition-colors touch-target',
                                clip.is_favorited ?
                                    'bg-red-500 text-white hover:bg-red-600'
                                :   'border border-border hover:bg-muted',
                                (!isAuthenticated || isBanned) &&
                                    'opacity-50 cursor-not-allowed hover:bg-muted',
                            )}
                            aria-label={
                                !isAuthenticated ? 'Log in to favorite'
                                : clip.is_favorited ?
                                    `Remove from favorites, ${clip.favorite_count} favorites`
                                :   `Add to favorites, ${clip.favorite_count} favorites`

                            }
                            aria-disabled={!isAuthenticated || isBanned}
                            title={
                                isAuthenticated ? undefined : (
                                    'Log in to favorite'
                                )
                            }
                        >
                            {clip.is_favorited ? '❤️ ' : ''}Favorite (
                            {clip.favorite_count})
                        </button>
                    </div>

                    <button
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className='w-full xs:w-auto px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors text-sm xs:text-base'
                        aria-label='Share this clip'
                    >
                        📤 Share
                    </button>

                    {showShareMenu && (
                        <div className='mt-2 p-3 border border-border rounded-md bg-card space-y-2'>
                            <button
                                onClick={handleCopyLink}
                                className='w-full px-4 py-2 text-left hover:bg-muted rounded transition-colors text-sm'
                            >
                                📋 Copy Link
                            </button>
                            {navigator.share && (
                                <button
                                    onClick={handleNativeShare}
                                    className='w-full px-4 py-2 text-left hover:bg-muted rounded transition-colors text-sm'
                                >
                                    📤 Share via...
                                </button>
                            )}
                            <button
                                onClick={handleShareToTwitter}
                                className='w-full px-4 py-2 text-left hover:bg-muted rounded transition-colors text-sm'
                            >
                                🐦 Share on Twitter/X
                            </button>
                            <button
                                onClick={handleShareToReddit}
                                className='w-full px-4 py-2 text-left hover:bg-muted rounded transition-colors text-sm'
                            >
                                🔴 Share on Reddit
                            </button>
                        </div>
                    )}

                    {clip.game_name && (
                        <div className='mb-4'>
                            <span className='text-xs xs:text-sm text-muted-foreground'>
                                Game:{' '}
                            </span>
                            <span className='font-semibold text-sm xs:text-base'>
                                {clip.game_name}
                            </span>
                        </div>
                    )}

                    <div className='text-xs xs:text-sm text-muted-foreground space-y-1'>
                        <p>Broadcaster: {clip.broadcaster_name}</p>
                        <p>
                            Created:{' '}
                            {new Date(clip.created_at).toLocaleDateString(
                                'en-US',
                                {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                },
                            )}
                        </p>
                    </div>

                    <div
                        className='mt-8 border-t border-border pt-8'
                        id='comments'
                    >
                        <CommentSection
                            clipId={clip.id}
                            currentUserId={user?.id}
                            isAdmin={user?.role === 'admin'}
                            isBanned={!!isBanned}
                            banReason={banReason}
                        />
                    </div>
                </div>
            </Container>
        </>
    );
}
