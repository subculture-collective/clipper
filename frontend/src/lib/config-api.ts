import { apiClient } from './api';

export interface EngagementConfig {
    vote_weight: number;
    comment_weight: number;
    favorite_weight: number;
    view_weight: number;
}

export interface UpdateEngagementConfigResponse {
    message: string;
    config: EngagementConfig;
}

export interface PresetProfile {
    id: string;
    name: string;
    description?: string;
    vote_weight: number;
    comment_weight: number;
    favorite_weight: number;
    view_weight: number;
    is_system: boolean;
    created_by?: string;
    created_at: string;
    updated_by?: string;
    updated_at: string;
}

export interface CreatePresetRequest {
    name: string;
    description?: string;
    vote_weight: number;
    comment_weight: number;
    favorite_weight: number;
    view_weight: number;
}

export interface UpdatePresetRequest {
    name: string;
    description?: string;
    vote_weight: number;
    comment_weight: number;
    favorite_weight: number;
    view_weight: number;
}

export const configApi = {
    getEngagementConfig: async (): Promise<EngagementConfig> => {
        const { data } = await apiClient.get<EngagementConfig>(
            '/admin/config/engagement'
        );
        return data;
    },

    updateEngagementConfig: async (
        config: EngagementConfig
    ): Promise<UpdateEngagementConfigResponse> => {
        const { data } = await apiClient.put<UpdateEngagementConfigResponse>(
            '/admin/config/engagement',
            config
        );
        return data;
    },

    getPresets: async (): Promise<PresetProfile[]> => {
        const { data } = await apiClient.get<{ presets: PresetProfile[] }>(
            '/admin/presets'
        );
        return data.presets;
    },

    getPreset: async (id: string): Promise<PresetProfile> => {
        const { data } = await apiClient.get<PresetProfile>(
            `/admin/presets/${id}`
        );
        return data;
    },

    createPreset: async (
        preset: CreatePresetRequest
    ): Promise<PresetProfile> => {
        const { data } = await apiClient.post<PresetProfile>(
            '/admin/presets',
            preset
        );
        return data;
    },

    updatePreset: async (
        id: string,
        preset: UpdatePresetRequest
    ): Promise<PresetProfile> => {
        const { data } = await apiClient.put<PresetProfile>(
            `/admin/presets/${id}`,
            preset
        );
        return data;
    },

    deletePreset: async (id: string): Promise<void> => {
        await apiClient.delete(`/admin/presets/${id}`);
    },
};
