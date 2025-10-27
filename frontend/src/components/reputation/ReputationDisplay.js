import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BadgeDisplay } from './BadgeDisplay';
const rankColors = {
    'Newcomer': 'text-gray-400',
    'Member': 'text-green-400',
    'Regular': 'text-blue-400',
    'Contributor': 'text-purple-400',
    'Veteran': 'text-yellow-400',
    'Legend': 'text-red-400',
};
export function ReputationDisplay({ reputation, compact = false }) {
    const rankColor = rankColors[reputation.rank] || 'text-gray-400';
    if (compact) {
        return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "font-semibold text-purple-400", children: reputation.karma_points.toLocaleString() }), _jsx("span", { className: "text-xs text-gray-400", children: "karma" })] }), _jsx("div", { className: `text-sm font-semibold ${rankColor}`, children: reputation.rank }), reputation.badges.length > 0 && (_jsx(BadgeDisplay, { badges: reputation.badges, maxVisible: 3, size: "sm" }))] }));
    }
    return (_jsxs("div", { className: "p-6 bg-gray-800 rounded-lg", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-white", children: reputation.display_name || reputation.username }), _jsx("div", { className: `text-lg font-semibold ${rankColor} mt-1`, children: reputation.rank })] }), reputation.avatar_url && (_jsx("img", { src: reputation.avatar_url, alt: reputation.username, className: "w-16 h-16 rounded-full" }))] }), _jsx("div", { className: "mb-6", children: _jsxs("div", { className: "p-4 text-center bg-gray-900 rounded-lg", children: [_jsx("div", { className: "text-4xl font-bold text-purple-400", children: reputation.karma_points.toLocaleString() }), _jsx("div", { className: "mt-1 text-sm text-gray-400", children: "Total Karma" })] }) }), _jsxs("div", { className: "grid grid-cols-2 gap-4 mb-6", children: [_jsxs("div", { className: "p-4 text-center bg-gray-900 rounded-lg", children: [_jsx("div", { className: "text-2xl font-bold text-green-400", children: reputation.trust_score }), _jsx("div", { className: "mt-1 text-sm text-gray-400", children: "Trust Score" })] }), _jsxs("div", { className: "p-4 text-center bg-gray-900 rounded-lg", children: [_jsx("div", { className: "text-2xl font-bold text-blue-400", children: reputation.engagement_score.toLocaleString() }), _jsx("div", { className: "mt-1 text-sm text-gray-400", children: "Engagement" })] })] }), reputation.badges.length > 0 && (_jsxs("div", { children: [_jsx("h3", { className: "mb-3 text-lg font-semibold text-white", children: "Badges" }), _jsx(BadgeDisplay, { badges: reputation.badges, maxVisible: 5, size: "lg" })] })), reputation.stats && (_jsxs("div", { className: "pt-6 mt-6 border-t border-gray-700", children: [_jsx("h3", { className: "mb-3 text-lg font-semibold text-white", children: "Activity" }), _jsxs("div", { className: "grid grid-cols-3 gap-4 text-center", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xl font-bold text-white", children: reputation.stats.total_comments.toLocaleString() }), _jsx("div", { className: "mt-1 text-xs text-gray-400", children: "Comments" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xl font-bold text-white", children: reputation.stats.total_votes_cast.toLocaleString() }), _jsx("div", { className: "mt-1 text-xs text-gray-400", children: "Votes" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xl font-bold text-white", children: reputation.stats.total_clips_submitted.toLocaleString() }), _jsx("div", { className: "mt-1 text-xs text-gray-400", children: "Submissions" })] })] })] }))] }));
}
export function RankBadge({ rank, size = 'md' }) {
    const rankColor = rankColors[rank] || 'text-gray-400';
    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2',
    };
    return (_jsx("span", { className: `${rankColor} ${sizeClasses[size]} bg-gray-800 rounded-full font-semibold`, children: rank }));
}
