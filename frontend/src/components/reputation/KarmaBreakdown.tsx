import { KarmaBreakdown } from '../../types/reputation';

interface KarmaBreakdownProps {
  breakdown: KarmaBreakdown;
}

export function KarmaBreakdownChart({ breakdown }: KarmaBreakdownProps) {
  const total = breakdown.total_karma;
  const clipPercentage = total > 0 ? (breakdown.clip_karma / total) * 100 : 0;
  const commentPercentage = total > 0 ? (breakdown.comment_karma / total) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Karma Breakdown</h3>
      
      {/* Total Karma */}
      <div className="mb-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-purple-400">
            {total.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400 mt-1">Total Karma</div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        {/* Clip Karma */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">📹 Clip Karma</span>
            <span className="text-purple-400 font-semibold">
              {breakdown.clip_karma.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${clipPercentage}%` }}
            />
          </div>
        </div>

        {/* Comment Karma */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">💬 Comment Karma</span>
            <span className="text-blue-400 font-semibold">
              {breakdown.comment_karma.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${commentPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Percentage Display */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            {clipPercentage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400">from clips</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">
            {commentPercentage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400">from comments</div>
        </div>
      </div>
    </div>
  );
}

interface KarmaStatsProps {
  breakdown: KarmaBreakdown;
}

export function KarmaStats({ breakdown }: KarmaStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-purple-400">
          {breakdown.total_karma.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400 mt-1">Total</div>
      </div>
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-purple-400">
          {breakdown.clip_karma.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400 mt-1">Clips</div>
      </div>
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-blue-400">
          {breakdown.comment_karma.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400 mt-1">Comments</div>
      </div>
    </div>
  );
}
