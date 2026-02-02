/**
 * User settings service - Handles user profile and settings operations
 */

import { api } from '@/lib/api';

export interface User {
    id: string;
    username: string;
    display_name: string;
    profile_image_url?: string;
    reputation_score?: number;
    bio?: string;
    created_at: string;
}

export interface UserSettings {
    user_id: string;
    profile_visibility: 'public' | 'private' | 'followers';
    show_karma_publicly: boolean;
    created_at: string;
    updated_at: string;
}

export interface UpdateProfileData {
    display_name: string;
    bio?: string;
}

export interface UpdateSettingsData {
    profile_visibility?: 'public' | 'private' | 'followers';
    show_karma_publicly?: boolean;
}

/**
 * Get public user profile by ID
 */
export async function getUser(userId: string): Promise<User> {
    const response = await api.get<{ user: User }>(`/api/v1/users/${userId}`);
    return response.data.user;
}

/**
 * Update user profile (display name and bio)
 * @throws Error if display_name is empty or invalid
 */
export async function updateProfile(data: UpdateProfileData): Promise<void> {
    if (!data.display_name || typeof data.display_name !== 'string' || data.display_name.trim() === '') {
        throw new Error('Display name cannot be empty');
    }
    await api.put('/api/v1/users/me/profile', data);
}

/**
 * Get user settings
 */
export async function getUserSettings(): Promise<UserSettings> {
    const response = await api.get<{ settings: UserSettings }>('/api/v1/users/me/settings');
    return response.data.settings;
}

/**
 * Update user settings
 */
export async function updateUserSettings(data: UpdateSettingsData): Promise<void> {
    await api.put('/api/v1/users/me/settings', data);
}

/**
 * Export user data
 */
export async function exportUserData(): Promise<Blob> {
    const response = await api.get('/api/v1/users/me/export', {
        responseType: 'blob',
    });
    return response.data;
}

/**
 * Request account deletion
 * @param reason Optional reason for account deletion
 * @returns An object with `scheduled_for` as an ISO 8601 date string (e.g., "2024-06-01T12:00:00Z")
 */
export async function requestAccountDeletion(reason?: string): Promise<{ scheduled_for: string }> {
    const response = await api.post<{ scheduled_for: string }>('/api/v1/users/me/delete', {
        confirmation: 'DELETE MY ACCOUNT',
        reason,
    });
    return response.data;
}

/**
 * Cancel account deletion
 */
export async function cancelAccountDeletion(): Promise<void> {
    await api.post('/api/v1/users/me/delete/cancel');
}

/**
 * Get account deletion status
 * @returns Object with deletion status information:
 *  - `pending`: true if account deletion is scheduled, false otherwise
 *  - `scheduled_for`: ISO 8601 date string when account will be deleted (only present if pending is true)
 *  - `requested_at`: ISO 8601 date string when deletion was requested (only present if pending is true)
 */
export async function getDeletionStatus(): Promise<{
    pending: boolean;
    scheduled_for?: string;
    requested_at?: string;
}> {
    const response = await api.get('/api/v1/users/me/delete/status');
    return response.data;
}
