import { apiClient } from './api';
import type { DiscoveryListWithStats } from '../types/discoveryList';
import type { ClipFeedResponse } from '../types/clip';

export const discoveryListApi = {
  // List all discovery lists
  listDiscoveryLists: async (params?: {
    featured?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get<DiscoveryListWithStats[]>(
      '/discovery-lists',
      { params }
    );
    return response.data;
  },

  // Get a single discovery list by ID or slug
  getDiscoveryList: async (idOrSlug: string) => {
    const response = await apiClient.get<DiscoveryListWithStats>(
      `/discovery-lists/${idOrSlug}`
    );
    return response.data;
  },

  // Get clips in a discovery list
  getDiscoveryListClips: async (
    listId: string,
    params?: { limit?: number; offset?: number }
  ) => {
    const response = await apiClient.get<ClipFeedResponse>(
      `/discovery-lists/${listId}/clips`,
      { params }
    );
    return response.data;
  },

  // Follow a discovery list
  followDiscoveryList: async (listId: string) => {
    const response = await apiClient.post<{ message: string }>(
      `/discovery-lists/${listId}/follow`
    );
    return response.data;
  },

  // Unfollow a discovery list
  unfollowDiscoveryList: async (listId: string) => {
    const response = await apiClient.delete<{ message: string }>(
      `/discovery-lists/${listId}/follow`
    );
    return response.data;
  },

  // Bookmark a discovery list
  bookmarkDiscoveryList: async (listId: string) => {
    const response = await apiClient.post<{ message: string }>(
      `/discovery-lists/${listId}/bookmark`
    );
    return response.data;
  },

  // Unbookmark a discovery list
  unbookmarkDiscoveryList: async (listId: string) => {
    const response = await apiClient.delete<{ message: string }>(
      `/discovery-lists/${listId}/bookmark`
    );
    return response.data;
  },

  // Get user's followed discovery lists
  getUserFollowedLists: async (params?: { limit?: number; offset?: number }) => {
    const response = await apiClient.get<DiscoveryListWithStats[]>(
      '/users/me/discovery-list-follows',
      { params }
    );
    return response.data;
  },
};
