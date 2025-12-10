import { apiClient } from "./api";
import type {
  GameDetailResponse,
  GameListResponse,
  TrendingGamesResponse,
  GameFollowResponse,
} from "../types/game";
import type { ClipFeedResponse } from "../types/clip";

export const gameApi = {
  // Get game details
  getGame: async (gameId: string) => {
    const response = await apiClient.get<GameDetailResponse>(`/games/${gameId}`);
    return response.data;
  },

  // Get clips for a game
  getGameClips: async (
    gameId: string,
    params?: {
      limit?: number;
      page?: number;
      sort?: "hot" | "new" | "top" | "rising";
      timeframe?: "hour" | "day" | "week" | "month" | "year" | "all";
    }
  ) => {
    const response = await apiClient.get<ClipFeedResponse>(
      `/games/${gameId}/clips`,
      { params }
    );
    return response.data;
  },

  // Get trending games
  getTrendingGames: async (params?: { limit?: number; page?: number }) => {
    const response = await apiClient.get<TrendingGamesResponse>(
      "/games/trending",
      { params }
    );
    return response.data;
  },

  // Follow a game
  followGame: async (gameId: string) => {
    const response = await apiClient.post<GameFollowResponse>(
      `/games/${gameId}/follow`
    );
    return response.data;
  },

  // Unfollow a game
  unfollowGame: async (gameId: string) => {
    const response = await apiClient.delete<GameFollowResponse>(
      `/games/${gameId}/follow`
    );
    return response.data;
  },

  // Get followed games for a user
  getFollowedGames: async (
    userId: string,
    params?: { limit?: number; page?: number }
  ) => {
    const response = await apiClient.get<GameListResponse>(
      `/users/${userId}/games/following`,
      { params }
    );
    return response.data;
  },
};
