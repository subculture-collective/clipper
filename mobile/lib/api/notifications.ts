import { apiRequest } from '../api-client';
import type { Notification, NotificationPreferences, PaginatedResponse } from '@/types';

export const notificationsApi = {
  list(page = 1) {
    return apiRequest<PaginatedResponse<Notification>>('/notifications', {
      params: { page },
    });
  },

  markRead(id: string) {
    return apiRequest<void>(`/notifications/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { is_read: true },
    });
  },

  markAllRead() {
    return apiRequest<void>('/notifications/read-all', { method: 'PUT' });
  },

  getPreferences() {
    return apiRequest<NotificationPreferences>('/notifications/preferences');
  },

  updatePreferences(prefs: Partial<NotificationPreferences>) {
    return apiRequest<void>('/notifications/preferences', {
      method: 'PUT',
      body: prefs,
    });
  },
};
