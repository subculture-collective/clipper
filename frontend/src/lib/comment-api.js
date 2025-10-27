import apiClient from './api';
/**
 * Fetch comments for a clip
 */
export async function fetchComments({ clipId, sort = 'best', pageParam = 1, limit = 10, }) {
    const response = await apiClient.get(`/clips/${clipId}/comments`, {
        params: {
            sort,
            cursor: (pageParam - 1) * limit,
            limit,
        },
    });
    return {
        comments: response.data.comments,
        total: response.data.total || response.data.comments.length,
        page: pageParam,
        limit,
        has_more: response.data.has_more,
    };
}
/**
 * Create a new comment
 */
export async function createComment(payload) {
    const response = await apiClient.post(`/clips/${payload.clip_id}/comments`, {
        content: payload.content,
        parent_id: payload.parent_id,
    });
    return response.data;
}
/**
 * Update a comment
 */
export async function updateComment(commentId, payload) {
    const response = await apiClient.put(`/comments/${commentId}`, payload);
    return response.data;
}
/**
 * Delete a comment
 */
export async function deleteComment(commentId) {
    const response = await apiClient.delete(`/comments/${commentId}`);
    return response.data;
}
/**
 * Vote on a comment
 */
export async function voteOnComment(payload) {
    const response = await apiClient.post(`/comments/${payload.comment_id}/vote`, {
        vote: payload.vote_type,
    });
    return response.data;
}
/**
 * Report a comment
 */
export async function reportComment(payload) {
    const response = await apiClient.post('/reports', {
        target_type: 'comment',
        target_id: payload.comment_id,
        reason: payload.reason,
        description: payload.description,
    });
    return response.data;
}
