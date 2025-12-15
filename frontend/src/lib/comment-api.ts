import apiClient from './api';
import type {
  Comment,
  CommentFeedResponse,
  CommentSortOption,
  CreateCommentPayload,
  UpdateCommentPayload,
  CommentVotePayload,
  ReportCommentPayload,
} from '@/types/comment';

/**
 * Fetch comments for a clip
 */
export async function fetchComments({
  clipId,
  sort = 'best',
  pageParam = 1,
  limit = 10,
  includeReplies = false,
}: {
  clipId: string;
  sort?: CommentSortOption;
  pageParam?: number;
  limit?: number;
  includeReplies?: boolean;
}): Promise<CommentFeedResponse> {
  const response = await apiClient.get<{
    comments: Comment[];
    total?: number;
    next_cursor?: number;
    has_more: boolean;
  }>(`/clips/${clipId}/comments`, {
    params: {
      sort,
      cursor: (pageParam - 1) * limit,
      limit,
      include_replies: includeReplies,
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
export async function createComment(
  payload: CreateCommentPayload
): Promise<Comment> {
  const response = await apiClient.post<Comment>(
    `/clips/${payload.clip_id}/comments`,
    {
      content: payload.content,
      parent_id: payload.parent_id,
    }
  );
  return response.data;
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  payload: UpdateCommentPayload
): Promise<{ message: string }> {
  const response = await apiClient.put<{ message: string }>(
    `/comments/${commentId}`,
    payload
  );
  return response.data;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>(
    `/comments/${commentId}`
  );
  return response.data;
}

/**
 * Vote on a comment
 */
export async function voteOnComment(
  payload: CommentVotePayload
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    `/comments/${payload.comment_id}/vote`,
    {
      vote: payload.vote_type,
    }
  );
  return response.data;
}

/**
 * Report a comment
 */
export async function reportComment(
  payload: ReportCommentPayload
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    '/reports',
    {
      target_type: 'comment',
      target_id: payload.comment_id,
      reason: payload.reason,
      description: payload.description,
    }
  );
  return response.data;
}
