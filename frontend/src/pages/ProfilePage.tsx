import { formatDistanceToNow } from 'date-fns';
import { useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { Card, CardBody, Container, Stack, Button, Skeleton } from '../components';
import { ClipCard } from '../components/clip/ClipCard';
import { ClipCardSkeleton } from '../components/clip/ClipCardSkeleton';
import {
    BadgeGrid,
    KarmaBreakdownChart,
    ReputationDisplay,
} from '../components/reputation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { KarmaBreakdown, UserReputation } from '../types/reputation';
import type { Clip } from '../types/clip';
import type { Comment } from '../types/comment';
import {
    fetchUserComments,
    fetchUserUpvotedClips,
    fetchUserDownvotedClips,
    reauthorizeTwitch,
} from '../lib/user-api';

type TabType = 'overview' | 'badges' | 'karma' | 'comments' | 'upvoted' | 'downvoted';

export function ProfilePage() {
    const { user, isAdmin } = useAuth();
    const toast = useToast();
    const [reputation, setReputation] = useState<UserReputation | null>(null);
    const [karmaBreakdown, setKarmaBreakdown] = useState<KarmaBreakdown | null>(
        null
    );
    const [loadingReputation, setLoadingReputation] = useState(true);
    const [reputationError, setReputationError] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    
    // Tab-specific data states
    const [comments, setComments] = useState<Comment[]>([]);
    const [upvotedClips, setUpvotedClips] = useState<Clip[]>([]);
    const [downvotedClips, setDownvotedClips] = useState<Clip[]>([]);
    const [loadingTabData, setLoadingTabData] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [reauthorizing, setReauthorizing] = useState(false);

    const fetchReputation = useCallback(async () => {
        if (!user) return;
        try {
            setLoadingReputation(true);
            setReputationError(false);
            const response = await fetch(`/api/v1/users/${user.id}/reputation`);
            if (response.ok) {
                const data = await response.json();
                setReputation(data);
            } else {
                setReputationError(true);
            }
        } catch (error) {
            console.error('Failed to fetch reputation:', error);
            setReputationError(true);
        } finally {
            setLoadingReputation(false);
        }
    }, [user]);
    
    const fetchKarmaBreakdown = useCallback(async () => {
        if (!user) return;
        try {
            const response = await fetch(
                `/api/v1/users/${user.id}/karma?limit=10`
            );
            if (response.ok) {
                const data = await response.json();
                setKarmaBreakdown(data.breakdown);
            }
        } catch (error) {
            console.error('Failed to fetch karma breakdown:', error);
        }
    }, [user]);

    const fetchTabData = useCallback(async (tab: TabType, page: number = 1) => {
        if (!user) return;
        
        setLoadingTabData(true);
        try {
            switch (tab) {
                case 'comments': {
                    const data = await fetchUserComments(user.id, page);
                    setComments(data.comments);
                    setHasMore(data.has_more);
                    break;
                }
                case 'upvoted': {
                    const data = await fetchUserUpvotedClips(user.id, page);
                    setUpvotedClips(data.clips);
                    setHasMore(data.has_more);
                    break;
                }
                case 'downvoted': {
                    const data = await fetchUserDownvotedClips(user.id, page);
                    setDownvotedClips(data.clips);
                    setHasMore(data.has_more);
                    break;
                }
            }
            setCurrentPage(page);
        } catch (error) {
            console.error(`Failed to fetch ${tab} data:`, error);
            toast.error(`Failed to load ${tab}`);
        } finally {
            setLoadingTabData(false);
        }
    }, [user, toast]);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        if (tab === 'comments' || tab === 'upvoted' || tab === 'downvoted') {
            fetchTabData(tab, 1);
        }
    };

    const handleReauthorize = async () => {
        try {
            setReauthorizing(true);
            const data = await reauthorizeTwitch();
            // Redirect to the auth URL
            window.location.href = data.auth_url;
        } catch (error) {
            console.error('Failed to reauthorize:', error);
            toast.error('Failed to initiate reauthorization');
            setReauthorizing(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchReputation();
            fetchKarmaBreakdown();
        }
    }, [user, fetchReputation, fetchKarmaBreakdown]);

    if (!user) {
        return null;
    }

    return (
        <Container className='py-8'>
            <div className='max-w-4xl mx-auto'>
                {/* Banned User Message */}
                {user.is_banned && (
                    <Card className='mb-6 border-red-500 bg-red-50 dark:bg-red-950'>
                        <CardBody>
                            <div className='flex items-start gap-4'>
                                <div className='flex-shrink-0'>
                                    <svg
                                        className='w-6 h-6 text-red-600'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className='text-lg font-semibold text-red-900 dark:text-red-100'>
                                        Account Restricted
                                    </h3>
                                    <p className='mt-1 text-red-800 dark:text-red-200'>
                                        Your account has been restricted from interacting with certain content. 
                                        Please contact support if you believe this is an error.
                                    </p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* Profile Header */}
                <Card className='mb-6'>
                    <CardBody>
                        <div className='flex items-start gap-6'>
                            {/* Avatar */}
                            <div className='shrink-0'>
                                {user.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt={user.username}
                                        className='border-border w-24 h-24 border-2 rounded-full'
                                    />
                                ) : (
                                    <div className='bg-primary-100 dark:bg-primary-900 text-primary-600 flex items-center justify-center w-24 h-24 text-3xl font-bold rounded-full'>
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* User Info */}
                            <div className='flex-1'>
                                <div className='flex items-start justify-between'>
                                    <div>
                                        <h1 className='mb-1 text-3xl font-bold'>
                                            {user.display_name}
                                        </h1>
                                        <p className='text-muted-foreground mb-2'>
                                            @{user.username}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleReauthorize}
                                        disabled={reauthorizing}
                                        variant='outline'
                                        size='sm'
                                    >
                                        {reauthorizing ? 'Redirecting...' : 'Reauthorize with Twitch'}
                                    </Button>
                                </div>

                                {user.bio && (
                                    <p className='text-foreground mb-4'>
                                        {user.bio}
                                    </p>
                                )}

                                <div className='flex flex-wrap gap-4 text-sm'>
                                    <div className='flex items-center gap-2'>
                                        <span className='text-muted-foreground'>
                                            Karma:
                                        </span>
                                        <span className='text-primary-600 font-semibold'>
                                            {user.karma_points}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <span className='text-muted-foreground'>
                                            Role:
                                        </span>
                                        <span className='font-semibold capitalize'>
                                            {user.role}
                                        </span>
                                    </div>
                                    {user.created_at && (
                                        <div className='flex items-center gap-2'>
                                            <span className='text-muted-foreground'>
                                                Joined:
                                            </span>
                                            <span className='font-semibold'>
                                                {formatDistanceToNow(
                                                    new Date(user.created_at),
                                                    { addSuffix: true }
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* RBAC Navigation */}
                                {isAdmin && (
                                    <div className='mt-4 pt-4 border-t border-border'>
                                        <p className='text-sm text-muted-foreground mb-2'>
                                            Admin Tools:
                                        </p>
                                        <div className='flex gap-3'>
                                            <Link
                                                to='/admin'
                                                className='text-sm text-primary-600 hover:text-primary-700 font-medium'
                                            >
                                                Dashboard
                                            </Link>
                                            <Link
                                                to='/admin/reports'
                                                className='text-sm text-primary-600 hover:text-primary-700 font-medium'
                                            >
                                                Reports
                                            </Link>
                                            <Link
                                                to='/admin/submissions'
                                                className='text-sm text-primary-600 hover:text-primary-700 font-medium'
                                            >
                                                Submissions
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Tabs Section */}
                <Card>
                    <CardBody>
                        <Stack
                            direction='vertical'
                            gap={4}
                        >
                            <div className='border-border border-b'>
                                <nav
                                    className='flex gap-4 overflow-x-auto'
                                    role='tablist'
                                >
                                    <button
                                        onClick={() => handleTabChange('overview')}
                                        className={`px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${
                                            activeTab === 'overview'
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                        role='tab'
                                        aria-selected={activeTab === 'overview'}
                                    >
                                        Overview
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('badges')}
                                        className={`px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${
                                            activeTab === 'badges'
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                        role='tab'
                                        aria-selected={activeTab === 'badges'}
                                    >
                                        Badges
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('karma')}
                                        className={`px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${
                                            activeTab === 'karma'
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                        role='tab'
                                        aria-selected={activeTab === 'karma'}
                                    >
                                        Karma
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('comments')}
                                        className={`px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${
                                            activeTab === 'comments'
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                        role='tab'
                                        aria-selected={activeTab === 'comments'}
                                    >
                                        Comments
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('upvoted')}
                                        className={`px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${
                                            activeTab === 'upvoted'
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                        role='tab'
                                        aria-selected={activeTab === 'upvoted'}
                                    >
                                        Upvoted
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('downvoted')}
                                        className={`px-4 py-2 border-b-2 font-semibold whitespace-nowrap ${
                                            activeTab === 'downvoted'
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                        role='tab'
                                        aria-selected={activeTab === 'downvoted'}
                                    >
                                        Downvoted
                                    </button>
                                </nav>
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'overview' && (
                                <div>
                                    {loadingReputation ? (
                                        <div className='space-y-4'>
                                            <Skeleton variant='rectangular' height={100} />
                                            <Skeleton variant='rectangular' height={200} />
                                        </div>
                                    ) : reputationError ? (
                                        <div className='py-12 text-center'>
                                            <p className='text-red-600 dark:text-red-400'>
                                                Failed to load reputation data
                                            </p>
                                        </div>
                                    ) : reputation ? (
                                        <ReputationDisplay
                                            reputation={reputation}
                                        />
                                    ) : (
                                        <div className='py-12 text-center'>
                                            <p className='text-muted-foreground'>
                                                Unable to load reputation data
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'badges' && (
                                <div>
                                    {loadingReputation ? (
                                        <div className='grid grid-cols-3 gap-4'>
                                            {[...Array(6)].map((_, i) => (
                                                <Skeleton key={i} variant='rectangular' height={120} />
                                            ))}
                                        </div>
                                    ) : reputation &&
                                      reputation.badges.length > 0 ? (
                                        <BadgeGrid
                                            badges={reputation.badges}
                                            columns={3}
                                        />
                                    ) : (
                                        <div className='py-12 text-center'>
                                            <p className='text-muted-foreground'>
                                                No badges earned yet. Keep
                                                contributing to earn badges!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'karma' && (
                                <div>
                                    {karmaBreakdown ? (
                                        <KarmaBreakdownChart
                                            breakdown={karmaBreakdown}
                                        />
                                    ) : (
                                        <div className='py-12 text-center'>
                                            <p className='text-muted-foreground'>
                                                Loading karma data...
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'comments' && (
                                <div>
                                    {loadingTabData ? (
                                        <div className='space-y-4'>
                                            {[...Array(5)].map((_, i) => (
                                                <Skeleton key={i} variant='rectangular' height={120} />
                                            ))}
                                        </div>
                                    ) : comments.length > 0 ? (
                                        <div className='space-y-4'>
                                            {comments.map((comment) => (
                                                <Card key={comment.id}>
                                                    <CardBody>
                                                        <Link
                                                            to={`/clips/${comment.clip_id}`}
                                                            className='text-sm text-primary-600 hover:underline mb-2 block'
                                                        >
                                                            View on clip
                                                        </Link>
                                                        <p className='text-foreground'>{comment.content}</p>
                                                        <div className='mt-2 text-sm text-muted-foreground'>
                                                            {comment.vote_score} points •{' '}
                                                            {formatDistanceToNow(new Date(comment.created_at), {
                                                                addSuffix: true,
                                                            })}
                                                        </div>
                                                    </CardBody>
                                                </Card>
                                            ))}
                                            {hasMore && (
                                                <div className='text-center pt-4'>
                                                    <Button
                                                        onClick={() => fetchTabData('comments', currentPage + 1)}
                                                        variant='outline'
                                                    >
                                                        Load More
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className='py-12 text-center'>
                                            <p className='text-muted-foreground'>
                                                No comments yet
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'upvoted' && (
                                <div>
                                    {loadingTabData ? (
                                        <div className='space-y-4'>
                                            {[...Array(5)].map((_, i) => (
                                                <ClipCardSkeleton key={i} />
                                            ))}
                                        </div>
                                    ) : upvotedClips.length > 0 ? (
                                        <div className='space-y-4'>
                                            {upvotedClips.map((clip) => (
                                                <ClipCard key={clip.id} clip={clip} />
                                            ))}
                                            {hasMore && (
                                                <div className='text-center pt-4'>
                                                    <Button
                                                        onClick={() => fetchTabData('upvoted', currentPage + 1)}
                                                        variant='outline'
                                                    >
                                                        Load More
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className='py-12 text-center'>
                                            <p className='text-muted-foreground'>
                                                No upvoted clips yet
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'downvoted' && (
                                <div>
                                    {loadingTabData ? (
                                        <div className='space-y-4'>
                                            {[...Array(5)].map((_, i) => (
                                                <ClipCardSkeleton key={i} />
                                            ))}
                                        </div>
                                    ) : downvotedClips.length > 0 ? (
                                        <div className='space-y-4'>
                                            {downvotedClips.map((clip) => (
                                                <ClipCard key={clip.id} clip={clip} />
                                            ))}
                                            {hasMore && (
                                                <div className='text-center pt-4'>
                                                    <Button
                                                        onClick={() => fetchTabData('downvoted', currentPage + 1)}
                                                        variant='outline'
                                                    >
                                                        Load More
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className='py-12 text-center'>
                                            <p className='text-muted-foreground'>
                                                No downvoted clips yet
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Stack>
                    </CardBody>
                </Card>
            </div>
        </Container>
    );
}
