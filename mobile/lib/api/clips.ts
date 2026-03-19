import { apiRequest } from './api-client';
import type { Clip, PaginatedResponse, Tag, Game, Comment } from '@/types';

export type ClipSortBy = 'hot' | 'trending' | 'new' | 'top';

interface ListClipsParams {
  page?: number;
  per_page?: number;
  sort?: ClipSortBy;
  game_id?: string;
  tag?: string;
  broadcaster?: string;
}

export const clipsApi = {
  list(params: ListClipsParams = {}) {
    return apiRequest<PaginatedResponse<Clip>>('/clips', {
      params: params as Record<string, string | number | undefined>,
      auth: false,
    });
  },

  getById(id: string) {
    return apiRequest<Clip>(`/clips/${encodeURIComponent(id)}`);
  },

  getRelated(id: string) {
    return apiRequest<Clip[]>(`/clips/${encodeURIComponent(id)}/related`, { auth: false });
  },

  vote(id: string, direction: 'up' | 'down') {
    return apiRequest<{ vote_score: number }>(`/clips/${encodeURIComponent(id)}/vote`, {
      method: 'POST',
      body: { direction },
    });
  },

  favorite(id: string) {
    return apiRequest<void>(`/clips/${encodeURIComponent(id)}/favorite`, { method: 'POST' });
  },

  unfavorite(id: string) {
    return apiRequest<void>(`/clips/${encodeURIComponent(id)}/favorite`, { method: 'DELETE' });
  },

  getTags(id: string) {
    return apiRequest<Tag[]>(`/clips/${encodeURIComponent(id)}/tags`, { auth: false });
  },

  getComments(id: string, page = 1) {
    return apiRequest<PaginatedResponse<Comment>>(`/clips/${encodeURIComponent(id)}/comments`, {
      params: { page },
      auth: false,
    });
  },

  createComment(id: string, content: string, parentId?: string) {
    return apiRequest<Comment>(`/clips/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      body: { content, parent_comment_id: parentId },
    });
  },

  trackView(id: string) {
    return apiRequest<void>(`/clips/${encodeURIComponent(id)}/track-view`, {
      method: 'POST',
      auth: false,
    });
  },
};

export const gamesApi = {
  getTrending() {
    return apiRequest<Game[]>('/games/trending', { auth: false });
  },

  getById(id: string) {
    return apiRequest<Game>(`/games/${encodeURIComponent(id)}`, { auth: false });
  },

  getClips(id: string, page = 1) {
    return apiRequest<PaginatedResponse<Clip>>(`/games/${encodeURIComponent(id)}/clips`, {
      params: { page },
      auth: false,
    });
  },
};

export const tagsApi = {
  search(query: string) {
    return apiRequest<Tag[]>('/tags/search', {
      params: { q: query },
      auth: false,
    });
  },

  getTrending() {
    return apiRequest<Tag[]>('/tags', {
      params: { sort: 'trending', per_page: 10 },
      auth: false,
    });
  },
};
