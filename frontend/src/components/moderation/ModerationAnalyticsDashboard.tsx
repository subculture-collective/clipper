import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import {
    getModerationAnalytics,
    type ModerationAnalytics,
} from '../../lib/moderation-api';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: string;
}

function MetricCard({ title, value, icon }: MetricCardProps) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-3xl">{icon}</span>
                <span className="text-3xl font-bold text-gray-900">{value}</span>
            </div>
            <p className="text-sm text-gray-600">{title}</p>
        </div>
    );
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ModerationAnalyticsDashboard() {
    const [analytics, setAnalytics] = useState<ModerationAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
    });

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getModerationAnalytics({
                start_date: dateRange.start,
                end_date: dateRange.end,
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

                {/* Date Range Picker */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="start-date" className="text-sm text-gray-600">
                            From:
                        </label>
                        <input
                            id="start-date"
                            type="date"
                            value={dateRange.start}
                            onChange={(e) =>
                                setDateRange({ ...dateRange, start: e.target.value })
                            }
                            className="rounded border border-gray-300 px-3 py-1 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="end-date" className="text-sm text-gray-600">
                            To:
                        </label>
                        <input
                            id="end-date"
                            type="date"
                            value={dateRange.end}
                            onChange={(e) =>
                                setDateRange({ ...dateRange, end: e.target.value })
                            }
                            className="rounded border border-gray-300 px-3 py-1 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard
                    title="Total Actions"
                    value={analytics.total_actions.toLocaleString()}
                    icon="🔨"
                />
                <MetricCard
                    title="Avg Response Time"
                    value={avgResponseTime}
                    icon="⏱️"
                />
                <MetricCard
                    title="Active Moderators"
                    value={activeModerators}
                    icon="👥"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Actions by Type */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                        Actions by Type
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={actionTypeData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                            >
                                {actionTypeData.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Moderators */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                        Top Moderators
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={moderatorData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Content Type Breakdown */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                        Content Type Breakdown
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={contentTypeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Actions Over Time */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                        Actions Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.actions_over_time}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
