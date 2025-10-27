import { apiClient } from './api';
/**
 * Get user's notifications with optional filtering and pagination
 */
export const getNotifications = async (filter = 'all', page = 1, limit = 50) => {
    const response = await apiClient.get('/notifications', {
        params: { filter, page, limit },
    });
    return response.data;
};
/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
    const response = await apiClient.get('/notifications/count');
    return response.data.unread_count;
};
/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
    await apiClient.put(`/notifications/${notificationId}/read`);
};
/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
    await apiClient.put('/notifications/read-all');
};
/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
    await apiClient.delete(`/notifications/${notificationId}`);
};
/**
 * Get notification preferences
 */
export const getNotificationPreferences = async () => {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
};
/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (preferences) => {
    const response = await apiClient.put('/notifications/preferences', preferences);
    return response.data.preferences;
};
