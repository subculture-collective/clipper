import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from '@dr.pogodin/react-helmet';
import {
  getRevenueOverview,
  getPlanDistribution,
  getMRRTrend,
  getSubscriberTrend,
  getChurnTrend,
  getCohortRetention,
  triggerBackfill,
} from '../../lib/revenue-api';
import {
  MetricCard,
  LineChartComponent,
  PieChartComponent,
  DateRangeSelector,
} from '../../components/analytics';

const AdminRevenuePage: React.FC = () => {
  const [timeRange, setTimeRange] = useState(30);
  const queryClient = useQueryClient();

  // Fetch revenue overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['revenueOverview'],
    queryFn: getRevenueOverview,
  });

  // Fetch plan distribution
  const { data: distribution, isLoading: distributionLoading } = useQuery({
    queryKey: ['planDistribution'],
    queryFn: getPlanDistribution,
  });

  // Fetch MRR trend
  const { data: mrrTrend, isLoading: mrrTrendLoading } = useQuery({
    queryKey: ['mrrTrend', timeRange],
    queryFn: () => getMRRTrend({ days: timeRange }),
  });

  // Fetch subscriber trend
  const { data: subscriberTrend, isLoading: subscriberTrendLoading } = useQuery({
    queryKey: ['subscriberTrend', timeRange],
    queryFn: () => getSubscriberTrend({ days: timeRange }),
  });

  // Fetch churn trend
  const { data: churnTrend, isLoading: churnTrendLoading } = useQuery({
    queryKey: ['churnTrend', timeRange],
    queryFn: () => getChurnTrend({ days: timeRange }),
  });

  // Fetch cohort retention
  const { data: cohortRetention, isLoading: cohortLoading } = useQuery({
    queryKey: ['cohortRetention'],
    queryFn: () => getCohortRetention({ months: 12 }),
  });

  // Backfill mutation
  const backfillMutation = useMutation({
    mutationFn: () => triggerBackfill({ days: 30 }),
    onSuccess: () => {
      // Invalidate all revenue queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['revenueOverview'] });
      queryClient.invalidateQueries({ queryKey: ['planDistribution'] });
      queryClient.invalidateQueries({ queryKey: ['mrrTrend'] });
      queryClient.invalidateQueries({ queryKey: ['subscriberTrend'] });
      queryClient.invalidateQueries({ queryKey: ['churnTrend'] });
      queryClient.invalidateQueries({ queryKey: ['cohortRetention'] });
    },
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Prepare pie chart data for plan distribution
  const planDistributionData = distribution
    ? [
        { name: 'Monthly', value: distribution.monthly_count },
        { name: 'Yearly', value: distribution.yearly_count },
        { name: 'Free', value: distribution.free_count },
      ]
    : [];

  return (
    <>
      <Helmet>
        <title>Revenue Analytics - Admin Dashboard</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Revenue Analytics
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Monitor subscription metrics, MRR, churn, and cohort retention
            </p>
          </div>
          <button
            onClick={() => backfillMutation.mutate()}
            disabled={backfillMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {backfillMutation.isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Sync Metrics
              </>
            )}
          </button>
        </div>

        {/* Revenue KPIs */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Key Metrics
          </h2>

          {overviewLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : overview ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Monthly Recurring Revenue"
                value={formatCurrency(overview.current_mrr)}
                subtitle="MRR"
                icon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              />
              <MetricCard
                title="Annual Recurring Revenue"
                value={formatCurrency(overview.current_arr)}
                subtitle="ARR"
                icon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                }
              />
              <MetricCard
                title="Avg Revenue Per User"
                value={formatCurrency(overview.arpu)}
                subtitle="ARPU"
                icon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                }
              />
              <MetricCard
                title="Active Subscribers"
                value={overview.active_subscribers}
                subtitle={`of ${overview.total_subscribers} total`}
                icon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                }
              />
              <MetricCard
                title="Monthly Churn Rate"
                value={formatPercentage(overview.monthly_churn_rate)}
                subtitle="Subscribers lost this month"
                trend={
                  overview.monthly_churn_rate !== 0
                    ? {
                        value: Math.abs(overview.monthly_churn_rate),
                        isPositive: overview.monthly_churn_rate < 0,
                      }
                    : undefined
                }
                icon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    />
                  </svg>
                }
              />
              <MetricCard
                title="Monthly Growth Rate"
                value={formatPercentage(overview.monthly_growth_rate)}
                subtitle="Net subscriber growth"
                trend={
                  overview.monthly_growth_rate !== 0
                    ? {
                        value: Math.abs(overview.monthly_growth_rate),
                        isPositive: overview.monthly_growth_rate > 0,
                      }
                    : undefined
                }
                icon={
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                }
              />
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                No revenue data available. Click "Sync Metrics" to populate data.
              </p>
            </div>
          )}
        </div>

        {/* Plan Distribution */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Plan Distribution
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {distributionLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : distribution && planDistributionData.some((d) => d.value > 0) ? (
              <PieChartComponent
                data={planDistributionData}
                title="Subscribers by Plan"
                colors={['#8b5cf6', '#10b981', '#6b7280']}
                height={300}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Subscribers by Plan
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No subscription data available
                </p>
              </div>
            )}

            {/* Plan breakdown stats */}
            {distribution && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Plan Breakdown
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-3"></div>
                      <span className="text-gray-700 dark:text-gray-300">
                        Monthly Pro
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {distribution.monthly_count}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        ({distribution.monthly_pct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-3"></div>
                      <span className="text-gray-700 dark:text-gray-300">
                        Yearly Pro
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {distribution.yearly_count}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        ({distribution.yearly_pct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-gray-500 mr-3"></div>
                      <span className="text-gray-700 dark:text-gray-300">Free</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {distribution.free_count}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        ({distribution.free_pct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trends */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Revenue Trends
            </h2>
            <DateRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mrrTrendLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : mrrTrend?.data && mrrTrend.data.length > 0 ? (
              <LineChartComponent
                data={mrrTrend.data}
                title="MRR Over Time"
                valueLabel="MRR ($)"
                color="#8b5cf6"
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  MRR Over Time
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No MRR data available
                </p>
              </div>
            )}

            {subscriberTrendLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : subscriberTrend?.data && subscriberTrend.data.length > 0 ? (
              <LineChartComponent
                data={subscriberTrend.data}
                title="Active Subscribers Over Time"
                valueLabel="Subscribers"
                color="#10b981"
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Active Subscribers Over Time
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No subscriber data available
                </p>
              </div>
            )}

            {churnTrendLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : churnTrend?.data && churnTrend.data.length > 0 ? (
              <LineChartComponent
                data={churnTrend.data}
                title="Daily Churn"
                valueLabel="Churned"
                color="#ef4444"
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Daily Churn
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No churn data available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cohort Retention */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Cohort Retention
          </h2>

          {cohortLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : cohortRetention && cohortRetention.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Retention by Cohort Month
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Percentage of subscribers retained after N months
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Cohort
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Initial
                      </th>
                      {[0, 1, 2, 3, 4, 5].map((month) => (
                        <th
                          key={month}
                          className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          M{month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {cohortRetention.map((cohort) => (
                      <tr key={cohort.cohort_month}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {cohort.cohort_month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {cohort.initial_count}
                        </td>
                        {[0, 1, 2, 3, 4, 5].map((month) => {
                          const rate = cohort.retention_rates?.[month];
                          const bgColor =
                            rate === undefined
                              ? ''
                              : rate >= 80
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                              : rate >= 60
                              ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                              : rate >= 40
                              ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200'
                              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';

                          return (
                            <td
                              key={month}
                              className={`px-6 py-4 whitespace-nowrap text-sm text-center ${bgColor}`}
                            >
                              {rate !== undefined ? `${rate.toFixed(0)}%` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Retention by Cohort Month
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No cohort retention data available. Data will populate as subscribers join and are tracked over time.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminRevenuePage;
