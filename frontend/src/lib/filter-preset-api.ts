import apiClient from './api';
import type {
    FilterPreset,
    CreateFilterPresetRequest,
    UpdateFilterPresetRequest,
} from '@/types/clip';

/**
 * Fetch all filter presets for the current user
 */
export async function fetchFilterPresets(userId: string): Promise<FilterPreset[]> {
    const response = await apiClient.get<FilterPreset[]>(
        `/users/${userId}/filter-presets`
    );
    return response.data;
}

/**
 * Create a new filter preset
 */
export async function createFilterPreset(
    userId: string,
    data: CreateFilterPresetRequest
): Promise<FilterPreset> {
    const response = await apiClient.post<FilterPreset>(
        `/users/${userId}/filter-presets`,
        data
    );
    return response.data;
}

/**
 * Update a filter preset
 */
export async function updateFilterPreset(
    userId: string,
    presetId: string,
    data: UpdateFilterPresetRequest
): Promise<FilterPreset> {
    const response = await apiClient.put<FilterPreset>(
        `/users/${userId}/filter-presets/${presetId}`,
        data
    );
    return response.data;
}

/**
 * Delete a filter preset
 */
export async function deleteFilterPreset(
    userId: string,
    presetId: string
): Promise<void> {
    await apiClient.delete(`/users/${userId}/filter-presets/${presetId}`);
}

/**
 * Get a specific filter preset
 */
export async function getFilterPreset(
    userId: string,
    presetId: string
): Promise<FilterPreset> {
    const response = await apiClient.get<FilterPreset>(
        `/users/${userId}/filter-presets/${presetId}`
    );
    return response.data;
}
