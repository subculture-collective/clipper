import { api } from '@/lib/api';

/**
 * Comment data types
 */
export type CommentUser = {
    id: string;
    username: string;
    avatar_url?: string;
};

export type Comment = {
    id: string;
    clip_id: string;
    user_id: string;
    user: CommentUser;
    parent_comment_id?: string;
    content: string;
    vote_score: number;
    user_vote?: number | null; // 1 for upvote, -1 for downvote, null for no vote
    reply_count?: number;
    is_edited: boolean;
    is_removed: boolean;
    removed_reason?: string;
    created_at: string;
    updated_at: string;
};

export type CommentsResponse = {
    comments: Comment[];
    next_cursor: number;
    has_more: boolean;
};

export type CreateCommentInput = {
    content: string;
    parent_comment_id?: string;
};

export type UpdateCommentInput = {
    content: string;
};

/**
 * List comments for a clip
 */
export async function listComments(
    clipId: string,
    options?: {
        sort?: 'best' | 'new' | 'top';
        cursor?: number;
        limit?: number;
    }
) {
    const { sort = 'best', cursor = 0, limit = 50 } = options || {};
    const res = await api.get<CommentsResponse>(`/clips/${clipId}/comments`, {
        params: { sort, cursor, limit },
    });
    return res.data;
}

/**
 * Get replies for a comment
 */
export async function getReplies(
    commentId: string,
    options?: {
        cursor?: number;
        limit?: number;
    }
) {
    const { cursor = 0, limit = 50 } = options || {};
    const res = await api.get<CommentsResponse>(`/comments/${commentId}/replies`, {
        params: { cursor, limit },
    });
    return res.data;
}

/**
 * Create a new comment or reply
 */
export async function createComment(clipId: string, input: CreateCommentInput) {
    const res = await api.post<Comment>(`/clips/${clipId}/comments`, input);
    return res.data;
}

/**
 * Update a comment
 */
export async function updateComment(commentId: string, input: UpdateCommentInput) {
    const res = await api.put<{ message: string }>(`/comments/${commentId}`, input);
    return res.data;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string) {
    const res = await api.delete<{ message: string }>(`/comments/${commentId}`);
    return res.data;
}

/**
 * Vote on a comment
 */
export async function voteOnComment(commentId: string, vote: 1 | -1 | 0) {
    const res = await api.post<{ message: string }>(`/comments/${commentId}/vote`, {
        vote,
    });
    return res.data;
}
