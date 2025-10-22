import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Clip, ClipFeedFilters, ClipFeedResponse, VotePayload, FavoritePayload } from '@/types/clip';

// Mock data for development - will be replaced by real API calls
const MOCK_CLIPS: Clip[] = Array.from({ length: 50 }, (_, i) => ({
  id: `clip-${i + 1}`,
  twitch_clip_id: `TwitchClip${i + 1}`,
  twitch_clip_url: `https://clips.twitch.tv/TwitchClip${i + 1}`,
  embed_url: `https://clips.twitch.tv/embed?clip=TwitchClip${i + 1}&parent=localhost`,
  title: `Amazing Gaming Moment #${i + 1}`,
  creator_name: `Creator${i % 10}`,
  creator_id: `creator-${i % 10}`,
  broadcaster_name: `Streamer${i % 5}`,
  broadcaster_id: `streamer-${i % 5}`,
  game_id: `game-${i % 8}`,
  game_name: ['Fortnite', 'League of Legends', 'Valorant', 'Apex Legends', 'Call of Duty', 'Minecraft', 'Just Chatting', 'GTA V'][i % 8],
  language: 'en',
  thumbnail_url: `https://picsum.photos/seed/clip${i + 1}/480/270`,
  duration: 30 + Math.random() * 60,
  view_count: Math.floor(Math.random() * 100000),
  created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  imported_at: new Date().toISOString(),
  vote_score: Math.floor(Math.random() * 1000) - 200,
  comment_count: Math.floor(Math.random() * 100),
  favorite_count: Math.floor(Math.random() * 500),
  is_featured: i % 10 === 0,
  is_nsfw: i % 15 === 0,
  is_removed: false,
  user_vote: i % 3 === 0 ? 1 : i % 7 === 0 ? -1 : null,
  user_favorited: i % 5 === 0,
}));

const ITEMS_PER_PAGE = 10;

// Fetch clips with pagination
const fetchClips = async ({ pageParam = 1 }: { pageParam?: number; filters?: ClipFeedFilters }): Promise<ClipFeedResponse> => {
  // TODO: Replace with real API call
  // const response = await apiClient.get('/clips', {
  //   params: {
  //     page: pageParam,
  //     limit: ITEMS_PER_PAGE,
  //     ...filters,
  //   },
  // });
  // return response.data;

  // Mock implementation with delay to simulate network
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const start = (pageParam - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const clips = MOCK_CLIPS.slice(start, end);

  return {
    clips,
    total: MOCK_CLIPS.length,
    page: pageParam,
    limit: ITEMS_PER_PAGE,
    has_more: end < MOCK_CLIPS.length,
  };
};

// Hook for infinite scrolling clip feed
export const useClipFeed = (filters?: ClipFeedFilters) => {
  return useInfiniteQuery({
    queryKey: ['clips', filters],
    queryFn: ({ pageParam = 1 }) => fetchClips({ pageParam, filters }),
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
};

// Hook to fetch a single clip by ID
export const useClipById = (clipId: string) => {
  return useQuery({
    queryKey: ['clip', clipId],
    queryFn: async () => {
      // TODO: Replace with real API call
      // const response = await apiClient.get(`/clips/${clipId}`);
      // return response.data;
      
      const clip = MOCK_CLIPS.find(c => c.id === clipId);
      if (!clip) throw new Error('Clip not found');
      return clip;
    },
  });
};

// Hook for voting on clips
export const useClipVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: VotePayload) => {
      // TODO: Replace with real API call
      // const response = await apiClient.post('/clips/vote', payload);
      // return response.data;
      
      await new Promise(resolve => setTimeout(resolve, 300));
      return payload;
    },
    onMutate: async (payload) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['clips'] });
      
      const previousData = queryClient.getQueriesData({ queryKey: ['clips'] });
      
      queryClient.setQueriesData({ queryKey: ['clips'] }, (old: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oldData = old as any;
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: ClipFeedResponse) => ({
            ...page,
            clips: page.clips.map((clip: Clip) => {
              if (clip.id === payload.clip_id) {
                const previousVote = clip.user_vote || 0;
                const scoreDelta = payload.vote_type - previousVote;
                
                return {
                  ...clip,
                  user_vote: payload.vote_type,
                  vote_score: clip.vote_score + scoreDelta,
                };
              }
              return clip;
            }),
          })),
        };
      });
      
      return { previousData };
    },
    onError: (_error, _payload, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueriesData({ queryKey: ['clips'] }, context.previousData);
      }
    },
  });
};

// Hook for favoriting clips
export const useClipFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FavoritePayload) => {
      // TODO: Replace with real API call
      // const response = await apiClient.post('/clips/favorite', payload);
      // return response.data;
      
      await new Promise(resolve => setTimeout(resolve, 300));
      return payload;
    },
    onMutate: async (payload) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['clips'] });
      
      const previousData = queryClient.getQueriesData({ queryKey: ['clips'] });
      
      queryClient.setQueriesData({ queryKey: ['clips'] }, (old: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oldData = old as any;
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: ClipFeedResponse) => ({
            ...page,
            clips: page.clips.map((clip: Clip) => {
              if (clip.id === payload.clip_id) {
                const isFavorited = !clip.user_favorited;
                return {
                  ...clip,
                  user_favorited: isFavorited,
                  favorite_count: clip.favorite_count + (isFavorited ? 1 : -1),
                };
              }
              return clip;
            }),
          })),
        };
      });
      
      return { previousData };
    },
    onError: (_error, _payload, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueriesData({ queryKey: ['clips'] }, context.previousData);
      }
    },
  });
};
