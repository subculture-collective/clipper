import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LeaderboardSummary, LeaderboardTable, } from '../components/reputation/LeaderboardTable';
import { useAuth } from '../context/AuthContext';
export default function LeaderboardPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const type = searchParams.get('type') || 'karma';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 50;
    const fetchLeaderboard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/v1/leaderboards/${type}?page=${page}&limit=${limit}`);
            // Handle non-OK responses
            if (!response.ok) {
                let errorMessage = 'Failed to fetch leaderboard';
                // Try to parse JSON error response
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                }
                catch {
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
        }
        catch (err) {
            console.error('Leaderboard fetch error:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
        finally {
            setLoading(false);
        }
    }, [type, page]);
    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);
    const handleTypeChange = (newType) => {
        setSearchParams({ type: newType, page: '1' });
    };
    const handlePageChange = (newPage) => {
        setSearchParams({ type, page: newPage.toString() });
    };
    return (_jsxs("div", { className: 'max-w-6xl mx-auto px-4 py-8', children: [_jsxs("div", { className: 'mb-8', children: [_jsx("h1", { className: 'text-4xl font-bold text-white mb-2', children: "Leaderboards" }), _jsx("p", { className: 'text-gray-400', children: "Top contributors in the Clipper community" })] }), _jsxs("div", { className: 'flex gap-2 mb-6', children: [_jsx("button", { onClick: () => handleTypeChange('karma'), className: `px-6 py-3 rounded-lg font-semibold transition-colors ${type === 'karma'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-750'}`, children: "\uD83C\uDFC6 Karma" }), _jsx("button", { onClick: () => handleTypeChange('engagement'), className: `px-6 py-3 rounded-lg font-semibold transition-colors ${type === 'engagement'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-750'}`, children: "\u26A1 Engagement" })] }), loading && (_jsx("div", { className: 'text-center py-12', children: _jsx("div", { className: 'text-gray-400', children: "Loading leaderboard..." }) })), error && (_jsxs("div", { className: 'bg-red-900/20 border border-red-500 rounded-lg p-6 mb-6', children: [_jsx("div", { className: 'text-red-400 mb-4', children: error }), _jsx("button", { onClick: fetchLeaderboard, className: 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors', children: "Retry" })] })), !loading && !error && leaderboard && (_jsxs(_Fragment, { children: [page === 1 && (_jsx(LeaderboardSummary, { entries: leaderboard.entries, type: type })), _jsx(LeaderboardTable, { entries: leaderboard.entries, type: type, currentUserId: user?.id }), leaderboard.entries.length === limit && (_jsxs("div", { className: 'flex justify-center gap-4 mt-6', children: [_jsx("button", { onClick: () => handlePageChange(page - 1), disabled: page === 1, className: 'px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-750 transition-colors', children: "Previous" }), _jsxs("div", { className: 'px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold', children: ["Page ", page] }), _jsx("button", { onClick: () => handlePageChange(page + 1), disabled: leaderboard.entries.length < limit, className: 'px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-750 transition-colors', children: "Next" })] }))] }))] }));
}
