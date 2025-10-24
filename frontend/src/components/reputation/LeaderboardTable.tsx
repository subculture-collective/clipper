import { Link } from 'react-router-dom';
import { LeaderboardEntry } from '../../types/reputation';
import { RankBadge } from './ReputationDisplay';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  type: 'karma' | 'engagement';
  currentUserId?: string;
}

const rankMedals: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function LeaderboardTable({ entries, type, currentUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg">No leaderboard data available</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-900">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
              Rank
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
              User
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
              Tier
            </th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">
              {type === 'karma' ? 'Karma' : 'Engagement'}
            </th>
            {type === 'engagement' && (
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">
                Activity
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {entries.map((entry) => {
            const isCurrentUser = entry.user_id === currentUserId;
            const rowClasses = isCurrentUser
              ? 'bg-purple-900/20 hover:bg-purple-900/30'
              : 'hover:bg-gray-750';

            return (
              <tr key={entry.user_id} className={rowClasses}>
                {/* Rank */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {rankMedals[entry.rank] && (
                      <span className="text-2xl">{rankMedals[entry.rank]}</span>
                    )}
                    <span className="text-lg font-semibold text-white">
                      #{entry.rank}
                    </span>
                  </div>
                </td>

                {/* User */}
                <td className="px-6 py-4">
                  <Link
                    to={`/profile/${entry.username}`}
                    className="flex items-center gap-3 group"
                  >
                    {entry.avatar_url ? (
                      <img
                        src={entry.avatar_url}
                        alt={entry.username}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        <span className="text-lg font-semibold text-gray-400">
                          {entry.username[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                        {entry.display_name || entry.username}
                      </div>
                      <div className="text-sm text-gray-400">
                        @{entry.username}
                      </div>
                    </div>
                  </Link>
                </td>

                {/* Rank/Tier */}
                <td className="px-6 py-4">
                  <RankBadge rank={entry.user_rank} size="sm" />
                </td>

                {/* Score */}
                <td className="px-6 py-4 text-right">
                  <div className="text-xl font-bold text-purple-400">
                    {entry.score.toLocaleString()}
                  </div>
                </td>

                {/* Activity Stats (for engagement leaderboard) */}
                {type === 'engagement' && (
                  <td className="px-6 py-4">
                    <div className="text-right text-sm text-gray-400 space-y-1">
                      <div>💬 {entry.total_comments?.toLocaleString() || 0} comments</div>
                      <div>👍 {entry.total_votes_cast?.toLocaleString() || 0} votes</div>
                      <div>📹 {entry.total_clips_submitted?.toLocaleString() || 0} clips</div>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface LeaderboardSummaryProps {
  entries: LeaderboardEntry[];
  type: 'karma' | 'engagement';
}

export function LeaderboardSummary({ entries, type }: LeaderboardSummaryProps) {
  const topThree = entries.slice(0, 3);

  if (topThree.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {topThree.map((entry, index) => (
        <Link
          key={entry.user_id}
          to={`/profile/${entry.username}`}
          className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors text-center"
        >
          <div className="text-4xl mb-2">{rankMedals[index + 1]}</div>
          <div className="mb-2">
            {entry.avatar_url ? (
              <img
                src={entry.avatar_url}
                alt={entry.username}
                className="w-16 h-16 rounded-full mx-auto"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mx-auto">
                <span className="text-2xl font-semibold text-gray-400">
                  {entry.username[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="font-semibold text-white mb-1">
            {entry.display_name || entry.username}
          </div>
          <RankBadge rank={entry.user_rank} size="sm" />
          <div className="mt-3 text-2xl font-bold text-purple-400">
            {entry.score.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {type === 'karma' ? 'karma' : 'engagement'}
          </div>
        </Link>
      ))}
    </div>
  );
}
