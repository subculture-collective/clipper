import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getPlatformOverview, getContentMetrics, getPlatformTrends, } from '../../lib/analytics-api';
import { MetricCard, LineChartComponent, BarChartComponent, DateRangeSelector, } from '../../components/analytics';
const AdminAnalyticsPage = () => {
    const [timeRange, setTimeRange] = useState(30);
    // Fetch platform overview
    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: ['platformOverview'],
        queryFn: getPlatformOverview,
    });
    // Fetch content metrics
    const { data: content, isLoading: contentLoading } = useQuery({
        queryKey: ['contentMetrics'],
        queryFn: getContentMetrics,
    });
    // Fetch user growth trend
    const { data: usersTrend, isLoading: usersTrendLoading } = useQuery({
        queryKey: ['platformTrends', 'users', timeRange],
        queryFn: () => getPlatformTrends({ metric: 'users', days: timeRange }),
    });
    // Fetch clips growth trend
    const { data: clipsTrend, isLoading: clipsTrendLoading } = useQuery({
        queryKey: ['platformTrends', 'clips', timeRange],
        queryFn: () => getPlatformTrends({ metric: 'clips', days: timeRange }),
    });
    return (_jsxs(_Fragment, { children: [_jsx(Helmet, { children: _jsx("title", { children: "Platform Analytics - Admin Dashboard" }) }), _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: "Platform Analytics" }), _jsx("p", { className: "mt-2 text-gray-600 dark:text-gray-400", children: "Monitor platform health and user engagement" })] }), _jsxs("div", { className: "mb-8", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 dark:text-white mb-4", children: "Overview Metrics" }), overviewLoading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" }), _jsx("div", { className: "h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" })] }, i))) })) : overview ? (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsx(MetricCard, { title: "Total Users", value: overview.total_users, subtitle: "Registered accounts" }), _jsx(MetricCard, { title: "Daily Active Users", value: overview.active_users_daily, subtitle: "Active today" }), _jsx(MetricCard, { title: "Monthly Active Users", value: overview.active_users_monthly, subtitle: "Active this month" }), _jsx(MetricCard, { title: "Total Clips", value: overview.total_clips, subtitle: "All clips" }), _jsx(MetricCard, { title: "Clips Added Today", value: overview.clips_added_today, subtitle: "New clips" }), _jsx(MetricCard, { title: "Total Votes", value: overview.total_votes, subtitle: "All time" }), _jsx(MetricCard, { title: "Total Comments", value: overview.total_comments, subtitle: "All time" }), _jsx(MetricCard, { title: "Avg. Session Duration", value: `${overview.avg_session_duration.toFixed(1)} min`, subtitle: "User engagement" })] })) : null] }), _jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 dark:text-white", children: "Growth Trends" }), _jsx(DateRangeSelector, { value: timeRange, onChange: setTimeRange })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [usersTrendLoading ? (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse", children: [_jsx("div", { className: "h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" }), _jsx("div", { className: "h-full bg-gray-200 dark:bg-gray-700 rounded" })] })) : usersTrend?.data ? (_jsx(LineChartComponent, { data: usersTrend.data, title: "New Users Over Time", valueLabel: "New Users", color: "#10b981" })) : null, clipsTrendLoading ? (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse", children: [_jsx("div", { className: "h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" }), _jsx("div", { className: "h-full bg-gray-200 dark:bg-gray-700 rounded" })] })) : clipsTrend?.data ? (_jsx(LineChartComponent, { data: clipsTrend.data, title: "New Clips Over Time", valueLabel: "New Clips", color: "#8b5cf6" })) : null] })] }), _jsxs("div", { className: "mb-8", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 dark:text-white mb-4", children: "Content Metrics" }), contentLoading ? (_jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [1, 2].map((i) => (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse", children: [_jsx("div", { className: "h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" }), _jsx("div", { className: "h-full bg-gray-200 dark:bg-gray-700 rounded" })] }, i))) })) : content ? (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsx(BarChartComponent, { data: content.most_popular_games.map((game) => ({
                                            name: game.game_name,
                                            value: game.clip_count,
                                        })), title: "Most Popular Games", valueLabel: "Clip Count", color: "#3b82f6", height: 350 }), _jsx(BarChartComponent, { data: content.most_popular_creators.map((creator) => ({
                                            name: creator.creator_name,
                                            value: creator.view_count,
                                        })), title: "Most Popular Creators", valueLabel: "Views", color: "#ec4899", height: 350 })] })) : null] }), content?.trending_tags && content.trending_tags.length > 0 && (_jsxs("div", { className: "mb-8", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 dark:text-white mb-4", children: "Trending Tags (Last 7 Days)" }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6", children: _jsx("div", { className: "flex flex-wrap gap-2", children: content.trending_tags.map((tag) => (_jsxs("span", { className: "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200", children: [tag.tag_name, _jsx("span", { className: "ml-2 text-xs text-purple-600 dark:text-purple-400", children: tag.usage_count })] }, tag.tag_id))) }) })] }))] })] }));
};
export default AdminAnalyticsPage;
