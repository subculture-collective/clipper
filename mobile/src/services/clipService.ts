import { Clip, ClipFeedResponse, ClipFeedFilters } from '@clipper/shared';

import api from './api';

export const clipService = {
  async getClips(
    filters?: ClipFeedFilters & { page?: number; limit?: number }
  ): Promise<ClipFeedResponse> {
    const response = await api.get<ClipFeedResponse>('/clips/feed', {
      params: filters,
    });
    return response.data;
  },

  async getClipById(id: string): Promise<Clip> {
    const response = await api.get<Clip>(`/clips/${id}`);
    return response.data;
  },

  async voteClip(clipId: string, voteType: 1 | -1): Promise<void> {
    await api.post('/clips/vote', {
      clip_id: clipId,
      vote_type: voteType,
    });
  },

  async favoriteClip(clipId: string): Promise<void> {
    await api.post('/clips/favorite', {
      clip_id: clipId,
    });
  },

  async unfavoriteClip(clipId: string): Promise<void> {
    await api.delete(`/clips/favorite/${clipId}`);
  },
};
