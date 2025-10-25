import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    LeaderboardSummary,
    LeaderboardTable,
} from '../components/reputation/LeaderboardTable';
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

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            const data = await response.json();
            setLeaderboard(data);
        } catch (err) {
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
                    Top contributors in the Clipper community
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
                <div className='text-center py-12'>
                    <div className='text-gray-400'>Loading leaderboard...</div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className='bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6'>
                    <div className='text-red-400'>{error}</div>
                </div>
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
