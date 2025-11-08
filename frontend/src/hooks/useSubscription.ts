import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getSubscription, hasActiveSubscription, isProUser } from '../lib/subscription-api';
import type { Subscription } from '../lib/subscription-api';

export interface UseSubscriptionReturn {
  subscription: Subscription | null;
  isLoading: boolean;
  isError: boolean;
  isPro: boolean;
  hasActive: boolean;
  refetch: () => void;
}

/**
 * Hook to get the current user's subscription status
 * 
 * @returns Subscription state and helper flags
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isPro, hasActive, isLoading } = useSubscription();
 *   
 *   if (isLoading) return <Loading />;
 *   
 *   return (
 *     <div>
 *       {isPro && <ProBadge />}
 *       {!hasActive && <UpgradeButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSubscription(): UseSubscriptionReturn {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: getSubscription,
    enabled: isAuthenticated && !!user,
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep cached data for 10 minutes
    gcTime: 10 * 60 * 1000,
  });

  const subscription = data ?? null;

  return {
    subscription,
    isLoading,
    isError,
    isPro: isProUser(subscription),
    hasActive: hasActiveSubscription(subscription),
    refetch,
  };
}
