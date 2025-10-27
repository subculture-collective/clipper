import apiClient from './api';
// Creator Analytics API
export const getCreatorAnalyticsOverview = async (creatorName) => {
    const response = await apiClient.get(`/creators/${encodeURIComponent(creatorName)}/analytics/overview`);
    return response.data;
};
export const getCreatorTopClips = async (creatorName, params) => {
    const response = await apiClient.get(`/creators/${encodeURIComponent(creatorName)}/analytics/clips`, { params });
    return response.data;
};
export const getCreatorTrends = async (creatorName, params) => {
    const response = await apiClient.get(`/creators/${encodeURIComponent(creatorName)}/analytics/trends`, { params });
    return response.data;
};
// Clip Analytics API
export const getClipAnalytics = async (clipId) => {
    const response = await apiClient.get(`/clips/${clipId}/analytics`);
    return response.data;
};
export const trackClipView = async (clipId) => {
    await apiClient.post(`/clips/${clipId}/track-view`);
};
// User Analytics API
export const getUserStats = async () => {
    const response = await apiClient.get('/users/me/stats');
    return response.data;
};
// Admin Analytics API
export const getPlatformOverview = async () => {
    const response = await apiClient.get('/admin/analytics/overview');
    return response.data;
};
export const getContentMetrics = async () => {
    const response = await apiClient.get('/admin/analytics/content');
    return response.data;
};
export const getPlatformTrends = async (params) => {
    const response = await apiClient.get('/admin/analytics/trends', { params });
    return response.data;
};
