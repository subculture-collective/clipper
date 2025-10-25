import { formatDistanceToNow } from 'date-fns';
import { useCallback, useState, useEffect } from 'react';

import { Card, CardBody, Container, Stack } from '../components';
import {
    BadgeGrid,
    KarmaBreakdownChart,
    ReputationDisplay,
} from '../components/reputation';
import { useAuth } from '../context/AuthContext';
import type { KarmaBreakdown, UserReputation } from '../types/reputation';

export function ProfilePage() {
    const { user } = useAuth();
    const [reputation, setReputation] = useState<UserReputation | null>(null);
    const [karmaBreakdown, setKarmaBreakdown] = useState<KarmaBreakdown | null>(
        null
    );
    const [loadingReputation, setLoadingReputation] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'karma'>(
        'overview'
    );

    const fetchReputation = useCallback(async () => {
        if (!user) return;
        try {
            const response = await fetch(`/api/v1/users/${user.id}/reputation`);
            if (response.ok) {
                const data = await response.json();
                setReputation(data);
            }
        } catch (error) {
            console.error('Failed to fetch reputation:', error);
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
                                <h1 className='mb-1 text-3xl font-bold'>
                                    {user.display_name}
                                </h1>
                                <p className='text-muted-foreground mb-2'>
                                    @{user.username}
                                </p>

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
                                    className='flex gap-4'
                                    role='tablist'
                                >
                                    <button
                                        onClick={() => setActiveTab('overview')}
                                        className={`px-4 py-2 border-b-2 font-semibold ${
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
                                        onClick={() => setActiveTab('badges')}
                                        className={`px-4 py-2 border-b-2 font-semibold ${
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
                                        onClick={() => setActiveTab('karma')}
                                        className={`px-4 py-2 border-b-2 font-semibold ${
                                            activeTab === 'karma'
                                                ? 'border-primary-500 text-primary-600'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                        role='tab'
                                        aria-selected={activeTab === 'karma'}
                                    >
                                        Karma
                                    </button>
                                </nav>
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'overview' && (
                                <div>
                                    {loadingReputation ? (
                                        <div className='py-12 text-center'>
                                            <p className='text-muted-foreground'>
                                                Loading reputation...
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
                                        <div className='py-12 text-center'>
                                            <p className='text-muted-foreground'>
                                                Loading badges...
                                            </p>
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
                        </Stack>
                    </CardBody>
                </Card>
            </div>
        </Container>
    );
}
