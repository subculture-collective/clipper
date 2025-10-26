import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Clip,
  ClipFeedFilters,
  ClipFeedResponse,
  VotePayload,
  FavoritePayload,
} from "@/types/clip";
import * as clipApi from "@/lib/clip-api";

// Hook for infinite scrolling clip feed
export const useClipFeed = (filters?: ClipFeedFilters) => {
  return useInfiniteQuery({
    queryKey: ["clips", filters],
    queryFn: ({ pageParam = 1 }) => clipApi.fetchClips({ pageParam, filters }),
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
};

// Hook to fetch a single clip by ID
export const useClipById = (clipId: string) => {
  return useQuery({
    queryKey: ["clip", clipId],
    queryFn: () => clipApi.fetchClipById(clipId),
    enabled: !!clipId,
  });
};

// Hook for voting on clips
export const useClipVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: VotePayload) => {
      return await clipApi.voteOnClip(payload);
    },
    onMutate: async (payload) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["clips"] });

      const previousData = queryClient.getQueriesData({ queryKey: ["clips"] });

      queryClient.setQueriesData({ queryKey: ["clips"] }, (old: unknown) => {
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
        queryClient.setQueriesData(
          { queryKey: ["clips"] },
          context.previousData
        );
      }
    },
  });
};

// Hook for favoriting clips
export const useClipFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FavoritePayload) => {
      // Check cache to determine if we should add or remove
      // This iterates cached clips but typically there are only a few pages cached
      const cachedClip = queryClient
        .getQueriesData({ queryKey: ["clips"] })
        .flatMap(([, data]) => {
          const queryData = data as { pages?: ClipFeedResponse[] };
          return queryData?.pages?.flatMap((page) => page.clips) || [];
        })
        .find((clip) => clip.id === payload.clip_id);

      const isCurrentlyFavorited = cachedClip?.user_favorited;

      if (isCurrentlyFavorited) {
        return await clipApi.removeFavorite(payload);
      } else {
        return await clipApi.addFavorite(payload);
      }
    },
    onMutate: async (payload) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["clips"] });

      const previousData = queryClient.getQueriesData({ queryKey: ["clips"] });

      queryClient.setQueriesData({ queryKey: ["clips"] }, (old: unknown) => {
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
        queryClient.setQueriesData(
          { queryKey: ["clips"] },
          context.previousData
        );
      }
    },
  });
};
