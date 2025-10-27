import apiClient from './api';
/**
 * Fetch clips with pagination and filters
 */
export async function fetchClips({ pageParam = 1, filters, }) {
    const params = {
        page: pageParam,
        limit: 10,
    };
    // Add filters to params, only if they are defined
    if (filters) {
        if (filters.sort)
            params.sort = filters.sort;
        if (filters.timeframe)
            params.timeframe = filters.timeframe;
        if (filters.game_id)
            params.game_id = filters.game_id;
        if (filters.creator_id)
            params.creator_id = filters.creator_id;
        if (filters.language)
            params.language = filters.language;
        if (filters.nsfw !== undefined)
            params.nsfw = filters.nsfw;
        if (filters.top10k_streamers !== undefined)
            params.top10k_streamers = filters.top10k_streamers;
        if (filters.tags && filters.tags.length > 0) {
            params.tag = filters.tags.join(',');
        }
    }
    const response = await apiClient.get('/clips', { params });
    return {
        clips: response.data.data,
        total: response.data.meta.total,
        page: response.data.meta.page,
        limit: response.data.meta.limit,
        has_more: response.data.meta.has_next,
    };
}
/**
 * Fetch a single clip by ID
 */
export async function fetchClipById(clipId) {
    const response = await apiClient.get(`/clips/${clipId}`);
    return response.data.data;
}
/**
 * Vote on a clip
 */
export async function voteOnClip(payload) {
    const response = await apiClient.post(`/clips/${payload.clip_id}/vote`, {
        vote: payload.vote_type,
    });
    return response.data.data;
}
/**
 * Add a clip to favorites
 */
export async function addFavorite(payload) {
    const response = await apiClient.post(`/clips/${payload.clip_id}/favorite`);
    return response.data.data;
}
/**
 * Remove a clip from favorites
 */
export async function removeFavorite(payload) {
    const response = await apiClient.delete(`/clips/${payload.clip_id}/favorite`);
    return response.data.data;
}
