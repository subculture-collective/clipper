import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';

export interface ProFeatureProps {
  /** Content to show when user has Pro access */
  children: React.ReactNode;
  /** Optional fallback content for non-Pro users */
  fallback?: React.ReactNode;
  /** Whether to show upgrade prompt (default: true) */
  showUpgradePrompt?: boolean;
  /** Feature name for upgrade prompt message */
  featureName?: string;
  /** Custom upgrade prompt message */
  upgradeMessage?: string;
}

/**
 * Component that gates content behind Pro subscription
 * 
 * @example
 * ```tsx
 * <ProFeature featureName="Collections">
 *   <CollectionsList />
 * </ProFeature>
 * ```
 * 
 * @example With custom fallback
 * ```tsx
 * <ProFeature 
 *   fallback={<div>Join Pro to unlock this feature</div>}
 *   showUpgradePrompt={false}
 * >
 *   <AdvancedSearch />
 * </ProFeature>
 * ```
 */
export function ProFeature({
  children,
  fallback,
  showUpgradePrompt = true,
  featureName = 'This feature',
  upgradeMessage,
}: ProFeatureProps): React.ReactElement {
  const { isPro, isLoading } = useSubscription();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show children if user is Pro
  if (isPro) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt if enabled
  if (showUpgradePrompt) {
    return (
      <UpgradePrompt 
        featureName={featureName}
        message={upgradeMessage}
      />
    );
  }

  // Default: show nothing
  return <></>;
}
