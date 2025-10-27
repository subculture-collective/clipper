import { apiClient } from './api';
/**
 * Update user profile (display name and bio)
 */
export const updateProfile = async (data) => {
    await apiClient.put('/users/me/profile', data);
};
/**
 * Get user settings
 */
export const getUserSettings = async () => {
    const response = await apiClient.get('/users/me/settings');
    return response.data.settings;
};
/**
 * Update user settings
 */
export const updateUserSettings = async (data) => {
    await apiClient.put('/users/me/settings', data);
};
/**
 * Export user data (returns a blob for download)
 */
export const exportUserData = async () => {
    const response = await apiClient.get('/users/me/export', {
        responseType: 'blob',
    });
    return response.data;
};
/**
 * Request account deletion
 */
export const requestAccountDeletion = async (data) => {
    const response = await apiClient.post('/users/me/delete', data);
    return response.data;
};
/**
 * Cancel account deletion
 */
export const cancelAccountDeletion = async () => {
    await apiClient.post('/users/me/delete/cancel');
};
/**
 * Get account deletion status
 */
export const getAccountDeletionStatus = async () => {
    const response = await apiClient.get('/users/me/delete/status');
    return response.data;
};
