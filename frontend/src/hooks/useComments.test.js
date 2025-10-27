import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useComments, useCreateComment, useUpdateComment, useDeleteComment, useCommentVote, useReportComment, } from './useComments';
import * as commentApi from '@/lib/comment-api';
// Mock the comment API
vi.mock('@/lib/comment-api');
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
            mutations: {
                retry: false,
            },
        },
    });
    return ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
};
const mockComment = {
    id: 'comment-1',
    clip_id: 'clip-1',
    user_id: 'user-1',
    username: 'testuser',
    user_avatar: 'https://example.com/avatar.png',
    user_karma: 1234,
    user_role: 'user',
    parent_id: null,
    content: 'Test comment',
    vote_score: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_deleted: false,
    is_removed: false,
    depth: 0,
    child_count: 0,
    user_vote: null,
    replies: [],
};
const mockCommentFeedResponse = {
    comments: [mockComment],
    total: 1,
    page: 1,
    limit: 10,
    has_more: false,
};
describe('useComments', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('useComments hook', () => {
        it('should fetch comments successfully', async () => {
            vi.mocked(commentApi.fetchComments).mockResolvedValue(mockCommentFeedResponse);
            const { result } = renderHook(() => useComments('clip-1', 'best'), {
                wrapper: createWrapper(),
            });
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data?.pages[0].comments).toEqual([mockComment]);
            expect(commentApi.fetchComments).toHaveBeenCalledWith({
                clipId: 'clip-1',
                sort: 'best',
                pageParam: 1,
                limit: 10,
            });
        });
        it('should handle fetch error', async () => {
            const error = new Error('Failed to fetch comments');
            vi.mocked(commentApi.fetchComments).mockRejectedValue(error);
            const { result } = renderHook(() => useComments('clip-1'), {
                wrapper: createWrapper(),
            });
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toEqual(error);
        });
        it('should handle loading state', () => {
            vi.mocked(commentApi.fetchComments).mockImplementation(() => new Promise(() => { }) // Never resolves
            );
            const { result } = renderHook(() => useComments('clip-1'), {
                wrapper: createWrapper(),
            });
            expect(result.current.isLoading).toBe(true);
            expect(result.current.data).toBeUndefined();
        });
        it('should not fetch when clipId is empty', () => {
            const { result } = renderHook(() => useComments(''), {
                wrapper: createWrapper(),
            });
            expect(result.current.fetchStatus).toBe('idle');
            expect(commentApi.fetchComments).not.toHaveBeenCalled();
        });
        it('should support different sort options', async () => {
            vi.mocked(commentApi.fetchComments).mockResolvedValue(mockCommentFeedResponse);
            const { result } = renderHook(() => useComments('clip-1', 'new'), {
                wrapper: createWrapper(),
            });
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(commentApi.fetchComments).toHaveBeenCalledWith({
                clipId: 'clip-1',
                sort: 'new',
                pageParam: 1,
                limit: 10,
            });
        });
        it('should handle pagination with has_more', async () => {
            const page1Response = {
                ...mockCommentFeedResponse,
                has_more: true,
            };
            vi.mocked(commentApi.fetchComments).mockResolvedValue(page1Response);
            const { result } = renderHook(() => useComments('clip-1'), {
                wrapper: createWrapper(),
            });
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.hasNextPage).toBe(true);
        });
    });
    describe('useCreateComment hook', () => {
        it('should create comment successfully', async () => {
            vi.mocked(commentApi.createComment).mockResolvedValue(mockComment);
            const { result } = renderHook(() => useCreateComment(), {
                wrapper: createWrapper(),
            });
            const payload = {
                clip_id: 'clip-1',
                content: 'New comment',
                parent_id: null,
            };
            result.current.mutate(payload);
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(mockComment);
            expect(commentApi.createComment).toHaveBeenCalledWith(payload);
        });
        it('should handle create error', async () => {
            const error = new Error('Failed to create comment');
            vi.mocked(commentApi.createComment).mockRejectedValue(error);
            const { result } = renderHook(() => useCreateComment(), {
                wrapper: createWrapper(),
            });
            const payload = {
                clip_id: 'clip-1',
                content: 'New comment',
            };
            result.current.mutate(payload);
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toEqual(error);
        });
        it('should handle loading state during creation', async () => {
            vi.mocked(commentApi.createComment).mockImplementation(() => new Promise(() => { }));
            const { result } = renderHook(() => useCreateComment(), {
                wrapper: createWrapper(),
            });
            result.current.mutate({
                clip_id: 'clip-1',
                content: 'New comment',
            });
            await waitFor(() => {
                expect(result.current.isPending).toBe(true);
            });
        });
    });
    describe('useUpdateComment hook', () => {
        it('should update comment successfully', async () => {
            const successResponse = { message: 'Comment updated successfully' };
            vi.mocked(commentApi.updateComment).mockResolvedValue(successResponse);
            const { result } = renderHook(() => useUpdateComment(), {
                wrapper: createWrapper(),
            });
            const payload = {
                content: 'Updated content',
            };
            result.current.mutate({ commentId: 'comment-1', payload });
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(successResponse);
            expect(commentApi.updateComment).toHaveBeenCalledWith('comment-1', payload);
        });
        it('should handle update error', async () => {
            const error = new Error('Failed to update comment');
            vi.mocked(commentApi.updateComment).mockRejectedValue(error);
            const { result } = renderHook(() => useUpdateComment(), {
                wrapper: createWrapper(),
            });
            result.current.mutate({
                commentId: 'comment-1',
                payload: { content: 'Updated' },
            });
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toEqual(error);
        });
    });
    describe('useDeleteComment hook', () => {
        it('should delete comment successfully', async () => {
            const successResponse = { message: 'Comment deleted successfully' };
            vi.mocked(commentApi.deleteComment).mockResolvedValue(successResponse);
            const { result } = renderHook(() => useDeleteComment(), {
                wrapper: createWrapper(),
            });
            result.current.mutate('comment-1');
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(successResponse);
            expect(commentApi.deleteComment).toHaveBeenCalledWith('comment-1');
        });
        it('should handle delete error', async () => {
            const error = new Error('Failed to delete comment');
            vi.mocked(commentApi.deleteComment).mockRejectedValue(error);
            const { result } = renderHook(() => useDeleteComment(), {
                wrapper: createWrapper(),
            });
            result.current.mutate('comment-1');
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toEqual(error);
        });
    });
    describe('useCommentVote hook', () => {
        it('should vote on comment successfully', async () => {
            const successResponse = { message: 'Vote recorded successfully' };
            vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);
            const { result } = renderHook(() => useCommentVote(), {
                wrapper: createWrapper(),
            });
            const payload = {
                comment_id: 'comment-1',
                vote_type: 1,
            };
            result.current.mutate(payload);
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(successResponse);
            expect(commentApi.voteOnComment).toHaveBeenCalledWith(payload);
        });
        it('should handle vote error', async () => {
            const error = new Error('Failed to vote');
            vi.mocked(commentApi.voteOnComment).mockRejectedValue(error);
            const { result } = renderHook(() => useCommentVote(), {
                wrapper: createWrapper(),
            });
            result.current.mutate({ comment_id: 'comment-1', vote_type: -1 });
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toEqual(error);
        });
        it('should handle upvote (vote_type: 1)', async () => {
            const successResponse = { message: 'Vote recorded successfully' };
            vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);
            const { result } = renderHook(() => useCommentVote(), {
                wrapper: createWrapper(),
            });
            result.current.mutate({ comment_id: 'comment-1', vote_type: 1 });
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(commentApi.voteOnComment).toHaveBeenCalledWith({
                comment_id: 'comment-1',
                vote_type: 1,
            });
        });
        it('should handle downvote (vote_type: -1)', async () => {
            const successResponse = { message: 'Vote recorded successfully' };
            vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);
            const { result } = renderHook(() => useCommentVote(), {
                wrapper: createWrapper(),
            });
            result.current.mutate({ comment_id: 'comment-1', vote_type: -1 });
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(commentApi.voteOnComment).toHaveBeenCalledWith({
                comment_id: 'comment-1',
                vote_type: -1,
            });
        });
    });
    describe('useReportComment hook', () => {
        it('should report comment successfully', async () => {
            const successResponse = { message: 'Report submitted successfully' };
            vi.mocked(commentApi.reportComment).mockResolvedValue(successResponse);
            const { result } = renderHook(() => useReportComment(), {
                wrapper: createWrapper(),
            });
            const payload = {
                comment_id: 'comment-1',
                reason: 'spam',
                description: 'This is spam',
            };
            result.current.mutate(payload);
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(successResponse);
            expect(commentApi.reportComment).toHaveBeenCalledWith(payload);
        });
        it('should handle report error', async () => {
            const error = new Error('Failed to report comment');
            vi.mocked(commentApi.reportComment).mockRejectedValue(error);
            const { result } = renderHook(() => useReportComment(), {
                wrapper: createWrapper(),
            });
            result.current.mutate({
                comment_id: 'comment-1',
                reason: 'harassment',
            });
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toEqual(error);
        });
        it('should handle different report reasons', async () => {
            const successResponse = { message: 'Report submitted successfully' };
            vi.mocked(commentApi.reportComment).mockResolvedValue(successResponse);
            const { result } = renderHook(() => useReportComment(), {
                wrapper: createWrapper(),
            });
            const reasons = [
                'spam',
                'harassment',
                'off-topic',
                'misinformation',
                'other',
            ];
            for (const reason of reasons) {
                result.current.mutate({
                    comment_id: 'comment-1',
                    reason,
                });
                await waitFor(() => expect(result.current.isSuccess).toBe(true));
                expect(commentApi.reportComment).toHaveBeenCalledWith({
                    comment_id: 'comment-1',
                    reason,
                });
                result.current.reset();
            }
        });
    });
});
