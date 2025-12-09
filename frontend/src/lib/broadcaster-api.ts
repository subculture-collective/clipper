import apiClient from './api';
import type { Clip } from '@/types/clip';

export interface BroadcasterProfile {
  broadcaster_id: string;
  broadcaster_name: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  twitch_url: string;
  total_clips: number;
  follower_count: number;
  total_views: number;
  avg_vote_score: number;
  is_following: boolean;
  updated_at: string;
}

export interface BroadcasterClipsResponse {
  success: boolean;
  data: Clip[];
  meta: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
}

export interface BroadcasterClipsFilters {
  page?: number;
  limit?: number;
  sort?: 'recent' | 'popular' | 'trending';
}

/**
 * Fetch broadcaster profile by broadcaster ID
 */
export async function fetchBroadcasterProfile(
  broadcasterId: string
): Promise<BroadcasterProfile> {
  const response = await apiClient.get<BroadcasterProfile>(
    `/broadcasters/${broadcasterId}`
  );
  return response.data;
}

/**
 * Fetch clips for a broadcaster with pagination and sorting
 */
export async function fetchBroadcasterClips(
  broadcasterId: string,
  filters?: BroadcasterClipsFilters
): Promise<BroadcasterClipsResponse> {
  const params: Record<string, string | number> = {
    page: filters?.page || 1,
    limit: filters?.limit || 20,
  };

  if (filters?.sort) {
    params.sort = filters.sort;
  }

  const response = await apiClient.get<BroadcasterClipsResponse>(
    `/broadcasters/${broadcasterId}/clips`,
    { params }
  );
  return response.data;
}

/**
 * Follow a broadcaster
 */
export async function followBroadcaster(
  broadcasterId: string
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    `/broadcasters/${broadcasterId}/follow`
  );
  return response.data;
}

/**
 * Unfollow a broadcaster
 */
export async function unfollowBroadcaster(
  broadcasterId: string
): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(
    `/broadcasters/${broadcasterId}/follow`
  );
  return response.data;
}
