import { apiClient } from './api';
/**
 * Initiates Twitch OAuth flow by redirecting to backend
 */
export function initiateOAuth() {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
    window.location.href = `${apiUrl}/auth/twitch`;
}
/**
 * Gets the current authenticated user
 */
export async function getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
}
/**
 * Refreshes the access token using the refresh token
 */
export async function refreshToken() {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
}
/**
 * Logs out the current user
 */
export async function logout() {
    await apiClient.post('/auth/logout');
}
