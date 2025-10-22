import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Clip, ClipFeedFilters, ClipFeedResponse, VotePayload, FavoritePayload } from '@/types/clip';

// Mock data for development - will be replaced by real API calls
const MOCK_CLIPS: Clip[] = [
  {
    id: '1',
    twitch_clip_id: 'clip1',
    twitch_clip_url: 'https://twitch.tv/clip1',
    embed_url: 'https://clips.twitch.tv/embed?clip=clip1',
    title: 'Amazing Play',
    creator_name: 'streamer1',
    broadcaster_name: 'streamer1',
    view_count: 1000,
    created_at: new Date().toISOString(),
    imported_at: new Date().toISOString(),
    vote_score: 42,
    comment_count: 5,
    favorite_count: 10,
    is_featured: false,
    is_nsfw: false,
    is_removed: false,
  },
];

/**
 * Mock API function to fetch clips feed
 */
const fetchClipsFeed = async (
  page: number,
  filters?: ClipFeedFilters
): Promise<ClipFeedResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // TODO: Apply filters when implementing real API
  // For now, filters are not used in mock implementation
  
  return {
    clips: MOCK_CLIPS,
    total: MOCK_CLIPS.length,
    page,
    per_page: 20,
    has_next: false,
  };
};

/**
 * Mock API function to fetch a single clip by ID
 */
const fetchClipById = async (clipId: string): Promise<Clip> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const clip = MOCK_CLIPS.find((c) => c.id === clipId);
  if (!clip) {
    throw new Error('Clip not found');
  }
  return clip;
};

/**
 * Hook to fetch paginated clips feed
 */
export const useClipsFeed = (filters?: ClipFeedFilters) => {
  return useInfiniteQuery({
    queryKey: ['clips', 'feed', filters],
    queryFn: ({ pageParam }) => fetchClipsFeed(pageParam, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => 
      lastPage.has_next ? lastPage.page + 1 : undefined,
  });
};

/**
 * Hook to fetch a single clip by ID
 * 
 * Changed from useInfiniteQuery to useQuery because:
 * - We're fetching a single clip, not paginated data
 * - initialPageParam and getNextPageParam don't apply to single resource fetches
 * - useQuery is the correct hook for single resource fetching
 */
export const useClipById = (clipId: string) => {
  return useQuery({
    queryKey: ['clips', clipId],
    queryFn: () => fetchClipById(clipId),
    enabled: !!clipId, // Only run query if clipId is provided
  });
};

/**
 * Hook to vote on a clip
 */
export const useVoteClip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: VotePayload) => {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 300));
      return payload;
    },
    onSuccess: () => {
      // Invalidate clips queries to refetch
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });
};

/**
 * Hook to favorite/unfavorite a clip
 */
export const useFavoriteClip = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: FavoritePayload) => {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 300));
      return payload;
    },
    onSuccess: () => {
      // Invalidate clips queries to refetch
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });
};
