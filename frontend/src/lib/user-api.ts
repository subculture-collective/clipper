import apiClient from './api';
import type { Comment } from '../types/comment';
import type { Clip, ClipFeedResponse } from '../types/clip';

export interface UserCommentsResponse {
    comments: Comment[];
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
}

/**
 * Fetch comments by a user
 */
export async function fetchUserComments(
    userId: string,
    page: number = 1,
    limit: number = 10
): Promise<UserCommentsResponse> {
    const response = await apiClient.get<UserCommentsResponse>(
        `/users/${userId}/comments`,
        {
            params: { page, limit },
        }
    );
    return response.data;
}

/**
 * Fetch clips that a user has upvoted
 */
export async function fetchUserUpvotedClips(
    userId: string,
    page: number = 1,
    limit: number = 10
): Promise<ClipFeedResponse> {
    const response = await apiClient.get<{
        success: boolean;
        data: Clip[];
        meta: {
            page: number;
            limit: number;
            total: number;
            total_pages: number;
            has_next: boolean;
            has_prev: boolean;
        };
    }>(`/users/${userId}/upvoted`, {
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
export async function fetchUserDownvotedClips(
    userId: string,
    page: number = 1,
    limit: number = 10
): Promise<ClipFeedResponse> {
    const response = await apiClient.get<{
        success: boolean;
        data: Clip[];
        meta: {
            page: number;
            limit: number;
            total: number;
            total_pages: number;
            has_next: boolean;
            has_prev: boolean;
        };
    }>(`/users/${userId}/downvoted`, {
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
export async function reauthorizeTwitch(): Promise<{ auth_url: string }> {
    const response = await apiClient.post<{ auth_url: string }>(
        '/auth/twitch/reauthorize'
    );
    return response.data;
}
