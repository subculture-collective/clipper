import { apiClient } from './api';

export interface User {
  id: string;
  twitch_id: string;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  role: 'user' | 'admin' | 'moderator';
  karma_points: number;
  is_banned: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

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
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
}

/**
 * Refreshes the access token using the refresh token
 */
export async function refreshToken(): Promise<AuthTokens> {
  const response = await apiClient.post<AuthTokens>('/auth/refresh');
  return response.data;
}

/**
 * Logs out the current user
 */
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
