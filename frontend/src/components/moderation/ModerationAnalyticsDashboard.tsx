import { useEffect, useState } from 'react';
import { subDays } from 'date-fns';
import {
    getModerationAnalytics,
    type ModerationAnalytics,
} from '../../lib/moderation-api';
import { MetricCard } from '../analytics/MetricCard';
import { PieChartComponent } from '../analytics/PieChartComponent';
import { BarChartComponent } from '../analytics/BarChartComponent';
import { LineChartComponent } from '../analytics/LineChartComponent';
import { DateRangeSelector } from '../analytics/DateRangeSelector';

export function ModerationAnalyticsDashboard() {
    const [analytics, setAnalytics] = useState<ModerationAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRangeDays, setDateRangeDays] = useState(30);

    useEffect(() => {
        loadAnalytics();
    }, [dateRangeDays]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const startDate = subDays(new Date(), dateRangeDays)
                .toISOString()
                .split('T')[0];
            const endDate = new Date().toISOString().split('T')[0];
            
            const response = await getModerationAnalytics({
                start_date: startDate,
                end_date: endDate,
            });
            setAnalytics(response.data);
        } catch (err) {
            setError('Failed to load analytics data');
            console.error('Analytics error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-lg text-gray-600">Loading analytics...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-red-800">{error}</p>
                <button
                    onClick={loadAnalytics}
                    className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!analytics) {
        return null;
    }

    // Transform data for charts
    const actionTypeData = Object.entries(analytics.actions_by_type).map(
        ([name, value]) => ({ name, value })
    );

    const moderatorData = Object.entries(analytics.actions_by_moderator)
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));

    const contentTypeData = Object.entries(analytics.content_type_breakdown).map(
        ([name, value]) => ({ name, value })
    );

    const activeModerators = Object.keys(analytics.actions_by_moderator).length;
    const avgResponseTime = analytics.average_response_time_minutes
        ? `${Math.round(analytics.average_response_time_minutes)} min`
        : 'N/A';

    return (
        <div className="container mx-auto space-y-6 py-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">
                    Moderation Analytics
                </h1>

                {/* Date Range Selector */}
                <DateRangeSelector
                    value={dateRangeDays}
                    onChange={setDateRangeDays}
                />
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard
                    title="Total Actions"
                    value={analytics.total_actions}
                    icon={<span className="text-2xl">🔨</span>}
                />
                <MetricCard
                    title="Avg Response Time"
                    value={avgResponseTime}
                    icon={<span className="text-2xl">⏱️</span>}
                />
                <MetricCard
                    title="Active Moderators"
                    value={activeModerators}
                    icon={<span className="text-2xl">👥</span>}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Actions by Type */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                        Actions by Type
                    </h3>
                    <PieChartComponent
                        data={actionTypeData}
                        nameKey="name"
                        dataKey="value"
                    />
                </div>

                {/* Top Moderators */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                        Top Moderators
                    </h3>
                    <BarChartComponent
                        data={moderatorData}
                        xAxisKey="name"
                        yAxisKey="value"
                        barColor="#3b82f6"
                    />
                </div>

                {/* Content Type Breakdown */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                        Content Type Breakdown
                    </h3>
                    <BarChartComponent
                        data={contentTypeData}
                        xAxisKey="name"
                        yAxisKey="value"
                        barColor="#10b981"
                    />
                </div>

                {/* Actions Over Time */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                        Actions Over Time
                    </h3>
                    <LineChartComponent
                        data={analytics.actions_over_time}
                        xAxisKey="date"
                        yAxisKey="count"
                        lineColor="#8b5cf6"
                    />
                </div>
            </div>
        </div>
    );
}
