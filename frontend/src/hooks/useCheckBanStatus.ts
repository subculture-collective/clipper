import { useQuery } from '@tanstack/react-query';
import { checkBanStatus, type BanStatus } from '@/lib/moderation-api';
import { useAuth } from './useAuth';

export interface UseBanStatusReturn extends BanStatus {
    isLoading: boolean;
    error?: Error;
}

/**
 * Hook for checking if the authenticated user is banned from a specific channel
 * 
 * @param channelId - The ID of the channel to check ban status for
 * @returns Ban status information including loading and error states
 * 
 * @example
 * ```tsx
 * const { isBanned, banReason, isLoading } = useCheckBanStatus(post.channelId);
 * 
 * if (isLoading) return <Spinner />;
 * if (isBanned) return <BanNotice reason={banReason} />;
 * ```
 */
export function useCheckBanStatus(channelId: string): UseBanStatusReturn {
    const { isAuthenticated } = useAuth();

    const {
        data,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['banStatus', channelId],
        queryFn: () => checkBanStatus(channelId),
        enabled: !!channelId && isAuthenticated,
        // Cache for 5 minutes to avoid excessive API calls
        staleTime: 5 * 60 * 1000,
        // Keep in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Don't retry on error (ban status should be clear immediately)
        retry: false,
    });

    return {
        isBanned: data?.isBanned ?? false,
        banReason: data?.banReason,
        bannedAt: data?.bannedAt,
        expiresAt: data?.expiresAt,
        isLoading,
        error: error instanceof Error ? error : undefined,
    };
}
