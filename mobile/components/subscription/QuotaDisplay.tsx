/**
 * QuotaDisplay Component - React Native component for displaying usage quotas
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription } from '../../hooks/useSubscription';

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
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="flex-row items-center gap-2">
        <Text className="text-sm text-gray-500 dark:text-gray-400">Loading...</Text>
      </View>
    );
  }

  // Pro users see unlimited or current count
  if (isPro) {
    return (
      <View className="flex-row items-center gap-2">
        <Text className="text-sm text-gray-700 dark:text-gray-300">
          {featureName}: {current}
        </Text>
        {proUnlimited && (
          <View className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900">
            <Text className="text-xs font-medium text-purple-800 dark:text-purple-200">
              Unlimited
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Free users see quota with warnings
  const remaining = freeLimit - current;
  const isNearLimit = remaining <= warningThreshold;
  const isAtLimit = remaining <= 0;

  const textColorClass = isAtLimit
    ? 'text-red-600 dark:text-red-400 font-semibold'
    : isNearLimit
    ? 'text-orange-600 dark:text-orange-400 font-medium'
    : 'text-gray-700 dark:text-gray-300';

  return (
    <View className="flex-row items-center gap-2">
      <Text className={`text-sm ${textColorClass}`}>
        {featureName}: {current}/{freeLimit}
      </Text>

      {isNearLimit && (
        <TouchableOpacity
          onPress={() => router.push('/pricing' as any)}
          className="flex-row items-center px-2 py-0.5 rounded bg-purple-100 active:bg-purple-200 dark:bg-purple-900 dark:active:bg-purple-800"
        >
          <Ionicons 
            name="sparkles" 
            size={12} 
            className="text-purple-800 dark:text-purple-200 mr-1"
          />
          <Text className="text-xs font-medium text-purple-800 dark:text-purple-200">
            Upgrade
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
