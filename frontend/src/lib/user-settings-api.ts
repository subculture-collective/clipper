import { apiClient } from './api';

/**
 * User Settings Types
 */
export interface UserSettings {
  user_id: string;
  profile_visibility: 'public' | 'private' | 'followers';
  show_karma_publicly: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  display_name: string;
  bio?: string | null;
}

export interface UpdateSettingsRequest {
  profile_visibility?: 'public' | 'private' | 'followers';
  show_karma_publicly?: boolean;
}

export interface DeleteAccountRequest {
  reason?: string;
  confirmation: string;
}

export interface AccountDeletionStatus {
  pending: boolean;
  scheduled_for?: string;
  requested_at?: string;
}

/**
 * Update user profile (display name and bio)
 */
export const updateProfile = async (data: UpdateProfileRequest): Promise<void> => {
  await apiClient.put('/users/me/profile', data);
};

/**
 * Get user settings
 */
export const getUserSettings = async (): Promise<UserSettings> => {
  const response = await apiClient.get<{ settings: UserSettings }>('/users/me/settings');
  return response.data.settings;
};

/**
 * Update user settings
 */
export const updateUserSettings = async (data: UpdateSettingsRequest): Promise<void> => {
  await apiClient.put('/users/me/settings', data);
};

/**
 * Export user data (returns a blob for download)
 */
export const exportUserData = async (): Promise<Blob> => {
  const response = await apiClient.get('/users/me/export', {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Request account deletion
 */
export const requestAccountDeletion = async (data: DeleteAccountRequest): Promise<{ message: string; scheduled_for: string }> => {
  const response = await apiClient.post<{ message: string; scheduled_for: string }>('/users/me/delete', data);
  return response.data;
};

/**
 * Cancel account deletion
 */
export const cancelAccountDeletion = async (): Promise<void> => {
  await apiClient.post('/users/me/delete/cancel');
};

/**
 * Get account deletion status
 */
export const getAccountDeletionStatus = async (): Promise<AccountDeletionStatus> => {
  const response = await apiClient.get<AccountDeletionStatus>('/users/me/delete/status');
  return response.data;
};
