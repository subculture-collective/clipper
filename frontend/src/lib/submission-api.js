import apiClient from './api';
/**
 * Submit a clip for moderation
 */
export async function submitClip(request) {
    const response = await apiClient.post('/submissions', request);
    return response.data;
}
/**
 * Get user's submissions
 */
export async function getUserSubmissions(page = 1, limit = 20) {
    const response = await apiClient.get('/submissions', {
        params: { page, limit },
    });
    return response.data;
}
/**
 * Get submission statistics for current user
 */
export async function getSubmissionStats() {
    const response = await apiClient.get('/submissions/stats');
    return response.data;
}
/**
 * Get pending submissions for moderation (admin/moderator only)
 */
export async function getPendingSubmissions(page = 1, limit = 20) {
    const response = await apiClient.get('/admin/submissions', {
        params: { page, limit },
    });
    return response.data;
}
/**
 * Approve a submission (admin/moderator only)
 */
export async function approveSubmission(submissionId) {
    await apiClient.post(`/admin/submissions/${submissionId}/approve`);
}
/**
 * Reject a submission (admin/moderator only)
 */
export async function rejectSubmission(submissionId, reason) {
    await apiClient.post(`/admin/submissions/${submissionId}/reject`, {
        reason,
    });
}
