import api from './api';

export interface KarmaConfig {
    initial_karma_points: number;
    submission_karma_required: number;
    require_karma_for_submission: boolean;
}

export interface PublicConfig {
    karma: KarmaConfig;
}

/**
 * Get public application configuration
 */
export const getPublicConfig = async (): Promise<PublicConfig> => {
    const response = await api.get<PublicConfig>('/config');
    return response.data;
};
