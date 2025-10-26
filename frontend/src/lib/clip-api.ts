import apiClient from './api';
import type {
  Clip,
  ClipFeedResponse,
  ClipFeedFilters,
  VotePayload,
  FavoritePayload,
} from '@/types/clip';

/**
 * Fetch clips with pagination and filters
 */
export async function fetchClips({
  pageParam = 1,
  filters,
}: {
  pageParam?: number;
  filters?: ClipFeedFilters;
}): Promise<ClipFeedResponse> {
  const params: Record<string, string | number | boolean> = {
    page: pageParam,
    limit: 10,
  };

  // Add filters to params, only if they are defined
  if (filters) {
    if (filters.sort) params.sort = filters.sort;
    if (filters.timeframe) params.timeframe = filters.timeframe;
    if (filters.game_id) params.game_id = filters.game_id;
    if (filters.creator_id) params.creator_id = filters.creator_id;
    if (filters.language) params.language = filters.language;
    if (filters.nsfw !== undefined) params.nsfw = filters.nsfw;
    if (filters.top10k_streamers !== undefined) params.top10k_streamers = filters.top10k_streamers;
    if (filters.tags && filters.tags.length > 0) {
      params.tag = filters.tags.join(',');
    }
  }

  const response = await apiClient.get<{
    success: boolean;
    data: Clip[];
    meta: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  }>('/clips', { params });

  return {
    clips: response.data.data,
    total: response.data.meta.total,
    page: response.data.meta.page,
    limit: response.data.meta.limit,
    has_more: response.data.meta.has_next,
  };
}

/**
 * Fetch a single clip by ID
 */
export async function fetchClipById(clipId: string): Promise<Clip> {
  const response = await apiClient.get<{
    success: boolean;
    data: Clip;
  }>(`/clips/${clipId}`);

  return response.data.data;
}

/**
 * Vote on a clip
 */
export async function voteOnClip(payload: VotePayload): Promise<{
  message: string;
  vote_score: number;
  upvote_count: number;
  downvote_count: number;
  user_vote: number;
}> {
  const response = await apiClient.post<{
    success: boolean;
    data: {
      message: string;
      vote_score: number;
      upvote_count: number;
      downvote_count: number;
      user_vote: number;
    };
  }>(`/clips/${payload.clip_id}/vote`, {
    vote: payload.vote_type,
  });

  return response.data.data;
}

/**
 * Add a clip to favorites
 */
export async function addFavorite(payload: FavoritePayload): Promise<{
  message: string;
  is_favorited: boolean;
}> {
  const response = await apiClient.post<{
    success: boolean;
    data: {
      message: string;
      is_favorited: boolean;
    };
  }>(`/clips/${payload.clip_id}/favorite`);

  return response.data.data;
}

/**
 * Remove a clip from favorites
 */
export async function removeFavorite(payload: FavoritePayload): Promise<{
  message: string;
  is_favorited: boolean;
}> {
  const response = await apiClient.delete<{
    success: boolean;
    data: {
      message: string;
      is_favorited: boolean;
    };
  }>(`/clips/${payload.clip_id}/favorite`);

  return response.data.data;
}
