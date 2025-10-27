import apiClient from './api';
/**
 * Fetch comments by a user
 */
export async function fetchUserComments(userId, page = 1, limit = 10) {
    const response = await apiClient.get(`/users/${userId}/comments`, {
        params: { page, limit },
    });
    return response.data;
}
/**
 * Fetch clips that a user has upvoted
 */
export async function fetchUserUpvotedClips(userId, page = 1, limit = 10) {
    const response = await apiClient.get(`/users/${userId}/upvoted`, {
        params: { page, limit },
    });
    return {
        clips: response.data.data,
        total: response.data.meta.total,
        page: response.data.meta.page,
        limit: response.data.meta.limit,
        has_more: response.data.meta.has_next,
    };
}
/**
 * Fetch clips that a user has downvoted
 */
export async function fetchUserDownvotedClips(userId, page = 1, limit = 10) {
    const response = await apiClient.get(`/users/${userId}/downvoted`, {
        params: { page, limit },
    });
    return {
        clips: response.data.data,
        total: response.data.meta.total,
        page: response.data.meta.page,
        limit: response.data.meta.limit,
        has_more: response.data.meta.has_next,
    };
}
/**
 * Initiate Twitch reauthorization flow
 */
export async function reauthorizeTwitch() {
    const response = await apiClient.post('/auth/twitch/reauthorize');
    return response.data;
}
