import { apiRequest } from '../api-client';
import type { Collection, PaginatedResponse, Clip } from '@/types';

export const collectionsApi = {
  list(userId: string, page = 1) {
    return apiRequest<PaginatedResponse<Collection>>(`/users/${encodeURIComponent(userId)}/feeds`, {
      params: { page },
    });
  },

  getById(id: string) {
    return apiRequest<Collection>(`/playlists/${encodeURIComponent(id)}`, { auth: false });
  },

  create(data: { title: string; description?: string; visibility?: string }) {
    return apiRequest<Collection>('/playlists', { method: 'POST', body: data });
  },

  update(id: string, data: Partial<{ title: string; description: string; visibility: string }>) {
    return apiRequest<Collection>(`/playlists/${encodeURIComponent(id)}`, { method: 'PATCH', body: data });
  },

  delete(id: string) {
    return apiRequest<void>(`/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  getClips(id: string, page = 1) {
    return apiRequest<PaginatedResponse<Clip>>(`/playlists/${encodeURIComponent(id)}/clips`, {
      params: { page },
      auth: false,
    });
  },

  addClip(id: string, clipId: string) {
    return apiRequest<void>(`/playlists/${encodeURIComponent(id)}/clips`, {
      method: 'POST',
      body: { clip_id: clipId },
    });
  },

  removeClip(id: string, clipId: string) {
    return apiRequest<void>(`/playlists/${encodeURIComponent(id)}/clips/${encodeURIComponent(clipId)}`, {
      method: 'DELETE',
    });
  },
};
