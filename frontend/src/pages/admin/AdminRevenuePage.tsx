import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from '@dr.pogodin/react-helmet';
import {
  getRevenueMetrics,
  formatCurrency,
  formatPercentage,
} from '../../lib/revenue-api';
import {
  MetricCard,
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
} from '../../components/analytics';

const AdminRevenuePage: React.FC = () => {
  // Fetch revenue metrics
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['revenueMetrics'],
    queryFn: getRevenueMetrics,
    refetchInterval: 60000, // Refresh every minute
  });

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          <p className="font-bold">Error loading revenue metrics</p>
          <p>Please try again later or contact support if the issue persists.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Revenue Dashboard - Admin</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Revenue Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Monitor MRR, churn, ARPU, and subscription metrics
          </p>
          {metrics?.updated_at && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Last updated: {new Date(metrics.updated_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Key Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Key Metrics
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Monthly Recurring Revenue"
                value={formatCurrency(metrics.mrr)}
                subtitle="Active subscriptions"
              />
              <MetricCard
                title="Active Subscribers"
                value={metrics.active_subscribers}
                subtitle="Paid users"
              />
              <MetricCard
                title="Churn Rate"
                value={formatPercentage(metrics.churn)}
                subtitle="This month"
              />
              <MetricCard
                title="ARPU"
                value={formatCurrency(metrics.arpu)}
                subtitle="Average revenue per user"
              />
              <MetricCard
                title="New Subscribers"
                value={metrics.new_subscribers}
                subtitle="This month"
              />
              <MetricCard
                title="Churned Subscribers"
                value={metrics.churned_subscribers}
                subtitle="This month"
              />
              <MetricCard
                title="Trial Conversion"
                value={formatPercentage(metrics.trial_conversion_rate)}
                subtitle="Trial to paid"
              />
              <MetricCard
                title="Avg. Lifetime Value"
                value={formatCurrency(metrics.average_lifetime_value)}
                subtitle="Customer LTV"
              />
            </div>
          ) : null}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* MRR Trend */}
          {isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : metrics?.revenue_by_month && metrics.revenue_by_month.length > 0 ? (
            <LineChartComponent
              data={metrics.revenue_by_month.map((m) => ({
                date: m.month,
                value: m.mrr / 100, // Convert cents to dollars for display
              }))}
              title="MRR Trend"
              valueLabel="MRR ($)"
              color="#10b981"
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center justify-center h-80">
              <p className="text-gray-500 dark:text-gray-400">No revenue data available</p>
            </div>
          )}

          {/* Subscriber Growth */}
          {isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : metrics?.subscriber_growth && metrics.subscriber_growth.length > 0 ? (
            <LineChartComponent
              data={metrics.subscriber_growth.map((m) => ({
                date: m.month,
                value: m.total,
              }))}
              title="Subscriber Growth"
              valueLabel="Total Subscribers"
              color="#8b5cf6"
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center justify-center h-80">
              <p className="text-gray-500 dark:text-gray-400">No subscriber data available</p>
            </div>
          )}
        </div>

        {/* Plan Distribution and Subscriber Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Plan Distribution */}
          {isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : metrics?.plan_distribution && metrics.plan_distribution.length > 0 ? (
            <PieChartComponent
              data={metrics.plan_distribution.map((p) => ({
                name: p.plan_name,
                value: p.subscribers,
              }))}
              title="Plan Distribution"
              height={350}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center justify-center h-80">
              <p className="text-gray-500 dark:text-gray-400">No plan distribution data available</p>
            </div>
          )}

          {/* Subscriber Flow (New vs Churned) */}
          {isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : metrics?.subscriber_growth && metrics.subscriber_growth.length > 0 ? (
            <BarChartComponent
              data={metrics.subscriber_growth.slice(-6).map((m) => ({
                name: m.month,
                value: m.net_change,
              }))}
              title="Monthly Net Subscriber Change"
              valueLabel="Net Change"
              color="#3b82f6"
              height={350}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center justify-center h-80">
              <p className="text-gray-500 dark:text-gray-400">No subscriber flow data available</p>
            </div>
          )}
        </div>

        {/* Cohort Retention Table */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Cohort Retention
          </h2>

          {isLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : metrics?.cohort_retention && metrics.cohort_retention.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Cohort
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Size
                      </th>
                      {[0, 1, 2, 3, 4, 5].map((month) => (
                        <th
                          key={month}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Month {month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {metrics.cohort_retention.map((cohort) => (
                      <tr key={cohort.cohort_month}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {cohort.cohort_month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {cohort.initial_size}
                        </td>
                        {[0, 1, 2, 3, 4, 5].map((month) => {
                          const retention = cohort.retention_rates[month];
                          const bgColor = retention !== undefined
                            ? retention >= 80
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : retention >= 60
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                              : retention >= 40
                              ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            : '';
                          return (
                            <td
                              key={month}
                              className={`px-6 py-4 whitespace-nowrap text-sm ${bgColor}`}
                            >
                              {retention !== undefined ? formatPercentage(retention) : '-'}
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
              <p className="text-gray-500 dark:text-gray-400 text-center">
                No cohort retention data available yet. Data will appear once you have subscribers
                who have been active for at least one month.
              </p>
            </div>
          )}
        </div>

        {/* Additional Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Recovery Metrics
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricCard
                title="Grace Period Recovery"
                value={formatPercentage(metrics.grace_period_recovery)}
                subtitle="Users recovered from payment failure"
              />
              <MetricCard
                title="Total Revenue"
                value={formatCurrency(metrics.total_revenue)}
                subtitle="All time"
              />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default AdminRevenuePage;
