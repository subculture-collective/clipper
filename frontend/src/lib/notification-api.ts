import type {
    NotificationCountResponse,
    NotificationFilter,
    NotificationListResponse,
    NotificationPreferences,
} from '../types/notification';
import { apiClient } from './api';

/**
 * Get user's notifications with optional filtering and pagination
 */
export const getNotifications = async (
    filter: NotificationFilter = 'all',
    page: number = 1,
    limit: number = 50
): Promise<NotificationListResponse> => {
    const response = await apiClient.get<NotificationListResponse>(
        '/notifications',
        {
            params: { filter, page, limit },
        }
    );
    return response.data;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (): Promise<number> => {
    const response = await apiClient.get<NotificationCountResponse>(
        '/notifications/count'
    );
    return response.data.unread_count;
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (
    notificationId: string
): Promise<void> => {
    await apiClient.put(`/notifications/${notificationId}/read`);
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
    await apiClient.put('/notifications/read-all');
};

/**
 * Delete a notification
 */
export const deleteNotification = async (
    notificationId: string
): Promise<void> => {
    await apiClient.delete(`/notifications/${notificationId}`);
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences =
    async (): Promise<NotificationPreferences> => {
        const response = await apiClient.get<NotificationPreferences>(
            '/notifications/preferences'
        );
        return response.data;
    };

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
    preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
    const response = await apiClient.put<{
        preferences: NotificationPreferences;
    }>('/notifications/preferences', preferences);
    return response.data.preferences;
};

/**
 * Reset notification preferences to defaults
 */
export const resetNotificationPreferences =
    async (): Promise<NotificationPreferences> => {
        const response = await apiClient.post<{
            preferences: NotificationPreferences;
        }>('/notifications/preferences/reset');
        return response.data.preferences;
    };
