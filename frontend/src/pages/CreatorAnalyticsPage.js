import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getCreatorAnalyticsOverview, getCreatorTopClips, getCreatorTrends, } from '../lib/analytics-api';
import { MetricCard, LineChartComponent, DateRangeSelector, } from '../components/analytics';
const CreatorAnalyticsPage = () => {
    const { creatorName } = useParams();
    const [timeRange, setTimeRange] = useState(30);
    const [sortBy, setSortBy] = useState('views');
    // Fetch analytics overview
    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: ['creatorAnalyticsOverview', creatorName],
        queryFn: () => getCreatorAnalyticsOverview(creatorName),
        enabled: !!creatorName,
    });
    // Fetch top clips
    const { data: topClips, isLoading: clipsLoading } = useQuery({
        queryKey: ['creatorTopClips', creatorName, sortBy],
        queryFn: () => getCreatorTopClips(creatorName, { sort: sortBy, limit: 10 }),
        enabled: !!creatorName,
    });
    // Fetch views trend
    const { data: viewsTrend, isLoading: viewsTrendLoading } = useQuery({
        queryKey: ['creatorTrends', creatorName, 'clip_views', timeRange],
        queryFn: () => getCreatorTrends(creatorName, { metric: 'clip_views', days: timeRange }),
        enabled: !!creatorName,
    });
    // Fetch votes trend
    const { data: votesTrend, isLoading: votesTrendLoading } = useQuery({
        queryKey: ['creatorTrends', creatorName, 'votes', timeRange],
        queryFn: () => getCreatorTrends(creatorName, { metric: 'votes', days: timeRange }),
        enabled: !!creatorName,
    });
    if (!creatorName) {
        return (_jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: _jsx("p", { className: "text-red-600", children: "Invalid creator name" }) }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(Helmet, { children: _jsxs("title", { children: [creatorName, " Analytics - Clipper"] }) }), _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsxs("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: [creatorName, " Analytics"] }), _jsx("p", { className: "mt-2 text-gray-600 dark:text-gray-400", children: "Performance metrics and insights for clips" })] }), overviewLoading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8", children: [1, 2, 3, 4, 5, 6].map((i) => (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" }), _jsx("div", { className: "h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" })] }, i))) })) : overview ? (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8", children: [_jsx(MetricCard, { title: "Total Clips", value: overview.total_clips, subtitle: "Clips on platform" }), _jsx(MetricCard, { title: "Total Views", value: overview.total_views, subtitle: "Across all clips" }), _jsx(MetricCard, { title: "Total Upvotes", value: overview.total_upvotes, subtitle: "Community approval" }), _jsx(MetricCard, { title: "Total Comments", value: overview.total_comments, subtitle: "User engagement" }), _jsx(MetricCard, { title: "Avg. Engagement Rate", value: `${(overview.avg_engagement_rate * 100).toFixed(2)}%`, subtitle: "Votes + Comments / Views" }), _jsx(MetricCard, { title: "Follower Count", value: overview.follower_count, subtitle: "Community size" })] })) : null, _jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Top Performing Clips" }), _jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), className: "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white", children: [_jsx("option", { value: "views", children: "By Views" }), _jsx("option", { value: "votes", children: "By Votes" }), _jsx("option", { value: "comments", children: "By Comments" })] })] }), clipsLoading ? (_jsx("div", { className: "space-y-4", children: [1, 2, 3].map((i) => (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse", children: _jsx("div", { className: "h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" }) }, i))) })) : topClips?.clips && topClips.clips.length > 0 ? (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 dark:divide-gray-700", children: [_jsx("thead", { className: "bg-gray-50 dark:bg-gray-900", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Clip" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Views" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Votes" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Comments" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Engagement" })] }) }), _jsx("tbody", { className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700", children: topClips.clips.map((clip) => (_jsxs("tr", { className: "hover:bg-gray-50 dark:hover:bg-gray-700", children: [_jsx("td", { className: "px-6 py-4", children: _jsx(Link, { to: `/clips/${clip.id}`, className: "text-purple-600 dark:text-purple-400 hover:underline", children: clip.title }) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-900 dark:text-white", children: clip.views.toLocaleString() }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-900 dark:text-white", children: clip.vote_score }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-900 dark:text-white", children: clip.comment_count }), _jsxs("td", { className: "px-6 py-4 text-sm text-gray-900 dark:text-white", children: [(clip.engagement_rate * 100).toFixed(2), "%"] })] }, clip.id))) })] }) })) : (_jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "No clips found" }))] }), _jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Performance Trends" }), _jsx(DateRangeSelector, { value: timeRange, onChange: setTimeRange })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [viewsTrendLoading ? (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse", children: [_jsx("div", { className: "h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" }), _jsx("div", { className: "h-full bg-gray-200 dark:bg-gray-700 rounded" })] })) : viewsTrend?.data ? (_jsx(LineChartComponent, { data: viewsTrend.data, title: "Views Over Time", valueLabel: "Views", color: "#8b5cf6" })) : null, votesTrendLoading ? (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse", children: [_jsx("div", { className: "h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" }), _jsx("div", { className: "h-full bg-gray-200 dark:bg-gray-700 rounded" })] })) : votesTrend?.data ? (_jsx(LineChartComponent, { data: votesTrend.data, title: "Votes Over Time", valueLabel: "Votes", color: "#ec4899" })) : null] })] })] })] }));
};
export default CreatorAnalyticsPage;
