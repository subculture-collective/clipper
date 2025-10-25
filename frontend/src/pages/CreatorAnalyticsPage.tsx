import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  getCreatorAnalyticsOverview,
  getCreatorTopClips,
  getCreatorTrends,
} from '../lib/analytics-api';
import {
  MetricCard,
  LineChartComponent,
  DateRangeSelector,
} from '../components/analytics';

const CreatorAnalyticsPage: React.FC = () => {
  const { creatorName } = useParams<{ creatorName: string }>();
  const [timeRange, setTimeRange] = useState(30);
  const [sortBy, setSortBy] = useState('views');

  // Fetch analytics overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['creatorAnalyticsOverview', creatorName],
    queryFn: () => getCreatorAnalyticsOverview(creatorName!),
    enabled: !!creatorName,
  });

  // Fetch top clips
  const { data: topClips, isLoading: clipsLoading } = useQuery({
    queryKey: ['creatorTopClips', creatorName, sortBy],
    queryFn: () => getCreatorTopClips(creatorName!, { sort: sortBy, limit: 10 }),
    enabled: !!creatorName,
  });

  // Fetch views trend
  const { data: viewsTrend, isLoading: viewsTrendLoading } = useQuery({
    queryKey: ['creatorTrends', creatorName, 'clip_views', timeRange],
    queryFn: () =>
      getCreatorTrends(creatorName!, { metric: 'clip_views', days: timeRange }),
    enabled: !!creatorName,
  });

  // Fetch votes trend
  const { data: votesTrend, isLoading: votesTrendLoading } = useQuery({
    queryKey: ['creatorTrends', creatorName, 'votes', timeRange],
    queryFn: () =>
      getCreatorTrends(creatorName!, { metric: 'votes', days: timeRange }),
    enabled: !!creatorName,
  });

  if (!creatorName) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">Invalid creator name</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{creatorName} Analytics - Clipper</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {creatorName} Analytics
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Performance metrics and insights for clips
          </p>
        </div>

        {/* Overview Metrics */}
        {overviewLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Total Clips"
              value={overview.total_clips}
              subtitle="Clips on platform"
            />
            <MetricCard
              title="Total Views"
              value={overview.total_views}
              subtitle="Across all clips"
            />
            <MetricCard
              title="Total Upvotes"
              value={overview.total_upvotes}
              subtitle="Community approval"
            />
            <MetricCard
              title="Total Comments"
              value={overview.total_comments}
              subtitle="User engagement"
            />
            <MetricCard
              title="Avg. Engagement Rate"
              value={`${(overview.avg_engagement_rate * 100).toFixed(2)}%`}
              subtitle="Votes + Comments / Views"
            />
            <MetricCard
              title="Follower Count"
              value={overview.follower_count}
              subtitle="Community size"
            />
          </div>
        ) : null}

        {/* Top Clips Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Top Performing Clips
            </h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="views">By Views</option>
              <option value="votes">By Votes</option>
              <option value="comments">By Comments</option>
            </select>
          </div>

          {clipsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse"
                >
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : topClips?.clips && topClips.clips.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Clip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Votes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Comments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Engagement
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {topClips.clips.map((clip) => (
                    <tr key={clip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <Link
                          to={`/clips/${clip.id}`}
                          className="text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          {clip.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {clip.views.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {clip.vote_score}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {clip.comment_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {(clip.engagement_rate * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No clips found</p>
          )}
        </div>

        {/* Performance Trends */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Performance Trends
            </h2>
            <DateRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {viewsTrendLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : viewsTrend?.data ? (
              <LineChartComponent
                data={viewsTrend.data}
                title="Views Over Time"
                valueLabel="Views"
                color="#8b5cf6"
              />
            ) : null}

            {votesTrendLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 h-80 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : votesTrend?.data ? (
              <LineChartComponent
                data={votesTrend.data}
                title="Votes Over Time"
                valueLabel="Votes"
                color="#ec4899"
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatorAnalyticsPage;
