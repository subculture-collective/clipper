import { UserReputation } from '../../types/reputation';
import { BadgeDisplay } from './BadgeDisplay';

interface ReputationDisplayProps {
  reputation: UserReputation;
  compact?: boolean;
}

const rankColors: Record<string, string> = {
  'Newcomer': 'text-gray-400',
  'Member': 'text-green-400',
  'Regular': 'text-blue-400',
  'Contributor': 'text-purple-400',
  'Veteran': 'text-yellow-400',
  'Legend': 'text-red-400',
};

export function ReputationDisplay({ reputation, compact = false }: ReputationDisplayProps) {
  const rankColor = rankColors[reputation.rank] || 'text-gray-400';

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Karma Points */}
        <div className="flex items-center gap-1">
          <span className="text-purple-400 font-semibold">
            {reputation.karma_points.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400">karma</span>
        </div>

        {/* Rank */}
        <div className={`text-sm font-semibold ${rankColor}`}>
          {reputation.rank}
        </div>

        {/* Badges */}
        {reputation.badges.length > 0 && (
          <BadgeDisplay badges={reputation.badges} maxVisible={3} size="sm" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {reputation.display_name || reputation.username}
          </h2>
          <div className={`text-lg font-semibold ${rankColor} mt-1`}>
            {reputation.rank}
          </div>
        </div>
        {reputation.avatar_url && (
          <img
            src={reputation.avatar_url}
            alt={reputation.username}
            className="w-16 h-16 rounded-full"
          />
        )}
      </div>

      {/* Karma */}
      <div className="mb-6">
        <div className="text-center bg-gray-900 rounded-lg p-4">
          <div className="text-4xl font-bold text-purple-400">
            {reputation.karma_points.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400 mt-1">Total Karma</div>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {reputation.trust_score}
          </div>
          <div className="text-sm text-gray-400 mt-1">Trust Score</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {reputation.engagement_score.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400 mt-1">Engagement</div>
        </div>
      </div>

      {/* Badges */}
      {reputation.badges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Badges</h3>
          <BadgeDisplay badges={reputation.badges} maxVisible={5} size="lg" />
        </div>
      )}

      {/* Stats */}
      {reputation.stats && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Activity</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-white">
                {reputation.stats.total_comments.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">Comments</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {reputation.stats.total_votes_cast.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">Votes</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {reputation.stats.total_clips_submitted.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">Submissions</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface RankBadgeProps {
  rank: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const rankColor = rankColors[rank] || 'text-gray-400';
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  return (
    <span className={`${rankColor} ${sizeClasses[size]} bg-gray-800 rounded-full font-semibold`}>
      {rank}
    </span>
  );
}
