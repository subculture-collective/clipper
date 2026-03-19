import { apiRequest, setTokens, clearTokens } from '../api-client';
import type { User, UserStats } from '@/types';

export const authApi = {
  getMe() {
    return apiRequest<User>('/auth/me');
  },

  logout() {
    return apiRequest<void>('/auth/logout', { method: 'POST' }).finally(clearTokens);
  },

  refresh(refreshToken: string) {
    return apiRequest<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
      auth: false,
    });
  },
};

export const usersApi = {
  getById(id: string) {
    return apiRequest<User>(`/users/${encodeURIComponent(id)}`, { auth: false });
  },

  getByUsername(username: string) {
    return apiRequest<User>(`/users/by-username/${encodeURIComponent(username)}`, { auth: false });
  },

  getStats(id: string) {
    return apiRequest<UserStats>(`/users/me/stats`);
  },

  getKarma(id: string) {
    return apiRequest<{ karma: number }>(`/users/${encodeURIComponent(id)}/karma`, { auth: false });
  },

  follow(id: string) {
    return apiRequest<void>(`/users/${encodeURIComponent(id)}/follow`, { method: 'POST' });
  },

  unfollow(id: string) {
    return apiRequest<void>(`/users/${encodeURIComponent(id)}/follow`, { method: 'DELETE' });
  },

  updateProfile(data: { display_name?: string; bio?: string; avatar_url?: string }) {
    return apiRequest<User>('/users/me/profile', { method: 'PUT', body: data });
  },

  getSettings() {
    return apiRequest<Record<string, unknown>>('/users/me/settings');
  },

  updateSettings(settings: Record<string, unknown>) {
    return apiRequest<void>('/users/me/settings', { method: 'PUT', body: settings });
  },

  getUpvoted(id: string, page = 1) {
    return apiRequest<import('@/types').PaginatedResponse<import('@/types').Clip>>(
      `/users/${encodeURIComponent(id)}/upvoted`,
      { params: { page } },
    );
  },

  getFavorites(id: string, page = 1) {
    return apiRequest<import('@/types').PaginatedResponse<import('@/types').Clip>>(
      `/users/${encodeURIComponent(id)}/clips`,
      { params: { page } },
    );
  },
};

export const searchApi = {
  search(query: string, params: Record<string, string | number> = {}) {
    return apiRequest<import('@/types').SearchResults>('/search', {
      params: { q: query, ...params },
      auth: false,
    });
  },

  suggestions(query: string) {
    return apiRequest<import('@/types').SearchSuggestion[]>('/search/suggestions', {
      params: { q: query },
      auth: false,
    });
  },

  trending() {
    return apiRequest<string[]>('/search/trending', { auth: false });
  },
};

export { setTokens, clearTokens };
