import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { RankBadge } from './ReputationDisplay';
const rankMedals = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
};
export function LeaderboardTable({ entries, type, currentUserId }) {
    if (entries.length === 0) {
        return (_jsx("div", { className: "py-12 text-center", children: _jsx("div", { className: "text-lg text-gray-400", children: "No leaderboard data available" }) }));
    }
    return (_jsx("div", { className: "overflow-hidden bg-gray-800 rounded-lg", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-900", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-4 text-sm font-semibold text-left text-gray-300", children: "Rank" }), _jsx("th", { className: "px-6 py-4 text-sm font-semibold text-left text-gray-300", children: "User" }), _jsx("th", { className: "px-6 py-4 text-sm font-semibold text-left text-gray-300", children: "Tier" }), _jsx("th", { className: "px-6 py-4 text-sm font-semibold text-right text-gray-300", children: type === 'karma' ? 'Karma' : 'Engagement' }), type === 'engagement' && (_jsx("th", { className: "px-6 py-4 text-sm font-semibold text-right text-gray-300", children: "Activity" }))] }) }), _jsx("tbody", { className: "divide-y divide-gray-700", children: entries.map((entry) => {
                        const isCurrentUser = entry.user_id === currentUserId;
                        const rowClasses = isCurrentUser
                            ? 'bg-purple-900/20 hover:bg-purple-900/30'
                            : 'hover:bg-gray-750';
                        return (_jsxs("tr", { className: rowClasses, children: [_jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [rankMedals[entry.rank] && (_jsx("span", { className: "text-2xl", children: rankMedals[entry.rank] })), _jsxs("span", { className: "text-lg font-semibold text-white", children: ["#", entry.rank] })] }) }), _jsx("td", { className: "px-6 py-4", children: _jsxs(Link, { to: `/profile/${entry.username}`, className: "group flex items-center gap-3", children: [entry.avatar_url ? (_jsx("img", { src: entry.avatar_url, alt: entry.username, className: "w-10 h-10 rounded-full" })) : (_jsx("div", { className: "flex items-center justify-center w-10 h-10 bg-gray-700 rounded-full", children: _jsx("span", { className: "text-lg font-semibold text-gray-400", children: entry.username[0].toUpperCase() }) })), _jsxs("div", { children: [_jsx("div", { className: "group-hover:text-purple-400 font-semibold text-white transition-colors", children: entry.display_name || entry.username }), _jsxs("div", { className: "text-sm text-gray-400", children: ["@", entry.username] })] })] }) }), _jsx("td", { className: "px-6 py-4", children: _jsx(RankBadge, { rank: entry.user_rank, size: "sm" }) }), _jsx("td", { className: "px-6 py-4 text-right", children: _jsx("div", { className: "text-xl font-bold text-purple-400", children: entry.score.toLocaleString() }) }), type === 'engagement' && (_jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "space-y-1 text-sm text-right text-gray-400", children: [_jsxs("div", { children: ["\uD83D\uDCAC ", entry.total_comments?.toLocaleString() || 0, " comments"] }), _jsxs("div", { children: ["\uD83D\uDC4D ", entry.total_votes_cast?.toLocaleString() || 0, " votes"] }), _jsxs("div", { children: ["\uD83D\uDCF9 ", entry.total_clips_submitted?.toLocaleString() || 0, " clips"] })] }) }))] }, entry.user_id));
                    }) })] }) }));
}
export function LeaderboardSummary({ entries, type }) {
    const topThree = entries.slice(0, 3);
    if (topThree.length === 0) {
        return null;
    }
    return (_jsx("div", { className: "grid grid-cols-3 gap-4 mb-6", children: topThree.map((entry, index) => (_jsxs(Link, { to: `/profile/${entry.username}`, className: "hover:bg-gray-750 p-6 text-center transition-colors bg-gray-800 rounded-lg", children: [_jsx("div", { className: "mb-2 text-4xl", children: rankMedals[index + 1] }), _jsx("div", { className: "mb-2", children: entry.avatar_url ? (_jsx("img", { src: entry.avatar_url, alt: entry.username, className: "w-16 h-16 mx-auto rounded-full" })) : (_jsx("div", { className: "flex items-center justify-center w-16 h-16 mx-auto bg-gray-700 rounded-full", children: _jsx("span", { className: "text-2xl font-semibold text-gray-400", children: entry.username[0].toUpperCase() }) })) }), _jsx("div", { className: "mb-1 font-semibold text-white", children: entry.display_name || entry.username }), _jsx(RankBadge, { rank: entry.user_rank, size: "sm" }), _jsx("div", { className: "mt-3 text-2xl font-bold text-purple-400", children: entry.score.toLocaleString() }), _jsx("div", { className: "mt-1 text-xs text-gray-400", children: type === 'karma' ? 'karma' : 'engagement' })] }, entry.user_id))) }));
}
