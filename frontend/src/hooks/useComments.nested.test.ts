import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, InfiniteData } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
  useUpdateComment,
  useDeleteComment,
  useCommentVote,
} from './useComments';
import * as commentApi from '@/lib/comment-api';
import type {
  Comment,
  CommentFeedResponse,
  UpdateCommentPayload,
  CommentVotePayload,
} from '@/types/comment';

// Mock the comment API
vi.mock('@/lib/comment-api');

const createNestedCommentStructure = (): Comment => {
  // Create a parent comment with nested replies
  const parentComment: Comment = {
    id: 'parent-1',
    clip_id: 'clip-1',
    user_id: 'user-1',
    username: 'parentuser',
    user_avatar: 'https://example.com/avatar.png',
    user_karma: 1000,
    user_role: 'user',
    parent_id: null,
    content: 'Parent comment',
    vote_score: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_deleted: false,
    is_removed: false,
    depth: 0,
    child_count: 2,
    user_vote: null,
    replies: [
      {
        id: 'reply-1',
        clip_id: 'clip-1',
        user_id: 'user-2',
        username: 'replyuser1',
        user_avatar: 'https://example.com/avatar2.png',
        user_karma: 500,
        user_role: 'user',
        parent_id: 'parent-1',
        content: 'First reply',
        vote_score: 5,
        created_at: '2024-01-01T01:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        is_deleted: false,
        is_removed: false,
        depth: 1,
        child_count: 1,
        user_vote: null,
        replies: [
          {
            id: 'nested-reply-1',
            clip_id: 'clip-1',
            user_id: 'user-3',
            username: 'nesteduser',
            user_avatar: 'https://example.com/avatar3.png',
            user_karma: 300,
            user_role: 'user',
            parent_id: 'reply-1',
            content: 'Deeply nested reply',
            vote_score: 2,
            created_at: '2024-01-01T02:00:00Z',
            updated_at: '2024-01-01T02:00:00Z',
            is_deleted: false,
            is_removed: false,
            depth: 2,
            child_count: 0,
            user_vote: null,
            replies: [],
          },
        ],
      },
      {
        id: 'reply-2',
        clip_id: 'clip-1',
        user_id: 'user-4',
        username: 'replyuser2',
        user_avatar: 'https://example.com/avatar4.png',
        user_karma: 400,
        user_role: 'user',
        parent_id: 'parent-1',
        content: 'Second reply',
        vote_score: 3,
        created_at: '2024-01-01T01:30:00Z',
        updated_at: '2024-01-01T01:30:00Z',
        is_deleted: false,
        is_removed: false,
        depth: 1,
        child_count: 0,
        user_vote: null,
        replies: [],
      },
    ],
  };

  return parentComment;
};

describe('useComments - Nested Comment Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUpdateComment with nested comments', () => {
    it('should optimistically update a nested comment (depth > 0)', async () => {
      const successResponse = { message: 'Comment updated successfully' };
      vi.mocked(commentApi.updateComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const parentComment = createNestedCommentStructure();

      // Pre-populate the query cache
      queryClient.setQueryData(['comments', 'clip-1'], {
        pages: [{
          comments: [parentComment],
          total: 1,
          page: 1,
          limit: 10,
          has_more: false,
        }],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUpdateComment(), { wrapper });

      const payload: UpdateCommentPayload = {
        content: 'Updated nested reply content',
      };

      // Update the deeply nested reply
      result.current.mutate({ commentId: 'nested-reply-1', payload });

      // Check optimistic update happened
      await waitFor(() => {
        const data = queryClient.getQueryData(['comments', 'clip-1']) as InfiniteData<CommentFeedResponse>;
        const nestedReply = data.pages[0].comments[0].replies[0].replies[0];
        expect(nestedReply.content).toBe('Updated nested reply content');
        expect(nestedReply.edited_at).toBeDefined();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(commentApi.updateComment).toHaveBeenCalledWith('nested-reply-1', payload);
    });

    it('should maintain thread structure after editing a nested comment', async () => {
      const successResponse = { message: 'Comment updated successfully' };
      vi.mocked(commentApi.updateComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const parentComment = createNestedCommentStructure();

      queryClient.setQueryData(['comments', 'clip-1'], {
        pages: [{
          comments: [parentComment],
          total: 1,
          page: 1,
          limit: 10,
          has_more: false,
        }],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUpdateComment(), { wrapper });

      // Update the first-level reply
      result.current.mutate({
        commentId: 'reply-1',
        payload: { content: 'Updated first reply' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify structure is maintained
      const data = queryClient.getQueryData(['comments', 'clip-1']) as InfiniteData<CommentFeedResponse>;
      expect(data.pages[0].comments[0].replies).toHaveLength(2);
      expect(data.pages[0].comments[0].replies[0].replies).toHaveLength(1);
      expect(data.pages[0].comments[0].child_count).toBe(2); // Parent still has 2 children
    });

    it('should rollback on error when updating a nested comment', async () => {
      const error = new Error('Failed to update comment');
      vi.mocked(commentApi.updateComment).mockRejectedValue(error);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const parentComment = createNestedCommentStructure();
      const originalContent = parentComment.replies![0].content;

      queryClient.setQueryData(['comments', 'clip-1'], {
        pages: [{
          comments: [parentComment],
          total: 1,
          page: 1,
          limit: 10,
          has_more: false,
        }],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useUpdateComment(), { wrapper });

      result.current.mutate({
        commentId: 'reply-1',
        payload: { content: 'This will fail' },
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Verify rollback happened
      const data = queryClient.getQueryData(['comments', 'clip-1']) as InfiniteData<CommentFeedResponse>;
      expect(data.pages[0].comments[0].replies[0].content).toBe(originalContent);
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useDeleteComment with nested comments', () => {
    it('should optimistically mark a nested comment as deleted (depth > 0)', async () => {
      const successResponse = { message: 'Comment deleted successfully' };
      vi.mocked(commentApi.deleteComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const parentComment = createNestedCommentStructure();

      queryClient.setQueryData(['comments', 'clip-1'], {
        pages: [{
          comments: [parentComment],
          total: 1,
          page: 1,
          limit: 10,
          has_more: false,
        }],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useDeleteComment(), { wrapper });

      // Delete the deeply nested reply
      result.current.mutate('nested-reply-1');

      // Check optimistic update happened
      await waitFor(() => {
        const data = queryClient.getQueryData(['comments', 'clip-1']) as InfiniteData<CommentFeedResponse>;
        const nestedReply = data.pages[0].comments[0].replies[0].replies[0];
        expect(nestedReply.is_deleted).toBe(true);
        expect(nestedReply.content).toBe('[deleted by user]');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(commentApi.deleteComment).toHaveBeenCalledWith('nested-reply-1');
    });

    it('should maintain thread structure after deleting a nested comment', async () => {
      const successResponse = { message: 'Comment deleted successfully' };
      vi.mocked(commentApi.deleteComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const parentComment = createNestedCommentStructure();

      queryClient.setQueryData(['comments', 'clip-1'], {
        pages: [{
          comments: [parentComment],
          total: 1,
          page: 1,
          limit: 10,
          has_more: false,
        }],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useDeleteComment(), { wrapper });

      // Delete a first-level reply
      result.current.mutate('reply-1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify structure is maintained (comment is marked deleted but structure intact)
      const data = queryClient.getQueryData(['comments', 'clip-1']) as InfiniteData<CommentFeedResponse>;
      expect(data.pages[0].comments[0].replies).toHaveLength(2); // Still 2 replies
      expect(data.pages[0].comments[0].replies[0].is_deleted).toBe(true);
      expect(data.pages[0].comments[0].replies[0].replies).toHaveLength(1); // Nested reply still exists
      expect(data.pages[0].comments[0].child_count).toBe(2); // child_count unchanged
    });

    it('should rollback on error when deleting a nested comment', async () => {
      const error = new Error('Failed to delete comment');
      vi.mocked(commentApi.deleteComment).mockRejectedValue(error);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const parentComment = createNestedCommentStructure();

      queryClient.setQueryData(['comments', 'clip-1'], {
        pages: [{
          comments: [parentComment],
          total: 1,
          page: 1,
          limit: 10,
          has_more: false,
        }],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useDeleteComment(), { wrapper });

      result.current.mutate('reply-1');

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Verify rollback happened
      const data = queryClient.getQueryData(['comments', 'clip-1']) as InfiniteData<CommentFeedResponse>;
      expect(data.pages[0].comments[0].replies[0].is_deleted).toBe(false);
      expect(data.pages[0].comments[0].replies[0].content).toBe('First reply');
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useCommentVote with nested comments', () => {
    it('should optimistically update vote on a nested comment (depth > 0)', async () => {
      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const parentComment = createNestedCommentStructure();

      queryClient.setQueryData(['comments', 'clip-1'], {
        pages: [{
          comments: [parentComment],
          total: 1,
          page: 1,
          limit: 10,
          has_more: false,
        }],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      const payload: CommentVotePayload = {
        comment_id: 'nested-reply-1',
        vote_type: 1,
      };

      result.current.mutate(payload);

      // Check optimistic update happened
      await waitFor(() => {
        const data = queryClient.getQueryData(['comments', 'clip-1']) as InfiniteData<CommentFeedResponse>;
        const nestedReply = data.pages[0].comments[0].replies[0].replies[0];
        expect(nestedReply.vote_score).toBe(3); // Was 2, now 3
        expect(nestedReply.user_vote).toBe(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(commentApi.voteOnComment).toHaveBeenCalledWith(payload);
    });

    it('should maintain thread structure after voting on nested comment', async () => {
      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const parentComment = createNestedCommentStructure();

      queryClient.setQueryData(['comments', 'clip-1'], {
        pages: [{
          comments: [parentComment],
          total: 1,
          page: 1,
          limit: 10,
          has_more: false,
        }],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      result.current.mutate({
        comment_id: 'reply-1',
        vote_type: 1,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify structure is maintained
      const data = queryClient.getQueryData(['comments', 'clip-1']) as InfiniteData<CommentFeedResponse>;
      expect(data.pages[0].comments[0].replies).toHaveLength(2);
      expect(data.pages[0].comments[0].replies[0].replies).toHaveLength(1);
      expect(data.pages[0].comments[0].child_count).toBe(2);
      // Only the voted comment should have changed vote_score
      expect(data.pages[0].comments[0].replies[0].vote_score).toBe(6); // Was 5, now 6
      expect(data.pages[0].comments[0].replies[1].vote_score).toBe(3); // Unchanged
    });

    it('should rollback on error when voting on a nested comment', async () => {
      const error = new Error('Failed to vote');
      vi.mocked(commentApi.voteOnComment).mockRejectedValue(error);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const parentComment = createNestedCommentStructure();
      const originalScore = parentComment.replies![0].vote_score;

      queryClient.setQueryData(['comments', 'clip-1'], {
        pages: [{
          comments: [parentComment],
          total: 1,
          page: 1,
          limit: 10,
          has_more: false,
        }],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      result.current.mutate({
        comment_id: 'reply-1',
        vote_type: 1,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Verify rollback happened
      const data = queryClient.getQueryData(['comments', 'clip-1']) as InfiniteData<CommentFeedResponse>;
      expect(data.pages[0].comments[0].replies[0].vote_score).toBe(originalScore);
      expect(data.pages[0].comments[0].replies[0].user_vote).toBeNull();
      expect(result.current.error).toEqual(error);
    });

    it('should handle vote toggle on nested comment', async () => {
      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const parentComment = createNestedCommentStructure();
      // Set initial upvote on nested reply
      parentComment.replies![0].replies![0].user_vote = 1;
      parentComment.replies![0].replies![0].vote_score = 3; // Already upvoted

      queryClient.setQueryData(['comments', 'clip-1'], {
        pages: [{
          comments: [parentComment],
          total: 1,
          page: 1,
          limit: 10,
          has_more: false,
        }],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      // Toggle the vote (remove upvote)
      result.current.mutate({
        comment_id: 'nested-reply-1',
        vote_type: 1,
      });

      // Check optimistic update - vote should be removed
      await waitFor(() => {
        const data = queryClient.getQueryData(['comments', 'clip-1']) as InfiniteData<CommentFeedResponse>;
        const nestedReply = data.pages[0].comments[0].replies[0].replies[0];
        expect(nestedReply.vote_score).toBe(2); // Was 3, now 2 (removed upvote)
        expect(nestedReply.user_vote).toBeNull();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
