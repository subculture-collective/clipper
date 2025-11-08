import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { Link } from 'react-router-dom';
import { trackQuotaLimitReached, trackUpgradeClick } from '../../lib/paywall-analytics';
import { useAuth } from '../../hooks/useAuth';

export interface QuotaDisplayProps {
  /** Current usage count */
  current: number;
  /** Maximum allowed for free tier */
  freeLimit: number;
  /** Feature name (e.g., "Favorites", "Submissions") */
  featureName: string;
  /** Whether Pro tier has unlimited quota */
  proUnlimited?: boolean;
  /** Optional custom threshold for warning (default: 5 remaining) */
  warningThreshold?: number;
}

/**
 * Component that displays quota usage with upgrade prompts
 * 
 * @example
 * ```tsx
 * <QuotaDisplay
 *   current={favorites.length}
 *   freeLimit={50}
 *   featureName="Favorites"
 *   proUnlimited={true}
 * />
 * ```
 */
export function QuotaDisplay({
  current,
  freeLimit,
  featureName,
  proUnlimited = true,
  warningThreshold = 5,
}: QuotaDisplayProps): React.ReactElement {
  const { isPro, isLoading } = useSubscription();
  const { user } = useAuth();

  // Track when quota limit is reached (only fire once per reach)
  const hasReachedLimit = React.useRef(false);
  React.useEffect(() => {
    if (!isPro && current >= freeLimit && !hasReachedLimit.current) {
      hasReachedLimit.current = true;
      trackQuotaLimitReached({
        feature: featureName,
        userId: user?.id,
        metadata: { current, limit: freeLimit },
      });
    } else if (current < freeLimit) {
      hasReachedLimit.current = false;
    }
  }, [isPro, current, freeLimit, featureName, user?.id]);

  const handleUpgradeClick = () => {
    trackUpgradeClick({
      feature: featureName,
      userId: user?.id,
      metadata: { 
        source: 'quota_display',
        current,
        limit: freeLimit,
      },
    });
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  // Pro users see unlimited or current count
  if (isPro) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-700 dark:text-gray-300">
          {featureName}: {current}
        </span>
        {proUnlimited && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Unlimited
          </span>
        )}
      </div>
    );
  }

  // Free users see quota with warnings
  const remaining = freeLimit - current;
  const isNearLimit = remaining <= warningThreshold;
  const isAtLimit = remaining <= 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`
        ${isAtLimit ? 'text-red-600 dark:text-red-400 font-semibold' : ''}
        ${isNearLimit && !isAtLimit ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}
        ${!isNearLimit ? 'text-gray-700 dark:text-gray-300' : ''}
      `}>
        {featureName}: {current}/{freeLimit}
      </span>

      {isNearLimit && (
        <Link
          to="/pricing"
          onClick={handleUpgradeClick}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900 dark:hover:bg-purple-800 dark:text-purple-200 transition-colors"
          title="Upgrade for unlimited"
        >
          <svg 
            className="w-3 h-3 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          Upgrade
        </Link>
      )}
    </div>
  );
}
