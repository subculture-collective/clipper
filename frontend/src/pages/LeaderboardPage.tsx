import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    LeaderboardSummary,
    LeaderboardTable,
} from '../components/reputation/LeaderboardTable';
import { LeaderboardSkeleton, EmptyStateWithAction } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { LeaderboardResponse, LeaderboardType } from '../types/reputation';

export default function LeaderboardPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const type = (searchParams.get('type') as LeaderboardType) || 'karma';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 50;

    const fetchLeaderboard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/v1/leaderboards/${type}?page=${page}&limit=${limit}`
            );

            // Handle non-OK responses
            if (!response.ok) {
                let errorMessage = 'Failed to fetch leaderboard';

                // Try to parse JSON error response
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch {
                    // If JSON parsing fails, use status text
                    errorMessage = response.statusText || errorMessage;
                }

                throw new Error(errorMessage);
            }

            // Ensure response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format from server');
            }

            const data = await response.json();
            setLeaderboard(data);
        } catch (err) {
            console.error('Leaderboard fetch error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [type, page]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    const handleTypeChange = (newType: LeaderboardType) => {
        setSearchParams({ type: newType, page: '1' });
    };

    const handlePageChange = (newPage: number) => {
        setSearchParams({ type, page: newPage.toString() });
    };

    return (
        <div className='max-w-6xl mx-auto px-4 py-8'>
            {/* Header */}
            <div className='mb-8'>
                <h1 className='text-4xl font-bold text-white mb-2'>
                    Leaderboards
                </h1>
                <p className='text-gray-400'>
                    Top contributors in the clpr community
                </p>
            </div>

            {/* Type Selector */}
            <div className='flex gap-2 mb-6'>
                <button
                    onClick={() => handleTypeChange('karma')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                        type === 'karma'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                    }`}
                >
                    🏆 Karma
                </button>
                <button
                    onClick={() => handleTypeChange('engagement')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                        type === 'engagement'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
                    }`}
                >
                    ⚡ Engagement
                </button>
            </div>

            {/* Loading State */}
            {loading && (
                <LeaderboardSkeleton />
            )}

            {/* Error State */}
            {error && (
                <EmptyStateWithAction
                    icon={
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    title="Failed to load leaderboard"
                    description={error}
                    primaryAction={{
                        label: "Try Again",
                        onClick: fetchLeaderboard
                    }}
                    secondaryAction={{
                        label: "Go Home",
                        href: "/"
                    }}
                />
            )}

            {/* Leaderboard Content */}
            {!loading && !error && leaderboard && (
                <>
                    {/* Top 3 Summary */}
                    {page === 1 && (
                        <LeaderboardSummary
                            entries={leaderboard.entries}
                            type={type}
                        />
                    )}

                    {/* Leaderboard Table */}
                    <LeaderboardTable
                        entries={leaderboard.entries}
                        type={type}
                        currentUserId={user?.id}
                    />

                    {/* Pagination */}
                    {leaderboard.entries.length === limit && (
                        <div className='flex justify-center gap-4 mt-6'>
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className='px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-750 transition-colors'
                            >
                                Previous
                            </button>
                            <div className='px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold'>
                                Page {page}
                            </div>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={leaderboard.entries.length < limit}
                                className='px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-750 transition-colors'
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
