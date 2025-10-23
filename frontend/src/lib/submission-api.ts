import apiClient from './api';
import type {
  SubmitClipRequest,
  SubmissionResponse,
  SubmissionListResponse,
  SubmissionStatsResponse,
  ModerationQueueResponse,
} from '../types/submission';

/**
 * Submit a clip for moderation
 */
export async function submitClip(
  request: SubmitClipRequest
): Promise<SubmissionResponse> {
  const response = await apiClient.post<SubmissionResponse>(
    '/submissions',
    request
  );
  return response.data;
}

/**
 * Get user's submissions
 */
export async function getUserSubmissions(
  page = 1,
  limit = 20
): Promise<SubmissionListResponse> {
  const response = await apiClient.get<SubmissionListResponse>(
    '/submissions',
    {
      params: { page, limit },
    }
  );
  return response.data;
}

/**
 * Get submission statistics for current user
 */
export async function getSubmissionStats(): Promise<SubmissionStatsResponse> {
  const response = await apiClient.get<SubmissionStatsResponse>(
    '/submissions/stats'
  );
  return response.data;
}

/**
 * Get pending submissions for moderation (admin/moderator only)
 */
export async function getPendingSubmissions(
  page = 1,
  limit = 20
): Promise<ModerationQueueResponse> {
  const response = await apiClient.get<ModerationQueueResponse>(
    '/admin/submissions',
    {
      params: { page, limit },
    }
  );
  return response.data;
}

/**
 * Approve a submission (admin/moderator only)
 */
export async function approveSubmission(submissionId: string): Promise<void> {
  await apiClient.post(`/admin/submissions/${submissionId}/approve`);
}

/**
 * Reject a submission (admin/moderator only)
 */
export async function rejectSubmission(
  submissionId: string,
  reason: string
): Promise<void> {
  await apiClient.post(`/admin/submissions/${submissionId}/reject`, {
    reason,
  });
}
